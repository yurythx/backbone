from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.core.models import Company
from django.contrib.auth import get_user_model

User = get_user_model()

class ApiFlowTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_full_flow(self):
        # 1. Create Company (Public)
        company_data = {
            "name": "Tech Corp",
            "slug": "tech-corp",
            "branding": {}
        }
        response = self.client.post('/api/core/companies/', company_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Company.objects.count(), 1)
        
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

        # 4. Access Protected Endpoint (List Companies)
        # Without token -> 401
        self.client.credentials() # clear
        response = self.client.get('/api/core/companies/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # With token -> 200
        self.client.credentials(HTTP_AUTHORIZATION='Bearer ' + access_token, HTTP_X_COMPANY_SLUG='tech-corp')
        
        response = self.client.get('/api/core/companies/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['slug'], 'tech-corp')
