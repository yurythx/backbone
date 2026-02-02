from django_filters import rest_framework as filters
from .models import Article

class ArticleFilter(filters.FilterSet):
    title = filters.CharFilter(lookup_expr='icontains')
    content = filters.CharFilter(lookup_expr='icontains')
    category = filters.NumberFilter(field_name='category__id')
    author = filters.NumberFilter(field_name='author__id')
    is_published = filters.BooleanFilter()
    created_at_after = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_before = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = Article
        fields = ['category', 'author', 'is_published', 'title', 'content']
