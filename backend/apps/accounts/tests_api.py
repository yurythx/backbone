from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.core.models import Company
from apps.accounts.models import Role, Invitation, UserThemePreference

User = get_user_model()

class AccountsAPITest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Test Corp", slug="test-corp")
        # Set generous limits for testing
        from apps.licensing.models import License, Plan, Feature, PlanFeature
        plan = Plan.objects.create(name="Enterprise")
        feat = Feature.objects.create(code="max_users", name="Max Users")
        PlanFeature.objects.create(plan=plan, feature=feat, value="100")
        License.objects.create(company=self.company, plan=plan, is_active=True)
        
        self.user = User.objects.create_user(
            username="tester",
            email="tester@test.corp",
            password="pass",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_COMPANY_SLUG='test-corp')

    def test_token_obtain_pair(self):
        self.client.logout()
        res = self.client.post('/api/accounts/token/', {"username": "tester", "password": "pass"}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)

    def test_user_me_get_and_patch(self):
        res = self.client.get('/api/accounts/users/me/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['username'], 'tester')
        # Patch
        res2 = self.client.patch('/api/accounts/users/me/', {"first_name": "Test"}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['first_name'], 'Test')

    def test_role_crud_and_protect_system_role(self):
        # Create role
        res = self.client.post('/api/accounts/roles/', {"name": "Editor", "permissions": ["articles.article_manage"]}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        role_id = res.data['id']
        # Delete allowed
        del_res = self.client.delete(f'/api/accounts/roles/{role_id}/')
        self.assertEqual(del_res.status_code, status.HTTP_204_NO_CONTENT)
        # System role cannot be deleted
        sys_role = Role.objects.create(company=self.company, name="System", is_system_role=True)
        res_forbidden = self.client.delete(f'/api/accounts/roles/{sys_role.id}/')
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

    def test_invitation_create_and_accept_flow(self):
        # Create role
        role = Role.objects.create(company=self.company, name="Member")
        # Create invitation
        res = self.client.post('/api/accounts/invitations/', {"email": "new@test.corp", "role": role.id}, format='json')
        if res.status_code != status.HTTP_201_CREATED:
            print(f"Invitation Error: {res.data}")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        
        inv = Invitation.objects.latest('created_at')
        self.assertEqual(inv.email, "new@test.corp")
        # Accept invitation via service endpoint
        self.client.logout()
        accept_payload = {
            "token": inv.token,
            "first_name": "New",
            "last_name": "Member",
            "password": "secretpass",
            "confirm_password": "secretpass",
        }
        res2 = self.client.post('/api/accounts/invitations/accept/', accept_payload, format='json')
        self.assertIn(res2.status_code, (status.HTTP_201_CREATED, status.HTTP_200_OK))

    def test_theme_preference_update(self):
        # Ensure preference object exists
        pref, _ = UserThemePreference.objects.get_or_create(user=self.user, defaults={
            "theme_palette": "blue",
            "use_tenant_theme": True,
            "dark_mode_preference": "system"
        })
        # Update via hypothetical endpoint
        res = self.client.put('/api/accounts/preferences/theme/update_current/', {
            "theme_palette": "royal-purple",
            "use_tenant_theme": False,
            "dark_mode_preference": "dark"
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_user_update_with_role_and_avatar(self):
        # Create a new role
        role = Role.objects.create(company=self.company, name="Admin")
        
        # Ensure role is visible/valid for the company context
        # The serializer validates role queryset, but we need to ensure test context is correct
        
        # Create a temporary image file for avatar upload
        import tempfile
        from PIL import Image
        
        image = Image.new('RGB', (100, 100))
        tmp_file = tempfile.NamedTemporaryFile(suffix='.jpg')
        image.save(tmp_file)
        tmp_file.seek(0)
        
        # Prepare multipart/form-data payload
        data = {
            'first_name': 'Updated Name',
            'role': role.id,
            'avatar': tmp_file
        }
        
        # Perform PATCH request
        # Note: We use the user's ID in the URL
        url = f'/api/accounts/users/{self.user.id}/'
        res = self.client.patch(url, data, format='multipart')
        
        if res.status_code != status.HTTP_200_OK:
            print(f"User Update Error: {res.data}")
            
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # Verify database update
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Updated Name')
        self.assertEqual(self.user.role.id, role.id)
        self.assertTrue(bool(self.user.avatar)) # Check if avatar exists
        
        tmp_file.close()

    def test_user_update_password(self):
        url = f'/api/accounts/users/{self.user.id}/'
        data = {
            'password': 'newpassword123'
        }
        res = self.client.patch(url, data, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # Verify login with new password
        self.client.logout()
        login_res = self.client.post('/api/accounts/token/', {
            "username": self.user.username,
            "password": "newpassword123"
        }, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
