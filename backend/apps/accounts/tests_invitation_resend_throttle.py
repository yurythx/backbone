from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.core.models import Company
from apps.accounts.models import Role, Invitation
from django.core.cache import cache

User = get_user_model()

class InvitationResendThrottleTest(APITestCase):
    def setUp(self):
        cache.clear()
        self.company = Company.objects.create(name="Throttle Corp", slug="throttle-corp")
        self.user = User.all_objects.create_user(
            username="inviter",
            email="i@corp.com",
            password="pass",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_COMPANY_SLUG='throttle-corp')

        role = Role.objects.create(company=self.company, name="Member")
        res = self.client.post('/api/accounts/invitations/', {"email": "new@corp.com", "role": role.id}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.invite = Invitation.objects.latest('created_at')

    def test_resend_throttled(self):
        self.user.is_staff = True
        self.user.save(update_fields=['is_staff'])
        url = f'/api/accounts/invitations/{self.invite.id}/resend/'
        ok = self.client.post(url, {}, format='json')
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        throttled = self.client.post(url, {}, format='json')
        self.assertEqual(throttled.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
