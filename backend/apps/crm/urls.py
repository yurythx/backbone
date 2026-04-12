from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ColumnViewSet,
    ContactViewSet,
    CRMGroupViewSet,
    CRMIntegrationInboundEventReplayAPIView,
    CRMIntegrationInboundEventsAPIView,
    CRMIntegrationOptionsAPIView,
    CRMSavedViewViewSet,
    DealViewSet,
    PipelineViewSet,
)

router = DefaultRouter()
router.register(r"contacts", ContactViewSet, basename="crm-contact")
router.register(r"saved-views", CRMSavedViewViewSet, basename="crm-saved-view")
router.register(r"groups", CRMGroupViewSet, basename="crm-group")
router.register(r"pipelines", PipelineViewSet, basename="crm-pipeline")
router.register(r"columns", ColumnViewSet, basename="crm-column")
router.register(r"deals", DealViewSet, basename="crm-deal")

urlpatterns = [
    path("integration/options/", CRMIntegrationOptionsAPIView.as_view(), name="crm-integration-options"),
    path("integration/inbound-events/", CRMIntegrationInboundEventsAPIView.as_view(), name="crm-integration-inbound-events"),
    path("integration/inbound-events/<int:event_id>/replay/", CRMIntegrationInboundEventReplayAPIView.as_view(), name="crm-integration-inbound-event-replay"),
    path("", include(router.urls)),
]
