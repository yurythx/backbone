from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from .models import Conversation, Message
from .serializers import MessageSerializer
from apps.notifications.tasks import notify_user_push

User = get_user_model()

class MessengerService:
    @staticmethod
    def create_conversation(creator, company, participant_usernames=None, title=None, is_group=False):
        """
        Creates a new conversation and adds participants.
        """
        conversation = Conversation.objects.create(
            company=company,
            title=title,
            is_group=is_group
        )
        conversation.participants.add(creator)
        
        if participant_usernames:
            for username in participant_usernames:
                try:
                    target_user = User.objects.get(company=company, username=username)
                    conversation.participants.add(target_user)
                except User.DoesNotExist:
                    continue
                    
        return conversation

    @staticmethod
    def send_message(user, company, conversation, content=None, file_obj=None, request=None):
        """
        Sends a message to a conversation and signals via WebSockets.
        """
        message_data = {
            'company': company,
            'conversation': conversation,
            'sender': user,
            'content': content
        }

        if file_obj:
            message_data['file'] = file_obj
            message_data['file_name'] = file_obj.name
            message_data['file_type'] = file_obj.content_type
            message_data['file_size'] = file_obj.size

        message = Message.objects.create(**message_data)
        
        # Signaling
        MessengerService.broadcast_message(company, conversation, message, request)
        
        # Web Push Notification
        participants = conversation.participants.exclude(id=user.id)
        for participant in participants:
            notify_user_push(
                participant,
                title=f"Nova mensagem de {user.username}",
                message=content[:100] if content else "Enviou um arquivo.",
                link=f"/messenger/conversas/{conversation.id}"
            )

        return message

    @staticmethod
    def broadcast_message(company, conversation, message, request=None):
        """
        Signals the new message to all participants via WebSocket group.
        """
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
            
        group_name = f'chat_{company.slug}_{conversation.id}'
        
        # Serialize with context for absolute URLs
        context = {'request': request} if request else {}
        serialized_message = MessageSerializer(message, context=context).data

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'chat_message',
                'message': message.content,
                'sender_id': message.sender.id,
                'sender_username': message.sender.username,
                'message_id': message.id,
                'created_at': message.created_at.isoformat(),
                'file_url': serialized_message.get('file_url'),
                'file_name': serialized_message.get('file_name'),
                'file_type': serialized_message.get('file_type'),
                'file_size': serialized_message.get('file_size')
            }
        )

    @staticmethod
    def add_reaction(user, message, emoji):
        from .models import MessageReaction
        
        reaction, created = MessageReaction.objects.get_or_create(
            message=message,
            user=user,
            emoji=emoji,
            defaults={'company': message.company}
        )
        
        if created:
            MessengerService.broadcast_reaction(message.company, message.conversation, message.id, user, emoji, 'add')
            
        return reaction

    @staticmethod
    def remove_reaction(user, message, emoji):
        from .models import MessageReaction
        try:
            reaction = MessageReaction.objects.get(
                message=message,
                user=user,
                emoji=emoji
            )
            reaction.delete()
            MessengerService.broadcast_reaction(message.company, message.conversation, message.id, user, emoji, 'remove')
            return True
        except MessageReaction.DoesNotExist:
            return False

    @staticmethod
    def broadcast_reaction(company, conversation, message_id, user, emoji, action):
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
            
        group_name = f'chat_{company.slug}_{conversation.id}'
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'reaction_update',
                'message_id': message_id,
                'user_id': user.id,
                'username': user.username,
                'emoji': emoji,
                'action': action
            }
        )
    @staticmethod
    def broadcast_read_receipt(company, conversation, message_id, user_id):
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
            
        group_name = f'chat_{company.slug}_{conversation.id}'
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'read_receipt_update',
                'message_id': message_id,
                'user_id': user_id,
                'is_read': True
            }
        )
