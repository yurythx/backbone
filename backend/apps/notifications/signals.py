from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from apps.messenger.models import Message
from apps.articles.models import Article
from .models import Notification

@receiver(post_save, sender=Message)
def notify_new_message(sender, instance, created, **kwargs):
    if created:
        conversation = instance.conversation
        channel_layer = get_channel_layer()
        
        # Notify all participants except the sender
        for participant in conversation.participants.exclude(id=instance.sender.id):
            # Create notification record
            notification = Notification.objects.create(
                company=instance.company,
                recipient=participant,
                notification_type=Notification.TYPE_MESSAGE,
                title=f"Nova mensagem de {instance.sender.username}",
                message=instance.content[:100] if instance.content else "Anexo enviado",
                link=f"/messenger?chat={conversation.id}"
            )
            
            # Send to WebSocket
            async_to_sync(channel_layer.group_send)(
                f'notifications_user_{participant.id}',
                {
                    'type': 'notification_message',
                    'notification_id': str(notification.id),
                    'notification_type': notification.notification_type,
                    'title': notification.title,
                    'message': notification.message,
                    'link': notification.link,
                    'created_at': notification.created_at.isoformat(),
                }
            )

@receiver(post_save, sender=Article)
def notify_article_status(sender, instance, created, **kwargs):
    # This signal could be more complex (check status change)
    # For now, let's notify the author when an article is published
    if not created and instance.status == Article.STATUS_PUBLISHED:
        # Avoid duplicate notifications if already published (simplified for demo)
        channel_layer = get_channel_layer()
        if instance.author:
            notification = Notification.objects.create(
                company=instance.company,
                recipient=instance.author,
                notification_type=Notification.TYPE_APPROVAL,
                title="Artigo Publicado!",
                message=f"Seu artigo '{instance.title}' foi publicado com sucesso.",
                link=f"/p/artigos/{instance.slug}"
            )
            
            async_to_sync(channel_layer.group_send)(
                f'notifications_user_{instance.author.id}',
                {
                    'type': 'notification_message',
                    'notification_id': str(notification.id),
                    'notification_type': notification.notification_type,
                    'title': notification.title,
                    'message': notification.message,
                    'link': notification.link,
                    'created_at': notification.created_at.isoformat(),
                }
            )
