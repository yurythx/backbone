from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.core.models import Company
from apps.licensing.models import Plan, Feature, License
from apps.module_manager.models import Module, TenantModule
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with initial data for development'

    def handle(self, *args, **options):
        self.stdout.write('Seeding data...')

        # 1. Create Companies
        blackbone, _ = Company.objects.get_or_create(
            name="BlackBone HQ",
            slug="blackbone",
            domain="blackbone.com"
        )
        ironminds, _ = Company.objects.get_or_create(
            name="IronMinds Ltd",
            slug="ironminds",
            domain="ironminds.com"
        )
        rootco, _ = Company.objects.get_or_create(
            name="Empresa Raiz",
            slug="raiz",
            domain="raiz.local"
        )
        self.stdout.write(self.style.SUCCESS(f'Companies created: {blackbone.name}, {ironminds.name}, {rootco.name}'))

        # 2. Create Plans & Features
        feature_cms, _ = Feature.objects.get_or_create(name="CMS", code="cms", description="Content Management System")
        feature_chat, _ = Feature.objects.get_or_create(name="Messenger", code="messenger", description="Real-time chat")

        plan_basic, _ = Plan.objects.get_or_create(name="Basic", price=29.99, is_active=True)
        plan_basic.features.add(feature_cms)

        plan_pro, _ = Plan.objects.get_or_create(name="Pro", price=99.99, is_active=True)
        plan_pro.features.add(feature_cms, feature_chat)
        
        self.stdout.write(self.style.SUCCESS('Plans and Features created'))

        # 3. Create Modules
        module_pages, _ = Module.objects.get_or_create(name="Pages", code="pages", is_default=True)
        module_articles, _ = Module.objects.get_or_create(name="Articles", code="articles", is_default=True)
        module_messenger, _ = Module.objects.get_or_create(name="Messenger", code="messenger", is_default=True)
        
        self.stdout.write(self.style.SUCCESS('Modules created'))

        # 4. Assign Licenses & Activate Modules
        # BlackBone -> Pro
        if not License.all_objects.filter(company=blackbone, plan=plan_pro).exists():
            License.all_objects.create(
                company=blackbone,
                plan=plan_pro,
                start_date=timezone.now(),
                end_date=timezone.now() + timedelta(days=365),
                is_active=True
            )
        TenantModule.all_objects.get_or_create(company=blackbone, module=module_pages, defaults={'is_active': True})
        TenantModule.all_objects.get_or_create(company=blackbone, module=module_articles, defaults={'is_active': True})
        TenantModule.all_objects.get_or_create(company=blackbone, module=module_messenger, defaults={'is_active': True})

        # IronMinds -> Basic
        if not License.all_objects.filter(company=ironminds, plan=plan_basic).exists():
            License.all_objects.create(
                company=ironminds,
                plan=plan_basic,
                start_date=timezone.now(),
                end_date=timezone.now() + timedelta(days=365),
                is_active=True
            )
        TenantModule.all_objects.get_or_create(company=ironminds, module=module_pages, defaults={'is_active': True})
        # IronMinds doesn't get Messenger
        # Root company -> Pro like BlackBone
        if not License.all_objects.filter(company=rootco, plan=plan_pro).exists():
            License.all_objects.create(
                company=rootco,
                plan=plan_pro,
                start_date=timezone.now(),
                end_date=timezone.now() + timedelta(days=365),
                is_active=True
            )
        TenantModule.all_objects.get_or_create(company=rootco, module=module_pages, defaults={'is_active': True})
        TenantModule.all_objects.get_or_create(company=rootco, module=module_articles, defaults={'is_active': True})
        TenantModule.all_objects.get_or_create(company=rootco, module=module_messenger, defaults={'is_active': True})

        self.stdout.write(self.style.SUCCESS('Licenses assigned and modules activated'))

        # 5. Create Users
        # Admin BlackBone
        if not User.all_objects.filter(username="admin_blackbone").exists():
            User.objects.create_superuser(
                username="admin_blackbone",
                email="admin@blackbone.com",
                password="password123",
                company=blackbone
            )
        
        # Admin IronMinds
        if not User.all_objects.filter(username="admin_ironminds").exists():
            User.objects.create_user(
                username="admin_ironminds",
                email="admin@ironminds.com",
                password="password123",
                company=ironminds,
                is_staff=True
            )
        # Suporte Root Superuser
        if not User.all_objects.filter(username="suporte").exists():
            User.all_objects.create_superuser(
                username="suporte",
                email="suporte@raiz.local",
                password="suporte123",
                company=rootco
            )
        # Colaborador Root (para testes de contatos/mensageria)
        if not User.all_objects.filter(username="colab_raiz").exists():
            User.all_objects.create_user(
                username="colab_raiz",
                email="colab@raiz.local",
                password="password123",
                company=rootco
            )

        self.stdout.write(self.style.SUCCESS('Users created: admin@blackbone.com, admin@ironminds.com (pass: password123), suporte@raiz.local (pass: suporte123)'))
        self.stdout.write(self.style.SUCCESS('Seeding completed successfully!'))
