from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.core.models import Company
from apps.crm.models import Contact, Pipeline, Stage, Deal
from apps.calendar.models import Event
from apps.notifications.models import Notification
from django.utils import timezone

User = get_user_model()

class CRMIntegrationTest(TestCase):
    def setUp(self):
        self.company = Company.objects.create(name="TI Solutions", slug="ti-solutions")
        self.user = User.objects.create_user(username="tecnico", password="password", company=self.company)
        
        # Cria um contato
        self.contact = Contact.objects.create(
            company=self.company,
            name="João Cliente",
            email="joao@cliente.com"
        )

    def test_pipeline_creates_default_stages(self):
        """Testa se a criação de um Pipeline gera as colunas [Novo, Planejados, Em Andamento, Concluído]."""
        pipeline = Pipeline.all_objects.create(company=self.company, name="Suporte TI")
        
        stages = Stage.all_objects.filter(pipeline=pipeline)
        self.assertEqual(stages.count(), 4)
        stage_names = list(stages.values_list('name', flat=True))
        self.assertIn("Novo", stage_names)
        self.assertIn("Concluído", stage_names)

    def test_deal_syncs_with_calendar(self):
        """Testa se um card criado com data gera um evento no calendário."""
        pipeline = Pipeline.all_objects.create(company=self.company, name="Suporte TI")
        stage = Stage.all_objects.get(pipeline=pipeline, name="Novo")
        
        deadline = timezone.now() + timezone.timedelta(days=2)
        
        deal = Deal.all_objects.create(
            company=self.company,
            owner=self.user,
            title="Manutenção Servidor",
            contact=self.contact,
            stage=stage,
            closing_date=deadline,
            priority="URGENT"
        )
        
        # Verifica se o evento foi criado na agenda
        deal.refresh_from_db()
        self.assertIsNotNone(deal.linked_event_id)
        event = Event.all_objects.get(id=deal.linked_event_id)
        self.assertEqual(event.title, "[URGENT] Manutenção Servidor")
        self.assertEqual(event.color_category, "red")

    def test_notification_on_deal_movement(self):
        """Testa se mover o card gera uma notificação no sistema."""
        pipeline = Pipeline.all_objects.create(company=self.company, name="Suporte TI")
        novo = Stage.all_objects.get(pipeline=pipeline, name="Novo")
        execucao = Stage.all_objects.get(pipeline=pipeline, name="Em Andamento")

        deal = Deal.all_objects.create(
            company=self.company,
            owner=self.user,
            title="Troca de Teclado",
            contact=self.contact,
            stage=novo
        )
        
        # Limpa notificações iniciais de criação
        Notification.all_objects.all().delete()
        
        # Move o card
        deal.stage = execucao
        deal.save(update_fields=['stage'])
        deal.refresh_from_db()
        
        notification = Notification.all_objects.filter(recipient=self.user, title="Card Movimentado").first()
        self.assertIsNotNone(notification)
        self.assertIn("Em Andamento", notification.message)
