from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import filters, mixins, permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.permissions import ActionRolePermission, HasRolePermission
from apps.module_manager.models import TenantModule
from apps.module_manager.permissions import HasModuleAccess
from shared_kernel.audit import log_create, log_delete, log_update

from .filters import ArticleFilter, PublicArticleFilter
from .models import Article, ArticleView, Category, Comment, Tag
from .serializers import (
    ArticleAnalyticsSerializer,
    ArticlePublicSerializer,
    ArticleSerializer,
    CategorySerializer,
    CommentSerializer,
    GlobalArticlesAnalyticsSerializer,
    TagSerializer,
)
from .services import ArticleService


@extend_schema_view(
    list=extend_schema(tags=["Public Articles"], description="Lista artigos públicos sem necessidade de autenticação"),
    retrieve=extend_schema(tags=["Public Articles"], description="Detalhe de artigo público"),
)
class PublicArticleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet público - sem autenticação requerida.
    Retorna apenas artigos marcados como públicos (is_public=True) e publicados.
    """

    serializer_class = ArticlePublicSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"
    lookup_url_kwarg = "slug"
    filterset_class = PublicArticleFilter
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "content", "excerpt"]
    ordering_fields = ["published_at", "created_at"]
    ordering = ["-published_at"]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public_articles"

    def get_queryset(self):
        """
        Retorna artigos publicados.
        - Usuários anônimos: apenas públicos.
        - Usuários autenticados (do mesmo tenant): públicos e privados.
        """
        company = getattr(self.request, "company", None)

        # Base query: apenas publicados
        # Usamos all_objects para poder filtrar manualmente o tenant se necessário (ex: acesso via slug público)
        qs = Article.all_objects.filter(status=Article.STATUS_PUBLISHED, published_at__isnull=False)

        # Se usuário autenticado e no contexto da sua empresa, vê privados também
        user = self.request.user
        is_same_tenant = user.is_authenticated and company and getattr(user, "company_id", None) == company.id

        if not is_same_tenant:
            qs = qs.filter(is_public=True)

        if company:
            qs = qs.filter(company=company)
        else:
            # Fallback manual de tenant
            company_slug = self.request.query_params.get("company_slug") or self.request.headers.get("X-Company-Slug")
            if company_slug:
                qs = qs.filter(company__slug=company_slug)

        return qs.select_related("category", "author", "company").prefetch_related("tags").order_by("-published_at")

    def retrieve(self, request, *args, **kwargs):
        slug = kwargs.get("slug")
        company = getattr(request, "company", None)
        c_slug = company.slug if company else "public"
        cache_key = f"art_p_det:{c_slug}:{slug}"

        cached = cache.get(cache_key)
        if cached:
            ArticleService.record_view(None, article_id=cached.get("id"), ip_address=request.META.get("REMOTE_ADDR"))
            return Response(cached)

        try:
            instance = self.get_object()
        except Article.MultipleObjectsReturned:
            return Response({"error": "Multiple found."}, status=status.HTTP_400_BAD_REQUEST)

        ArticleService.record_view(
            request.user if request.user.is_authenticated else None, instance, request.META.get("REMOTE_ADDR")
        )
        data = self.get_serializer(instance).data
        cache.set(cache_key, data, timeout=300)
        return Response(data)


@extend_schema_view(
    list=extend_schema(tags=["Articles"]),
    retrieve=extend_schema(tags=["Articles"]),
    create=extend_schema(tags=["Articles"]),
    update=extend_schema(tags=["Articles"]),
    partial_update=extend_schema(tags=["Articles"]),
    destroy=extend_schema(tags=["Articles"]),
)
class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess, HasRolePermission]
    required_permission = "articles.category_manage"
    module_code = "articles"
    lookup_field = "slug"
    lookup_url_kwarg = "slug"
    pagination_class = None

    def get_queryset(self):
        return Category.objects.all().order_by("name")

    def perform_create(self, serializer):
        obj = serializer.save(company=self.request.company)
        log_create(self.request.user, "Category", obj, request=self.request)

    def perform_update(self, serializer):
        obj = serializer.save()
        log_update(self.request.user, "Category", obj, request=self.request)

    def perform_destroy(self, instance):
        log_delete(self.request.user, "Category", instance, request=self.request)
        instance.delete()

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasModuleAccess(), HasRolePermission()]


@extend_schema_view(
    list=extend_schema(tags=["Articles"]),
    retrieve=extend_schema(tags=["Articles"]),
    create=extend_schema(tags=["Articles"]),
    update=extend_schema(tags=["Articles"]),
    partial_update=extend_schema(tags=["Articles"]),
    destroy=extend_schema(tags=["Articles"]),
)
class TagViewSet(viewsets.ModelViewSet):
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess, HasRolePermission]
    required_permission = "articles.category_manage"
    module_code = "articles"
    lookup_field = "slug"
    pagination_class = None

    def get_queryset(self):
        return Tag.objects.all().order_by("name")

    def perform_create(self, serializer):
        obj = serializer.save(company=self.request.company)
        log_create(self.request.user, "Tag", obj, request=self.request)

    def perform_update(self, serializer):
        obj = serializer.save()
        log_update(self.request.user, "Tag", obj, request=self.request)

    def perform_destroy(self, instance):
        log_delete(self.request.user, "Tag", instance, request=self.request)
        instance.delete()

    def get_permissions(self):
        return [permissions.IsAuthenticated(), HasModuleAccess(), HasRolePermission()]


@extend_schema_view(
    list=extend_schema(tags=["Articles"]),
    retrieve=extend_schema(tags=["Articles"]),
    create=extend_schema(tags=["Articles"]),
    update=extend_schema(tags=["Articles"]),
    partial_update=extend_schema(tags=["Articles"]),
    destroy=extend_schema(tags=["Articles"]),
    history=extend_schema(
        tags=["Articles"], responses={200: serializers.ListSerializer(child=serializers.DictField())}
    ),
    revert=extend_schema(tags=["Articles"], responses={200: serializers.DictField()}),
    submit_for_review=extend_schema(tags=["Articles"], responses={200: serializers.DictField()}),
    publish=extend_schema(tags=["Articles"], responses={200: serializers.DictField()}),
    reject=extend_schema(tags=["Articles"], responses={200: serializers.DictField()}),
)
class ArticleViewSet(viewsets.ModelViewSet):
    lookup_field = "slug"
    lookup_url_kwarg = "slug"
    serializer_class = ArticleSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess, ActionRolePermission]
    module_code = "articles"
    filterset_class = ArticleFilter
    search_fields = ["title", "content", "excerpt"]
    ordering_fields = ["created_at", "updated_at", "title"]

    # Permissões granulares por action — gerenciadas por ActionRolePermission.
    # Isso evita mutar self.required_permission dentro de perform_create/update/destroy.
    action_permissions = {
        "list": "articles.article_view",
        "retrieve": "articles.article_view",
        "create": "articles.article_create",
        "update": "articles.article_edit",
        "partial_update": "articles.article_edit",
        "destroy": "articles.article_delete",
        "publish": "articles.article_publish",
        "submit_for_review": "articles.article_create",
        "reject": "articles.article_publish",
        "revert": "articles.article_edit",
        "history": "articles.article_view",
        "analytics": "articles.article_view",
        "analytics_detail": "articles.article_view",
    }

    def get_queryset(self):
        """
        Retorna artigos do tenant atual do usuário autenticado.
        Cross-tenant isolation: um usuário só pode ver artigos da sua própria empresa,
        independente de is_public. Artigos públicos de outros tenants são acessíveis
        apenas pelo PublicArticleViewSet (sem autenticação).
        """
        if self.request.user.is_authenticated:
            user_company = self.request.company
            return (
                Article.objects.filter(company=user_company)
                .select_related("category", "author", "company")
                .prefetch_related("tags")
                .order_by("-created_at")
            )

        # Usuário anônimo: apenas públicos publicados
        return (
            Article.objects.filter(is_public=True, status=Article.STATUS_PUBLISHED, published_at__isnull=False)
            .select_related("category", "author", "company")
            .prefetch_related("tags")
            .order_by("-published_at")
        )

    def retrieve(self, request, *args, **kwargs):
        slug = kwargs.get("slug")
        company_slug = request.company.slug if request.company else "unassigned"
        cache_key = f"art_det:{company_slug}:{slug}"

        cached = cache.get(cache_key)
        if cached:
            ArticleService.record_view(
                request.user, article_id=cached.get("id"), ip_address=request.META.get("REMOTE_ADDR")
            )
            return Response(cached)

        instance = self.get_object()
        ArticleService.record_view(request.user, instance, request.META.get("REMOTE_ADDR"))
        data = self.get_serializer(instance).data
        cache.set(cache_key, data, timeout=60)  # Cache mais curto para editores
        return Response(data)

    def perform_create(self, serializer):
        # Permission already verified by ActionRolePermission before this point.
        from shared_kernel.licensing import check_feature_limit

        can_add, limit, current = check_feature_limit(self.request.company, "max_articles")
        if not can_add:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(f"Limite de artigos atingido ({current}/{limit}). Faça um upgrade do seu plano.")

        article = ArticleService.create_article(
            user=self.request.user,
            company=self.request.company,
            data=serializer.validated_data,
            image=self.request.FILES.get("image"),
        )
        serializer.instance = article
        log_create(self.request.user, "Article", article, request=self.request)

    def perform_update(self, serializer):
        # Permission already verified by ActionRolePermission before this point.
        updated_article = ArticleService.update_article(
            user=self.request.user,
            article=serializer.instance,
            data=serializer.validated_data,
            image=self.request.FILES.get("image"),
        )
        serializer.instance = updated_article
        log_update(self.request.user, "Article", updated_article, request=self.request)

    def perform_destroy(self, instance):
        # Permission already verified by ActionRolePermission before this point.
        ArticleService.delete_article(self.request.user, instance)
        log_delete(self.request.user, "Article", instance, request=self.request)
        instance.delete()

    @action(detail=True, methods=["get"])
    def history(self, request, slug=None):
        """
        Retorna o histórico de versões do artigo.
        """
        import reversion

        article = self.get_object()
        versions = reversion.models.Version.objects.get_for_object(article)

        data = []
        for version in versions:
            data.append(
                {
                    "id": version.id,
                    "created_at": version.revision.date_created,
                    "user": version.revision.user.username if version.revision.user else "System",
                    "comment": version.revision.comment,
                    # We could deserialize the data here if needed, but for now metadata is enough
                }
            )

        return Response(data)

    @action(detail=True, methods=["post"])
    def revert(self, request, slug=None):
        """
        Reverte o artigo para uma versão específica.
        """
        article = self.get_object()
        version_id = request.data.get("version_id")

        if not version_id:
            return Response({"error": "version_id is required"}, status=400)

        try:
            ArticleService.revert_to_version(request.user, article, version_id)
            return Response({"status": "restored"})
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=True, methods=["post"], url_path="submit")
    def submit_for_review(self, request, slug=None):
        article = self.get_object()
        try:
            ArticleService.submit_for_review(request.user, article)
            return Response({"status": "submitted"})
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request, slug=None):
        self.required_permission = "articles.article_publish"
        if not HasRolePermission().has_permission(request, self):
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Sem permissão para publicar artigos.")

        article = self.get_object()
        try:
            ArticleService.publish_article(request.user, article)
            return Response({"status": "published"})
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, slug=None):
        article = self.get_object()
        reason = request.data.get("reason", "")
        try:
            ArticleService.reject_article(request.user, article, reason=reason)
            return Response({"status": "rejected"})
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=False, methods=["get"])
    def analytics(self, request):
        """
        Retorna estatísticas globais de visualizações dos artigos do tenant.
        """
        from django.db.models import Count, Q
        from django.db.models.functions import TruncDate
        from django.utils import timezone

        company = request.company
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)

        # 1. Estatísticas globais
        total_articles = Article.objects.filter(company=company).count()
        total_views = ArticleView.objects.filter(company=company).count()

        # 2. Artigos mais vistos (Top 5)
        most_viewed_qs = (
            Article.objects.filter(company=company)
            .annotate(
                total_views=Count("views"),
                views_last_30_days=Count("views", filter=Q(views__viewed_at__gte=thirty_days_ago)),
                unique_visitors=Count("views__ip_address", distinct=True),
            )
            .order_by("-total_views")[:5]
        )

        # 3. Visualizações por data (Últimos 15 dias)
        fifteen_days_ago = timezone.now().date() - timezone.timedelta(days=15)
        views_by_date_qs = (
            ArticleView.objects.filter(company=company, viewed_at__date__gte=fifteen_days_ago)
            .annotate(date=TruncDate("viewed_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        views_by_date = [{"date": item["date"].isoformat(), "count": item["count"]} for item in views_by_date_qs]

        data = {
            "total_articles": total_articles,
            "total_views": total_views,
            "most_viewed": most_viewed_qs,
            "views_by_date": views_by_date,
        }

        serializer = GlobalArticlesAnalyticsSerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def analytics_detail(self, request, slug=None):
        """
        Retorna estatísticas detalhadas de um artigo específico.
        """
        from django.db.models import Count, Q
        from django.utils import timezone

        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)

        # Use get_object logic but with pre-annotation
        queryset = (
            self.get_queryset()
            .filter(slug=slug)
            .annotate(
                total_views=Count("views"),
                views_last_30_days=Count("views", filter=Q(views__viewed_at__gte=thirty_days_ago)),
                unique_visitors=Count("views__ip_address", distinct=True),
            )
        )
        article = queryset.first()

        if not article:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        # Agregação básica (já calculada pelo serializer se passarmos o objeto)
        serializer = ArticleAnalyticsSerializer(article)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(tags=["Articles"]),
    retrieve=extend_schema(tags=["Articles"]),
    create=extend_schema(tags=["Articles"]),
    update=extend_schema(tags=["Articles"]),
    partial_update=extend_schema(tags=["Articles"]),
    destroy=extend_schema(tags=["Articles"]),
)
class CommentViewSet(viewsets.ModelViewSet):
    """
    Gerencia comentários dos artigos (painel interno).
    Requer permissão articles.article_manage.
    """

    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess, HasRolePermission]
    required_permission = "articles.article_manage"
    module_code = "articles"
    filterset_fields = {"article": ["exact"], "is_approved": ["exact"], "created_at": ["gte", "lte"]}
    ordering_fields = ["created_at"]
    search_fields = ["content", "name", "email", "author__username", "article__title", "article__slug"]

    def get_queryset(self):
        return (
            Comment.objects.filter(company=self.request.company)
            .select_related("article", "author", "company")
            .order_by("-created_at")
        )

    def perform_create(self, serializer):
        serializer.save(company=self.request.company, author=self.request.user)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """
        Aprova um comentário pendente de moderação.
        """
        comment = self.get_object()
        comment.is_approved = True
        comment.save(update_fields=["is_approved"])
        return Response({"status": "approved"})

    @action(detail=True, methods=["post"])
    def disapprove(self, request, pk=None):
        comment = self.get_object()
        comment.is_approved = False
        comment.save(update_fields=["is_approved"])
        return Response({"status": "disapproved"})

    class BulkIdsSerializer(serializers.Serializer):
        ids = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False)

    @action(detail=False, methods=["post"])
    def bulk_approve(self, request):
        ser = self.BulkIdsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ids = ser.validated_data["ids"]
        updated = self.get_queryset().filter(id__in=ids).update(is_approved=True)
        return Response({"updated": updated})

    @action(detail=False, methods=["post"])
    def bulk_disapprove(self, request):
        ser = self.BulkIdsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ids = ser.validated_data["ids"]
        updated = self.get_queryset().filter(id__in=ids).update(is_approved=False)
        return Response({"updated": updated})

    @action(detail=False, methods=["post"])
    def bulk_delete(self, request):
        ser = self.BulkIdsSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        ids = ser.validated_data["ids"]
        deleted, _ = self.get_queryset().filter(id__in=ids).delete()
        return Response({"deleted": deleted})


@extend_schema_view(
    list=extend_schema(tags=["Public Articles"], description="Lista comentários aprovados de um artigo público"),
    create=extend_schema(tags=["Public Articles"], description="Cria comentário público pendente de moderação"),
)
class PublicCommentViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    Endpoint público de comentários com moderação e rate limit básico.
    """

    serializer_class = CommentSerializer
    permission_classes = [permissions.AllowAny]
    filterset_fields = ["article"]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def _notify_moderators(self, comment: Comment, article: Article):
        if not TenantModule.objects.filter(company=article.company, module__code="articles", is_active=True).exists():
            return

        from apps.notifications.models import Notification
        from apps.notifications.tasks import send_websocket_notification

        User = get_user_model()
        perm = "articles.article_manage"
        candidates = (
            User.all_objects.filter(company=article.company, is_active=True)
            .select_related("role")
            .filter(Q(is_superuser=True) | Q(is_staff=True) | Q(role__isnull=False))
        )
        recipients = []
        for u in candidates:
            if u.is_superuser or u.is_staff:
                recipients.append(u)
                continue
            role = getattr(u, "role", None)
            perms = getattr(role, "permissions", None) if role else None
            if isinstance(perms, list) and perm in perms:
                recipients.append(u)
        if getattr(comment, "author_id", None):
            recipients = [u for u in recipients if u.id != comment.author_id]

        link = f"/artigos/comentarios?status=pending&article={article.id}"
        title = "Novo comentário pendente"
        msg_content = (comment.content or "").strip()
        message = (
            f"{article.title}: {msg_content[:120]}" if msg_content else f"Novo comentário pendente em {article.title}."
        )

        for u in recipients:
            notification = Notification.objects.create(
                company=article.company,
                recipient=u,
                notification_type=Notification.TYPE_APPROVAL,
                title=title,
                message=message,
                link=link,
            )
            try:
                send_websocket_notification.delay(
                    f"notifications_user_{u.id}",
                    {
                        "type": "notification_message",
                        "notification_id": str(notification.id),
                        "notification_type": notification.notification_type,
                        "title": notification.title,
                        "message": notification.message,
                        "link": notification.link,
                        "created_at": notification.created_at.isoformat(),
                    },
                )
            except Exception:
                pass

    def get_queryset(self):
        from .models import Article

        qs = (
            Comment.objects.filter(is_approved=True)
            .select_related("article", "author", "company")
            .order_by("-created_at")
        )
        article_slug = self.request.query_params.get("article_slug")
        article_id = self.request.query_params.get("article")
        company = getattr(self.request, "company", None)
        if article_slug:
            article_qs = Article.objects.filter(slug=article_slug, is_public=True, status=Article.STATUS_PUBLISHED)
            if company:
                article_qs = article_qs.filter(company=company)
            article = article_qs.first()
            if article:
                qs = qs.filter(article=article, company=article.company)
            else:
                qs = qs.none()
        elif article_id:
            qs = qs.filter(article_id=article_id)
            if company:
                qs = qs.filter(company=company)
        else:
            qs = qs.none()
        return qs

    def create(self, request, *args, **kwargs):
        """
        Cria comentário público com moderação (is_approved=False) e rate limit por IP.
        Requer article_slug ou article (id) no corpo.
        """
        from .models import Article

        data = request.data.copy()
        article_slug = data.get("article_slug")
        article_id = data.get("article")
        company = getattr(request, "company", None)

        # Rate limit simples: 5 comentários/10min por IP por empresa
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        ip = (
            forwarded_for.split(",")[0].strip()
            if forwarded_for and isinstance(forwarded_for, str)
            else request.META.get("REMOTE_ADDR", "unknown")
        )
        company_key = company.slug if company else "public"
        key = f"rate:pub_comment:{company_key}:{ip}"
        count = cache.get(key, 0)
        if count >= 5:
            return Response(
                {"detail": "Limite de envio de comentários atingido. Tente mais tarde."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        cache.set(key, count + 1, timeout=600)

        # Resolver artigo
        article = None
        if article_slug:
            article_qs = Article.objects.filter(slug=article_slug, is_public=True, status=Article.STATUS_PUBLISHED)
            if company:
                article_qs = article_qs.filter(company=company)
            article = article_qs.first()
        elif article_id:
            article_qs = Article.objects.filter(pk=article_id, is_public=True, status=Article.STATUS_PUBLISHED)
            if company:
                article_qs = article_qs.filter(company=company)
            article = article_qs.first()

        if not article:
            return Response({"detail": "Artigo não encontrado ou não público."}, status=status.HTTP_404_NOT_FOUND)

        # Criar comentário pendente de moderação
        serializer = self.get_serializer(
            data={
                "article": article.id,
                "name": data.get("name", ""),
                "email": data.get("email", ""),
                "content": data.get("content", ""),
            }
        )
        serializer.is_valid(raise_exception=True)
        obj = serializer.save(company=article.company, author=None, is_approved=False)
        self._notify_moderators(obj, article)
        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(obj).data, status=status.HTTP_201_CREATED, headers=headers)
