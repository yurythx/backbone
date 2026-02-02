from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.core.models import Company
from .models import Module, TenantModule
from apps.accounts.models import Role

User = get_user_model()

class ModuleManagerTest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Test Co", slug="test-co")
        self.role = Role.objects.create(company=self.company, name="Admin", permissions=[])
        self.user = User.objects.create_user(
            username="admin", 
            password="pwd", 
            company=self.company,
            role=self.role
        )
        self.client.credentials(HTTP_X_COMPANY_SLUG=self.company.slug)
        
        # Create a module
        self.module = Module.objects.create(
            code="messenger",
            name="Messenger",
            description="Chat functionality"
        )
        
    def test_list_modules(self):
        """Test listing available system modules."""
        self.client.force_authenticate(user=self.user)
        # Use corrected URL
        response = self.client.get('/api/modules/available/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        # Should return the global Module
        self.assertEqual(len(response.data['results']), 1, response.data)
        self.assertEqual(response.data['results'][0]['code'], "messenger")

    def test_activate_module(self):
        """Test activating a module for the current tenant."""
        self.client.force_authenticate(user=self.user)
        payload = {"module_code": "messenger"}
        # Use corrected URL
        response = self.client.post('/api/modules/my-modules/activate/', payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        
        # Verify it was activated
        self.assertTrue(TenantModule.objects.filter(
            company=self.company, 
            module=self.module, 
            is_active=True
        ).exists())

    def test_list_tenant_modules(self):
        """Test listing activated modules for the tenant."""
        # Activate first
        TenantModule.objects.create(company=self.company, module=self.module, is_active=True)
        
        self.client.force_authenticate(user=self.user)
        # Use corrected URL
        response = self.client.get('/api/modules/my-modules/')
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertEqual(len(response.data['results']), 1, response.data)
        self.assertEqual(response.data['results'][0]['module_name'], "Messenger")
