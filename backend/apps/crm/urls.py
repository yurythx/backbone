from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ContactViewSet, DealViewSet, PipelineViewSet, StageViewSet

router = DefaultRouter()
router.register(r"contacts", ContactViewSet)
router.register(r"pipelines", PipelineViewSet)
router.register(r"stages", StageViewSet)
router.register(r"deals", DealViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
