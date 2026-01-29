from rest_framework import serializers
from .models import Feature, Plan, PlanFeature, License

class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = '__all__'

class PlanFeatureSerializer(serializers.ModelSerializer):
    feature_code = serializers.CharField(source='feature.code', read_only=True)
    feature_name = serializers.CharField(source='feature.name', read_only=True)

    class Meta:
        model = PlanFeature
        fields = ['id', 'feature', 'feature_code', 'feature_name', 'value']

class PlanSerializer(serializers.ModelSerializer):
    features = PlanFeatureSerializer(source='planfeature_set', many=True, read_only=True)

    class Meta:
        model = Plan
        fields = '__all__'

class LicenseSerializer(serializers.ModelSerializer):
    plan_name = serializers.CharField(source='plan.name', read_only=True)
    
    class Meta:
        model = License
        fields = ['id', 'company', 'plan', 'plan_name', 'start_date', 'end_date', 'is_active']
        read_only_fields = ['company', 'start_date']
