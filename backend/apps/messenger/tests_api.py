from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.core.models import Company
from apps.module_manager.models import Module, TenantModule

User = get_user_model()

class MessengerAPITest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Test Corp", slug="test-corp")
        self.user = User.all_objects.create_user(
            username="tester",
            email="tester@test.corp",
            password="pass",
            company=self.company
        )
        self.peer = User.all_objects.create_user(
            username="peer",
            email="peer@test.corp",
            password="pass",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_COMPANY_SLUG='test-corp')

        messenger = Module.objects.create(code="messenger", name="Messenger")
        TenantModule.objects.create(company=self.company, module=messenger, is_active=True)

    def test_conversation_and_message_flow(self):
        # Create conversation with target_username
        res = self.client.post('/api/messenger/conversations/', {"target_username": "peer"}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        conv_id = res.data['id']

        # Send message
        msg_res = self.client.post(f'/api/messenger/conversations/{conv_id}/send_message/', {"content": "Hello"}, format='json')
        self.assertEqual(msg_res.status_code, status.HTTP_201_CREATED)
        message_id = msg_res.data['id']

        # Add reaction
        react_res = self.client.post(f'/api/messenger/messages/{message_id}/reaction/', {"emoji": "👍", "action": "add"}, format='json')
        self.assertEqual(react_res.status_code, status.HTTP_200_OK)

        # Mark read as sender should fail
        mark_res = self.client.post(f'/api/messenger/messages/{message_id}/mark_read/', {}, format='json')
        self.assertEqual(mark_res.status_code, status.HTTP_400_BAD_REQUEST)
