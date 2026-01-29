from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.core.models import Company
from apps.messenger.models import Conversation
from apps.module_manager.models import Module, TenantModule

User = get_user_model()

class MessengerIsolationTest(APITestCase):
    def setUp(self):
        # Company A
        self.company_a = Company.objects.create(name="Company A", slug="company-a")
        self.user_a1 = User.objects.create_user(username="u_a1", email="a1@a.com", password="pwd", company=self.company_a)
        self.user_a2 = User.objects.create_user(username="u_a2", email="a2@a.com", password="pwd", company=self.company_a)

        # Company B
        self.company_b = Company.objects.create(name="Company B", slug="company-b")
        self.user_b1 = User.objects.create_user(username="u_b1", email="b1@b.com", password="pwd", company=self.company_b)

        # Enable messenger module for both tenants
        messenger = Module.objects.create(code="messenger", name="Messenger")
        TenantModule.objects.create(company=self.company_a, module=messenger, is_active=True)
        TenantModule.objects.create(company=self.company_b, module=messenger, is_active=True)

        # Conversation in A
        self.conv_a = Conversation.objects.create(company=self.company_a)
        self.conv_a.participants.add(self.user_a1, self.user_a2)

        # Conversation in B
        self.conv_b = Conversation.objects.create(company=self.company_b)
        self.conv_b.participants.add(self.user_b1)

    def test_isolation_list(self):
        # User A1 should only see conversations from Company A
        self.client.force_authenticate(user=self.user_a1)
        # Set Header for Company A
        self.client.defaults['HTTP_X_COMPANY_SLUG'] = 'company-a'
        
        response = self.client.get('/api/messenger/conversations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.conv_a.id)

        # User B1 should only see conversations from Company B
        self.client.force_authenticate(user=self.user_b1)
        # Set Header for Company B
        self.client.defaults['HTTP_X_COMPANY_SLUG'] = 'company-b'

        response = self.client.get('/api/messenger/conversations/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.conv_b.id)

    def test_cross_tenant_access_denied(self):
        # User A1 tries to access Conversation B via ID
        self.client.force_authenticate(user=self.user_a1)
        self.client.defaults['HTTP_X_COMPANY_SLUG'] = 'company-a'
        
        response = self.client.get(f'/api/messenger/conversations/{self.conv_b.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND) 
        # Should be 404 because BaseTenantModel filters querysets by company, so it won't even find it.
