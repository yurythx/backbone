from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from apps.core.models import Company, TenantBranding
from apps.accounts.models import Role
from apps.licensing.models import Plan, Feature, PlanFeature, License
from shared_kernel.tenant_context import set_current_company

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with CORE System Data (Features, Plans) and DEFAULT Tenant (Support). Safe to run multiple times.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Starting System and Default Tenant Seeding...'))

        # 1. CORE FEATURES
        features_data = [
            ('max_users', 'Max Users', 'unlimited'),
            ('max_articles', 'Max Articles', 'unlimited'),
            ('max_storage', 'Max Storage', '10GB'),
            ('has_cms', 'Content Management System', 'true'),
            ('has_api', 'API Access', 'true'),
        ]
        
        created_features = []
        for code, name, default_val in features_data:
            feat, created = Feature.objects.get_or_create(code=code, defaults={'name': name})
            created_features.append((feat, default_val))
            if created:
                 self.stdout.write(f'  [+] Created Feature: {name}')

        # 2. DEFAULT PLAN (Requested: "Free Premium")
        plan, created = Plan.objects.get_or_create(
            name='Free Premium',
            defaults={'price': 0.00, 'is_active': True}
        )
        
        if created:
            self.stdout.write(f'  [+] Created Plan: {plan.name}')
            for feat, val in created_features:
                PlanFeature.objects.create(plan=plan, feature=feat, value=val)
        else:
            self.stdout.write(f'  [.] Plan {plan.name} already exists')
        
        # 3. DEFAULT TENANT (Backbone Support)
        company, created = Company.objects.get_or_create(
            slug='suporte',
            defaults={
                'name': 'Backbone Suporte', 
                'domain': 'suporte.localhost',
                'onboarding_completed': True,
                'onboarding_step': 4
            }
        )
        
        if created:
             self.stdout.write(self.style.SUCCESS(f'  [+] Created Company: {company.name}'))
             # Default Branding
             TenantBranding.objects.create(
                company=company,
                company_name='Suporte Backbone',
                primary_color='#000000'
             )
        else:
             self.stdout.write(f'  [.] Company {company.name} already exists')

        # Set context to act within this tenant
        set_current_company(company)

        # 4. LICENSE for Default Tenant
        License.objects.get_or_create(
            company=company,
            defaults={'plan': plan, 'is_active': True}
        )

        # 5. ROLES for Default Tenant
        admin_role, _ = Role.objects.get_or_create(
            company=company, 
            name='Admin',
            defaults={'is_system_role': True, 'permissions': ['*']} 
        )

        # 6. SUPER ADMIN USER (suporte / suporte123)
        user, created = User.objects.get_or_create(
            username='suporte',
            company=company,
            defaults={
                'email': 'suporte@backbone.com',
                'is_staff': True,
                'is_superuser': True,
                'role': admin_role
            }
        )
        
        if created:
            user.set_password('suporte123')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'  [+] Created Superuser: {user.username} (Pass: suporte123)'))
        else:
            # Optional: Reset password if ensures consistency? No, safer not to touch existing users' passwords.
            self.stdout.write(f'  [.] User {user.username} already exists')
        
        self.stdout.write(self.style.SUCCESS('System Seeding completed!'))
        
        # Health Check
        self.verify_seed_health()
    
    def verify_seed_health(self):
        """Verifica se o seed foi executado com sucesso"""
        self.stdout.write(self.style.WARNING('\n🔍 Running health check...'))
        
        issues = []
        warnings = []
        
        # 1. Verificar Features
        feature_count = Feature.objects.count()
        if feature_count == 0:
            issues.append('No features created')
        else:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Features: {feature_count} found'))
        
        # 2. Verificar Planos
        plan_count = Plan.objects.count()
        if plan_count == 0:
            issues.append('No plans created')
        else:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Plans: {plan_count} found'))
        
        # 3. Verificar Empresa Padrão
        try:
            support_company = Company.objects.get(slug='suporte')
            self.stdout.write(self.style.SUCCESS(f'  ✓ Support Company: {support_company.name} (ID: {support_company.id})'))
            
            # 3.1 Verificar Branding
            if not hasattr(support_company, 'branding'):
                warnings.append('Support company has no branding configured')
            else:
                self.stdout.write(self.style.SUCCESS(f'  ✓ Branding configured'))
        except Company.DoesNotExist:
            issues.append('Support company not found (slug: suporte)')
        
        # 4. Verificar Licença
        try:
            license = License.objects.get(company__slug='suporte')
            if not license.is_active:
                warnings.append('Support company license is inactive')
            else:
                self.stdout.write(self.style.SUCCESS(f'  ✓ License: {license.plan.name} (Active: {license.is_active})'))
        except License.DoesNotExist:
            issues.append('No license for support company')
        
        # 5. Verificar Superuser
        superuser_count = User.objects.filter(is_superuser=True).count()
        if superuser_count == 0:
            issues.append('No superuser found')
        else:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Superusers: {superuser_count} found'))
        
        # 6. Verificar Roles
        admin_role_count = Role.objects.filter(name='Admin').count()
        if admin_role_count == 0:
            warnings.append('No Admin role found')
        else:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Admin roles: {admin_role_count} found'))
        
        # Resultado
        self.stdout.write('')
        if issues:
            self.stdout.write(self.style.ERROR(f'❌ Health check FAILED with {len(issues)} critical issue(s):'))
            for issue in issues:
                self.stdout.write(self.style.ERROR(f'   • {issue}'))
            raise CommandError('Seed verification failed. Database may be in inconsistent state.')
        
        if warnings:
            self.stdout.write(self.style.WARNING(f'⚠️  Health check passed with {len(warnings)} warning(s):'))
            for warning in warnings:
                self.stdout.write(self.style.WARNING(f'   • {warning}'))
        else:
            self.stdout.write(self.style.SUCCESS('✅ Health check passed - All systems nominal!'))
