from urllib.parse import quote

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from apps.articles.models import Article
from apps.messenger.models import Message

from .models import Notification
from .tasks import send_websocket_notification


@receiver(post_save, sender=Message)
def notify_new_message(sender, instance, created, **kwargs):
    if created:
        conversation = instance.conversation

        # Notify all participants except the sender
        for participant in conversation.participants.exclude(id=instance.sender.id):
            # Create notification record
            # I-N3: encode created_at para evitar quebra de URL ('+' em iso format)
            created_at_encoded = quote(instance.created_at.isoformat())
            notification = Notification.objects.create(
                company=instance.company,
                recipient=participant,
                notification_type=Notification.TYPE_MESSAGE,
                title=f"Nova mensagem de {instance.sender.username}",
                message=instance.content[:100] if instance.content else "Anexo enviado",
                link=f"/messenger?conversation={conversation.id}&message_id={instance.id}&created_at={created_at_encoded}",
            )

            # Send to WebSocket via Celery
            send_websocket_notification.delay(
                f"notifications_user_{participant.id}",
                {
                    "type": "notification_message",
                    "notification_id": str(notification.id),
                    "notification_type": notification.notification_type,
                    "title": notification.title,
                    "message": notification.message,
                    "link": notification.link,
                    "conversation_id": conversation.id,
                    "message_id": instance.id,
                    "message_created_at": instance.created_at.isoformat(),
                    "created_at": notification.created_at.isoformat(),
                },
            )


@receiver(pre_save, sender=Article)
def track_article_status(sender, instance, **kwargs):
    """
    Salva o status original diretamente na instância para comparação no post_save.
    Evita o uso de dicionários globais que não são seguros em ambientes multi-worker.
    """
    if instance.pk:
        try:
            # Busca apenas o campo status para performance
            previous = Article.objects.filter(pk=instance.pk).values("status").first()
            instance._original_status = previous["status"] if previous else None
        except Exception:
            instance._original_status = None
    else:
        instance._original_status = None


@receiver(post_save, sender=Article)
def notify_article_status(sender, instance, created, **kwargs):
    """
    Notifica o autor apenas quando o status MUDA para 'published'.
    """
    if created:
        return

    original_status = getattr(instance, "_original_status", None)

    # Só notifica se houve transição real para 'published'
    if instance.status == Article.STATUS_PUBLISHED and original_status != Article.STATUS_PUBLISHED:
        if instance.author:
            notification = Notification.objects.create(
                company=instance.company,
                recipient=instance.author,
                notification_type=Notification.TYPE_APPROVAL,
                title="Artigo Publicado!",
                message=f"Seu artigo '{instance.title}' foi publicado com sucesso.",
                link=f"/p/artigos/{instance.slug}",
            )

            send_websocket_notification.delay(
                f"notifications_user_{instance.author.id}",
                {
                    "type": "notification_message",
                    "notification_id": str(notification.id),
                    "notification_type": notification.notification_type,
                    "title": notification.title,
                    "message": notification.message,
                    "link": notification.link,
                    "created_at": notification.created_at.isoformat(),
                },
            )
