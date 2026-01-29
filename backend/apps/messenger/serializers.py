from rest_framework import serializers
from .models import Conversation, Message
from apps.accounts.serializers import UserSerializer # Supondo que exista ou usar um simplificado

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
