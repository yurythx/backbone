from rest_framework import viewsets, permissions, status, filters, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from apps.module_manager.permissions import HasModuleAccess
from apps.accounts.permissions import HasRolePermission
from shared_kernel.audit import log_create, log_update, log_delete
from .models import Article, Category, Tag, Comment, ArticleView
from .serializers import (
    ArticleSerializer, CategorySerializer, TagSerializer, 
    CommentSerializer, ArticleHistorySerializer, ArticleAnalyticsSerializer,
    GlobalArticlesAnalyticsSerializer
)
from .services import ArticleService
from .filters import ArticleFilter

@extend_schema_view(
    list=extend_schema(tags=['Articles']),
    retrieve=extend_schema(tags=['Articles']),
    create=extend_schema(tags=['Articles']),
    update=extend_schema(tags=['Articles']),
    partial_update=extend_schema(tags=['Articles']),
    destroy=extend_schema(tags=['Articles']),
)
class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, HasModuleAccess, HasRolePermission]
    required_permission = 'articles.category_manage'
    module_code = 'articles'
    lookup_field = 'slug'
    

    def get_queryset(self):
        return Category.objects.all().order_by('name')

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
        base = [permissions.IsAuthenticatedOrReadOnly(), HasModuleAccess()]
        if self.request.method in permissions.SAFE_METHODS:
            return base
        return base + [HasRolePermission()]

@extend_schema_view(
    list=extend_schema(tags=['Articles']),
    retrieve=extend_schema(tags=['Articles']),
    create=extend_schema(tags=['Articles']),
    update=extend_schema(tags=['Articles']),
    partial_update=extend_schema(tags=['Articles']),
    destroy=extend_schema(tags=['Articles']),
)
class TagViewSet(viewsets.ModelViewSet):
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, HasModuleAccess, HasRolePermission]
    required_permission = 'articles.article_manage'
    module_code = 'articles'
    lookup_field = 'slug'
    

    def get_queryset(self):
        return Tag.objects.all().order_by('name')

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
        base = [permissions.IsAuthenticatedOrReadOnly(), HasModuleAccess()]
        if self.request.method in permissions.SAFE_METHODS:
            return base
        return base + [HasRolePermission()]

@extend_schema_view(
    list=extend_schema(tags=['Articles']),
    retrieve=extend_schema(tags=['Articles']),
    create=extend_schema(tags=['Articles']),
    update=extend_schema(tags=['Articles']),
    partial_update=extend_schema(tags=['Articles']),
    destroy=extend_schema(tags=['Articles']),
    history=extend_schema(tags=['Articles'], responses={200: serializers.ListSerializer(child=serializers.DictField())}),
    revert=extend_schema(tags=['Articles'], responses={200: serializers.DictField()}),
    submit_for_review=extend_schema(tags=['Articles'], responses={200: serializers.DictField()}),
    publish=extend_schema(tags=['Articles'], responses={200: serializers.DictField()}),
    reject=extend_schema(tags=['Articles'], responses={200: serializers.DictField()}),
)
class ArticleViewSet(viewsets.ModelViewSet):
    serializer_class = ArticleSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess, HasRolePermission]
    required_permission = 'articles.article_manage'
    module_code = 'articles'
    filterset_class = ArticleFilter
    search_fields = ['title', 'content', 'excerpt']
    ordering_fields = ['created_at', 'updated_at', 'title']

    def get_queryset(self):
        return Article.objects.filter(
            company=self.request.company
        ).select_related('category', 'author').prefetch_related('tags').order_by('-created_at')

    def get_permissions(self):
        """
        Permite leitura para todos, mas exige Role específica para escrita e ações admin.
        """
        base = [permissions.IsAuthenticated(), HasModuleAccess()]
        if self.request.method in permissions.SAFE_METHODS:
            return base
        return base + [HasRolePermission()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        ArticleService.record_view(request.user, instance, request.META.get('REMOTE_ADDR'))
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        from shared_kernel.licensing import check_feature_limit
        can_add, limit, current = check_feature_limit(self.request.company, 'max_articles')
        if not can_add:
            from rest_framework.exceptions import ValidationError
            raise ValidationError(f"Limite de artigos atingido ({current}/{limit}). Faça um upgrade do seu plano.")

        article = ArticleService.create_article(
            user=self.request.user,
            company=self.request.company,
            data=serializer.validated_data,
            image=self.request.FILES.get('image')
        )
        serializer.instance = article

    def perform_update(self, serializer):
        ArticleService.update_article(
            user=self.request.user,
            article=self.get_object(),
            data=serializer.validated_data,
            image=self.request.FILES.get('image')
        )

    def perform_destroy(self, instance):
        ArticleService.delete_article(self.request.user, instance)
        instance.delete()

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Retorna o histórico de versões do artigo.
        """
        import reversion
        article = self.get_object()
        versions = reversion.models.Version.objects.get_for_object(article)
        
        data = []
        for version in versions:
            data.append({
                'id': version.id,
                'created_at': version.revision.date_created,
                'user': version.revision.user.username if version.revision.user else 'System',
                'comment': version.revision.comment,
                # We could deserialize the data here if needed, but for now metadata is enough
            })
            
        return Response(data)

    @action(detail=True, methods=['post'])
    def revert(self, request, pk=None):
        """
        Reverte o artigo para uma versão específica.
        """
        article = self.get_object()
        version_id = request.data.get('version_id')
        
        if not version_id:
            return Response({"error": "version_id is required"}, status=400)
            
        try:
            ArticleService.revert_to_version(request.user, article, version_id)
            return Response({'status': 'restored'})
        except ValueError as e:
            return Response({"error": str(e)}, status=400)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit_for_review(self, request, pk=None):
        article = self.get_object()
        try:
            ArticleService.submit_for_review(request.user, article)
            return Response({'status': 'submitted'})
        except ValueError as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=True, methods=['post'], url_path='publish')
    def publish(self, request, pk=None):
        article = self.get_object()
        try:
            ArticleService.publish_article(request.user, article)
            return Response({'status': 'published'})
        except ValueError as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        article = self.get_object()
        try:
            ArticleService.reject_article(request.user, article)
            return Response({'status': 'rejected'})
        except ValueError as e:
            return Response({'error': str(e)}, status=400)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """
        Retorna estatísticas globais de visualizações dos artigos do tenant.
        """
        from django.db.models import Count, Q
        from django.db.models.functions import TruncDate
        from django.utils import timezone
        from .models import ArticleView
        from .serializers import GlobalArticlesAnalyticsSerializer
        
        company = request.company
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        
        # 1. Estatísticas globais
        total_articles = Article.objects.filter(company=company).count()
        total_views = ArticleView.objects.filter(company=company).count()
        
        # 2. Artigos mais vistos (Top 5)
        most_viewed_qs = Article.objects.filter(company=company).annotate(
            total_views=Count('views'),
            views_last_30_days=Count('views', filter=Q(views__viewed_at__gte=thirty_days_ago))
        ).order_by('-total_views')[:5]
        
        # 3. Visualizações por data (Últimos 15 dias)
        fifteen_days_ago = timezone.now().date() - timezone.timedelta(days=15)
        views_by_date_qs = ArticleView.objects.filter(
            company=company,
            viewed_at__date__gte=fifteen_days_ago
        ).annotate(
            date=TruncDate('viewed_at')
        ).values('date').annotate(
            count=Count('id')
        ).order_by('date')
        
        views_by_date = [
            {'date': item['date'].isoformat(), 'count': item['count']}
            for item in views_by_date_qs
        ]

        data = {
            'total_articles': total_articles,
            'total_views': total_views,
            'most_viewed': most_viewed_qs,
            'views_by_date': views_by_date
        }
        
        serializer = GlobalArticlesAnalyticsSerializer(data)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def analytics_detail(self, request, pk=None):
        """
        Retorna estatísticas detalhadas de um artigo específico.
        """
        from django.db.models import Count, Q
        from django.utils import timezone
        
        thirty_days_ago = timezone.now() - timezone.timedelta(days=30)
        article = Article.objects.filter(pk=pk).annotate(
            total_views=Count('views'),
            views_last_30_days=Count('views', filter=Q(views__viewed_at__gte=thirty_days_ago)),
            unique_visitors=Count('views__ip_address', distinct=True)
        ).first()
        
        if not article:
             return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
             
        from .serializers import ArticleAnalyticsSerializer
        
        # Agregação básica (já calculada pelo serializer se passarmos o objeto)
        serializer = ArticleAnalyticsSerializer(article)
        return Response(serializer.data)

@extend_schema_view(
    list=extend_schema(tags=['Articles']),
    retrieve=extend_schema(tags=['Articles']),
    create=extend_schema(tags=['Articles']),
    update=extend_schema(tags=['Articles']),
    partial_update=extend_schema(tags=['Articles']),
    destroy=extend_schema(tags=['Articles']),
)
class CommentViewSet(viewsets.ModelViewSet):
    """
    Gerencia comentários dos artigos.
    """
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess, HasRolePermission]
    required_permission = 'articles.article_manage'
    module_code = 'articles'
    filterset_fields = ['article', 'is_approved']
    ordering_fields = ['created_at']

    def get_queryset(self):
        return Comment.objects.filter(company=self.request.company).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(company=self.request.company, author=self.request.user)
