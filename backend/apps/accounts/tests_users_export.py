from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.core.models import Company
from apps.accounts.models import Role

User = get_user_model()

class UsersExportTest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Export Corp", slug="export-corp")
        self.user = User.all_objects.create_user(
            username="admin",
            email="admin@corp.com",
            password="pass",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_COMPANY_SLUG='export-corp')
        role = Role.objects.create(company=self.company, name="Member")
        User.all_objects.create_user(username="u1", email="u1@corp.com", password="pass", company=self.company, role=role)
        User.all_objects.create_user(username="u2", email="u2@corp.com", password="pass", company=self.company)

    def test_export_requires_staff(self):
        res_forbidden = self.client.get('/api/accounts/users/export/')
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)
        self.user.is_staff = True
        self.user.save(update_fields=['is_staff'])
        res_ok = self.client.get('/api/accounts/users/export/')
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertIn('text/csv', res_ok.headers.get('Content-Type', ''))
        body = res_ok.content.decode()
        self.assertTrue(body.startswith('username,email'))
        self.assertIn('u1,u1@corp.com', body)
        self.assertIn('u2,u2@corp.com', body)
