from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Article, Category, Tag, Comment
from .serializers import ArticleSerializer, CategorySerializer, TagSerializer, CommentSerializer
from .filters import ArticleFilter
from .services import ArticleService
from apps.module_manager.permissions import HasModuleAccess
from apps.accounts.permissions import HasRolePermission
from shared_kernel.audit import log_create, log_update, log_delete

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

class ArticleViewSet(viewsets.ModelViewSet):
    """
    Gerencia artigos do CMS.
    """
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
        Permite leitura e escrita para usuários autenticados com acesso ao módulo.
        (Pode ser refinado para exigir Role em operações específicas se necessário.)
        """
        return [permissions.IsAuthenticated(), HasModuleAccess()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        ArticleService.record_view(request.user, instance, request.META.get('REMOTE_ADDR'))
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        # Extract data from serializer, but we let the service handle the object creation
        # to centralize logic like slug generation or complex side effects.
        # However, DRF's serializer.save() is already quite good.
        # To truly use the service, we can do:
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
