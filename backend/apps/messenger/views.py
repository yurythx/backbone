from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiTypes
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer, ContactSerializer
from .services import MessengerService
from django.contrib.auth import get_user_model
from apps.module_manager.permissions import HasModuleAccess

User = get_user_model()

from apps.accounts.permissions import HasRolePermission

@extend_schema_view(
    list=extend_schema(tags=['Messenger']),
    retrieve=extend_schema(tags=['Messenger']),
)
class ContactViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess, HasRolePermission]
    required_permission = 'messenger.view'
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

@extend_schema_view(
    list=extend_schema(tags=['Messenger']),
    retrieve=extend_schema(tags=['Messenger']),
    create=extend_schema(tags=['Messenger']),
    update=extend_schema(tags=['Messenger']),
    partial_update=extend_schema(tags=['Messenger']),
    destroy=extend_schema(tags=['Messenger']),
)
class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = 'messenger'

    def create(self, request, *args, **kwargs):
        participant_usernames = request.data.get('participant_usernames', [])
        target_username = request.data.get('target_username')
        if target_username and target_username not in participant_usernames:
            participant_usernames.append(target_username)
            
        conversation = MessengerService.create_conversation(
            creator=request.user,
            company=request.company,
            participant_usernames=participant_usernames,
            title=request.data.get('title'),
            is_group=request.data.get('is_group', False)
        )
        serializer = self.get_serializer(conversation)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        # Retorna apenas conversas onde o usuário é participante
        return Conversation.objects.filter(participants=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['post'])
    def add_participant(self, request, pk=None):
        conversation = self.get_object()
        if not conversation.is_group:
            return Response({"error": "Only group conversations can have participants added"}, status=400)
            
        username = request.data.get('username')
        try:
            target_user = User.objects.get(company=request.company, username=username)
            conversation.participants.add(target_user)
            return Response({"status": "Participant added"})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

    @action(detail=True, methods=['post'])
    def remove_participant(self, request, pk=None):
        conversation = self.get_object()
        if not conversation.is_group:
            return Response({"error": "Only group conversations can have participants removed"}, status=400)
            
        username = request.data.get('username')
        try:
            target_user = User.objects.get(company=request.company, username=username)
            conversation.participants.remove(target_user)
            return Response({"status": "Participant removed"})
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

    @extend_schema(
        parameters=[OpenApiParameter("q", OpenApiTypes.STR, description="Termo de pesquisa")],
        responses={200: MessageSerializer(many=True)},
        description="Global search in message history"
    )
    @action(detail=False, methods=['get'])
    def search(self, request):
        query = request.query_params.get('q')
        if not query:
            return Response({"error": "Query parameter 'q' is required"}, status=400)
            
        messages = Message.objects.filter(
            conversation__participants=request.user,
            content__icontains=query
        ).order_by('-created_at')
        
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response(serializer.data)

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
        # Order by -created_at for pagination (latest first) then reverse for display
        qs = conversation.messages.all().order_by('-created_at')
        
        before = request.query_params.get('before')
        if before:
            try:
                from django.utils.dateparse import parse_datetime
                dt = parse_datetime(before)
                if dt:
                    qs = qs.filter(created_at__lt=dt)
            except Exception:
                pass
        
        # Paginate (default is 50 usually)
        page = self.paginate_queryset(qs)
        if page is not None:
            # We want to return them in chronological order for the frontend
            # but we paginate from latest to oldest
            messages_list = sorted(page, key=lambda x: x.created_at)
            serializer = MessageSerializer(messages_list, many=True, context={'request': request})
            response = self.get_paginated_response(serializer.data)
            
            # Enrich response with 'before' param for next page if exists
            if page:
                oldest_msg = page[-1] # The last one in the page (oldest)
                # Note: Default pagination 'next' uses ?page=2. 
                # We might want to keep using standard pagination but adjust it, 
                # or manually construct the next link.
                pass
            
            return response

        messages_list = sorted(qs, key=lambda x: x.created_at)
        serializer = MessageSerializer(messages_list, many=True, context={'request': request})
        return Response(serializer.data)

@extend_schema_view(
    reaction=extend_schema(tags=['Messenger'], summary="Add or remove emoji reaction"),
    mark_read=extend_schema(tags=['Messenger'], summary="Mark message as read by recipient"),
)
class MessageViewSet(viewsets.GenericViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess, HasRolePermission]
    required_permission = 'messenger.view'
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
        
        # Broadcast to conversation group
        MessengerService.broadcast_read_receipt(
            request.company, 
            message.conversation, 
            message.id, 
            request.user.id
        )
        
        return Response({'status': 'success', 'is_read': True})
