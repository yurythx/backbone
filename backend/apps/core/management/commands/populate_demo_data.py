import random

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.accounts.models import Role
from apps.articles.models import Article, Category, Tag
from apps.core.models import Company, TenantBranding
from apps.licensing.models import Feature, License, Plan, PlanFeature
from shared_kernel.tenant_context import set_current_company

User = get_user_model()


class Command(BaseCommand):
    help = "Populates the database with demo data for development/checking."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Starting demo data population..."))

        # 1. Create Features
        features_data = [
            ("max_users", "Max Users", "unlimited"),
            ("max_articles", "Max Articles", "unlimited"),
            ("max_storage", "Max Storage", "10GB"),
            ("has_cms", "Content Management System", "true"),
            ("has_api", "API Access", "true"),
        ]

        created_features = []
        for code, name, default_val in features_data:
            feat, _ = Feature.objects.get_or_create(code=code, defaults={"name": name})
            created_features.append((feat, default_val))

        # 2. Create "Free Premium" Plan
        plan, created = Plan.objects.get_or_create(name="Free Premium", defaults={"price": 0.00, "is_active": True})

        if created:
            self.stdout.write(f"Created Plan: {plan.name}")
            for feat, val in created_features:
                PlanFeature.objects.create(plan=plan, feature=feat, value=val)
        else:
            self.stdout.write(f"Plan {plan.name} already exists.")

        # 3. Create Companies
        companies_data = [
            {"name": "Alpha Corp", "slug": "alpha-corp", "domain": "alpha.localhost"},
            {"name": "Beta Inc", "slug": "beta-inc", "domain": "beta.localhost"},
        ]

        for comp_data in companies_data:
            company, created = Company.objects.get_or_create(
                slug=comp_data["slug"],
                defaults={
                    "name": comp_data["name"],
                    "domain": comp_data["domain"],
                    "onboarding_completed": True,
                    "onboarding_step": 4,
                },
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f"Created Company: {company.name}"))
            else:
                self.stdout.write(f"Company {company.name} already exists.")

            # 3.1 Create/Update Branding
            branding_data = {
                "alpha-corp": {"palette": "django-green", "primary": "#0C4B33"},
                "beta-inc": {"palette": "ocean-blue", "primary": "#0077B6"},
            }

            b_info = branding_data.get(company.slug, {"palette": "slate-gray", "primary": "#64748B"})

            TenantBranding.objects.get_or_create(
                company=company,
                defaults={
                    "company_name": company.name,
                    "theme_palette": b_info["palette"],
                    "primary_color": b_info["primary"],
                    "footer_text": f"© 2024 {company.name}. All rights reserved.",
                },
            )

            # Set context for tenant-aware models
            set_current_company(company)

            # 4. Create License
            License.objects.get_or_create(company=company, defaults={"plan": plan, "is_active": True})

            # 5. Create Roles
            admin_role, _ = Role.objects.get_or_create(
                company=company, name="Admin", defaults={"is_system_role": True, "permissions": ["*"]}
            )
            user_role, _ = Role.objects.get_or_create(
                company=company,
                name="User",
                defaults={"is_system_role": True, "permissions": ["articles.read", "articles.create"]},
            )

            # 6. Create Categories and Tags
            categories = []
            for i in range(1, 4):
                cat_name = f"Category {i} - {company.name}"
                cat, _ = Category.objects.get_or_create(
                    company=company, slug=slugify(cat_name), defaults={"name": cat_name}
                )
                categories.append(cat)

            tags = []
            for i in range(1, 4):
                tag_name = f"Tag {i}"
                tag, _ = Tag.objects.get_or_create(company=company, slug=slugify(tag_name), defaults={"name": tag_name})
                tags.append(tag)

            # 7. Create Users (5 Superadmin/Admin, 5 Standard)
            # Admin Users
            for i in range(1, 6):
                username = f"admin{i}_{company.slug}"
                email = f"admin{i}@{company.slug}.com"
                user, created = User.objects.get_or_create(
                    username=username,
                    company=company,
                    defaults={
                        "email": email,
                        "is_staff": True,
                        "is_superuser": True,  # Request asked for "superadmin"
                        "role": admin_role,
                    },
                )
                if created:
                    user.set_password("password123")
                    user.save()
                    self.stdout.write(f"Created Admin: {username}")

                self._create_articles_for_user(user, company, categories, tags)

            # Standard Users
            for i in range(1, 6):
                username = f"user{i}_{company.slug}"
                email = f"user{i}@{company.slug}.com"
                user, created = User.objects.get_or_create(
                    username=username,
                    company=company,
                    defaults={"email": email, "is_staff": False, "is_superuser": False, "role": user_role},
                )
                if created:
                    user.set_password("password123")
                    user.save()
                    self.stdout.write(f"Created User: {username}")

                self._create_articles_for_user(user, company, categories)

        self.stdout.write(self.style.SUCCESS("Successfully populated demo data!"))

    def _create_articles_for_user(self, user, company, categories, tags=None):
        # Create 2 articles per user
        if Article.objects.filter(author=user, company=company).count() >= 2:
            return

        for i in range(1, 3):
            title = f"Article {i} by {user.username}"
            slug = slugify(f"{title}-{company.slug}")
            # Ensure unique slug if rerunning or conflict
            if Article.objects.filter(slug=slug, company=company).exists():
                slug = f"{slug}-{random.randint(1000, 9999)}"

            article = Article.objects.create(
                company=company,
                title=title,
                slug=slug,
                content=f"This is the content for {title}. Lorem ipsum dolor sit amet.",
                author=user,
                category=random.choice(categories),
                status=Article.STATUS_PUBLISHED,
            )
            if tags:
                article.tags.set(random.sample(tags, k=min(len(tags), 2)))
            if tags:
                article.tags.set(random.sample(tags, k=min(len(tags), 2)))
