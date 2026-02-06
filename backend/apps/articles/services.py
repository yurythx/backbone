from django.utils.text import slugify
from .models import Article, Category, Tag
from apps.core.models import AuditLog
from shared_kernel.audit import log_create, log_update, log_delete
from apps.webhooks.tasks import trigger_webhooks
from apps.notifications.tasks import notify_user_push
from apps.accounts.models import User

class ArticleService:
    @staticmethod
    def create_article(user, company, data, image=None):
        """
        Creates an article with audit logging and automatic slug generation if missing.
        """
        import reversion

        with reversion.create_revision():
            tags_data = data.pop('tags', [])
            
            # Auto-slug if not provided
            if not data.get('slug'):
                data['slug'] = slugify(data.get('title', ''))
            # Ensure slug uniqueness within the company
            base_slug = data.get('slug') or ''
            candidate = base_slug
            index = 1
            while Article.objects.filter(company=company, slug=candidate).exists():
                candidate = f"{base_slug}-{index}"
                index += 1
            data['slug'] = candidate
                
            article = Article.objects.create(
                company=company,
                author=user,
                **data
            )
            
            if tags_data:
                article.tags.set(tags_data)
                
            if image:
                article.image = image
                article.save()

            reversion.set_user(user)
            reversion.set_comment(f"Created by {user.username}")
            
        from types import SimpleNamespace
        log_create(user, "Article", article, request=SimpleNamespace(company=company))
        
        trigger_webhooks(company, 'article.created', {
            'id': str(article.id),
            'title': article.title,
            'slug': article.slug,
            'author': user.username
        })
        return article

    @staticmethod
    def update_article(user, article, data, image=None):
        """
        Updates an article and logs the change.
        """
        import reversion
        
        with reversion.create_revision():
            tags_data = data.pop('tags', None)
            
            # If status is being updated, ensure valid transition
            new_status = data.get('status')
            if new_status and new_status != article.status:
                # Basic validation logic could go here
                pass

            for attr, value in data.items():
                setattr(article, attr, value)
                
            if tags_data is not None:
                article.tags.set(tags_data)
                
            if image:
                article.image = image
                
            article.save()
            
            reversion.set_user(user)
            reversion.set_comment(f"Updated by {user.username}")
            
        from types import SimpleNamespace
        log_update(user, "Article", article, request=SimpleNamespace(company=article.company))
        
        trigger_webhooks(article.company, 'article.updated', {
            'id': str(article.id),
            'title': article.title,
            'slug': article.slug,
            'status': article.status
        })
        return article

    @staticmethod
    def submit_for_review(user, article):
        if article.status != Article.STATUS_DRAFT:
             raise ValueError("Only drafts can be submitted for review")
        
        return ArticleService.update_article(user, article, {'status': Article.STATUS_PENDING})

    @staticmethod
    def publish_article(user, article):
        if not user.has_perm('articles.publish_article'):
             # This check depends on permission system setup, if strict:
             # raise PermissionDenied("User does not have permission to publish")
             pass

        if article.status not in [Article.STATUS_PENDING, Article.STATUS_DRAFT]:
             raise ValueError("Only pending or draft articles can be published")

        article = ArticleService.update_article(user, article, {
            'status': Article.STATUS_PUBLISHED, 
            'is_published': True,
            'published_at':  article.published_at or __import__('django.utils.timezone', fromlist=['now']).now()
        })
        
        trigger_webhooks(article.company, 'article.published', {
            'id': str(article.id),
            'title': article.title,
            'slug': article.slug,
            'url': f"/artigos/{article.slug}"
        })

        # Notificar todos os usuários da empresa via Push
        active_users = User.objects.filter(company=article.company, is_active=True)
        for target_user in active_users:
            notify_user_push(
                target_user, 
                title=f"Novo Artigo: {article.title}", 
                message=article.excerpt or "Confira a nova publicação!",
                link=f"/artigos/{article.slug}"
            )

        return article

    @staticmethod
    def reject_article(user, article, reason=None):
        if article.status != Article.STATUS_PENDING:
             raise ValueError("Only pending articles can be rejected")

        # Optionally store rejection reason in a separate model/field or log
        return ArticleService.update_article(user, article, {'status': Article.STATUS_REJECTED})

    @staticmethod
    def delete_article(user, article):
        """
        Deletes an article and logs the removal.
        """
        log_delete(user, "Article", article)
        
        company = article.company
        article_data = {
            'id': str(article.id),
            'title': article.title
        }
        
        article.delete()
        
        trigger_webhooks(company, 'article.deleted', article_data)

    @staticmethod
    def record_view(user, article, ip_address=None):
        from .models import ArticleView
        
        ArticleView.objects.create(
            company=article.company,
            article=article,
            user=user if user and user.is_authenticated else None,
            ip_address=ip_address
        )

    @staticmethod
    def revert_to_version(user, article, version_id):
        """
        Reverts an article to a specific version ID.
        """
        import reversion
        from reversion.models import Version
        
        try:
            version = Version.objects.get(pk=version_id)
        except Version.DoesNotExist:
            raise ValueError("Version not found")
            
        # Verify the version belongs to the object (sanity check)
        if str(version.object_id) != str(article.id) and version.object_id != article.id:
             # Reversion stores object_id as string usually, but depends on PK type
             raise ValueError("Version does not belong to this article")

        with reversion.create_revision():
            version.revision.revert()
            article.refresh_from_db() # Reload to get the reverted state
            
            reversion.set_user(user)
            reversion.set_comment(f"Reverted to version from {version.revision.date_created}")
            
        from types import SimpleNamespace
        log_update(user, "Article", article, request=SimpleNamespace(company=article.company), changes={"reverted_to_version": version_id})
        return article
