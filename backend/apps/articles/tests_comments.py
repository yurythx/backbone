from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role
from apps.articles.models import Article, Category
from apps.core.models import Company
from apps.module_manager.models import Module, TenantModule

User = get_user_model()


class ArticleCommentsAPITest(APITestCase):
    def setUp(self):
        self.company = Company.objects.create(name="Comm Corp", slug="comm-corp")
        self.user = User.all_objects.create_user(
            username="commuser", email="c@corp.com", password="pass", company=self.company
        )
        self.client.force_authenticate(user=self.user)
        self.client.credentials(HTTP_X_COMPANY_SLUG="comm-corp")

        mod = Module.objects.create(code="articles", name="Articles")
        TenantModule.objects.create(company=self.company, module=mod, is_active=True)

        self.category = Category.objects.create(company=self.company, name="General", slug="general")
        self.article = Article.objects.create(
            company=self.company, author=self.user, title="Post", slug="post-1", content="x", category=self.category
        )

    def test_create_comment_requires_role(self):
        payload = {"article": self.article.id, "content": "Nice", "is_approved": True}
        res_forbidden = self.client.post("/api/articles/comments/", payload, format="json")
        self.assertEqual(res_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        role, _ = Role.all_objects.get_or_create(
            company=self.company, name="Editor", defaults={"permissions": ["articles.article_manage"]}
        )
        if role.permissions != ["articles.article_manage"]:
            role.permissions = ["articles.article_manage"]
            role.save(update_fields=["permissions"])
        self.user.role = role
        self.user.save(update_fields=["role"])

        res_ok = self.client.post("/api/articles/comments/", payload, format="json")
        self.assertEqual(res_ok.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_ok.data["content"], "Nice")

    def test_filter_comments(self):
        role, _ = Role.all_objects.get_or_create(
            company=self.company, name="Editor", defaults={"permissions": ["articles.article_manage"]}
        )
        if role.permissions != ["articles.article_manage"]:
            role.permissions = ["articles.article_manage"]
            role.save(update_fields=["permissions"])
        self.user.role = role
        self.user.save(update_fields=["role"])
        self.client.post(
            "/api/articles/comments/",
            {"article": self.article.id, "content": "Nice", "is_approved": True},
            format="json",
        )
        self.client.post(
            "/api/articles/comments/",
            {"article": self.article.id, "content": "Hold", "is_approved": False},
            format="json",
        )

        res_approved = self.client.get("/api/articles/comments/?is_approved=true")
        self.assertEqual(res_approved.status_code, status.HTTP_200_OK)
        self.assertTrue(all(c["is_approved"] is True for c in res_approved.data["results"]))
