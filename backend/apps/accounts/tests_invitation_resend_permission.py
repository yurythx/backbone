from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.core.models import Company
from apps.accounts.models import Role, Invitation

User = get_user_model()

class InvitationResendPermissionTest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Perm Corp", slug="perm-corp")
        self.user = User.all_objects.create_user(
            username="user",
            email="user@corp.com",
            password="pass",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_COMPANY_SLUG='perm-corp')
        role = Role.objects.create(company=self.company, name="Member")
        res = self.client.post('/api/accounts/invitations/', {"email": "new@corp.com", "role": role.id}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.invite = Invitation.objects.latest('created_at')

    def test_resend_requires_staff(self):
        url = f'/api/accounts/invitations/{self.invite.id}/resend/'
        res_forbidden = self.client.post(url, {}, format='json')
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)
        self.user.is_staff = True
        self.user.save(update_fields=['is_staff'])
        res_ok = self.client.post(url, {}, format='json')
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
