import uuid
import unicodedata
from django.conf import settings
from django.db import models
from django.contrib.postgres.indexes import GinIndex

from shared_kernel.models import BaseTenantModel


def normalize_column_semantic_text(value):
    if not value:
        return ""

    normalized = unicodedata.normalize("NFKD", value)
    without_accents = "".join(char for char in normalized if not unicodedata.combining(char))
    return " ".join(without_accents.lower().strip().split())


def get_column_semantic_defaults(title=None, column_kind=None):
    semantic_by_kind = {
        "backlog": {
            "column_kind": "backlog",
            "marks_done": False,
            "requires_schedule": False,
            "requires_assignee": False,
        },
        "planned": {
            "column_kind": "planned",
            "marks_done": False,
            "requires_schedule": True,
            "requires_assignee": True,
        },
        "active": {
            "column_kind": "active",
            "marks_done": False,
            "requires_schedule": False,
            "requires_assignee": False,
        },
        "done": {
            "column_kind": "done",
            "marks_done": True,
            "requires_schedule": False,
            "requires_assignee": False,
        },
        "custom": {
            "column_kind": "custom",
            "marks_done": False,
            "requires_schedule": False,
            "requires_assignee": False,
        },
    }

    if column_kind in semantic_by_kind:
        return semantic_by_kind[column_kind].copy()

    normalized_title = normalize_column_semantic_text(title)

    if normalized_title in {"novo", "new", "backlog"}:
        inferred_kind = "backlog"
    elif "planejad" in normalized_title or "agendad" in normalized_title:
        inferred_kind = "planned"
    elif any(token in normalized_title for token in ["andamento", "execucao", "progresso", "in progress", "doing"]):
        inferred_kind = "active"
    elif any(token in normalized_title for token in ["concluid", "finaliz", "encerr", "done", "closed"]):
        inferred_kind = "done"
    else:
        inferred_kind = "custom"

    return semantic_by_kind[inferred_kind].copy()


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
        indexes = [
            GinIndex(name="crm_contact_name_gin", fields=["name"], opclasses=["gin_trgm_ops"]),
            GinIndex(name="crm_contact_email_gin", fields=["email"], opclasses=["gin_trgm_ops"]),
        ]

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


class Column(BaseTenantModel):
    """Colunas dinâmicas do pipeline usadas pelo board e integrações."""

    COLUMN_KIND_CHOICES = [
        ("backlog", "Backlog"),
        ("planned", "Planejada"),
        ("active", "Em andamento"),
        ("done", "Concluída"),
        ("custom", "Customizada"),
    ]

    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, related_name="columns")
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=0)
    color = models.CharField(max_length=7, default="#CBD5E1")
    column_kind = models.CharField(max_length=20, choices=COLUMN_KIND_CHOICES, default="custom")
    marks_done = models.BooleanField(default=False)
    requires_schedule = models.BooleanField(default=False)
    requires_assignee = models.BooleanField(default=False)
    allowed_source_columns = models.JSONField(default=list, blank=True)
    wip_limit = models.PositiveIntegerField(blank=True, null=True)
    legacy_stage = models.OneToOneField(Stage, on_delete=models.SET_NULL, related_name="column", blank=True, null=True)

    class Meta:
        verbose_name = "Column"
        verbose_name_plural = "Columns"
        ordering = ["order", "id"]
        indexes = [
            models.Index(fields=["company", "pipeline", "order"]),
        ]

    def __str__(self):
        return f"{self.pipeline.name} - {self.title}"

    def is_done(self):
        return self.marks_done

    def allows_transition_from(self, source_column_id):
        if not self.allowed_source_columns:
            return True
        if source_column_id is None:
            return False
        return source_column_id in self.allowed_source_columns


class CRMSavedView(BaseTenantModel):
    """Views salvas por usuário para cada pipeline do CRM."""

    VIEW_MODE_CHOICES = [
        ("kanban", "Kanban"),
        ("list", "Tabela"),
        ("overview", "Visão Geral"),
    ]

    pipeline = models.ForeignKey("Pipeline", on_delete=models.CASCADE, related_name="saved_views")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="crm_saved_views")
    name = models.CharField(max_length=120)
    view_mode = models.CharField(max_length=20, choices=VIEW_MODE_CHOICES, default="kanban")
    filters = models.JSONField(default=dict, blank=True)
    sorting = models.JSONField(default=list, blank=True)
    column_visibility = models.JSONField(default=dict, blank=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        verbose_name = "CRM Saved View"
        verbose_name_plural = "CRM Saved Views"
        ordering = ["-is_default", "name", "id"]
        unique_together = [("company", "owner", "pipeline", "name")]
        indexes = [
            models.Index(fields=["company", "owner", "pipeline"], name="crm_crmsave_company_6f80c5_idx"),
            models.Index(fields=["company", "owner", "is_default"], name="crm_crmsave_company_1a23fd_idx"),
        ]

    def __str__(self):
        return f"{self.owner} - {self.pipeline.name} - {self.name}"


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
    column = models.ForeignKey("Column", on_delete=models.PROTECT, related_name="cards", blank=True, null=True)

    value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    closing_date = models.DateTimeField(blank=True, null=True, help_text="Data de entrega / Prazo SLA")
    data_agendamento = models.DateTimeField(blank=True, null=True)

    priority = models.CharField(max_length=15, choices=PRIORITY_CHOICES, default="MEDIUM")
    integration_source = models.CharField(max_length=50, default="manual")
    external_id = models.CharField(max_length=255, blank=True, null=True)

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="deals")
    tecnico_responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="scheduled_deals",
        blank=True,
        null=True,
    )

    is_closed = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    # Campo para rastrear o ID do evento no calendário vinculado (loose coupling)
    linked_event_id = models.IntegerField(blank=True, null=True)

    # Campos Customizados Flexíveis (JSON)
    custom_fields = models.JSONField(default=dict, blank=True, help_text="Campos dinâmicos do deal")

    class Meta:
        verbose_name = "Deal"
        verbose_name_plural = "Deals"
        indexes = [
            models.Index(fields=["company", "stage"]),
            models.Index(fields=["company", "column"]),
            models.Index(fields=["closing_date"]),
            models.Index(fields=["company", "external_id"]),
            GinIndex(name="crm_deal_title_gin", fields=["title"], opclasses=["gin_trgm_ops"]),
        ]

    def __str__(self):
        return self.title


class DealActivity(BaseTenantModel):
    """
    Auditoria e Histórico do Deal (Mudanças de Coluna, Notas, Automações).
    """
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name="activities")
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    activity_type = models.CharField(max_length=50, choices=[
        ("column_change", "Mudança de Coluna"),
        ("stage_change", "Mudança de Coluna (Legado)"),
        ("note", "Nota Manual"),
        ("automation", "Automação"),
        ("creation", "Criação")
    ])
    description = models.TextField()
    old_value = models.JSONField(null=True, blank=True)
    new_value = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.activity_type} - {self.deal.title}"
