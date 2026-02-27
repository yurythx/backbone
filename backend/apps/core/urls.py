from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, AuditLogViewSet, DashboardStatsView, SitemapView, RobotsView, LDAPConfigViewSet
from .branding_views import TenantBrandingViewSet
from .search_views import GlobalSearchViewSet

from .health_view import health_check

router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'branding', TenantBrandingViewSet)
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')
router.register(r'ldap-config', LDAPConfigViewSet, basename='ldap-config')
router.register(r'search', GlobalSearchViewSet, basename='global-search')


urlpatterns = [
    path('health/', health_check, name='health-check'),
    path('ldap-health/', lambda request: __import__('apps.core.ldap_health', fromlist=['LDAPHealthCheck']).LDAPHealthCheck.as_view()(request), name='ldap-health'),
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('sitemap/', SitemapView.as_view(), name='sitemap'),
    path('robots.txt', RobotsView.as_view(), name='robots-txt'),
    path('', include(router.urls)),
]
