import json
import logging
from celery import shared_task
from django.conf import settings
from pywebpush import webpush, WebPushException
from .models import PushSubscription

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def send_push_notification(self, subscription_id, title, message, link=None, icon=None):
    try:
        sub = PushSubscription.objects.get(pk=subscription_id, is_active=True)
    except PushSubscription.DoesNotExist:
        return f"Subscription {subscription_id} not found or inactive"

    subscription_info = {
        "endpoint": sub.endpoint,
        "keys": {
            "p256dh": sub.p256dh,
            "auth": sub.auth
        }
    }

    data = {
        "title": title,
        "body": message,
        "data": {
            "url": link or "/"
        }
    }
    if icon:
        data["icon"] = icon

    try:
        response = webpush(
            subscription_info=subscription_info,
            data=json.dumps(data),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": f"mailto:{settings.VAPID_ADMIN_EMAIL}"
            }
        )
        return f"Push sent to {sub.user.username}"
    except WebPushException as e:
        logger.error(f"Push failed for {sub.user.username}: {e}")
        # If 410 Gone, the subscription is no longer valid
        if e.response is not None and e.response.status_code == 410:
            sub.is_active = False
            sub.save(update_fields=['is_active'])
            return f"Subscription for {sub.user.username} marked as inactive (410 Gone)"
        
        # Retry for other issues
        raise self.retry(exc=e, countdown=60)

def notify_user_push(user, title, message, link=None):
    """
    Utility to send push to all active subscriptions of a user.
    """
    subs = PushSubscription.objects.filter(user=user, is_active=True)
    for sub in subs:
        send_push_notification.delay(sub.id, title, message, link)
