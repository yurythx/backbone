from django.utils import timezone
from django.db import transaction

from apps.calendar.models import Event
from apps.notifications.models import Notification
from .models import get_column_semantic_defaults


def create_default_stages(sender, instance, created, **kwargs):
    """Cria os estágios padrão [Novo, Planejados, Em Andamento, Concluído] para novos Pipelines."""
    if created:
        from .models import Stage

        default_stages = [
            ("Novo", 10),
            ("Planejados", 20),
            ("Em Andamento", 30),
            ("Concluído", 40),
        ]
        for name, order in default_stages:
            Stage.objects.create(pipeline=instance, name=name, order=order, company=instance.company)


def ensure_column_for_stage(sender, instance, created, **kwargs):
    """Mantém uma coluna espelhada para cada legacy stage."""
    from .models import Column

    defaults = {
        "pipeline": instance.pipeline,
        "title": instance.name,
        "order": instance.order,
        "company": instance.company,
        **get_column_semantic_defaults(title=instance.name),
    }

    if created:
        Column.objects.create(legacy_stage=instance, **defaults)
        return

    if hasattr(instance, "column") and instance.column_id:
        Column.all_objects.filter(id=instance.column.id).update(**defaults)
    else:
        Column.objects.create(legacy_stage=instance, **defaults)


@transaction.atomic
def sync_deal_with_calendar(sender, instance, created, **kwargs):
    """Sincroniza automaticamente o Deal do CRM com o Calendário e envia notificações."""

    if instance.column_id is None and instance.stage_id:
        legacy_stage_column = getattr(instance.stage, "column", None)
        if legacy_stage_column is not None:
            instance.__class__.all_objects.filter(id=instance.id).update(column=legacy_stage_column)
            instance.column = legacy_stage_column

    # 1. Sincronização com Calendário
    if not instance.closing_date:
        if instance.linked_event_id:
            Event.all_objects.filter(id=instance.linked_event_id).delete()
            instance.__class__.all_objects.filter(id=instance.id).update(linked_event_id=None)
    else:
        color_map = {"LOW": "green", "MEDIUM": "blue", "HIGH": "orange", "URGENT": "red"}

        event_data = {
            "title": f"[{instance.priority}] {instance.title}",
            "description": f"CRM: {instance.description or ''}\nCliente: {instance.contact.name}",
            "start_datetime": instance.closing_date,
            "end_datetime": instance.closing_date + timezone.timedelta(hours=1),
            "color_category": color_map.get(instance.priority, "blue"),
            "company": instance.company,
            "owner": instance.owner,
        }

        if instance.linked_event_id:
            Event.all_objects.filter(id=instance.linked_event_id).update(**event_data)
        else:
            event = Event.all_objects.create(**event_data)
            instance.__class__.all_objects.filter(id=instance.id).update(linked_event_id=event.id)

    # 2. Sistema de notificações e histórico
    from .models import DealActivity
    
    if created:
        current_column = getattr(instance.stage, "column", None) or instance.column
        column_name = current_column.title if current_column else instance.stage.name
        DealActivity.objects.create(
            company=instance.company,
            deal=instance,
            actor=instance.owner,
            activity_type="creation",
            description=f"Card criado na coluna {column_name}.",
            new_value={"column": column_name}
        )
        Notification.objects.create(
            recipient=instance.owner,
            company=instance.company,
            title="Novo Card Criado",
            message=f"O card '{instance.title}' foi adicionado a coluna {column_name}.",
            notification_type=Notification.TYPE_SYSTEM,
            metadata={"deal_uuid": str(instance.uuid)},
        )
    elif "stage" in (kwargs.get("update_fields") or []):
        current_column = getattr(instance.stage, "column", None) or instance.column
        column_name = current_column.title if current_column else instance.stage.name
        DealActivity.objects.create(
            company=instance.company,
            deal=instance,
            actor=instance.owner,
            activity_type="column_change",
            description=f"Card movido para a coluna {column_name}.",
            new_value={"column": column_name}
        )
        Notification.objects.create(
            recipient=instance.owner,
            company=instance.company,
            title="Card Movimentado",
            message=f"O card '{instance.title}' foi movido para a coluna {column_name}.",
            notification_type=Notification.TYPE_SYSTEM,
            metadata={"deal_uuid": str(instance.uuid)},
        )


def delete_calendar_event(sender, instance, **kwargs):
    """Remove o evento da agenda ao deletar o card do CRM."""
    if instance.linked_event_id:
        from apps.calendar.models import Event

        Event.all_objects.filter(id=instance.linked_event_id).delete()
