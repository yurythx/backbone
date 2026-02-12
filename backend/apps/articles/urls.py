from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ArticleViewSet, CategoryViewSet, TagViewSet, CommentViewSet, PublicArticleViewSet

# Router principal (autenticado)
router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='categories')
router.register(r'tags', TagViewSet, basename='tags')
router.register(r'articles', ArticleViewSet, basename='articles')
router.register(r'comments', CommentViewSet, basename='comments')

# Router público (sem autenticação)
public_router = DefaultRouter()
public_router.register(r'public/articles', PublicArticleViewSet, basename='public-articles')

urlpatterns = [
    path('', include(router.urls)),
    path('', include(public_router.urls)),
]

