from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FeatureViewSet, PlanViewSet, LicenseViewSet

router = DefaultRouter()
router.register(r'features', FeatureViewSet)
router.register(r'plans', PlanViewSet)
router.register(r'my-license', LicenseViewSet, basename='my-license')

urlpatterns = [
    path('', include(router.urls)),
]
