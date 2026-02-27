from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.core.models import Company
from apps.accounts.models import Role, Invitation
from apps.licensing.models import Plan, Feature, PlanFeature, License

User = get_user_model()

class InvitationFlowTest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Invite Corp", slug="invite-corp")
        # Role com permissão admin.user_manage (necessária após I-A3)
        self.admin_role = Role.objects.create(
            company=self.company,
            name="Admin",
            permissions=["admin.user_manage"]
        )
        self.user = User.objects.create_user(
            username="inviter",
            email="i@corp.com",
            password="pass",
            company=self.company,
            role=self.admin_role
        )
        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_COMPANY_SLUG='invite-corp')

        self.role = Role.objects.create(company=self.company, name="Member")
        plan = Plan.objects.create(name="Test Plan", price="0.00")
        feat = Feature.objects.create(code="max_users", name="Max Users")
        PlanFeature.objects.create(plan=plan, feature=feat, value="100")
        License.objects.create(company=self.company, plan=plan, is_active=True)

    def test_invitation_expired_on_accept(self):
        # Create invitation
        res = self.client.post('/api/accounts/invitations/', {"email": "new@corp.com", "role": self.role.id}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        inv = Invitation.objects.latest('created_at')
        # Force expiration to past
        inv.expires_at = timezone.now() - timezone.timedelta(days=1)
        inv.save(update_fields=['expires_at'])

        # Attempt accept
        self.client.logout()
        payload = {
            "token": inv.token,
            "first_name": "Late",
            "last_name": "User",
            "password": "secretpass",
            "confirm_password": "secretpass"
        }
        res2 = self.client.post('/api/accounts/invitations/accept/', payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
