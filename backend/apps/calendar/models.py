from django.db import models
from django.conf import settings
from shared_kernel.models import BaseTenantModel
import uuid

class Event(BaseTenantModel):
    """
    Representa um evento no calendário.
    Suporta recorrência via RFC 5545 (campo rrule).
    """
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='events')
    
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField()
    is_all_day = models.BooleanField(default=False)
    
    # Recorrência (RFC 5545 string, e.g., "FREQ=WEEKLY;COUNT=10")
    rrule = models.TextField(blank=True, null=True, help_text="Regra de recorrência no formato RFC 5545")
    
    # Categoria de cor (pode ser evoluído para uma FK de CalendarCategory depois)
    color_category = models.CharField(max_length=50, default='blue', help_text="Cor do evento no calendário")
    
    # Location / Meeting Link
    location = models.CharField(max_length=255, blank=True, null=True)
    meeting_url = models.URLField(blank=True, null=True)

    class Meta:
        verbose_name = "Event"
        verbose_name_plural = "Events"
        indexes = [
            models.Index(fields=['company', 'start_datetime', 'end_datetime']),
            models.Index(fields=['uuid']),
        ]

    def __str__(self):
        return f"{self.title} ({self.start_datetime})"
