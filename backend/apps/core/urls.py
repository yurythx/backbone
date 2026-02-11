from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, AuditLogViewSet, DashboardStatsView, SitemapView, RobotsView
from .branding_views import TenantBrandingViewSet
from .health_view import health_check

router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'branding', TenantBrandingViewSet)
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')

urlpatterns = [
    path('health/', health_check, name='health-check'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('sitemap/', SitemapView.as_view(), name='sitemap'),
    path('robots.txt', RobotsView.as_view(), name='robots-txt'),
    path('', include(router.urls)),
]
