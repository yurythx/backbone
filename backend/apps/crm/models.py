import uuid
from django.db import models
from django.conf import settings
from shared_kernel.models import BaseTenantModel

class Contact(BaseTenantModel):
    """Representa um cliente ou usuário final."""
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    company_name = models.CharField(max_length=255, blank=True, null=True)
    
    class Meta:
        verbose_name = "Contact"
        verbose_name_plural = "Contacts"
        
    def __str__(self):
        return self.name

class Pipeline(BaseTenantModel):
    """Fluxo de trabalho (ex: Suporte TI, Comercial, Projetos)."""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = "Pipeline"
        verbose_name_plural = "Pipelines"
        
    def __str__(self):
        return self.name

class Stage(BaseTenantModel):
    """Etapas/Colunas do Kanban vinculadas a um Pipeline."""
    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, related_name="stages")
    name = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        verbose_name = "Stage"
        verbose_name_plural = "Stages"
        ordering = ["order"]
        
    def __str__(self):
        return f"{self.pipeline.name} - {self.name}"

class Deal(BaseTenantModel):
    """O Card/Item do Kanban (pode ser um Chamado de TI ou Oportunidade)."""
    PRIORITY_CHOICES = [
        ("LOW", "Baixa"),
        ("MEDIUM", "Média"),
        ("HIGH", "Alta"),
        ("URGENT", "Crítica / Urgente"),
    ]
    
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="deals")
    stage = models.ForeignKey(Stage, on_delete=models.PROTECT, related_name="deals")
    
    value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    closing_date = models.DateTimeField(blank=True, null=True, help_text="Data de entrega / Prazo SLA")
    
    priority = models.CharField(max_length=15, choices=PRIORITY_CHOICES, default="MEDIUM")
    
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="deals")
    
    is_closed = models.BooleanField(default=False)
    
    # Campo para rastrear o ID do evento no calendário vinculado (loose coupling)
    linked_event_id = models.IntegerField(blank=True, null=True)

    class Meta:
        verbose_name = "Deal"
        verbose_name_plural = "Deals"
        indexes = [
            models.Index(fields=["company", "stage"]),
            models.Index(fields=["closing_date"]),
        ]
        
    def __str__(self):
        return self.title
