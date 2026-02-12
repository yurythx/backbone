"""
Backend de autenticação LDAP customizado para multi-tenancy.
Usa ldap3 (pura Python, cross-platform).
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend
from apps.core.models import LDAPConfig
from ldap3 import Server, Connection, ALL, SUBTREE
from ldap3.core.exceptions import LDAPException, LDAPBindError, LDAPInvalidCredentialsResult
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class TenantLDAPBackend(ModelBackend):
    """
    Backend de autenticação LDAP que usa configurações por tenant.
    Fallback para autenticação padrão se LDAP não estiver configurado.
    """
    
    def authenticate(self, request, username=None, password=None, company=None, **kwargs):
        """
        Autentica usuário via LDAP se configurado para o tenant.
        """
        if not company or not username or not password:
            return None
        
        # Verificar se LDAP está habilitado para este tenant
        try:
            ldap_config = LDAPConfig.objects.select_related('company').get(
                company=company,
                enabled=True
            )
        except LDAPConfig.DoesNotExist:
            logger.debug(f"LDAP not configured/enabled for company: {company.slug}")
            return None
        
        # Tentar autenticação LDAP
        try:
            user_dn, user_attrs = self._ldap_authenticate(ldap_config, username, password)
            
            if user_dn:
                # Autenticação LDAP bem-sucedida - criar/atualizar usuário
                user = self._get_or_create_user(company, username, user_attrs, ldap_config)
                logger.info(f"✓ LDAP login successful: {username} @ {company.slug}")
                return user
            else:
                logger.warning(f"LDAP authentication failed for {username} @ {company.slug}")
                return None
                
        except Exception as e:
            logger.error(f"LDAP authentication error for {username} @ {company.slug}: {str(e)}")
            return None
    
    def _ldap_authenticate(self, config: LDAPConfig, username: str, password: str):
        """
        Realiza autenticação LDAP usando ldap3.
        
        Returns:
            Tupla (user_dn, user_attrs) ou (None, None) se falhar
        """
        try:
            # Configurar servidor
            use_ssl = config.server_uri.startswith('ldaps://')
            server = Server(config.server_uri, get_info=ALL, use_ssl=use_ssl)
            
            # Bind com credenciais administrativas para buscar usuário
            bind_password = config.get_bind_password()
            admin_conn = Connection(
                server,
                user=config.bind_dn,
                password=bind_password,
                auto_bind=True
            )
            
            # Buscar usuário
            search_filter = config.user_search_filter.replace('%(user)s', username)
            logger.debug(f"Searching for user with filter: {search_filter}")
            
            admin_conn.search(
                search_base=config.user_search_base,
                search_filter=search_filter,
                search_scope=SUBTREE,
                attributes=[
                    config.attr_username,
                    config.attr_email,
                    config.attr_first_name,
                    config.attr_last_name
                ]
            )
            
            if not admin_conn.entries:
                logger.warning(f"User {username} not found in LDAP")
                admin_conn.unbind()
                return None, None
            
            # Pegar primeiro resultado
            entry = admin_conn.entries[0]
            user_dn = entry.entry_dn
            logger.debug(f"Found user DN: {user_dn}")
            
            # Verificar grupo obrigatório se configurado
            if config.require_group:
                if not self._check_group_membership(admin_conn, user_dn, config.require_group):
                    logger.warning(f"User {username} not in required group {config.require_group}")
                    admin_conn.unbind()
                    return None, None
            
            admin_conn.unbind()
            
            # Tentar bind com credenciais do usuário
            user_conn = Connection(
                server,
                user=user_dn,
                password=password,
                auto_bind=True
            )
            user_conn.unbind()
            
            # Converter atributos para dict
            user_attrs = {
                config.attr_username: str(getattr(entry, config.attr_username, username)),
                config.attr_email: str(getattr(entry, config.attr_email, '')),
                config.attr_first_name: str(getattr(entry, config.attr_first_name, '')),
                config.attr_last_name: str(getattr(entry, config.attr_last_name, ''))
            }
            
            return user_dn, user_attrs
            
        except LDAPBindError:
            logger.warning(f"Invalid password for user {username}")
            return None, None
        except LDAPException as e:
            logger.error(f"LDAP error during authentication: {str(e)}")
            return None, None
        except Exception as e:
            logger.exception(f"Unexpected error during LDAP authentication: {str(e)}")
            return None, None
    
    def _check_group_membership(self, conn: Connection, user_dn: str, group_dn: str) -> bool:
        """Verifica se usuário é membro do grupo especificado."""
        try:
            conn.search(
                search_base=group_dn,
                search_filter=f'(member={user_dn})',
                search_scope=SUBTREE
            )
            return len(conn.entries) > 0
        except LDAPException as e:
            logger.error(f"Error checking group membership: {str(e)}")
            return False
    
    def _get_or_create_user(self, company, username: str, user_attrs: dict, config: LDAPConfig):
        """Cria ou atualiza usuário no banco de dados baseado nos atributos LDAP."""
        
        email = user_attrs.get(config.attr_email, f'{username}@{company.slug}.local')
        first_name = user_attrs.get(config.attr_first_name, '')
        last_name = user_attrs.get(config.attr_last_name, '')
        
        # Buscar ou criar usuário
        user, created = User.objects.get_or_create(
            username=username,
            company=company,
            defaults={
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'is_active': True,
            }
        )
        
        if not created:
            # Atualizar informações do usuário existente
            user.email = email
            user.first_name = first_name
            user.last_name = last_name
            user.save(update_fields=['email', 'first_name', 'last_name'])
        
        logger.info(f"{'Created' if created else 'Updated'} user from LDAP: {username}")
        return user
