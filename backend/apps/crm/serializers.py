from rest_framework import serializers
from .models import Contact, Pipeline, Stage, Deal

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = "__all__"
        read_only_fields = ["id", "uuid", "company", "created_at", "updated_at"]

class StageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stage
        fields = "__all__"
        read_only_fields = ["id", "company"]

class PipelineSerializer(serializers.ModelSerializer):
    stages = StageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Pipeline
        fields = "__all__"
        read_only_fields = ["id", "company"]

class DealSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source="contact.name", read_only=True)
    stage_name = serializers.CharField(source="stage.name", read_only=True)
    
    class Meta:
        model = Deal
        fields = "__all__"
        read_only_fields = ["id", "uuid", "company", "owner", "linked_event_id", "created_at", "updated_at"]
