from rest_framework import viewsets, permissions
from .models import Article, Category
from .serializers import ArticleSerializer, CategorySerializer
from apps.module_manager.permissions import HasModuleAccess

class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, HasModuleAccess]
    module_code = 'articles'
    lookup_field = 'slug'

    def get_queryset(self):
        return Category.objects.all().order_by('name')

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)

class ArticleViewSet(viewsets.ModelViewSet):
    """
    Gerencia artigos do CMS.
    """
    serializer_class = ArticleSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = 'articles'

    def get_queryset(self):
        return Article.objects.filter(company=self.request.company).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(company=self.request.company, author=self.request.user)
