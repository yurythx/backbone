from django.contrib import admin
from .models import Page

@admin.register(Page)
class PageAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'company', 'is_published', 'created_at')
    list_filter = ('company', 'is_published')
    search_fields = ('title', 'slug', 'company__name')
    # prepopulated_fields cannot be used easily with tenant logic in admin sometimes, 
    # but let's try standard behavior or leave it out if slug is auto-generated
    prepopulated_fields = {'slug': ('title',)}
