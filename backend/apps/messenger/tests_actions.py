from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core.models import Company
from apps.messenger.models import Conversation, Message
from apps.module_manager.models import Module, TenantModule

User = get_user_model()


class MessengerActionsTest(APITestCase):
    def setUp(self):
        # Company
        self.company = Company.objects.create(name="Tech Corp", slug="tech-corp")

        # Users
        self.alice = User.objects.create_user(username="alice", email="a@t.com", password="pwd", company=self.company)
        self.bob = User.objects.create_user(username="bob", email="b@t.com", password="pwd", company=self.company)
        self.eve = User.objects.create_user(username="eve", email="e@t.com", password="pwd", company=self.company)

        # Enable module
        messenger = Module.objects.create(code="messenger", name="Messenger")
        TenantModule.objects.create(company=self.company, module=messenger, is_active=True)

        # Authenticate Alice
        self.client.force_authenticate(user=self.alice)
        self.client.defaults["HTTP_X_COMPANY_SLUG"] = "tech-corp"

    def test_create_conversation(self):
        """Test creating a conversation with another user"""
        data = {"target_username": "bob"}
        response = self.client.post("/api/messenger/conversations/", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Conversation.objects.count(), 1)

        conv = Conversation.objects.first()
        self.assertEqual(conv.participants.count(), 2)  # Alice + Bob
        self.assertTrue(conv.participants.filter(username="alice").exists())
        self.assertTrue(conv.participants.filter(username="bob").exists())

    def test_send_message(self):
        """Test sending a message to a conversation"""
        # Create conversation first
        conv = Conversation.objects.create(company=self.company)
        conv.participants.add(self.alice, self.bob)

        data = {"content": "Hello Bob!"}
        response = self.client.post(f"/api/messenger/conversations/{conv.id}/send_message/", data, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Message.objects.count(), 1)
        self.assertEqual(Message.objects.first().content, "Hello Bob!")
        self.assertEqual(Message.objects.first().sender, self.alice)

    def test_list_messages(self):
        """Test retrieving messages from a conversation"""
        conv = Conversation.objects.create(company=self.company)
        conv.participants.add(self.alice, self.bob)

        Message.objects.create(company=self.company, conversation=conv, sender=self.alice, content="Hi")
        Message.objects.create(company=self.company, conversation=conv, sender=self.bob, content="Hello")

        response = self.client.get(f"/api/messenger/conversations/{conv.id}/messages/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should be paginated or list depending on view implementation.
        # View uses paginate_queryset, so likely returns { count, results: [] }
        # But if PAGE_SIZE not set, might be list. Let's check type.

        if isinstance(response.data, dict) and "results" in response.data:
            results = response.data["results"]
        else:
            results = response.data

        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["content"], "Hi")

    def test_send_message_not_participant(self):
        """Test that a non-participant cannot send messages"""
        # Conversation between Bob and Eve
        conv = Conversation.objects.create(company=self.company)
        conv.participants.add(self.bob, self.eve)

        # Alice tries to send
        data = {"content": "I am spying"}
        response = self.client.post(f"/api/messenger/conversations/{conv.id}/send_message/", data, format="json")

        # Should be 404 because get_queryset filters by participants
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
