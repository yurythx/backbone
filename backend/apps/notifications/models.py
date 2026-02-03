from django.db import models
from django.conf import settings
from shared_kernel.models import BaseTenantModel

class Notification(BaseTenantModel):
    TYPE_MESSAGE = 'message'
    TYPE_SYSTEM = 'system'
    TYPE_APPROVAL = 'approval'
    
    TYPE_CHOICES = [
        (TYPE_MESSAGE, 'Mensagem'),
        (TYPE_SYSTEM, 'Sistema'),
        (TYPE_APPROVAL, 'Aprovação'),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_SYSTEM)
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
        ]

    def __str__(self):
        return f"{self.notification_type}: {self.title} to {self.recipient.username}"
