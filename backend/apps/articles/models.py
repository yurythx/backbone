from django.db import models
from django.conf import settings
import reversion
from shared_kernel.models import BaseTenantModel
from shared_kernel.utils import tenant_upload_to
from shared_kernel.validators import validate_image

@reversion.register()
class Category(BaseTenantModel):
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100)

    class Meta:
        unique_together = ('company', 'slug')
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.name

@reversion.register()
class Tag(BaseTenantModel):
    name = models.CharField(max_length=50)
    slug = models.SlugField(max_length=50)
    
    # SEO fields
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.TextField(blank=True)

    class Meta:
        unique_together = ('company', 'slug')

    def __str__(self):
        return self.name

@reversion.register()
class Article(BaseTenantModel):
    STATUS_DRAFT = 'draft'
    STATUS_PENDING = 'pending'
    STATUS_PUBLISHED = 'published'
    STATUS_REJECTED = 'rejected'
    
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Rascunho'),
        (STATUS_PENDING, 'Aguardando Aprovação'),
        (STATUS_PUBLISHED, 'Publicado'),
        (STATUS_REJECTED, 'Rejeitado'),
    ]

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200)
    content = models.TextField()
    excerpt = models.TextField(blank=True, help_text="Resumo do artigo")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    tags = models.ManyToManyField(Tag, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    # Deprecating is_published in favor of status, but keeping for compatibility for now
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    image = models.ImageField(
        upload_to=tenant_upload_to('articles'),
        null=True,
        blank=True,
        validators=[validate_image],
        help_text="Imagem de destaque (max 10MB, formatos: JPEG, PNG, GIF, WebP)"
    )
    
    # SEO fields
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.TextField(blank=True)
    meta_keywords = models.CharField(max_length=500, blank=True)

    class Meta:
        unique_together = ('company', 'slug')

    def __str__(self):
        return self.title

class ArticleView(BaseTenantModel):
    article = models.ForeignKey(Article, related_name='views', on_delete=models.CASCADE)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['article', 'viewed_at']),
            models.Index(fields=['company', 'viewed_at']),
        ]

@reversion.register()
class Comment(BaseTenantModel):
    article = models.ForeignKey(Article, related_name='comments', on_delete=models.CASCADE)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    name = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    content = models.TextField()
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Comment by {self.author or self.name} on {self.article}"
