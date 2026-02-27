"""
Celery tasks for the articles app.
"""
from celery import shared_task


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def notify_article_published(self, article_id):
    """
    Sends push notifications to all active users of a company when an article is published.
    Runs asynchronously to avoid blocking the Django request worker.
    """
    try:
        from .models import Article
        from apps.accounts.models import User
        from apps.notifications.tasks import notify_user_push

        article = Article.objects.select_related('company').get(pk=article_id)
        active_users = User.objects.filter(company=article.company, is_active=True)

        for target_user in active_users:
            try:
                notify_user_push(
                    target_user,
                    title=f"Novo Artigo: {article.title}",
                    message=article.excerpt or "Confira a nova publicação!",
                    link=f"/artigos/{article.slug}"
                )
            except Exception:
                pass  # falha individual não deve derrubar a task inteira

    except Exception as exc:
        raise self.retry(exc=exc)
