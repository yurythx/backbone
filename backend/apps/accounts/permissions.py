from rest_framework import permissions

# Definição centralizada de permissões e papéis padrão

AVAILABLE_PERMISSIONS = {
    # Artigos
    'articles.article_view': 'Visualizar Artigos',
    'articles.article_create': 'Criar Artigos',
    'articles.article_edit': 'Editar Artigos',
    'articles.article_delete': 'Excluir Artigos',
    'articles.article_publish': 'Publicar Artigos',
    'articles.category_manage': 'Gerenciar Categorias/Tags',
    
    # CMS/Páginas
    'pages.page_view': 'Visualizar Páginas',
    'pages.page_create': 'Criar Páginas',
    'pages.page_edit': 'Editar Páginas',
    'pages.page_delete': 'Excluir Páginas',
    
    # Mídia
    'media.media_view': 'Ver Biblioteca de Mídia',
    'media.media_upload': 'Fazer Upload de Mídia',
    'media.media_delete': 'Excluir Mídia',
    
    # Messenger
    'messenger.view': 'Acesso ao Chat',
    'messenger.admin': 'Administrar Grupos/Conversas',
    
    # Administração
    'admin.user_manage': 'Gerenciar Equipe/Convites',
    'admin.smtp_manage': 'Configurações de E-mail',
    'admin.view_dashboard': 'Acessar Painel Administrativo',
    'admin.settings_manage': 'Configurações da Empresa',
}

DEFAULT_ROLES = {
    'Administrador': {
        'description': 'Acesso total a todos os recursos da empresa.',
        'permissions': list(AVAILABLE_PERMISSIONS.keys())
    },
    'Editor': {
        'description': 'Pode criar e gerenciar conteúdo, mas sem acesso a configurações administrativas.',
        'permissions': [
            'articles.article_view', 'articles.article_create', 'articles.article_edit', 'articles.article_publish',
            'articles.category_manage',
            'pages.page_view', 'pages.page_create', 'pages.page_edit',
            'media.media_view', 'media.media_upload',
            'messenger.view',
            'admin.view_dashboard',
        ]
    },
    'Membro': {
        'description': 'Acesso de visualização e uso do chat.',
        'permissions': [
            'articles.article_view',
            'pages.page_view',
            'media.media_view',
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
