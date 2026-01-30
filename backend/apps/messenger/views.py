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
        description="Send a message to this conversation"
    )
    @action(detail=True, methods=['post'])
    def send_message(self, request, pk=None):
        conversation = self.get_object()
        content = request.data.get('content')
        
        if not content:
            return Response({"error": "Content is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        message = Message.objects.create(
            company=request.company,
            conversation=conversation,
            sender=request.user,
            content=content
        )
        
        # Aqui poderia emitir evento WebSocket
        
        serializer = MessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

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
