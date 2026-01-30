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
        text_data_json = json.loads(text_data)
        message = text_data_json.get('message', '')
        
        # Força o sender ser o usuário autenticado
        sender_username = self.user.username

        # Send message to room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'sender': sender_username
                }
            )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        sender = event['sender']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message,
            'sender': sender
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
