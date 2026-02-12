"""
Health check específico para LDAP.
Verifica status de configurações LDAP ativas.
"""
from django.http import JsonResponse
from django.views import View
from apps.core.models import LDAPConfig
from apps.core.ldap_utils import test_ldap_connection
import logging

logger = logging.getLogger(__name__)


class LDAPHealthCheck(View):
    """
    Endpoint de health check para LDAP.
    Retorna status de todas as configurações ativas.
    """
    
    def get(self, request):
        """
        GET /api/core/ldap-health/
        
        Returns:
            {
                "status": "healthy" | "degraded" | "unhealthy",
                "total_configs": int,
                "active_configs": int,
                "failing_configs": int,
                "details": [...]
            }
        """
        try:
            all_configs = LDAPConfig.objects.select_related('company').all()
            active_configs = all_configs.filter(enabled=True)
            
            total = all_configs.count()
            active = active_configs.count()
            failing = 0
            
            details = []
            
            for config in active_configs:
                # Testar apenas configs ativas
                success, message = test_ldap_connection(config)
                
                status_detail = {
                    'company': config.company.name,
                    'company_slug': config.company.slug,
                    'server_uri': config.server_uri,
                    'status': 'up' if success else 'down',
                    'last_test': config.last_test_at.isoformat() if config.last_test_at else None,
                }
                
                if not success:
                    failing += 1
                    status_detail['error'] = message
                
                details.append(status_detail)
            
            # Determinar status geral
            if failing == 0:
                overall_status = "healthy"
            elif failing < active:
                overall_status = "degraded"
            else:
                overall_status = "unhealthy"
            
            return JsonResponse({
                "status": overall_status,
                "total_configs": total,
                "active_configs": active,
                "failing_configs": failing,
                "details": details
            })
            
        except Exception as e:
            logger.exception("Error in LDAP health check")
            return JsonResponse({
                "status": "error",
                "error": str(e)
            }, status=500)
