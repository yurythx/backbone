from django.urls import path
from .views import robots_txt, dynamic_sitemap

urlpatterns = [
    path('robots.txt', robots_txt, name='robots_txt'),
    path('sitemap.xml', dynamic_sitemap, name='sitemap_xml'),
]
