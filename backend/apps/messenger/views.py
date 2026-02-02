from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer, ContactSerializer
from .services import MessengerService
from django.contrib.auth import get_user_model
from apps.module_manager.permissions import HasModuleAccess

User = get_user_model()

@extend_schema(tags=['Messenger'])
class ContactViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = 'messenger'
    

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

    def create(self, request, *args, **kwargs):
        target_username = request.data.get('target_username')
        conversation = MessengerService.create_conversation(
            creator=request.user,
            company=request.company,
            participant_usernames=[target_username] if target_username else []
        )
        serializer = self.get_serializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        # Retorna apenas conversas onde o usuário é participante
        return Conversation.objects.filter(participants=self.request.user).order_by('-created_at')

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
            
        message = MessengerService.send_message(
            user=request.user,
            company=request.company,
            conversation=conversation,
            content=content,
            file_obj=file_obj,
            request=request
        )
        
        serializer = MessageSerializer(message, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(
        responses={200: MessageSerializer(many=True)},
        description="List messages in this conversation (supports ?before=<ISO datetime> for pagination)"
    )
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        qs = conversation.messages.all().order_by('created_at')
        before = request.query_params.get('before')
        if before:
            try:
                # ISO format expected
                from django.utils.dateparse import parse_datetime
                dt = parse_datetime(before)
                if dt:
                    qs = qs.filter(created_at__lt=dt)
            except Exception:
                pass
        messages = qs
        page = self.paginate_queryset(messages)
        if page is not None:
            serializer = MessageSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)

        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)

@extend_schema(tags=['Messenger'])
class MessageViewSet(viewsets.GenericViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = 'messenger'

    def get_queryset(self):
        # Users can only interact with messages in conversations they are part of
        return Message.objects.filter(conversation__participants=self.request.user)

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiTypes.OBJECT},
        description="Add or remove a reaction to a message"
    )
    @action(detail=True, methods=['post'])
    def reaction(self, request, pk=None):
        message = self.get_object()
        emoji = request.data.get('emoji')
        action_type = request.data.get('action', 'add') # add or remove
        
        if not emoji:
            return Response({"error": "Emoji is required"}, status=status.HTTP_400_BAD_REQUEST)

        if action_type == 'add':
            MessengerService.add_reaction(request.user, message, emoji)
        elif action_type == 'remove':
            MessengerService.remove_reaction(request.user, message, emoji)
        else:
            return Response({"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response({'status': 'success'})

    @extend_schema(
        request=None,
        responses={200: OpenApiTypes.OBJECT},
        description="Mark a message as read (only if recipient)"
    )
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        message = self.get_object()
        # Only allow marking as read if requester is participant and not the sender
        if message.sender_id == request.user.id:
            return Response({'error': 'Sender cannot mark own message as read'}, status=status.HTTP_400_BAD_REQUEST)
        message.is_read = True
        message.save(update_fields=['is_read'])
        return Response({'status': 'success', 'is_read': True})
