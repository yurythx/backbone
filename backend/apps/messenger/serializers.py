from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.cache import cache
from .models import Conversation, Message, MessageReaction

User = get_user_model()

class ContactSerializer(serializers.ModelSerializer):
    is_online = serializers.SerializerMethodField()
    group_names = serializers.SerializerMethodField()
    is_staff = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_online', 'group_names', 'is_staff']
        
    def get_is_online(self, obj):
        key = f"user_presence:{obj.id}"
        return cache.get(key) == "online"

    def get_group_names(self, obj):
        return [g.name for g in obj.groups.all()]


class MessageReactionSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'user', 'user_username', 'emoji', 'created_at']

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    file_url = serializers.SerializerMethodField()
    reactions = MessageReactionSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'sender_username', 
            'content', 'file', 'file_url', 'file_name', 
            'file_type', 'file_size', 'created_at', 'is_read',
            'reactions'
        ]
        read_only_fields = ['sender', 'conversation']

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

class ConversationSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    participants_list = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'participants_list', 'created_at', 'updated_at', 'title', 'is_group', 'last_message']
        read_only_fields = ['participants']

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return MessageSerializer(last_msg).data
        return None
        
    def get_participants_list(self, obj):
        # Retorna lista simplificada de usernames
        return [user.username for user in obj.participants.all()]
