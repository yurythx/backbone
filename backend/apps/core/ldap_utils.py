"""
Utilitários para testar conexão LDAP.
Usa ldap3 (pura Python, cross-platform).
"""
from ldap3 import Server, Connection, ALL, SUBTREE
from ldap3.core.exceptions import LDAPException, LDAPBindError
import logging

logger = logging.getLogger(__name__)


def test_ldap_connection(config):
    """
    Testa conexão LDAP com a configuração fornecida.
    
    Args:
        config: Instância de LDAPConfig
    
    Returns:
        Tupla (success: bool, message: str)
    """
    
    # Validação de campos obrigatórios
    if not config.server_uri:
        return False, "❌ Server URI não configurado. Configure o endereço do servidor LDAP."
    
    if not config.bind_dn:
        return False, "❌ Bind DN não configurado. Configure o DN de autenticação administrativa."
    
    if not config.user_search_base:
        return False, "❌ User Search Base não configurado. Configure a base DN para busca de usuários."
    
    bind_password = config.get_bind_password()
    if not bind_password:
        return False, "❌ Bind Password não configurado. Configure a senha do Bind DN."
    
    try:
        # Configurar servidor
        use_ssl = config.server_uri.startswith('ldaps://')
        server = Server(config.server_uri, get_info=ALL, use_ssl=use_ssl)
        
        # Tentar conectar
        logger.info(f"Testing LDAP connection to {config.server_uri}")
        
        # Bind com credenciais administrativas
        try:
            conn = Connection(
                server,
                user=config.bind_dn,
                password=bind_password,
                auto_bind=True
            )
        except LDAPBindError:
            return False, (
                "❌ Credenciais do Bind DN inválidas.\n\n"
                "Verifique:\n"
                f"- Bind DN: {config.bind_dn}\n"
                "- Senha está correta\n"
                "- DN tem permissão de busca no diretório"
            )
        except Exception as e:
            return False, f"❌ Erro ao conectar ao servidor:\n{str(e)}"
        
        # Testar busca na base de usuários
        try:
            conn.search(
                search_base=config.user_search_base,
                search_filter='(objectClass=*)',
                search_scope=SUBTREE,
                size_limit=1
            )
        except LDAPException as e:
            conn.unbind()
            return False, (
                f"❌ Erro ao buscar em '{config.user_search_base}':\n\n"
                f"{str(e)}\n\n"
                "Verifique se o User Search Base está correto."
            )
        
        # Verificar filtro de busca
        if '%(user)s' not in config.user_search_filter:
            conn.unbind()
            return False, (
                "❌ Filtro de busca inválido.\n\n"
                "O filtro deve conter '%(user)s' como placeholder para o username.\n"
                f"Filtro atual: {config.user_search_filter}\n\n"
                "Exemplos válidos:\n"
                "- (uid=%(user)s)\n"
                "- (sAMAccountName=%(user)s)"
            )
        
        # Testar grupo obrigatório se configurado
        if config.require_group:
            try:
                conn.search(
                    search_base=config.require_group,
                    search_filter='(objectClass=*)',
                    search_scope=SUBTREE,
                    size_limit=1
                )
            except LDAPException as e:
                conn.unbind()
                return False, (
                    f"❌ Grupo obrigatório não encontrado:\n\n"
                    f"DN: {config.require_group}\n"
                    f"Erro: {str(e)}\n\n"
                    "Verifique se o DN do grupo está correto."
                )
        
        conn.unbind()
        
        # Sucesso!
        tls_status = "Sim" if config.use_tls or use_ssl else "Não"
        
        success_msg = (
            "✅ Conexão LDAP estabelecida com sucesso!\n\n"
            f"Servidor: {config.server_uri}\n"
            f"Base de Busca: {config.user_search_base}\n"
            f"Filtro: {config.user_search_filter}\n"
            f"TLS/SSL: {tls_status}"
        )
        
        if config.require_group:
            success_msg += f"\nGrupo Obrigatório: ✓ Validado"
        
        return True, success_msg
        
    except LDAPException as e:
        error_msg = str(e).lower()
        
        if 'server down' in error_msg or 'cannot connect' in error_msg:
            return False, (
                f"❌ Servidor LDAP não acessível.\n\n"
                f"URI: {config.server_uri}\n\n"
                "Verifique:\n"
                "- O servidor está ligado e acessível\n"
                "- Firewall permite conexão\n"
                "- Porta correta (389 para LDAP, 636 para LDAPS)"
            )
        elif 'invalid credentials' in error_msg:
            return False, (
                "❌ Credenciais do Bind DN inválidas.\n\n"
                "Verifique o DN e a senha."
            )
        else:
            return False, f"❌ Erro LDAP: {str(e)}"
            
    except Exception as e:
        logger.exception("Unexpected error testing LDAP connection")
        return False, f"❌ Erro inesperado: {str(e)}"
