from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WebhookSubscriptionViewSet

router = DefaultRouter()
router.register(r'subscriptions', WebhookSubscriptionViewSet, basename='webhook-subscription')

urlpatterns = [
    path('', include(router.urls)),
]
