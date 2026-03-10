from rest_framework import serializers

from .models import Category, Transaction


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_at', 'updated_at', 'created_by']

class TransactionSerializer(serializers.ModelSerializer):
    category_details = CategorySerializer(source='category', read_only=True)

    class Meta:
        model = Transaction
        fields = '__all__'
        read_only_fields = ['id', 'company', 'created_by', 'created_at', 'updated_at']

    def validate_category(self, value):
        """
        Garante que a categoria pertence à mesma empresa.
        """
        if value:
            # Em alguns contextos (ex: teste) request pode não ter company injetada
            request = self.context.get('request')
            if request and hasattr(request, 'company'):
                if value.company != request.company:
                    raise serializers.ValidationError("Categoria inválida para esta empresa.")
                if not value.is_shared:
                    role = getattr(getattr(request, "user", None), "role", None)
                    can_manage = bool(getattr(getattr(request, "user", None), "is_superuser", False)) or (
                        role and "finance.manage_financial" in (role.permissions or [])
                    )
                    if not can_manage and value.created_by_id != getattr(request.user, "id", None):
                        raise serializers.ValidationError("Categoria inválida para este usuário.")
        return value
