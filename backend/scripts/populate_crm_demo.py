import os
import random
import sys

import django
from django.utils import timezone

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.accounts.models import User
from apps.core.models import Company
from apps.crm.models import Contact, Deal, Pipeline, Stage


def run():
    print("🚀 Iniciando Simulação do CRM de TI...")

    # 1. Pega a primeira empresa/usuário existente ou cria um mock
    company = Company.objects.first()
    if not company:
        print("❌ Nenhuma empresa encontrada. Por favor, crie uma empresa primeiro.")
        return

    admin_user = (
        User.all_objects.filter(is_superuser=True, company=company).first()
        or User.all_objects.filter(company=company).first()
    )
    if not admin_user:
        # Se ainda não achar, tenta qualquer usuário
        admin_user = User.all_objects.first()
        if not admin_user:
            print("❌ Nenhum usuário encontrado para herdar os cards.")
            return
        company = admin_user.company  # Ajusta a empresa para o usuário encontrado

    # 2. Cria contatos (Clientes da Central de TI)
    clients_data = [
        ("Maria Financeiro", "maria@empresa.com", "Financeiro S/A"),
        ("Pedro Marketing", "pedro@agencia.com", "Agência Criativa"),
        ("João RH", "joao@rh.com", "Consultoria RH"),
    ]

    contacts = []
    for name, email, corp in clients_data:
        contact, _ = Contact.all_objects.get_or_create(company=company, name=name, email=email, company_name=corp)
        contacts.append(contact)

    # 3. Cria o Pipeline de TI (Gera estágios automaticamente via signal)
    pipeline, _created = Pipeline.all_objects.get_or_create(
        company=company,
        name="Suporte Técnico TI",
        defaults={"description": "Gerenciamento de incidentes e requisições."},
    )

    # Se o pipeline já existia, garante que ele tenha os estágios (re-executa a lógica se necessário)
    stages = list(Stage.all_objects.filter(pipeline=pipeline).order_by("order"))
    if not stages:
        # Força a criação se os sinais falharam ou se o objeto já existia sem estágios
        from apps.crm.signals import create_default_stages

        create_default_stages(Pipeline, pipeline, created=True)
        stages = list(Stage.all_objects.filter(pipeline=pipeline).order_by("order"))

    # 4. Cria os cards (Tickets)
    tickets = [
        ("Configuração de VPN", "Configurar acesso remoto para nova equipe home-office.", "HIGH", "Novo"),
        ("Notebook Lento", "Usuário relata lentidão excessiva ao abrir o ERP.", "MEDIUM", "Em Andamento"),
        (
            "Servidor de Arquivos Offline",
            "Urgente: Unidade Z: inacessível para todos os departamentos.",
            "URGENT",
            "Planejados",
        ),
        ("Instalação de Impressora", "Instalar HP Color LaserJet no setor de marketing.", "LOW", "Concluído"),
        ("Backup Semanal", "Verificar logs do backup de sexta-feira.", "MEDIUM", "Novo"),
    ]

    for title, desc, priority, stage_name in tickets:
        stage = next((s for s in stages if s.name == stage_name), stages[0])

        # Define datas para aparecerem na agenda
        deadline = timezone.now() + timezone.timedelta(days=random.randint(0, 7), hours=random.randint(0, 8))

        Deal.all_objects.create(
            company=company,
            owner=admin_user,
            title=title,
            description=desc,
            contact=random.choice(contacts),
            stage=stage,
            priority=priority,
            closing_date=deadline if stage_name != "Novo" else None,
        )
        print(f"✅ Ticket criado: {title} (Stage: {stage.name}, Priority: {priority})")

    print("\n🎉 Simulação do CRM concluída com sucesso!")
    print("Dica: Vá para /crm e /calendar no seu front para ver os resultados.")


if __name__ == "__main__":
    run()
