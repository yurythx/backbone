from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.contrib.auth import get_user_model
from django.db.models import Count
from .models import Conversation, Message, ConversationPreference

from .serializers import MessageSerializer
from apps.notifications.tasks import notify_user_push

User = get_user_model()

class MessengerService:
    @staticmethod
    def create_conversation(creator, company, participant_usernames=None, title=None, is_group=False):
        """
        Creates a new conversation or returns an existing one for private chats.
        Ensures that 1:1 conversations are unique per company.
        """
        if isinstance(participant_usernames, str):
            participant_usernames = [participant_usernames]
        elif not participant_usernames:
            participant_usernames = []

        # Normalize: others = set of unique usernames excluding the creator
        others = {u for u in participant_usernames if u != creator.username}
        
        if not is_group:
            # 1:1 Chat: Find existing private conversation between EXACTLY these participants
            # (either creator + 1 other, or just creator for self-chat)
            qs = Conversation.all_objects.filter(company=company, is_group=False, participants=creator)
            
            if others:
                target_username = list(others)[0] # only consider first for 1:1
                try:
                    target_user = User.all_objects.get(company=company, username=target_username)
                    existing = qs.filter(participants=target_user).annotate(p_count=Count('participants')).filter(p_count=2).first()
                    if existing: return existing
                except User.DoesNotExist:
                    pass
            else:
                # Self-chat: exactly 1 participant (the creator)
                existing = qs.annotate(p_count=Count('participants')).filter(p_count=1).first()
                if existing: return existing

        conversation = Conversation.all_objects.create(
            company=company,
            title=title,
            is_group=is_group
        )
        conversation.participants.add(creator)
        
        if others:
            for username in others:
                try:
                    target_user = User.all_objects.get(company=company, username=username)
                    conversation.participants.add(target_user)
                    if not is_group: break # Stop after first for 1:1
                except User.DoesNotExist:
                    continue
                    
        return conversation


    @staticmethod
    def send_message(user, company, conversation, content=None, file_obj=None, request=None, reply_to_id=None):
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

        if reply_to_id:
            try:
                reply_to = Message.all_objects.get(id=reply_to_id, conversation=conversation)
                message_data['reply_to'] = reply_to
            except Message.DoesNotExist:
                pass

        message = Message.all_objects.create(**message_data)
        
        # Signaling
        MessengerService.broadcast_message(company, conversation, message, request)
        
        # Web Push Notification
        # Respect Mute settings: only notify participants who haven't muted this conversation
        # Also exclude the sender (user)
        muted_user_ids = ConversationPreference.objects.filter(
            conversation=conversation,
            is_muted=True
        ).values_list('user_id', flat=True)

        recipients = conversation.participants.exclude(id=user.id).exclude(id__in=muted_user_ids)
        
        for participant in recipients:
            notify_user_push(
                participant,
                title=f"{user.first_name or user.username}",
                message=content[:100] if content else "Enviou um arquivo.",
                link=f"/messenger?conversation={conversation.id}&message_id={message.id}"
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
                'file_size': serialized_message.get('file_size'),
                'reply_to': serialized_message.get('reply_to')
            }
        )

    @staticmethod
    def add_reaction(user, message, emoji):
        from .models import MessageReaction
        
        reaction, created = MessageReaction.all_objects.get_or_create(
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

    @staticmethod
    def broadcast_delete(company, conversation, message_id):
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
            
        group_name = f'chat_{company.slug}_{conversation.id}'
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'delete_message',
                'message_id': message_id
            }
        )

    @staticmethod
    def broadcast_edit(company, conversation, message):
        channel_layer = get_channel_layer()
        if not channel_layer:
            return
            
        group_name = f'chat_{company.slug}_{conversation.id}'
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'edit_message',
                'message_id': message.id,
                'content': message.content,
                'edited_at': message.edited_at.isoformat() if message.edited_at else None
            }
        )
