from django.contrib import admin
from .models import Category, Article

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'company')
    list_filter = ('company',)
    search_fields = ('name', 'company__name')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'company', 'author', 'is_published', 'published_at')
    list_filter = ('company', 'is_published')
    search_fields = ('title', 'company__name')
    prepopulated_fields = {'slug': ('title',)}
