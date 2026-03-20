from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.core.models import Company
from apps.pages.models import Page

DEFAULT_PAGES = [
    {
        "title": "Sobre Nós",
        "slug": "sobre",
        "content": "<h1>Sobre Nós</h1><p>Informações sobre a empresa.</p>",
        "meta_title": "Sobre Nós",
        "meta_description": "Informações institucionais da empresa.",
    },
    {
        "title": "Ecossistema de Serviços",
        "slug": "ecossistema-de-servicos",
        "content": """
<h1>Ecossistema de Serviços</h1>
<p>Acesse todos os serviços e aplicações disponíveis. Organizados por categorias com descrições detalhadas e acesso direto.</p>

<h2>Conhecimento</h2>
<ul>
  <li><strong>Central de Artigos</strong> — Base de conhecimento com guias, tutoriais e documentações técnicas. <a href="/p/artigos">Acessar</a></li>
</ul>

<h2>Comunicação</h2>
<ul>
  <li><strong>Backbone Messenger</strong> — Plataforma de comunicação integrada para chat em tempo real. <a href="/messenger">Acessar</a></li>
  <li><strong>Evolution API</strong> — API para integração com WhatsApp Business, permitindo automação de mensagens e atendimento. <a href="http://evolution.projetoravenna.cloud/" target="_blank" rel="noopener noreferrer">Acessar</a></li>
  <li><strong>Atendimento</strong> — Plataforma de atendimento ao cliente com chat ao vivo, tickets e integração com múltiplos canais. <a href="https://atendimento.projetoravanna.cloud/" target="_blank" rel="noopener noreferrer">Acessar</a></li>
</ul>

<h2>Produtividade</h2>
<ul>
  <li><strong>Criador de Páginas</strong> — Ferramenta visual para criação e gestão de páginas web personalizadas. <a href="/cms">Acessar</a></li>
  <li><strong>Nextcloud</strong> — Plataforma de colaboração e compartilhamento de arquivos auto-hospedada com integração ao Samba. <a href="https://nextcloud.projetoravenna.cloud/" target="_blank" rel="noopener noreferrer">Acessar</a></li>
</ul>

<h2>Entretenimento</h2>
<ul>
  <li><strong>Jellyfin</strong> — Servidor de mídia open-source para organizar e transmitir músicas, vídeos e fotos. <a href="https://jellyfin.projetoravenna.cloud/" target="_blank" rel="noopener noreferrer">Acessar</a></li>
  <li><strong>Komga</strong> — Gerenciador de bibliotecas de quadrinhos e mangás com leitor web integrado. <a href="https://komga.projetoravenna.cloud/" target="_blank" rel="noopener noreferrer">Acessar</a></li>
  <li><strong>Navidrome</strong> — Servidor de música moderno e compatível com Subsonic. <a href="https://navidrome.projetoravenna.cloud/" target="_blank" rel="noopener noreferrer">Acessar</a></li>
</ul>

<h2>Automação</h2>
<ul>
  <li><strong>n8n</strong> — Plataforma de automação de workflows que conecta diferentes serviços e automatiza tarefas. <a href="https://n8n.projetoravenna.cloud/" target="_blank" rel="noopener noreferrer">Acessar</a></li>
</ul>

<h2>Monitoramento</h2>
<ul>
  <li><strong>Zabbix</strong> — Sistema de monitoramento de infraestrutura que acompanha o desempenho e disponibilidade dos serviços. <a href="https://zabbix.projetoravenna.cloud/" target="_blank" rel="noopener noreferrer">Acessar</a></li>
</ul>

<h2>Gerenciamento</h2>
<ul>
  <li><strong>Portainer</strong> — Interface de gerenciamento para Docker, facilitando a administração de containers e serviços. <a href="https://portainer.projetoravenna.cloud/" target="_blank" rel="noopener noreferrer">Acessar</a></li>
  <li><strong>GLPI</strong> — Sistema de gerenciamento de ativos de TI e help desk para controle de inventário e suporte técnico. <a href="https://glpi.projetoravenna.cloud/" target="_blank" rel="noopener noreferrer">Acessar</a></li>
</ul>
""",
        "meta_title": "Ecossistema de Serviços",
        "meta_description": "Central de serviços e aplicações com acesso organizado por categorias.",
    },
    {
        "title": "Contato",
        "slug": "contato",
        "content": "<h1>Contato</h1><p>Fale conosco pelos canais oficiais.</p>",
        "meta_title": "Contato",
        "meta_description": "Canais oficiais de contato.",
    },
    {
        "title": "Política de Privacidade",
        "slug": "politica-de-privacidade",
        "content": "<h1>Política de Privacidade</h1><p>Esta política descreve como tratamos seus dados.</p>",
        "meta_title": "Política de Privacidade",
        "meta_description": "Como tratamos dados pessoais.",
    },
]


class Command(BaseCommand):
    help = "Cria páginas padrão (Sobre, Contato, Política de Privacidade) para todas as empresas."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Iniciando seed de páginas padrão..."))

        companies = Company.objects.all()
        if not companies.exists():
            self.stdout.write(self.style.WARNING("Nenhuma empresa encontrada. Encerrando."))
            return

        total_created = 0
        for company in companies:
            self.stdout.write(f"Processando empresa: {company.name}")
            for page_data in DEFAULT_PAGES:
                slug = slugify(page_data["slug"])
                page, created = Page.all_objects.get_or_create(
                    company=company,
                    slug=slug,
                    defaults={
                        "title": page_data["title"],
                        "content": page_data["content"],
                        "meta_title": page_data["meta_title"],
                        "meta_description": page_data["meta_description"],
                        "status": "published",
                    },
                )
                if created:
                    total_created += 1
                    self.stdout.write(self.style.SUCCESS(f"  [+] Página criada: {page.title}"))
                else:
                    self.stdout.write(f"  [.] Página existente: {page.title}")

        self.stdout.write(self.style.SUCCESS(f"Concluído. Total de páginas criadas: {total_created}"))
