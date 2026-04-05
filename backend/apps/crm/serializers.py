from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import CRMSavedView, Column, Contact, Deal, DealActivity, Pipeline, Stage, get_column_semantic_defaults

User = get_user_model()


def should_omit_legacy_stage_fields(context):
    request = context.get("request")
    if request is None:
        return False

    return request.query_params.get("omit_legacy_stage_fields") == "1"


def should_include_legacy_stage_fields(context):
    request = context.get("request")
    if request is None:
        return False

    return request.query_params.get("include_legacy_stage_fields") == "1"


def should_include_legacy_overview_stages(context):
    request = context.get("request")
    if request is None:
        return False

    return request.query_params.get("include_legacy_overview_stages") == "1"


class DealActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.username", read_only=True)

    class Meta:
        model = DealActivity
        fields = "__all__"
        read_only_fields = ["id", "company", "deal", "actor", "created_at"]


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


class CardNestedSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source="contact.name", read_only=True)
    owner_name = serializers.CharField(source="owner.username", read_only=True)
    column_id = serializers.IntegerField(source="column.id", read_only=True)
    column_title = serializers.CharField(source="column.title", read_only=True)

    class Meta:
        model = Deal
        fields = [
            "id",
            "uuid",
            "title",
            "description",
            "contact",
            "contact_name",
            "owner",
            "owner_name",
            "priority",
            "value",
            "closing_date",
            "is_closed",
            "external_id",
            "integration_source",
            "data_agendamento",
            "tecnico_responsavel",
            "custom_fields",
            "column",
            "column_id",
            "column_title",
        ]


class ColumnSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Column
        fields = [
            "id",
            "pipeline",
            "title",
            "order",
            "color",
            "column_kind",
            "marks_done",
            "requires_schedule",
            "requires_assignee",
            "allowed_source_columns",
            "wip_limit",
            "legacy_stage",
        ]


class ColumnSerializer(serializers.ModelSerializer):
    cards = CardNestedSerializer(many=True, read_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["cards"].context.update(self.context)

    def validate(self, attrs):
        initial_data = getattr(self, "initial_data", {})
        provided_fields = set(initial_data.keys())
        explicit_boolean_fields = {"marks_done", "requires_schedule", "requires_assignee"} & provided_fields

        if "column_kind" in attrs and not explicit_boolean_fields:
            attrs.update(get_column_semantic_defaults(column_kind=attrs["column_kind"]))
        elif self.instance is None and not explicit_boolean_fields and "column_kind" not in provided_fields:
            attrs.update(get_column_semantic_defaults(title=attrs.get("title")))

        return attrs

    def validate_allowed_source_columns(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Informe uma lista de IDs de colunas permitidas.")

        normalized = []
        for item in value:
            try:
                normalized.append(int(item))
            except (TypeError, ValueError):
                raise serializers.ValidationError("Cada coluna permitida deve ser representada por um ID inteiro.")
        return normalized

    class Meta:
        model = Column
        fields = "__all__"
        read_only_fields = ["id", "company"]


class PipelineSerializer(serializers.ModelSerializer):
    stages = StageSerializer(many=True, read_only=True)
    columns = ColumnSerializer(many=True, read_only=True)

    class Meta:
        model = Pipeline
        fields = "__all__"
        read_only_fields = ["id", "company"]


class CRMSavedViewSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.username", read_only=True)

    class Meta:
        model = CRMSavedView
        fields = "__all__"
        read_only_fields = ["id", "company", "owner"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        company = getattr(request, "company", None) if request else None
        if company is not None:
            self.fields["pipeline"].queryset = Pipeline.all_objects.filter(company=company)

    def validate_filters(self, value):
        return value if isinstance(value, dict) else {}

    def validate_sorting(self, value):
        return value if isinstance(value, list) else []

    def validate_column_visibility(self, value):
        return value if isinstance(value, dict) else {}


class DealNoteCreateSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=5000, trim_whitespace=True)

    def validate_description(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Escreva uma atualização antes de publicar.")
        return cleaned


class PipelineOverviewSummarySerializer(serializers.Serializer):
    total_deals = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    overdue = serializers.IntegerField()
    at_risk = serializers.IntegerField()
    done = serializers.IntegerField()
    average_progress = serializers.IntegerField()


class PipelineOverviewStageSerializer(serializers.Serializer):
    stage_id = serializers.IntegerField(required=False)
    column_id = serializers.IntegerField(required=False)
    column_title = serializers.CharField(required=False)
    name = serializers.CharField()
    total_deals = serializers.IntegerField()
    overdue = serializers.IntegerField()
    average_progress = serializers.IntegerField()


class PipelineOverviewSerializer(serializers.Serializer):
    pipeline_id = serializers.IntegerField()
    pipeline_name = serializers.CharField()
    summary = PipelineOverviewSummarySerializer()
    stages = PipelineOverviewStageSerializer(many=True, required=False)
    columns = PipelineOverviewStageSerializer(many=True, required=False)


class DealSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source="contact.name", read_only=True)
    column_id = serializers.IntegerField(source="column.id", read_only=True)
    column_title = serializers.CharField(source="column.title", read_only=True)
    column_data = ColumnSummarySerializer(source="column", read_only=True)
    activities = DealActivitySerializer(many=True, read_only=True)
    owner = serializers.PrimaryKeyRelatedField(queryset=User.all_objects.none(), required=False)
    tecnico_responsavel = serializers.PrimaryKeyRelatedField(queryset=User.all_objects.none(), required=False, allow_null=True)

    class Meta:
        model = Deal
        fields = "__all__"
        read_only_fields = ["id", "uuid", "company", "linked_event_id", "created_at", "updated_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["stage"].required = False
        self.fields["column"].required = False

        request = self.context.get("request")
        company = getattr(request, "company", None) if request else None
        if not company and self.instance is not None:
            company = getattr(self.instance, "company", None)

        if company is not None:
            self.fields["owner"].queryset = User.all_objects.filter(company=company)
            self.fields["tecnico_responsavel"].queryset = User.all_objects.filter(company=company)

        if not should_include_legacy_stage_fields(self.context) and not hasattr(self, "initial_data"):
            self.fields.pop("stage", None)

    def validate(self, attrs):
        legacy_stage = attrs.get("stage")
        column = attrs.get("column")
        instance = getattr(self, "instance", None)

        if column is None and legacy_stage is not None:
            column = getattr(legacy_stage, "column", None)
            if column is not None:
                attrs["column"] = column

        if legacy_stage is None and column is not None:
            legacy_stage = getattr(column, "legacy_stage", None)
            if legacy_stage is not None:
                attrs["stage"] = legacy_stage

        if instance is not None:
            instance_legacy_stage = instance.stage
            attrs.setdefault("stage", instance_legacy_stage)
            attrs.setdefault("column", instance.column or getattr(instance_legacy_stage, "column", None))

        target_column = attrs.get("column")
        if target_column is not None:
            current_column = None
            if instance is not None:
                current_column = instance.column or getattr(instance.stage, "column", None)

            source_column_id = getattr(current_column, "id", None)
            target_column_id = getattr(target_column, "id", None)
            is_column_change = source_column_id != target_column_id

            if is_column_change and not target_column.allows_transition_from(source_column_id):
                raise serializers.ValidationError(
                    {
                        "column": (
                            f"O card nao pode ser movido de '{current_column.title if current_column else 'sem coluna'}' "
                            f"para '{target_column.title}'."
                        )
                    }
                )

            if is_column_change and target_column.wip_limit:
                occupancy = Deal.all_objects.filter(
                    company=target_column.company,
                    column=target_column,
                    is_deleted=False,
                )
                if instance is not None:
                    occupancy = occupancy.exclude(id=instance.id)
                if occupancy.count() >= target_column.wip_limit:
                    raise serializers.ValidationError(
                        {
                            "column": (
                                f"A coluna '{target_column.title}' atingiu o limite WIP de {target_column.wip_limit} cards."
                            )
                        }
                    )

            data_agendamento = attrs.get("data_agendamento", getattr(instance, "data_agendamento", None))
            tecnico_responsavel = attrs.get("tecnico_responsavel", getattr(instance, "tecnico_responsavel", None))

            errors = {}
            if target_column.requires_schedule and not data_agendamento:
                errors["data_agendamento"] = "Preencha a data de agendamento para mover o card para uma coluna com agendamento obrigatório."
            if target_column.requires_assignee and not tecnico_responsavel:
                errors["tecnico_responsavel"] = "Defina o técnico responsável para mover o card para uma coluna com responsável obrigatório."
            if errors:
                raise serializers.ValidationError(errors)

        return attrs


class IntegrationSyncCardSerializer(serializers.Serializer):
    pipeline_id = serializers.IntegerField()
    column_id = serializers.IntegerField(required=False, allow_null=True)
    external_id = serializers.CharField(max_length=255)
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    integration_source = serializers.CharField(max_length=50, default="glpi")
    value = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default="0.00")
    priority = serializers.ChoiceField(choices=Deal.PRIORITY_CHOICES, required=False, default="MEDIUM")
    closing_date = serializers.DateTimeField(required=False, allow_null=True)
    data_agendamento = serializers.DateTimeField(required=False, allow_null=True)
    owner_id = serializers.IntegerField(required=False, allow_null=True)
    tecnico_responsavel_id = serializers.IntegerField(required=False, allow_null=True)
    contact_id = serializers.IntegerField(required=False, allow_null=True)
    custom_fields = serializers.JSONField(required=False)

    def validate(self, attrs):
        request = self.context.get("request")
        company = getattr(request, "company", None) if request else None

        pipeline = Pipeline.all_objects.filter(company=company, id=attrs["pipeline_id"]).first()
        if pipeline is None:
            raise serializers.ValidationError({"pipeline_id": "Pipeline inválido para este tenant."})
        attrs["pipeline"] = pipeline

        column_id = attrs.get("column_id")
        if column_id is not None:
            column = Column.all_objects.filter(company=company, pipeline=pipeline, id=column_id).first()
            if column is None:
                raise serializers.ValidationError({"column_id": "Coluna inválida para este pipeline."})
            attrs["column"] = column

        owner_id = attrs.get("owner_id")
        tecnico_id = attrs.get("tecnico_responsavel_id")
        contact_id = attrs.get("contact_id")

        if owner_id is not None:
            owner = User.all_objects.filter(company=company, id=owner_id).first()
            if owner is None:
                raise serializers.ValidationError({"owner_id": "Responsável inválido para este tenant."})
            attrs["owner"] = owner

        if tecnico_id is not None:
            tecnico = User.all_objects.filter(company=company, id=tecnico_id).first()
            if tecnico is None:
                raise serializers.ValidationError({"tecnico_responsavel_id": "Técnico inválido para este tenant."})
            attrs["tecnico_responsavel"] = tecnico

        if contact_id is not None:
            contact = Contact.all_objects.filter(company=company, id=contact_id).first()
            if contact is None:
                raise serializers.ValidationError({"contact_id": "Contato inválido para este tenant."})
            attrs["contact"] = contact

        return attrs
