from django.db import models
from shared_kernel.models import BaseTenantModel

class Page(BaseTenantModel):
    """
    Páginas estáticas do site (ex: Home, Sobre, Contato).
    """
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200)
    content = models.TextField(blank=True) # Pode ser HTML ou Markdown
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # SEO fields
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=500, blank=True)

    class Meta:
        unique_together = ('company', 'slug')

    def __str__(self):
        return f"{self.company.name} - {self.title}"
