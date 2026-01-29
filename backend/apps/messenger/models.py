from django.db import models
from django.conf import settings
from shared_kernel.models import BaseTenantModel

class Conversation(BaseTenantModel):
    """
    Uma conversa entre usuários.
    """
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Metadados opcionais (ex: título de grupo)
    title = models.CharField(max_length=255, blank=True, null=True)
    is_group = models.BooleanField(default=False)

    def __str__(self):
        if self.title:
            return self.title
        return f"Conversation {self.id}"

class Message(BaseTenantModel):
    """
    Uma mensagem dentro de uma conversa.
    """
    conversation = models.ForeignKey(Conversation, related_name='messages', on_delete=models.CASCADE)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='sent_messages', on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Message {self.id} from {self.sender}"
