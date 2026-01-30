from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from apps.core.models import AuditLog
from .tasks import send_welcome_email

User = get_user_model()

@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    if created:
        # 1. Audit Log
        # Note: We don't have request.user here easily for 'user' field in AuditLog unless we use thread locals.
        # For now, we leave user=None or system.
        AuditLog.objects.create(
            company=instance.company,
            action='create',
            resource='User',
            resource_id=str(instance.id),
            details={'username': instance.username, 'email': instance.email}
        )
        
        # 2. Async Task: Welcome Email
        # Use on_commit to ensure DB transaction is finished before Celery worker tries to read the user
        from django.db import transaction
        transaction.on_commit(lambda: send_welcome_email.delay(instance.id, instance.username, instance.email))
