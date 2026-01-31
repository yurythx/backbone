from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer, ContactSerializer
from django.contrib.auth import get_user_model
from apps.module_manager.permissions import HasModuleAccess

User = get_user_model()

@extend_schema(tags=['Messenger'])
class ContactViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = 'messenger'
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        
        # Superuser or Company Admin (staff) sees everyone in the company
        if user.is_superuser or user.is_staff:
            return User.objects.all().exclude(id=user.id).order_by('username')
            
        # Regular user: see users in same groups
        # Note: We rely on User.objects (TenantUserManager) to filter by company automatically.
        user_groups = user.groups.all()
        if not user_groups.exists():
            # If user has no groups, they see no one (except maybe themselves, but let's stick to strict group rule)
            return User.objects.none()
            
        return User.objects.filter(groups__in=user_groups).exclude(id=user.id).distinct().order_by('username')

@extend_schema(tags=['Messenger'])
class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = 'messenger'

    def get_queryset(self):
        # Retorna apenas conversas onde o usuário é participante
        return Conversation.objects.filter(participants=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        # Cria conversa e adiciona o criador automaticamente
        conversation = serializer.save(company=self.request.company)
        conversation.participants.add(self.request.user)
        
        # Se houver 'target_username' no body, adiciona o outro participante
        target_username = self.request.data.get('target_username')
        if target_username:
            try:
                target_user = User.objects.get(username=target_username)
                conversation.participants.add(target_user)
            except User.DoesNotExist:
                pass # Ou tratar erro

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={201: MessageSerializer},
        description="Send a message to this conversation (supports content and/or file)"
    )
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        conversation = self.get_object()
        content = request.data.get('content')
        file_obj = request.FILES.get('file')
        
        if not content and not file_obj:
            return Response({"error": "Content or file is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        message_data = {
            'company': request.company,
            'conversation': conversation,
            'sender': request.user,
            'content': content
        }

        if file_obj:
            message_data['file'] = file_obj
            message_data['file_name'] = file_obj.name
            message_data['file_type'] = file_obj.content_type
            message_data['file_size'] = file_obj.size

        message = Message.objects.create(**message_data)
        
        # Emit WebSocket event
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        company_slug = request.company.slug
        group_name = f'chat_{company_slug}_{conversation.id}'
        
        # Get absolute URL for the file if it exists
        serialized_message = MessageSerializer(message, context={'request': request}).data

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'chat_message',
                'message': content,
                'sender_id': request.user.id,
                'sender_username': request.user.username,
                'message_id': message.id,
                'created_at': message.created_at.isoformat(),
                'file_url': serialized_message.get('file_url'),
                'file_name': serialized_message.get('file_name'),
                'file_type': serialized_message.get('file_type'),
                'file_size': serialized_message.get('file_size')
            }
        )
        
        return Response(serialized_message, status=status.HTTP_201_CREATED)

    @extend_schema(
        responses={200: MessageSerializer(many=True)},
        description="List all messages in this conversation"
    )
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        messages = conversation.messages.all().order_by('created_at')
        page = self.paginate_queryset(messages)
        if page is not None:
            serializer = MessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
