from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from django.contrib.auth import get_user_model
from apps.module_manager.permissions import HasModuleAccess

User = get_user_model()

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
