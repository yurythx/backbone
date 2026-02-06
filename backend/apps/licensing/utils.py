from .models import License, PlanFeature

def check_feature_permission(company, feature_code):
    """
    Verifica se uma empresa tem permissão para usar uma feature específica.
    """
    if not company:
        return False
        
    active_license = License.objects.filter(company=company, is_active=True).first()
    if not active_license:
        return False
        
    plan_feature = PlanFeature.objects.filter(
        plan=active_license.plan, 
        feature__code=feature_code
    ).first()
    
    if not plan_feature:
        return False
        
    value = str(plan_feature.value).lower()
    if value in ['true', 'unlimited', 'yes', '1']:
        return True
    
    # Se for um número (limite), consideramos que a feature em si está habilitada
    # A lógica de consumo do limite deve ser tratada separadamente se necessário.
    try:
        if int(value) > 0:
            return True
    except ValueError:
        pass
        
    return False
