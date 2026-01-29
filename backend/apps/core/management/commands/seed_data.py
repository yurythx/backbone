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
        self.stdout.write(self.style.SUCCESS(f'Companies created: {blackbone.name}, {ironminds.name}'))

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
        License.objects.get_or_create(
            company=blackbone,
            plan=plan_pro,
            defaults={
                'start_date': timezone.now(),
                'end_date': timezone.now() + timedelta(days=365),
                'is_active': True
            }
        )
        TenantModule.objects.get_or_create(company=blackbone, module=module_pages, is_active=True)
        TenantModule.objects.get_or_create(company=blackbone, module=module_articles, is_active=True)
        TenantModule.objects.get_or_create(company=blackbone, module=module_messenger, is_active=True)

        # IronMinds -> Basic
        License.objects.get_or_create(
            company=ironminds,
            plan=plan_basic,
            defaults={
                'start_date': timezone.now(),
                'end_date': timezone.now() + timedelta(days=365),
                'is_active': True
            }
        )
        TenantModule.objects.get_or_create(company=ironminds, module=module_pages, is_active=True)
        # IronMinds doesn't get Messenger

        self.stdout.write(self.style.SUCCESS('Licenses assigned and modules activated'))

        # 5. Create Users
        # Admin BlackBone
        if not User.objects.filter(email="admin@blackbone.com").exists():
            User.objects.create_superuser(
                username="admin_blackbone",
                email="admin@blackbone.com",
                password="password123",
                company=blackbone
            )
        
        # Admin IronMinds
        if not User.objects.filter(email="admin@ironminds.com").exists():
            User.objects.create_user(
                username="admin_ironminds",
                email="admin@ironminds.com",
                password="password123",
                company=ironminds,
                is_staff=True
            )

        self.stdout.write(self.style.SUCCESS('Users created: admin@blackbone.com, admin@ironminds.com (pass: password123)'))
        self.stdout.write(self.style.SUCCESS('Seeding completed successfully!'))
