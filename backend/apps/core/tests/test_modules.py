from rest_framework import status
from rest_framework.test import APITestCase
from apps.core.models import Company
from django.contrib.auth import get_user_model
from apps.module_manager.models import Module, TenantModule

User = get_user_model()

class ModulesTestCase(APITestCase):
    def setUp(self):
        # Setup similar to test_api_flow
        self.company = Company.objects.create(name="Test Corp", slug="test-corp")
        self.user = User.objects.create_user(
            username="tester", 
            email="tester@test.corp", 
            password="pass",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)
        # Set tenant header
        self.client.credentials(HTTP_X_COMPANY_SLUG='test-corp')

        # Enable required modules for this tenant
        pages = Module.objects.create(code="pages", name="Pages")
        articles = Module.objects.create(code="articles", name="Articles")
        messenger = Module.objects.create(code="messenger", name="Messenger")
        TenantModule.objects.create(company=self.company, module=pages, is_active=True)
        TenantModule.objects.create(company=self.company, module=articles, is_active=True)
        TenantModule.objects.create(company=self.company, module=messenger, is_active=True)

    def test_pages_crud(self):
        # Create Page
        data = {"title": "About Us", "slug": "about", "content": "We are cool.", "is_published": True}
        response = self.client.post('/api/pages/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # List Pages
        response = self.client.get('/api/pages/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], "About Us")

    def test_articles_crud(self):
        # Create Article
        data = {"title": "News 1", "slug": "news-1", "content": "Extra extra!", "is_published": True}
        response = self.client.post('/api/articles/articles/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['author_name'], 'tester')

    def test_messenger_conversation(self):
        # Create Conversation
        data = {"title": "General Chat", "is_group": True}
        response = self.client.post('/api/messenger/conversations/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        conv_id = response.data['id']

        # Send Message
        msg_data = {"content": "Hello world"}
        response = self.client.post(f'/api/messenger/conversations/{conv_id}/send_message/', msg_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
