from rest_framework import permissions, viewsets

from apps.module_manager.permissions import HasModuleAccess

from .models import Contact, Deal, Pipeline, Stage
from .serializers import ContactSerializer, DealSerializer, PipelineSerializer, StageSerializer


class ContactViewSet(viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = "crm"

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)


class PipelineViewSet(viewsets.ModelViewSet):
    queryset = Pipeline.objects.all()
    serializer_class = PipelineSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = "crm"

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)


class StageViewSet(viewsets.ModelViewSet):
    queryset = Stage.objects.all()
    serializer_class = StageSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = "crm"

    def perform_create(self, serializer):
        serializer.save(company=self.request.company)


class DealViewSet(viewsets.ModelViewSet):
    queryset = Deal.objects.all()
    serializer_class = DealSerializer
    permission_classes = [permissions.IsAuthenticated, HasModuleAccess]
    module_code = "crm"

    def perform_create(self, serializer):
        # Todo Deal deve ter um owner (quem criou) e a empresa (tenant)
        serializer.save(owner=self.request.user, company=self.request.company)

    def get_queryset(self):
        # Filtros extras como ?pipeline_id=... podem ser adicionados aqui
        qs = super().get_queryset()
        pipeline_id = self.request.query_params.get("pipeline_id")
        if pipeline_id:
            qs = qs.filter(stage__pipeline_id=pipeline_id)
        return qs
