from rest_framework import permissions

# Definição centralizada de permissões e papéis padrão

AVAILABLE_PERMISSIONS = {
    'articles.article_manage': 'Gerenciar Artigos',
    'articles.category_manage': 'Gerenciar Categorias',
    'cms.page_manage': 'Gerenciar Páginas',
    'messenger.view': 'Acesso ao Chat',
    'admin.user_manage': 'Gerenciar Equipe',
    'admin.smtp_manage': 'Configurações de E-mail',
}

DEFAULT_ROLES = {
    'Administrador': {
        'description': 'Acesso total a todos os recursos do sistema.',
        'permissions': [
            'articles.article_manage',
            'articles.category_manage',
            'cms.page_manage',
            'messenger.view',
            'admin.user_manage',
            'admin.smtp_manage',
        ]
    },
    'Editor': {
        'description': 'Pode criar e gerenciar conteúdo, mas sem acesso a configurações administrativas.',
        'permissions': [
            'articles.article_manage',
            'articles.category_manage',
            'cms.page_manage',
            'messenger.view',
        ]
    },
    'Membro': {
        'description': 'Acesso básico para visualização e comunicação.',
        'permissions': [
            'messenger.view',
        ]
    }
}

class HasRolePermission(permissions.BasePermission):
    """
    Verifica se o usuário tem a permissão exigida pela view (definida em 'required_permission').
    As permissões são checadas através do Role do usuário.
    """
    def has_permission(self, request, view):
        # Admin/Superuser sempre pode
        if request.user.is_superuser:
            return True
            
        required_permission = getattr(view, 'required_permission', None)
        if not required_permission:
            return True # Se a view não exige permissão específica, passa

        # Verifica se usuário tem role
        if not hasattr(request.user, 'role') or not request.user.role:
            return False

        # Verifica se o slug da permissão está na lista de permissões da role
        return required_permission in request.user.role.permissions
