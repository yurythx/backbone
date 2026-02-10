import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache
from shared_kernel.tenant_context import set_current_company
from .models import Conversation

class PresenceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.company_slug = await self.get_company_slug()
        self.room_group_name = f'presence_{self.company_slug}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        
        # Mark online and broadcast
        await self.update_presence("online")
        await self.broadcast_status("online")

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.update_presence("offline")
            await self.broadcast_status("offline")
            
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def presence_update(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps(event))

    async def broadcast_status(self, status):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'presence_update',
                    'user_id': self.user.id,
                    'username': self.user.username,
                    'status': status
                }
            )

    @database_sync_to_async
    def get_company_slug(self):
        if hasattr(self.user, 'company') and self.user.company:
            return self.user.company.slug
        return "default"

    @database_sync_to_async
    def update_presence(self, status):
        # Set context for cache key prefixing
        set_current_company(self.user.company)
        key = f"user_presence:{self.user.id}"
        if status == "online":
            cache.set(key, "online", timeout=None)
        else:
            cache.delete(key)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        
        # Obter conversa verificando participação e tenant (via user)
        self.conversation = await self.get_conversation(self.conversation_id, self.user)
        
        if not self.conversation:
            # Conversa não existe, ou usuário não participa, ou empresa errada
            await self.close()
            return
            
        # Isolamento: Grupo prefixado com slug da empresa
        company_slug = await self.get_company_slug(self.conversation)
        self.room_group_name = f'chat_{company_slug}_{self.conversation_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'chat_message':
            content = data.get('message')
            conversation_id = data.get('conversation_id')
            
            # Broadcast message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': content,
                    'conversation_id': conversation_id
                }
            )
        elif message_type == 'typing_status':
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_status',
                    'user_id': self.scope['user'].id,
                    'username': self.scope['user'].username,
                    'is_typing': data.get('is_typing', False)
                }
            )

    # Receive message from room group
    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message'],
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username'],
            'message_id': event['message_id'],
            'created_at': event['created_at'],
            'file_url': event.get('file_url'),
            'file_name': event.get('file_name'),
            'file_type': event.get('file_type'),
            'file_size': event.get('file_size'),
        }))

    async def typing_status(self, event):
        # Only send typing status of OTHERS to the client
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'typing',
                'user_id': event['user_id'],
                'username': event['username'],
                'is_typing': event['is_typing']
            }))

    async def reaction_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'reaction',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'username': event['username'],
            'emoji': event['emoji'],
            'action': event['action']
        }))

    async def read_receipt_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'is_read': event['is_read']
        }))

    async def delete_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'delete_message',
            'message_id': event['message_id']
        }))

    async def edit_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'edit_message',
            'message_id': event['message_id'],
            'content': event['content'],
            'edited_at': event['edited_at']
        }))

    @database_sync_to_async
    def get_conversation(self, conversation_id, user):
        try:
            # Verifica se a conversa existe E se o usuário é participante
            return Conversation.all_objects.select_related('company').get(
                id=int(conversation_id),
                participants=user
            )
        except Conversation.DoesNotExist:
            return None

    @database_sync_to_async
    def get_company_slug(self, conversation):
        return conversation.company.slug
