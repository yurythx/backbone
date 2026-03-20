from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ContactViewSet, PipelineViewSet, StageViewSet, DealViewSet

router = DefaultRouter()
router.register(r"contacts", ContactViewSet)
router.register(r"pipelines", PipelineViewSet)
router.register(r"stages", StageViewSet)
router.register(r"deals", DealViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
