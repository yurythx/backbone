from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.core.cache import cache
from .models import Conversation, Message

User = get_user_model()

class ContactSerializer(serializers.ModelSerializer):
    is_online = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_online']
        
    def get_is_online(self, obj):
        # Cache key matches what we set in PresenceConsumer
        # Note: Tenant context is already set in the view, so make_key_with_tenant works automatically
        key = f"user_presence:{obj.id}"
        return cache.get(key) == "online"

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'sender_username', 'content', 'created_at', 'is_read']
        read_only_fields = ['sender', 'conversation']

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
