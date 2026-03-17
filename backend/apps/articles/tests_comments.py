from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Role
from apps.articles.models import Article, Category, Comment
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

    def test_approve_and_disapprove_comment(self):
        role, _ = Role.all_objects.get_or_create(
            company=self.company, name="Editor", defaults={"permissions": ["articles.article_manage"]}
        )
        if role.permissions != ["articles.article_manage"]:
            role.permissions = ["articles.article_manage"]
            role.save(update_fields=["permissions"])
        self.user.role = role
        self.user.save(update_fields=["role"])

        comment = Comment.objects.create(
            company=self.company, article=self.article, author=self.user, content="Pendente", is_approved=False
        )

        res_approve = self.client.post(f"/api/articles/comments/{comment.id}/approve/", {}, format="json")
        self.assertEqual(res_approve.status_code, status.HTTP_200_OK)
        comment.refresh_from_db()
        self.assertTrue(comment.is_approved)

        res_disapprove = self.client.post(f"/api/articles/comments/{comment.id}/disapprove/", {}, format="json")
        self.assertEqual(res_disapprove.status_code, status.HTTP_200_OK)
        comment.refresh_from_db()
        self.assertFalse(comment.is_approved)

    def test_bulk_actions_and_date_filters(self):
        role, _ = Role.all_objects.get_or_create(
            company=self.company, name="Editor", defaults={"permissions": ["articles.article_manage"]}
        )
        if role.permissions != ["articles.article_manage"]:
            role.permissions = ["articles.article_manage"]
            role.save(update_fields=["permissions"])
        self.user.role = role
        self.user.save(update_fields=["role"])

        c1 = Comment.objects.create(
            company=self.company, article=self.article, author=self.user, content="C1", is_approved=False
        )
        c2 = Comment.objects.create(
            company=self.company, article=self.article, author=self.user, content="C2", is_approved=False
        )

        res_bulk_approve = self.client.post(
            "/api/articles/comments/bulk_approve/", {"ids": [c1.id, c2.id]}, format="json"
        )
        self.assertEqual(res_bulk_approve.status_code, status.HTTP_200_OK)
        c1.refresh_from_db()
        c2.refresh_from_db()
        self.assertTrue(c1.is_approved)
        self.assertTrue(c2.is_approved)

        res_bulk_disapprove = self.client.post(
            "/api/articles/comments/bulk_disapprove/", {"ids": [c1.id]}, format="json"
        )
        self.assertEqual(res_bulk_disapprove.status_code, status.HTTP_200_OK)
        c1.refresh_from_db()
        self.assertFalse(c1.is_approved)

        gte = c1.created_at.isoformat()
        res_filter = self.client.get("/api/articles/comments/", {"created_at__gte": gte})
        self.assertEqual(res_filter.status_code, status.HTTP_200_OK)
        ids = [c["id"] for c in res_filter.data.get("results", [])]
        self.assertIn(c1.id, ids)
        self.assertIn(c2.id, ids)

        res_bulk_delete = self.client.post("/api/articles/comments/bulk_delete/", {"ids": [c2.id]}, format="json")
        self.assertEqual(res_bulk_delete.status_code, status.HTTP_200_OK)
        self.assertFalse(Comment.objects.filter(id=c2.id).exists())
