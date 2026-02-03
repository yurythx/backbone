from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.core.models import Company
from apps.accounts.models import Role
from apps.module_manager.models import Module, TenantModule
from apps.licensing.models import Feature, Plan, PlanFeature, License
from .models import Article, Category, Tag

User = get_user_model()

class ArticleAPITest(APITestCase):
    def setUp(self):
        # Create Companies
        self.company1 = Company.objects.create(name="Company 1", slug="company-1")
        self.company2 = Company.objects.create(name="Company 2", slug="company-2")

        # Create Module and enable for companies
        self.module = Module.objects.create(code="articles", name="Articles")
        TenantModule.objects.create(company=self.company1, module=self.module, is_active=True)
        TenantModule.objects.create(company=self.company2, module=self.module, is_active=True)

        # Create Plan and Features for testing
        self.feat_articles = Feature.objects.create(code="max_articles", name="Max Articles")
        self.feat_users = Feature.objects.create(code="max_users", name="Max Users")
        self.plan = Plan.objects.create(name="Enterprise")
        PlanFeature.objects.create(plan=self.plan, feature=self.feat_articles, value="unlimited")
        PlanFeature.objects.create(plan=self.plan, feature=self.feat_users, value="unlimited")

        # Assign Licenses
        License.objects.create(company=self.company1, plan=self.plan, is_active=True)
        License.objects.create(company=self.company2, plan=self.plan, is_active=True)

        # Create Role with permission
        self.role1 = Role.objects.create(
            company=self.company1, 
            name="Admin", 
            permissions=["articles.article_manage"]
        )
        self.role2 = Role.objects.create(
            company=self.company2, 
            name="Admin", 
            permissions=["articles.article_manage"]
        )

        # Create Users with Roles
        self.user1 = User.objects.create_user(
            username="user1", 
            password="password", 
            company=self.company1,
            role=self.role1
        )
        self.user2 = User.objects.create_user(
            username="user2", 
            password="password", 
            company=self.company2,
            role=self.role2
        )

        # Set default company header for client (can be overridden in specific tests)
        self.client.credentials(HTTP_X_COMPANY_SLUG=self.company1.slug)

        # Create Category
        self.cat1 = Category.objects.create(name="Cat 1", slug="cat-1", company=self.company1)
        
        # Create Article for Company 1
        self.article1 = Article.objects.create(
            title="Article 1",
            slug="article-1",
            content="Content 1",
            company=self.company1,
            category=self.cat1,
            author=self.user1
        )

    def test_tenant_isolation_list(self):
        """
        User from Company 1 should only see articles from Company 1.
        """
        self.client.force_authenticate(user=self.user1)
        self.client.credentials(HTTP_X_COMPANY_SLUG=self.company1.slug)
        response = self.client.get('/api/articles/articles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check if list is wrapped in results or not based on pagination
        data = response.data
        if isinstance(data, dict) and 'results' in data:
            results = data['results']
        else:
            results = data
            
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['title'], "Article 1")

        # User from Company 2 should see nothing
        self.client.force_authenticate(user=self.user2)
        self.client.credentials(HTTP_X_COMPANY_SLUG=self.company2.slug)
        response = self.client.get('/api/articles/articles/')
        
        data = response.data
        if isinstance(data, dict) and 'results' in data:
            results = data['results']
        else:
            results = data
            
        self.assertEqual(len(results), 0)

    def test_tenant_isolation_detail(self):
        """
        User from Company 2 should not be able to access detail of Article 1.
        """
        self.client.force_authenticate(user=self.user2)
        self.client.credentials(HTTP_X_COMPANY_SLUG=self.company2.slug)
        response = self.client.get(f'/api/articles/articles/{self.article1.id}/')
        # Since get_queryset filters by company, it should return 404
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_article(self):
        """
        Test article creation.
        """
        self.client.force_authenticate(user=self.user1)
        payload = {
            "title": "New Article",
            "slug": "new-article",
            "content": "New content",
            "category": self.cat1.id
        }
        response = self.client.post('/api/articles/articles/', payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        
        # Verify it was created for company 1
        article = Article.objects.get(slug="new-article")
        self.assertEqual(article.company, self.company1)

    def test_update_article(self):
        """
        Test updating an article.
        """
        self.client.force_authenticate(user=self.user1)
        payload = {"title": "Updated Title"}
        response = self.client.patch(f'/api/articles/articles/{self.article1.id}/', payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.article1.refresh_from_db()
        self.assertEqual(self.article1.title, "Updated Title")

    def test_search_and_filter(self):
        """
        Test search and category filtering.
        """
        # Create another article
        Article.objects.create(
            title="Search Me",
            slug="search-me",
            content="Content",
            company=self.company1,
            author=self.user1
        )
        
        self.client.force_authenticate(user=self.user1)
        
        # Search by title
        response = self.client.get('/api/articles/articles/?title=Search')
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], "Search Me")
        
        # Filter by category
        response = self.client.get(f'/api/articles/articles/?category={self.cat1.id}')
        data = response.data.get('results', response.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], "Article 1")
