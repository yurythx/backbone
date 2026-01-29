from django.db import models
from django.conf import settings
from shared_kernel.models import BaseTenantModel
from shared_kernel.utils import tenant_upload_to

class Category(BaseTenantModel):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100)

    class Meta:
        unique_together = ('company', 'slug')
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

class Article(BaseTenantModel):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200)
    content = models.TextField()
    excerpt = models.TextField(blank=True, help_text="Resumo do artigo")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    image = models.ImageField(upload_to=tenant_upload_to('articles'), null=True, blank=True)

    class Meta:
        unique_together = ('company', 'slug')

    def __str__(self):
        return self.title
