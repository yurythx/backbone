from rest_framework import permissions

class HasRolePermission(permissions.BasePermission):
    """
    Permissão que verifica se o usuário tem um slug específico em sua Role.
    O slug deve ser passado via 'required_permission' na View.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
            
        # Superuser sempre tem permissão
        if request.user.is_superuser:
            return True
            
        # Se a view não define uma permissão necessária, permite (ou nega por padrão, dependendo da política)
        required_permission = getattr(view, 'required_permission', None)
        if not required_permission:
            return True
            
        # Verifica se o usuário tem uma Role vinculada
        if not request.user.role:
            return False
            
        # Verifica se o slug está na lista de permissões da Role
        return required_permission in request.user.role.permissions

def role_required(permission_slug):
    """
    Sugestão de uso (exemplo):
    @role_required('articles.create')
    """
    # Esta é uma estrutura básica, no DRF usamos mais direct classes.
    pass
