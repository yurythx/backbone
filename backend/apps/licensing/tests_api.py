from rest_framework import status
from rest_framework.test import APITestCase
from apps.core.models import Company
from apps.licensing.models import Feature, Plan, PlanFeature, License
from django.contrib.auth import get_user_model

User = get_user_model()

class LicensingAPITest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Lic Corp", slug="lic-corp")
        self.user = User.all_objects.create_user(
            username="licuser",
            email="lic@corp.com",
            password="pass",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_COMPANY_SLUG='lic-corp')

        # Seed features and plan
        feat_users = Feature.objects.create(code="max_users", name="Max Users")
        feat_cms = Feature.objects.create(code="has_cms", name="CMS")
        self.plan = Plan.objects.create(name="Pro", price="99.00")
        PlanFeature.objects.create(plan=self.plan, feature=feat_users, value="100")
        PlanFeature.objects.create(plan=self.plan, feature=feat_cms, value="true")

    def test_create_and_get_license(self):
        res = self.client.post('/api/licensing/my-license/', {"plan": self.plan.id}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        lic_id = res.data['id']
        lic = License.objects.get(id=lic_id)
        self.assertEqual(lic.company, self.company)
        self.assertEqual(lic.plan, self.plan)

        list_res = self.client.get('/api/licensing/my-license/')
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertTrue(any(item['id'] == lic_id for item in list_res.data['results']))
