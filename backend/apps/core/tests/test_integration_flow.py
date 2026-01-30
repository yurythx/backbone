from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.core.models import Company
from apps.module_manager.models import Module, TenantModule
from django.contrib.auth import get_user_model

User = get_user_model()

class IntegrationFlowTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        # Ensure the 'articles' module exists in the system (globally)
        self.article_module = Module.objects.create(
            code="articles",
            name="Articles Module",
            description="Manage blog posts",
            is_default=False
        )

    def test_end_to_end_flow(self):
        """
        Tests the complete flow:
        1. Create Company (Tenant)
        2. Register User
        3. Login (Get Token)
        4. Fail to access protected module (Articles)
        5. Grant access to module
        6. Successfully access module
        """
        
        # 1. Create Company (Public)
        company_data = {
            "name": "Tech Corp",
            "slug": "tech-corp",
            "branding": {}
        }
        response = self.client.post('/api/core/companies/', company_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Company.objects.count(), 1)
        company = Company.objects.get(slug="tech-corp")
        
        # 2. Register User (Public)
        user_data = {
            "username": "alice",
            "email": "alice@tech.corp",
            "password": "strongpassword123",
            "company_slug": "tech-corp"
        }
        response = self.client.post('/api/accounts/register/', user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.all_objects.count(), 1)

        # 3. Login / Get Token
        login_data = {
            "username": "alice",
            "password": "strongpassword123"
        }
        response = self.client.post('/api/accounts/token/', login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        access_token = response.data['access']

        # Setup authenticated client with Tenant Context
        self.client.credentials(
            HTTP_AUTHORIZATION='Bearer ' + access_token, 
            HTTP_X_COMPANY_SLUG='tech-corp'
        )

        # 4. Access Protected Endpoint (Articles) - Should Fail
        # Because the company 'tech-corp' does not have 'articles' module active yet
        response = self.client.get('/api/articles/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # 5. Grant Access (Simulating Admin/Licensing Action)
        TenantModule.objects.create(company=company, module=self.article_module, is_active=True)

        # 6. Access Protected Endpoint (Articles) - Should Succeed
        response = self.client.get('/api/articles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should return empty list initially
        self.assertEqual(response.data['count'], 0)

        # 7. Create an Article (Verify write access within module)
        article_data = {
            "title": "Hello World",
            "slug": "hello-world",
            "content": "First post",
            "is_published": True
        }
        response = self.client.post('/api/articles/', article_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], "Hello World")
