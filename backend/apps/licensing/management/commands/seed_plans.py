from django.core.management.base import BaseCommand
from apps.licensing.models import Feature, Plan, PlanFeature

class Command(BaseCommand):
    help = 'Popula o banco com planos e features padrão para o Sprint 13'

    def handle(self, *args, **options):
        # 1. Criar Features
        features_data = [
            {'code': 'max_users', 'name': 'Limite de Usuários', 'description': 'Número máximo de usuários por tenant'},
            {'code': 'max_articles', 'name': 'Limite de Artigos', 'description': 'Número máximo de artigos publicados'},
            {'code': 'storage_limit_mb', 'name': 'Espaço em Disco (MB)', 'description': 'Limite de armazenamento de mídia'},
            {'code': 'ai_access', 'name': 'Acesso a IA', 'description': 'Otimizador SEO e Assistente de conteúdo'},
            {'code': 'api_access', 'name': 'Acesso a API Pública', 'description': 'Webhooks e API Keys'},
            {'code': 'advanced_analytics', 'name': 'Analytics Avançado', 'description': 'Dashboard de Insights e Engajamento'},
        ]

        features_objs = {}
        for f in features_data:
            obj, created = Feature.objects.get_or_create(code=f['code'], defaults=f)
            features_objs[f['code']] = obj
            if created:
                self.stdout.write(self.style.SUCCESS(f"Feature '{f['name']}' criada."))

        # 2. Criar Planos
        plans_data = [
            {
                'name': 'Free', 
                'price': 0.00, 
                'features': {
                    'max_users': '3', 
                    'max_articles': '5', 
                    'storage_limit_mb': '100',
                    'ai_access': 'false',
                    'api_access': 'false',
                    'advanced_analytics': 'false'
                }
            },
            {
                'name': 'Pro', 
                'price': 49.90, 
                'features': {
                    'max_users': '20', 
                    'max_articles': '50', 
                    'storage_limit_mb': '1000',
                    'ai_access': 'true',
                    'api_access': 'true',
                    'advanced_analytics': 'false'
                }
            },
            {
                'name': 'Enterprise', 
                'price': 199.90, 
                'features': {
                    'max_users': 'unlimited', 
                    'max_articles': 'unlimited', 
                    'storage_limit_mb': '10000',
                    'ai_access': 'true',
                    'api_access': 'true',
                    'advanced_analytics': 'true'
                }
            },
        ]

        for p in plans_data:
            plan, created = Plan.objects.get_or_create(name=p['name'], defaults={'price': p['price']})
            if created:
                self.stdout.write(self.style.SUCCESS(f"Plano '{p['name']}' criado."))
            
            for f_code, f_value in p['features'].items():
                PlanFeature.objects.update_or_create(
                    plan=plan,
                    feature=features_objs[f_code],
                    defaults={'value': f_value}
                )
        
        self.stdout.write(self.style.SUCCESS("Dados de licenciamento populados com sucesso!"))
        
        # Health Check
        self.verify_seed_health()
    
    def verify_seed_health(self):
        """Verifica se o seed de licenciamento foi executado com sucesso"""
        self.stdout.write(self.style.WARNING('\n🔍 Running licensing health check...'))
        
        issues = []
        warnings = []
        
        # 1. Verificar Features
        feature_count = Feature.objects.count()
        expected_features = 6  # Baseado no seed
        
        if feature_count == 0:
            issues.append('No features created')
        elif feature_count < expected_features:
            warnings.append(f'Expected {expected_features} features, found {feature_count}')
        else:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Features: {feature_count}/{expected_features}'))
        
        # 2. Verificar Planos
        plan_count = Plan.objects.count()
        expected_plans = 3  # Free, Pro, Enterprise
        
        if plan_count == 0:
            issues.append('No plans created')
        elif plan_count < expected_plans:
            warnings.append(f'Expected {expected_plans} plans, found {plan_count}')
        else:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Plans: {plan_count}/{expected_plans}'))
            
            # Listar planos criados
            for plan in Plan.objects.all():
                feature_count = PlanFeature.objects.filter(plan=plan).count()
                self.stdout.write(self.style.SUCCESS(f'    • {plan.name} (R$ {plan.price}) - {feature_count} features'))
        
        # 3. Verificar PlanFeatures
        plan_feature_count = PlanFeature.objects.count()
        expected_plan_features = expected_plans * expected_features  # 3 planos x 6 features = 18
        
        if plan_feature_count == 0:
            issues.append('No plan features configured')
        elif plan_feature_count < expected_plan_features:
            warnings.append(f'Expected {expected_plan_features} plan-feature mappings, found {plan_feature_count}')
        else:
            self.stdout.write(self.style.SUCCESS(f'  ✓ Plan-Feature mappings: {plan_feature_count}/{expected_plan_features}'))
        
        # Resultado
        self.stdout.write('')
        if issues:
            self.stdout.write(self.style.ERROR(f'❌ Health check FAILED with {len(issues)} issue(s):'))
            for issue in issues:
                self.stdout.write(self.style.ERROR(f'   • {issue}'))
        elif warnings:
            self.stdout.write(self.style.WARNING(f'⚠️  Health check passed with {len(warnings)} warning(s):'))
            for warning in warnings:
                self.stdout.write(self.style.WARNING(f'   • {warning}'))
        else:
            self.stdout.write(self.style.SUCCESS('✅ Licensing health check passed!'))
