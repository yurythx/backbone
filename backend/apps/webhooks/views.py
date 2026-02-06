from rest_framework import viewsets, permissions
from shared_kernel.audit import log_create, log_update, log_delete
from .models import WebhookSubscription
from .serializers import WebhookSubscriptionSerializer
from apps.accounts.permissions import HasRolePermission

class WebhookSubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = WebhookSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated, HasRolePermission]
    required_permission = 'settings.webhooks_manage'
    
    def get_queryset(self):
        return WebhookSubscription.objects.filter(company=self.request.company)

    def perform_create(self, serializer):
        obj = serializer.save(company=self.request.company)
        log_create(self.request.user, "WebhookSubscription", obj, request=self.request)

    def perform_update(self, serializer):
        obj = serializer.save()
        log_update(self.request.user, "WebhookSubscription", obj, request=self.request)

    def perform_destroy(self, instance):
        log_delete(self.request.user, "WebhookSubscription", instance, request=self.request)
        instance.delete()
