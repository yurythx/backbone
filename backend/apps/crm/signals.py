from django.utils import timezone

from apps.calendar.models import Event
from apps.notifications.models import Notification


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


def sync_deal_with_calendar(sender, instance, created, **kwargs):
    """Sincroniza automaticamente o Deal do CRM com o Calendário e envia notificações."""

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

    # 2. Sistema de Notificações
    if created:
        Notification.objects.create(
            recipient=instance.owner,
            company=instance.company,
            title="Novo Card Criado",
            message=f"O card '{instance.title}' foi adicionado ao estágio {instance.stage.name}.",
            notification_type=Notification.TYPE_SYSTEM,
            metadata={"deal_uuid": str(instance.uuid)},
        )
    elif "stage" in (kwargs.get("update_fields") or []):
        Notification.objects.create(
            recipient=instance.owner,
            company=instance.company,
            title="Card Movimentado",
            message=f"O card '{instance.title}' foi movido para {instance.stage.name}.",
            notification_type=Notification.TYPE_SYSTEM,
            metadata={"deal_uuid": str(instance.uuid)},
        )


def delete_calendar_event(sender, instance, **kwargs):
    """Remove o evento da agenda ao deletar o card do CRM."""
    if instance.linked_event_id:
        from apps.calendar.models import Event

        Event.all_objects.filter(id=instance.linked_event_id).delete()
