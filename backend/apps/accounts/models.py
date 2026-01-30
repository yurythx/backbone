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
        return qs

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


class UserThemePreference(models.Model):
    """
    Preferências de tema personalizadas por usuário.
    Permite que cada usuário escolha uma paleta de cores própria,
    diferente do tema da empresa, salvando no seu perfil.
    """
    PALETTE_CHOICES = (
        ('django-green', 'Django Green'),
        ('ocean-blue', 'Ocean Blue'),
        ('royal-purple', 'Royal Purple'),
        ('sunset-orange', 'Sunset Orange'),
        ('forest-green', 'Forest Green'),
        ('slate-gray', 'Slate Gray'),
    )
    
    DARK_MODE_CHOICES = (
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('system', 'System'),
    )
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='theme_preference'
    )
    theme_palette = models.CharField(
        max_length=50,
        choices=PALETTE_CHOICES,
        null=True,
        blank=True,
        help_text="Paleta escolhida pelo usuário (null = usa tema da empresa)"
    )
    use_tenant_theme = models.BooleanField(
        default=True,
        help_text="Se True, ignora theme_palette e usa o tema da empresa"
    )
    dark_mode_preference = models.CharField(
        max_length=10,
        choices=DARK_MODE_CHOICES,
        default='system',
        help_text="Preferência de modo escuro (independente do tema)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Theme Preference"
        verbose_name_plural = "User Theme Preferences"

    def __str__(self):
        palette = self.theme_palette if not self.use_tenant_theme else "Tenant Theme"
        return f"{self.user.username} - {palette}"

