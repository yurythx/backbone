import logging
from decimal import Decimal

from django.db.models import Q
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.api_keys.authentication import APIKeyAuthentication
from apps.module_manager.permissions import HasModuleAccess
from apps.notifications.models import Notification

from .models import CRMSavedView, Column, Contact, Deal, DealActivity, Pipeline, Stage, get_column_semantic_defaults
from .services import send_column_change_webhook
from .serializers import (
    ColumnSerializer,
    CRMSavedViewSerializer,
    ContactSerializer,
    DealNoteCreateSerializer,
    DealSerializer,
    IntegrationSyncCardSerializer,
    PipelineOverviewSerializer,
    PipelineSerializer,
    should_include_legacy_stage_fields,
    should_include_legacy_overview_stages,
)

logger = logging.getLogger(__name__)


def add_deprecation_headers(response, message):
    response["Warning"] = f'299 backbone "{message}"'
    response["X-Backbone-Deprecated"] = "true"
    response["X-Backbone-Deprecation-Message"] = message
    return response


class ContactViewSet(viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = "crm"

    def get_queryset(self):
        company = getattr(self.request, "company", None)
        if not company:
            return Contact.all_objects.none()
        return Contact.all_objects.filter(company=company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)


class CRMSavedViewViewSet(viewsets.ModelViewSet):
    serializer_class = CRMSavedViewSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = "crm"
    pagination_class = None

    def get_queryset(self):
        company = getattr(self.request, "company", None)
        user = getattr(self.request, "user", None)
        if not company or not getattr(user, "is_authenticated", False):
            return CRMSavedView.all_objects.none()

        queryset = CRMSavedView.all_objects.select_related("pipeline", "owner").filter(company=company, owner=user)
        pipeline_id = self.request.query_params.get("pipeline_id")
        if pipeline_id:
            queryset = queryset.filter(pipeline_id=pipeline_id)
        return queryset

    def _unset_other_defaults(self, saved_view):
        if not saved_view.is_default:
            return

        CRMSavedView.all_objects.filter(
            company=saved_view.company,
            owner=saved_view.owner,
            pipeline=saved_view.pipeline,
            is_default=True,
        ).exclude(id=saved_view.id).update(is_default=False)

    def perform_create(self, serializer):
        saved_view = serializer.save(company=self.request.company, owner=self.request.user)
        self._unset_other_defaults(saved_view)

    def perform_update(self, serializer):
        saved_view = serializer.save()
        self._unset_other_defaults(saved_view)


class PipelineViewSet(viewsets.ModelViewSet):
    serializer_class = PipelineSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = "crm"

    def get_queryset(self):
        company = getattr(self.request, "company", None)
        if not company:
            return Pipeline.all_objects.none()
        return Pipeline.all_objects.filter(company=company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)

    @staticmethod
    def _get_progress_value(deal):
        raw_value = (deal.custom_fields or {}).get("progress_percentage")

        try:
            numeric_value = float(raw_value)
        except (TypeError, ValueError):
            return 0

        return max(0, min(100, round(numeric_value)))

    @staticmethod
    def _get_deadline_risk(deal):
        if not deal.closing_date:
            return "none"

        current_column = deal.column or getattr(deal.stage, "column", None)
        if deal.is_closed or (current_column and current_column.is_done()):
            return "done"

        now = timezone.localtime(timezone.now())
        due_date = timezone.localtime(deal.closing_date)
        start_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_due = due_date.replace(hour=0, minute=0, second=0, microsecond=0)
        diff_in_days = (start_of_due - start_of_today).days

        if diff_in_days < 0:
            return "overdue"
        if diff_in_days <= 2:
            return "risk"
        return "ok"

    @action(detail=True, methods=["get"])
    def overview(self, request, pk=None):
        pipeline = self.get_object()
        columns = list(pipeline.columns.all().order_by("order", "id"))
        if not columns:
            columns = [
                Column.objects.create(
                    company=pipeline.company,
                    pipeline=pipeline,
                    title=legacy_stage.name,
                    order=legacy_stage.order,
                    **get_column_semantic_defaults(title=legacy_stage.name),
                    legacy_stage=legacy_stage,
                )
                for legacy_stage in pipeline.stages.all().order_by("order", "id")
            ]
        deals = list(
            Deal.all_objects.select_related("stage", "column")
            .filter(company=request.company, is_deleted=False, stage__pipeline=pipeline)
        )

        summary = {
            "total_deals": 0,
            "total_value": Decimal("0.00"),
            "overdue": 0,
            "at_risk": 0,
            "done": 0,
            "average_progress": 0,
        }
        progress_sum = 0
        stages_payload = []

        for column in columns:
            stage_deals = [deal for deal in deals if deal.column_id == column.id or (deal.column_id is None and deal.stage_id == column.legacy_stage_id)]
            stage_progress_sum = 0
            stage_overdue = 0

            for deal in stage_deals:
                progress = self._get_progress_value(deal)
                risk = self._get_deadline_risk(deal)

                summary["total_deals"] += 1
                summary["total_value"] += deal.value or Decimal("0.00")
                progress_sum += progress
                stage_progress_sum += progress

                if risk == "overdue":
                    summary["overdue"] += 1
                    stage_overdue += 1
                if risk == "risk":
                    summary["at_risk"] += 1
                if deal.is_closed or column.is_done() or progress >= 100:
                    summary["done"] += 1

            stages_payload.append(
                {
                    "stage_id": column.legacy_stage_id,
                    "column_id": column.id,
                    "column_title": column.title,
                    "name": column.title,
                    "total_deals": len(stage_deals),
                    "overdue": stage_overdue,
                    "average_progress": round(stage_progress_sum / len(stage_deals)) if stage_deals else 0,
                }
            )

        if summary["total_deals"] > 0:
            summary["average_progress"] = round(progress_sum / summary["total_deals"])

        serializer_payload = {
            "pipeline_id": pipeline.id,
            "pipeline_name": pipeline.name,
            "summary": summary,
            "columns": stages_payload,
        }

        if should_include_legacy_overview_stages({"request": request}):
            serializer_payload["stages"] = stages_payload

        serializer = PipelineOverviewSerializer(serializer_payload)
        response = Response(serializer.data)
        if should_include_legacy_overview_stages({"request": request}):
            return add_deprecation_headers(
                response,
                "crm overview field 'stages' is deprecated; prefer 'columns'.",
            )
        return response


class ColumnViewSet(viewsets.ModelViewSet):
    serializer_class = ColumnSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = "crm"

    def get_queryset(self):
        company = getattr(self.request, "company", None)
        if not company:
            return Column.all_objects.none()
        return Column.all_objects.select_related("pipeline", "legacy_stage").prefetch_related("cards").filter(company=company)

    def perform_create(self, serializer):
        column = serializer.save(company=self.request.company)
        if column.legacy_stage_id is None:
            legacy_stage = Stage.objects.create(
                company=self.request.company,
                pipeline=column.pipeline,
                name=column.title,
                order=column.order,
            )
            column.legacy_stage = legacy_stage
            column.save(update_fields=["legacy_stage"])

    def perform_update(self, serializer):
        column = serializer.save()
        if column.legacy_stage_id:
            Stage.all_objects.filter(id=column.legacy_stage_id).update(
                pipeline=column.pipeline,
                name=column.title,
                order=column.order,
            )


class DealViewSet(viewsets.ModelViewSet):
    serializer_class = DealSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = "crm"
    pagination_class = None

    @staticmethod
    def _is_done_column(legacy_stage=None, column=None):
        resolved_column = column or getattr(legacy_stage, "column", None)
        return bool(resolved_column and resolved_column.is_done())

    def perform_create(self, serializer):
        legacy_stage = serializer.validated_data.get("stage")
        column = serializer.validated_data.get("column") or getattr(legacy_stage, "column", None)
        serializer.save(
            owner=serializer.validated_data.get("owner", self.request.user),
            company=self.request.company,
            tecnico_responsavel=serializer.validated_data.get("tecnico_responsavel"),
            column=column,
            is_closed=self._is_done_column(legacy_stage=legacy_stage, column=column),
        )

    def get_queryset(self):
        company = getattr(self.request, "company", None)
        if not company:
            return Deal.all_objects.none()

        qs = (
            Deal.all_objects.select_related("stage", "column", "contact", "owner", "tecnico_responsavel")
            .prefetch_related("activities", "activities__actor")
            .filter(company=company, is_deleted=False)
        )
        pipeline_id = self.request.query_params.get("pipeline_id")
        if pipeline_id:
            qs = qs.filter(Q(column__pipeline_id=pipeline_id) | Q(stage__pipeline_id=pipeline_id))
        return qs

    def perform_update(self, serializer):
        previous_legacy_stage = serializer.instance.stage
        previous_column = serializer.instance.column or getattr(serializer.instance.stage, "column", None)
        previous_owner = serializer.instance.owner
        next_legacy_stage = serializer.validated_data.get("stage", previous_legacy_stage)
        next_column = serializer.validated_data.get("column", previous_column)
        next_owner = serializer.validated_data.get("owner", previous_owner)
        updated_deal = serializer.save(
            column=next_column,
            is_closed=self._is_done_column(legacy_stage=next_legacy_stage, column=next_column),
        )

        changed_fields = sorted(
            {
                "column" if field == "stage" else field
                for field in serializer.validated_data.keys()
            }
        )
        user = getattr(self.request, "user", None)

        logger.info(
            "crm_deal_updated",
            extra={
                "deal_id": updated_deal.id,
                "title": updated_deal.title,
                "changed_fields": changed_fields,
                "previous_legacy_stage_id": previous_legacy_stage.id if previous_legacy_stage else None,
                "previous_legacy_stage_name": previous_legacy_stage.name if previous_legacy_stage else None,
                "previous_column_id": previous_column.id if previous_column else None,
                "previous_column_title": previous_column.title if previous_column else None,
                "next_legacy_stage_id": next_legacy_stage.id if next_legacy_stage else None,
                "next_legacy_stage_name": next_legacy_stage.name if next_legacy_stage else None,
                "next_column_id": next_column.id if next_column else None,
                "next_column_title": next_column.title if next_column else None,
                "user_id": getattr(user, "id", None),
                "company_id": getattr(updated_deal.company, "id", None),
            },
        )

        if previous_legacy_stage != next_legacy_stage:
            DealActivity.objects.create(
                company=updated_deal.company,
                deal=updated_deal,
                actor=user if getattr(user, "is_authenticated", False) else updated_deal.owner,
                activity_type="column_change",
                description=f"Card movido da coluna {previous_legacy_stage.name} para {next_legacy_stage.name}.",
                old_value={"column": previous_legacy_stage.name},
                new_value={"column": next_legacy_stage.name},
            )
            Notification.objects.create(
                recipient=updated_deal.owner,
                company=updated_deal.company,
                title="Card Movimentado",
                message=f"O card '{updated_deal.title}' foi movido para a coluna {next_legacy_stage.name}.",
                notification_type=Notification.TYPE_SYSTEM,
                metadata={"deal_uuid": str(updated_deal.uuid)},
            )

        if previous_column != next_column and next_column is not None:
            send_column_change_webhook(updated_deal, previous_column, next_column)

        if previous_owner != next_owner:
            actor = user if getattr(user, "is_authenticated", False) else updated_deal.owner
            previous_owner_name = previous_owner.get_full_name().strip() or previous_owner.username
            next_owner_name = next_owner.get_full_name().strip() or next_owner.username

            DealActivity.objects.create(
                company=updated_deal.company,
                deal=updated_deal,
                actor=actor,
                activity_type="note",
                description=f"Responsável alterado de {previous_owner_name} para {next_owner_name}.",
                old_value={"owner": previous_owner_name},
                new_value={"owner": next_owner_name},
            )
            Notification.objects.create(
                recipient=next_owner,
                company=updated_deal.company,
                title="Card Atribuído",
                message=f"Você agora é o responsável pelo card '{updated_deal.title}'.",
                notification_type=Notification.TYPE_SYSTEM,
                metadata={"deal_uuid": str(updated_deal.uuid)},
            )

    @action(detail=True, methods=["post"], url_path="notes")
    def add_note(self, request, pk=None):
        deal = self.get_object()
        serializer = DealNoteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = getattr(request, "user", None)
        DealActivity.objects.create(
            company=deal.company,
            deal=deal,
            actor=user if getattr(user, "is_authenticated", False) else deal.owner,
            activity_type="note",
            description=serializer.validated_data["description"],
        )

        return Response(DealSerializer(deal, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if should_include_legacy_stage_fields({"request": request}):
            return add_deprecation_headers(
                response,
                "crm deal field 'stage' is deprecated; prefer column fields.",
            )
        return response


class IntegrationSyncCardAPIView(APIView):
    authentication_classes = [APIKeyAuthentication, SessionAuthentication]
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = "crm"

    @staticmethod
    def _is_done_column(column=None):
        return bool(column and column.is_done())

    @staticmethod
    def _get_default_contact(company, integration_source):
        contact, _ = Contact.all_objects.get_or_create(
            company=company,
            name=f"Integração {integration_source.upper()}",
            defaults={"email": None, "phone": None},
        )
        return contact

    @staticmethod
    def _get_default_owner(company):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        return User.all_objects.filter(company=company).order_by("id").first()

    def post(self, request):
        serializer = IntegrationSyncCardSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        company = request.company
        pipeline = serializer.validated_data["pipeline"]
        target_column = serializer.validated_data.get("column") or Column.all_objects.filter(company=company, pipeline=pipeline).order_by("order", "id").first()
        if target_column is None:
            return Response({"detail": "O pipeline precisa ter ao menos uma coluna."}, status=status.HTTP_400_BAD_REQUEST)

        card = Deal.all_objects.filter(company=company, external_id=serializer.validated_data["external_id"]).first()
        owner = serializer.validated_data.get("owner") or self._get_default_owner(company)
        if owner is None:
            return Response({"detail": "Não há usuário disponível para assumir o card sincronizado."}, status=status.HTTP_400_BAD_REQUEST)

        payload = {
            "title": serializer.validated_data["title"],
            "description": serializer.validated_data.get("description"),
            "integration_source": serializer.validated_data.get("integration_source", "glpi"),
            "external_id": serializer.validated_data["external_id"],
            "value": serializer.validated_data.get("value", Decimal("0.00")),
            "priority": serializer.validated_data.get("priority", "MEDIUM"),
            "closing_date": serializer.validated_data.get("closing_date"),
            "data_agendamento": serializer.validated_data.get("data_agendamento"),
            "tecnico_responsavel": serializer.validated_data.get("tecnico_responsavel"),
            "custom_fields": serializer.validated_data.get("custom_fields", {}),
        }

        if card is not None:
            for key, value in payload.items():
                setattr(card, key, value)
            if serializer.validated_data.get("column") is not None:
                card.column = serializer.validated_data["column"]
                card.stage = serializer.validated_data["column"].legacy_stage
            if serializer.validated_data.get("tecnico_responsavel") is not None:
                card.tecnico_responsavel = serializer.validated_data["tecnico_responsavel"]
            card.is_closed = self._is_done_column(card.column) if card.column_id else card.is_closed
            card.save()
            return Response(DealSerializer(card, context={"request": request}).data)

        contact = serializer.validated_data.get("contact") or self._get_default_contact(company, payload["integration_source"])
        card = Deal.all_objects.create(
            company=company,
            owner=owner,
            contact=contact,
            stage=target_column.legacy_stage,
            column=target_column,
            title=payload["title"],
            description=payload["description"],
            integration_source=payload["integration_source"],
            external_id=payload["external_id"],
            value=payload["value"],
            priority=payload["priority"],
            closing_date=payload["closing_date"],
            data_agendamento=payload["data_agendamento"],
            tecnico_responsavel=payload["tecnico_responsavel"],
            custom_fields=payload["custom_fields"],
            is_closed=self._is_done_column(target_column),
        )
        return Response(DealSerializer(card, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if should_include_legacy_stage_fields({"request": request}):
            return add_deprecation_headers(
                response,
                "crm deal field 'stage' is deprecated; prefer column fields.",
            )
        return response
