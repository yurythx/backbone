from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompanyViewSet
from .branding_views import TenantBrandingViewSet

router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'branding', TenantBrandingViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
