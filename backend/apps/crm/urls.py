from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CRMSavedViewViewSet, ColumnViewSet, ContactViewSet, DealViewSet, PipelineViewSet

router = DefaultRouter()
router.register(r"contacts", ContactViewSet, basename="crm-contact")
router.register(r"saved-views", CRMSavedViewViewSet, basename="crm-saved-view")
router.register(r"pipelines", PipelineViewSet, basename="crm-pipeline")
router.register(r"columns", ColumnViewSet, basename="crm-column")
router.register(r"deals", DealViewSet, basename="crm-deal")

urlpatterns = [
    path("", include(router.urls)),
]
