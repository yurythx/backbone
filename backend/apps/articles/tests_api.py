from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.core.models import Company
from apps.module_manager.models import Module, TenantModule
from apps.accounts.models import Role
from apps.articles.models import Category, Tag

User = get_user_model()

class ArticlesAPITest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Test Corp", slug="test-corp")
        # Basic user
        self.user = User.all_objects.create_user(
            username="tester",
            email="tester@test.corp",
            password="pass",
            company=self.company
        )
        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_COMPANY_SLUG='test-corp')

        # Modules
        self.mod_articles = Module.objects.create(code="articles", name="Articles")
        TenantModule.objects.create(company=self.company, module=self.mod_articles, is_active=True)

        # Data
        self.cat = Category.objects.create(name="Tech", slug="tech", company=self.company)
        self.tag = Tag.objects.create(name="Python", slug="python", company=self.company)

    def test_read_endpoints_without_role(self):
        # List articles (no role required for read)
        res = self.client.get('/api/articles/articles/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # List categories
        res = self.client.get('/api/articles/categories/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) >= 1)

        # List tags
        res = self.client.get('/api/articles/tags/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) >= 1)

    def test_write_without_role(self):
        # Create article without role (allowed)
        payload = {
            "title": "News 1",
            "slug": "news-api-1",
            "content": "Extra extra!",
            "is_published": False,
            "category": self.cat.id,
            "tags": [self.tag.id],
        }
        res = self.client.post('/api/articles/articles/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Assign role with permission and retry (should still succeed)
        role = Role.objects.create(company=self.company, name="Editor", permissions=["articles.article_manage"])
        self.user.role = role
        self.user.save(update_fields=['role'])

        res = self.client.post('/api/articles/articles/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['title'], "News 1")
        
        # Create another article with different slug
        payload2 = dict(payload)
        payload2['title'] = "News 2"
        payload2['slug'] = "news-api-2"
        res2 = self.client.post('/api/articles/articles/', payload2, format='json')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

    def test_module_disabled_blocks_access(self):
        # Disable module
        tm = TenantModule.all_objects.get(company=self.company, module=self.mod_articles)
        tm.is_active = False
        tm.save(update_fields=['is_active'])

        res = self.client.get('/api/articles/articles/')
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
