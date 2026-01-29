from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from apps.core.models import Company
from apps.accounts.models import User
from .models import Plan, Feature, PlanFeature, License

class LicensingTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.company = Company.objects.create(name="Test Corp", slug="test-corp")
        self.user = User.objects.create_user(
            username="admin", 
            email="admin@test.com", 
            password="password123", 
            company=self.company
        )
        self.client.force_authenticate(user=self.user)

        # Setup basic data
        self.feature = Feature.objects.create(code="max_users", name="Max Users")
        self.plan = Plan.objects.create(name="Pro Plan", price=99.99)
        PlanFeature.objects.create(plan=self.plan, feature=self.feature, value="100")

    def test_list_plans(self):
        response = self.client.get('/api/licensing/plans/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], "Pro Plan")

    def test_assign_license(self):
        # Assign license to company
        data = {
            "plan_id": self.plan.id
        }
        # Assuming we have an endpoint to assign/update license, or we test model directly if API is admin-only.
        # Let's check API first. If standard CRUD, it might be under /api/licenses/
        
        # Test Model directly first for logic
        license = License.objects.create(company=self.company, plan=self.plan)
        self.assertEqual(license.plan.name, "Pro Plan")
        self.assertTrue(license.is_active)

    def test_feature_check(self):
        # Verify if plan has feature
        self.assertTrue(self.plan.features.filter(code="max_users").exists())
        pf = PlanFeature.objects.get(plan=self.plan, feature__code="max_users")
        self.assertEqual(pf.value, "100")
