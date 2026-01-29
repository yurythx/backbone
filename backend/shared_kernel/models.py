from django.db import models

class TenantQuerySet(models.QuerySet):
    def for_company(self, company):
        return self.filter(company=company)

class TenantManager(models.Manager):
    def get_queryset(self):
        from shared_kernel.tenant_context import get_current_company
        company = get_current_company()
        qs = super().get_queryset()
        if company:
            return qs.filter(company=company)
        return qs.none()  # Fallback seguro: se não tem contexto, não retorna nada por padrão

class BaseTenantModel(models.Model):
    company = models.ForeignKey('core.Company', on_delete=models.CASCADE, db_index=True)
    
    objects = TenantManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True
