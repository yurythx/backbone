from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.utils.text import slugify

from apps.accounts.models import Role
from apps.articles.models import Article, Category, Tag
from apps.core.models import Company, TenantBranding
from apps.licensing.models import Feature, License, Plan, PlanFeature
from apps.module_manager.models import Module, TenantModule
from apps.pages.models import Page
from shared_kernel.tenant_context import set_current_company

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds the database with CORE System Data (Features, Plans) and DEFAULT Tenant (Support). Safe to run multiple times."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Starting System and Default Tenant Seeding..."))

        # 1. CORE FEATURES
        features_data = [
            ("max_users", "Max Users", "unlimited"),
            ("max_articles", "Max Articles", "unlimited"),
            ("max_storage", "Max Storage", "10GB"),
            ("has_cms", "Content Management System", "true"),
            ("has_api", "API Access", "true"),
        ]

        created_features = []
        for code, name, default_val in features_data:
            feat, created = Feature.objects.get_or_create(code=code, defaults={"name": name})
            created_features.append((feat, default_val))
            if created:
                self.stdout.write(f"  [+] Created Feature: {name}")

        # 2. DEFAULT PLAN (Requested: "Free Premium")
        plan, created = Plan.objects.get_or_create(name="Free Premium", defaults={"price": 0.00, "is_active": True})

        if created:
            self.stdout.write(f"  [+] Created Plan: {plan.name}")
            for feat, val in created_features:
                PlanFeature.objects.create(plan=plan, feature=feat, value=val)
        else:
            self.stdout.write(f"  [.] Plan {plan.name} already exists")

        # 3. DEFAULT TENANT (Empresa Raiz)
        company = Company.all_companies.filter(slug="raiz").first()
        created = False

        if not company:
            company = Company.all_companies.create(
                slug="raiz", name="Empresa Raiz", domain="raiz.localhost", onboarding_completed=True, onboarding_step=4
            )
            created = True
        else:
            self.stdout.write(f"  [.] Company {company.name} (slug: {company.slug}) already exists")

        if created:
            self.stdout.write(self.style.SUCCESS(f"  [+] Created Company: {company.name}"))
            # Default Branding
            TenantBranding.objects.create(company=company, company_name="Empresa Raiz", primary_color="#0C4B33")

        else:
            self.stdout.write(f"  [.] Company {company.name} already exists")

        # Set context to act within this tenant
        set_current_company(company)

        # 4. LICENSE for Default Tenant
        License.objects.get_or_create(company=company, defaults={"plan": plan, "is_active": True})

        # 5. ROLES for Default Tenant
        admin_role, _ = Role.objects.get_or_create(
            company=company, name="Admin", defaults={"is_system_role": True, "permissions": ["*"]}
        )

        # 6. SUPER ADMIN USER (suporte / suporte123)
        user, created = User.all_objects.get_or_create(
            username="suporte",
            defaults={
                "company": company,
                "email": "suporte@backbone.com",
                "is_staff": True,
                "is_superuser": True,
                "role": admin_role,
            },
        )

        if created:
            user.set_password("suporte123")
            user.save()
            self.stdout.write(self.style.SUCCESS(f"  [+] Created Superuser: {user.username} (Pass: suporte123)"))
        else:
            self.stdout.write(f"  [.] User {user.username} already exists")

        # 7. COLLABORATOR ROLE
        colab_role, _ = Role.objects.get_or_create(
            company=company,
            name="Colaborador",
            defaults={"permissions": ["articles.view_*", "articles.add_article", "messenger.*", "pages.view_page"]},
        )
        self.stdout.write(f"  [+] Role {colab_role.name} verified")

        # 8. TEST USER (yuri / yuri123)
        test_user, created = User.all_objects.get_or_create(
            username="yuri",
            defaults={
                "company": company,
                "email": "yuri@backbone.com",
                "first_name": "Yuri",
                "last_name": "Menezes",
                "role": colab_role,
            },
        )

        if created:
            test_user.set_password("yuri123")
            test_user.save()
            self.stdout.write(self.style.SUCCESS(f"  [+] Created Test User: {test_user.username} (Pass: yuri123)"))

        # 9. CATEGORIES & TAGS
        cats = ["Geral", "Notícias", "Tecnologia", "RH"]
        cat_objs = []
        for name in cats:
            obj, _ = Category.objects.get_or_create(company=company, name=name, defaults={"slug": slugify(name)})
            cat_objs.append(obj)

        tags = ["Backbone", "Novidade", "Tutorial", "Destaque"]
        tag_objs = []
        for name in tags:
            obj, _ = Tag.objects.get_or_create(company=company, name=name, defaults={"slug": slugify(name)})
            tag_objs.append(obj)
        self.stdout.write(self.style.SUCCESS("  [+] Categories and Tags created"))

        # 10. SAMPLE ARTICLES
        articles_data = [
            {
                "title": "Bem-vindo ao Backbone",
                "excerpt": "Conheça a nova plataforma centralizada da sua empresa.",
                "content": "Estamos muito felizes em anunciar o lançamento do Backbone! Uma ferramenta completa para comunicação interna.",
                "status": Article.STATUS_PUBLISHED,
                "is_public": True,
            },
            {
                "title": "Manual do Colaborador",
                "excerpt": "Tudo o que você precisa saber para começar.",
                "content": "Neste manual detalhamos as políticas internas e como utilizar cada módulo do sistema.",
                "status": Article.STATUS_PUBLISHED,
                "is_public": False,
            },
            {
                "title": "Próximas Atualizações",
                "excerpt": "O que vem por aí no roadmap de 2026.",
                "content": "Estamos preparando o módulo de IA para transcrição de áudio e busca inteligente.",
                "status": Article.STATUS_DRAFT,
                "is_public": False,
            },
        ]

        for i, a_data in enumerate(articles_data):
            slug = slugify(a_data["title"])
            art, art_created = Article.objects.get_or_create(
                company=company,
                slug=slug,
                defaults={
                    "title": a_data["title"],
                    "content": a_data["content"],
                    "excerpt": a_data["excerpt"],
                    "status": a_data["status"],
                    "is_public": a_data["is_public"],
                    "author": user,  # Admin author
                    "category": cat_objs[i % len(cat_objs)],
                    "published_at": timezone.now() if a_data["status"] == Article.STATUS_PUBLISHED else None,
                },
            )
            if art_created:
                art.tags.add(tag_objs[0], tag_objs[i % len(tag_objs)])
                self.stdout.write(f"  [+] Created Article: {art.title}")

        # 11. SAMPLE PAGES
        pages_data = [
            {
                "title": "Home",
                "slug": "home",
                "content": "<h1>Bem-vindo à nossa intranet</h1><p>Esta é a página inicial configurável.</p>",
                "status": Page.STATUS_PUBLISHED,
            },
            {
                "title": "Sobre Nós",
                "slug": "sobre",
                "content": "<p>Nossa missão é conectar pessoas e processos de forma eficiente.</p>",
                "status": Page.STATUS_PUBLISHED,
            },
        ]

        for p_data in pages_data:
            pg, pg_created = Page.objects.get_or_create(
                company=company,
                slug=p_data["slug"],
                defaults={"title": p_data["title"], "content": p_data["content"], "status": p_data["status"]},
            )
            if pg_created:
                self.stdout.write(f"  [+] Created Page: {pg.title}")

        # 12. MODULES
        modules_data = [
            {"code": "calendar", "name": "Agenda", "description": "Gestão de eventos e compromissos"},
            {"code": "finance", "name": "Financeiro", "description": "Gestão de receitas e despesas"},
            {"code": "articles", "name": "Artigos", "description": "Gestão de conteúdo"},
            {"code": "pages", "name": "Páginas", "description": "Páginas institucionais"},
            {"code": "messenger", "name": "Mensagens", "description": "Chat interno"},
        ]

        for mod_data in modules_data:
            module, _ = Module.objects.get_or_create(
                code=mod_data["code"],
                defaults={"name": mod_data["name"], "description": mod_data["description"], "is_default": True},
            )
            # Enable for default tenant
            TenantModule.objects.get_or_create(company=company, module=module, defaults={"is_active": True})
            self.stdout.write(f"  [+] Module verified: {module.name}")

        self.stdout.write(self.style.SUCCESS("System Seeding completed!"))

        # Health Check
        self.verify_seed_health()

    def verify_seed_health(self):
        """Verifica se o seed foi executado com sucesso"""
        self.stdout.write(self.style.WARNING("\n🔍 Running health check..."))

        issues = []
        warnings = []

        # 1. Verificar Features
        feature_count = Feature.objects.count()
        if feature_count == 0:
            issues.append("No features created")
        else:
            self.stdout.write(self.style.SUCCESS(f"  ✓ Features: {feature_count} found"))

        # 2. Verificar Planos
        plan_count = Plan.objects.count()
        if plan_count == 0:
            issues.append("No plans created")
        else:
            self.stdout.write(self.style.SUCCESS(f"  ✓ Plans: {plan_count} found"))

        # 3. Verificar Empresa Padrão
        try:
            support_company = Company.all_companies.filter(slug="raiz").first() or Company.all_companies.get(
                slug="projetoravenna"
            )
            self.stdout.write(
                self.style.SUCCESS(f"  ✓ Root Company: {support_company.name} (ID: {support_company.id})")
            )

            # 3.1 Verificar Branding
            if not hasattr(support_company, "theme_branding"):
                warnings.append("Root company has no branding configured")
            else:
                self.stdout.write(self.style.SUCCESS("  ✓ Branding configured"))
        except (Company.DoesNotExist, AttributeError):
            issues.append("Root company not found (slug: raiz or projetoravenna)")

        # 4. Verificar Licença
        try:
            license = License.objects.filter(company=support_company).first()
            if license and not license.is_active:
                warnings.append("Root company license is inactive")
            elif license:
                self.stdout.write(self.style.SUCCESS(f"  ✓ License: {license.plan.name} (Active: {license.is_active})"))
            else:
                issues.append("No license for root company")
        except Exception:
            issues.append("Error checking license")

        # 5. Verificar Superuser
        superuser_count = User.all_objects.filter(is_superuser=True).count()
        if superuser_count == 0:
            issues.append("No superuser found")
        else:
            self.stdout.write(self.style.SUCCESS(f"  ✓ Superusers: {superuser_count} found"))

        # 6. Verificar Roles
        admin_role_count = Role.objects.filter(name="Admin").count()
        if admin_role_count == 0:
            warnings.append("No Admin role found")
        else:
            self.stdout.write(self.style.SUCCESS(f"  ✓ Admin roles: {admin_role_count} found"))

        # Resultado
        self.stdout.write("")
        if issues:
            self.stdout.write(self.style.ERROR(f"❌ Health check FAILED with {len(issues)} critical issue(s):"))
            for issue in issues:
                self.stdout.write(self.style.ERROR(f"   • {issue}"))
            raise CommandError("Seed verification failed. Database may be in inconsistent state.")

        if warnings:
            self.stdout.write(self.style.WARNING(f"⚠️  Health check passed with {len(warnings)} warning(s):"))
            for warning in warnings:
                self.stdout.write(self.style.WARNING(f"   • {warning}"))
        else:
            self.stdout.write(self.style.SUCCESS("✅ Health check passed - All systems nominal!"))
