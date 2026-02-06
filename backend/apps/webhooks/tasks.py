import hmac
import hashlib
import json
import requests
import time
import logging
from celery import shared_task
from django.conf import settings
from .models import WebhookSubscription

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def dispatch_webhook(self, subscription_id, event_name, payload):
    try:
        sub = WebhookSubscription.objects.get(pk=subscription_id, is_active=True)
    except WebhookSubscription.DoesNotExist:
        return f"Subscription {subscription_id} not found or inactive"

    try:
        body = json.dumps({
            "event": event_name,
            "timestamp": time.time(),
            "payload": payload
        })
        
        # Gerar assinatura HMAC-SHA256
        signature = hmac.new(
            sub.secret.encode('utf-8'),
            msg=body.encode('utf-8'),
            digestmod=hashlib.sha256
        ).hexdigest()

        headers = {
            "Content-Type": "application/json",
            "X-Backbone-Signature": signature,
            "X-Backbone-Event": event_name,
            "User-Agent": "Backbone-Webhooks/1.0"
        }

        response = requests.post(
            sub.url,
            data=body,
            headers=headers,
            timeout=10
        )
        
        response.raise_for_status()
        return f"Webhook sent to {sub.url} for event {event_name}"

    except requests.exceptions.RequestException as e:
        logger.error(f"Error sending webhook to {sub.url}: {e}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=2 ** self.request.retries * 60)

def trigger_webhooks(company, event_name, payload):
    """
    Função utilitária para ser chamada em signals ou views.
    Encontra assinaturas ativas para o evento e empresa e dispara o Celery.
    """
    subscriptions = WebhookSubscription.objects.filter(
        company=company,
        is_active=True,
        events__contains=event_name # O Django orm lida bem com JSONField __contains para listas
    )
    
    for sub in subscriptions:
        dispatch_webhook.delay(sub.id, event_name, payload)
