from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet, AuditLogViewSet, DashboardStatsView
from .branding_views import TenantBrandingViewSet

router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'branding', TenantBrandingViewSet)
router.register(r'audit-logs', AuditLogViewSet, basename='audit-logs')

urlpatterns = [
    path('dashboard/stats/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('', include(router.urls)),
]
