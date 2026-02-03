from django.db.models import Count
from apps.licensing.models import License, PlanFeature

def check_feature_limit(company, feature_code, current_count=None):
    """
    Verifica se a empresa atingiu o limite de uma feature específica.
    Retorna (pode_continuar, limite, atual)
    """
    # Obter licença ativa
    active_license = License.objects.filter(company=company, is_active=True).first()
    if not active_license:
        return False, 0, 0
    
    # Obter limite da feature para este plano
    plan_feature = PlanFeature.objects.filter(
        plan=active_license.plan, 
        feature__code=feature_code
    ).first()
    
    if not plan_feature:
        return False, 0, 0
        
    limit_value = plan_feature.value.lower()
    
    if limit_value == 'unlimited' or limit_value == 'true':
        return True, -1, current_count or 0
        
    try:
        limit_int = int(limit_value)
    except ValueError:
        return limit_value == 'true', 0, 0

    if current_count is None:
        # Calcular contagem se não fornecida
        if feature_code == 'max_users':
            from django.contrib.auth import get_user_model
            current_count = get_user_model().objects.filter(company=company).count()
        elif feature_code == 'max_articles':
            from apps.articles.models import Article
            current_count = Article.objects.filter(company=company).count()
        else:
            current_count = 0

    return current_count < limit_int, limit_int, current_count
