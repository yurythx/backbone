from rest_framework import permissions
from .models import Module, TenantModule

class HasModuleAccess(permissions.BasePermission):
    """
    Check if the tenant has the module enabled.
    Requires the ViewSet to define `module_code`.
    """
    
    def has_permission(self, request, view):
        # Allow superusers or safe methods? No, if module is disabled, it should be fully hidden.
        # But wait, maybe Admin needs access. For now, let's enforce for all tenant users.
        
        if not hasattr(view, 'module_code') or not view.module_code:
            return True # No module restriction defined
            
        if not request.company:
            return False # Must be in a company context
            
        # Check if module exists and is active for this tenant
        try:
            # We check if TenantModule exists and is_active=True
            # Also check if Module global definition exists
            is_allowed = TenantModule.objects.filter(
                company=request.company,
                module__code=view.module_code,
                is_active=True
            ).exists()
            
            return is_allowed
        except Exception:
            return False
