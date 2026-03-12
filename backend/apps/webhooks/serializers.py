from rest_framework import serializers

from .models import WebhookEvent, WebhookSubscription


class WebhookSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookSubscription
        fields = ["id", "url", "secret", "is_active", "events", "description", "created_at"]
        read_only_fields = ["id", "secret", "created_at"]

    def validate_events(self, value):
        valid_events = WebhookEvent.values
        for event in value:
            if event not in valid_events:
                raise serializers.ValidationError(f"Evento inválido: {event}")
        return value
