from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from shared_kernel.models import BaseTenantModel
from shared_kernel.tenant_context import get_current_company

class TenantUserManager(UserManager):
    def get_queryset(self):
        company = get_current_company()
        qs = super().get_queryset()
        if company:
            return qs.filter(company=company)
        return qs.none()

class User(AbstractUser, BaseTenantModel):
    # Managers
    objects = TenantUserManager()
    all_objects = UserManager() 

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        # Usar o manager global para autenticação (authenticate() usa _default_manager)
        # Isso permite login sem contexto de tenant pré-definido, se o username for único globalmente.
        # Se username for único apenas por tenant, a estratégia de login muda.
        # Assumimos username unique global por enquanto (padrão AbstractUser).
        default_manager_name = 'all_objects'
