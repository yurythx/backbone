"""
Management command to create test articles for development and testing.
Usage: python manage.py create_test_articles
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.articles.models import Article, Category
from apps.accounts.models import User
from apps.core.models import Company


class Command(BaseCommand):
    help = 'Creates 6 public test articles with rich content'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Creating test articles...'))

        # Get first existing company
        company = Company.objects.first()
        if not company:
            self.stdout.write(self.style.ERROR('No companies found. Please create a company first.'))
            return

        self.stdout.write(self.style.SUCCESS(f'Using company: {company.name}'))

        # Get first user or create admin
        user = User.all_objects.filter(company=company).first()
        if not user:
            user, created = User.all_objects.get_or_create(
                username='admin',
                company=company,
                defaults={
                    'email': 'admin@test.com',
                    'first_name': 'Admin',
                    'last_name': 'User',
                    'is_staff': True,
                    'is_superuser': True
                }
            )
            if created:
                user.set_password('admin123')
                user.save()
                self.stdout.write(self.style.SUCCESS(f'Created admin user: {user.username}'))

        # Get existing categories or use first available
        categories = {}
        try:
            categories['tecnologia'] = Category.objects.filter(company=company, slug__icontains='tecno').first()
            categories['tutoriais'] = Category.objects.filter(company=company, slug__icontains='tutor').first()
            categories['novidades'] = Category.objects.filter(company=company, slug__icontains='novid').first()
        except:
            pass
        
        # If no specific categories found, just get first three or None
        default_category = Category.objects.filter(company=company).first()
        if not categories.get('tecnologia'):
            categories['tecnologia'] = default_category
        if not categories.get('tutoriais'):
            categories['tutoriais'] = default_category
        if not categories.get('novidades'):
            categories['novidades'] = default_category

        # Test articles data
        articles_data = [
            {
                'title': 'Introdução ao Django: Guia Completo para Iniciantes',
                'slug': 'introducao-ao-django-guia-completo',
                'excerpt': 'Aprenda Django do zero com este guia completo. Descubra como criar aplicações web poderosas usando o framework Python mais popular.',
                'category': categories['tutoriais'],
                'content': '''
                    <h2>Por que aprender Django?</h2>
                    <p>Django é um framework web de alto nível que permite o desenvolvimento rápido de aplicações seguras e escaláveis. Usado por empresas como Instagram, Pinterest e NASA, Django se destaca por sua filosofia "batteries included".</p>
                    
                    <h3>Principais Vantagens</h3>
                    <ul>
                        <li><strong>Desenvolvimento Rápido:</strong> Com Django, você pode criar protótipos funcionais em questão de horas.</li>
                        <li><strong>Segurança:</strong> Proteção contra SQL injection, XSS, CSRF e muito mais, tudo por padrão.</li>
                        <li><strong>Escalabilidade:</strong> Arquitetura preparada para crescer junto com seu projeto.</li>
                        <li><strong>Admin Automático:</strong> Interface administrativa gerada automaticamente a partir dos seus modelos.</li>
                    </ul>

                    <h3>Primeiros Passos</h3>
                    <p>Para começar com Django, você precisa ter Python instalado. Depois, é simples:</p>
                    <pre><code>pip install django
django-admin startproject meu_projeto
cd meu_projeto
python manage.py runserver</code></pre>

                    <p>Em minutos, você terá um servidor de desenvolvimento rodando! Django cuida de toda a configuração inicial, permitindo que você foque no que realmente importa: construir sua aplicação.</p>

                    <h3>Estrutura de um Projeto Django</h3>
                    <p>Um projeto Django bem organizado segue o padrão MTV (Model-Template-View), semelhante ao MVC. Os models definem a estrutura dos dados, as views processam a lógica de negócio, e os templates renderizam a interface.</p>

                    <blockquote>
                        <p>"Django me permite focar na lógica de negócio sem me preocupar com a infraestrutura básica. É produtividade elevada ao máximo." - Desenvolvedor Python</p>
                    </blockquote>
                ''',
                'meta_title': 'Django Tutorial Completo: Aprenda o Framework Python',
                'meta_description': 'Guia completo de Django para iniciantes. Aprenda a criar aplicações web modernas com Python e Django framework.',
            },
            {
                'title': 'TypeScript vs JavaScript: Quando Usar Cada Um?',
                'slug': 'typescript-vs-javascript-quando-usar',
                'excerpt': 'Entenda as diferenças fundamentais entre TypeScript e JavaScript e descubra qual é a melhor escolha para seu próximo projeto.',
                'category': categories['tecnologia'],
                'content': '''
                    <h2>A Evolução do JavaScript</h2>
                    <p>JavaScript dominou o desenvolvimento web por décadas, mas TypeScript emergiu como um superconjunto que adiciona tipagem estática. A grande questão é: você realmente precisa disso?</p>

                    <h3>JavaScript: Flexibilidade e Simplicidade</h3>
                    <p>JavaScript é dinâmico, flexível e permite prototipagem rápida. Perfeito para projetos pequenos e MVPs onde a velocidade de desenvolvimento é crucial.</p>

                    <h3>TypeScript: Segurança e Escalabilidade</h3>
                    <p>TypeScript adiciona verificação de tipos em tempo de compilação, reduzindo bugs e melhorando a manutenibilidade em projetos grandes.</p>

                    <h3>Quando Usar TypeScript?</h3>
                    <ul>
                        <li>Projetos de grande escala com múltiplos desenvolvedores</li>
                        <li>Aplicações críticas que exigem alta confiabilidade</li>
                        <li>Código que será mantido por longos períodos</li>
                        <li>Times que valorizam autocompletar e refatoração segura</li>
                    </ul>

                    <h3>Quando JavaScript Puro Basta?</h3>
                    <ul>
                        <li>Protótipos e MVPs rápidos</li>
                        <li>Scripts pequenos e ferramentas de automação</li>
                        <li>Projetos com equipes pequenas e bem alinhadas</li>
                        <li>Quando a simplicidade é mais importante que a verificação estática</li>
                    </ul>

                    <p>A verdade é que não existe uma resposta única. TypeScript é especialmente valioso em bases de código grandes, mas adiciona complexidade inicial. JavaScript puro ainda é incrivelmente poderoso para muitos casos de uso.</p>
                ''',
                'meta_title': 'TypeScript vs JavaScript: Comparação Completa 2024',
                'meta_description': 'Comparação detalhada entre TypeScript e JavaScript. Entenda quando usar cada tecnologia para máxima produtividade.',
            },
            {
                'title': 'Novas Funcionalidades do React 19: O Que Você Precisa Saber',
                'slug': 'react-19-novas-funcionalidades',
                'excerpt': 'React 19 traz mudanças significativas que vão transformar a forma como desenvolvemos interfaces. Conheça as principais novidades.',
                'category': categories['novidades'],
                'content': '''
                    <h2>React 19: Uma Nova Era</h2>
                    <p>O React 19 representa um dos maiores avanços do framework nos últimos anos, com foco em performance, experiência do desenvolvedor e padrões modernos da web.</p>

                    <h3>1. React Compiler: Adeus useMemo e useCallback</h3>
                    <p>A maior novidade é o compilador oficial do React. Ele otimiza automaticamente seus componentes, eliminando a necessidade de memoização manual na maioria dos casos.</p>

                    <pre><code>// Antes: você precisava fazer isso
const expensiveValue = useMemo(() => compute(a, b), [a, b]);

// Agora: o compilador faz automaticamente
const expensiveValue = compute(a, b);</code></pre>

                    <h3>2. Actions: Tratamento Nativo de Formulários</h3>
                    <p>Actions simplificam o gerenciamento de estado assíncrono em formulários, com tratamento automático de pending states e otimistic updates.</p>

                    <h3>3. Server Components Estáveis</h3>
                    <p>React Server Components saem da fase experimental, permitindo renderização no servidor com zero JavaScript no cliente para componentes que não precisam de interatividade.</p>

                    <h3>4. Asset Loading com Suspense</h3>
                    <p>Carregamento de imagens, fontes e scripts agora integrados ao Suspense, proporcionando experiências de carregamento mais fluidas.</p>

                    <h3>5. Performance Aprimorada</h3>
                    <ul>
                        <li>Rehidratação até 2x mais rápida</li>
                        <li>Menor tamanho do bundle</li>
                        <li>Melhor suporte a concurrent rendering</li>
                    </ul>

                    <blockquote>
                        <p>"React 19 não é apenas uma atualização incremental – é uma reimaginação de como construímos interfaces para a web moderna." - Dan Abramov</p>
                    </blockquote>

                    <p>A migração será gradual e compatível com versões anteriores, mas os benefícios são significativos o suficiente para justificar o upgrade.</p>
                ''',
                'meta_title': 'React 19: Novidades e Mudanças - Guia Completo',
                'meta_description': 'Descubra todas as novidades do React 19: compiler, actions, server components e mais. Guia atualizado com exemplos práticos.',
            },
            {
                'title': 'Arquitetura de Microserviços: Prós, Contras e Quando Usar',
                'slug': 'arquitetura-microservicos-guia',
                'excerpt': 'Microserviços são a solução para tudo? Descubra os verdadeiros benefícios e desafios desta arquitetura antes de implementar.',
                'category': categories['tecnologia'],
                'content': '''
                    <h2>O Que São Microserviços?</h2>
                    <p>Microserviços são uma abordagem arquitetural onde uma aplicação é composta por serviços pequenos, independentes e especializados que se comunicam através de APIs.</p>

                    <h3>Vantagens dos Microserviços</h3>
                    <ul>
                        <li><strong>Escalabilidade Independente:</strong> Escale apenas os componentes que precisam</li>
                        <li><strong>Tecnologias Heterogêneas:</strong> Cada serviço pode usar a stack mais adequada</li>
                        <li><strong>Deploy Independente:</strong> Atualize serviços sem afetar o sistema todo</li>
                        <li><strong>Resiliência:</strong> Falhas em um serviço não derrubam toda a aplicação</li>
                        <li><strong>Times Autônomos:</strong> Equipes podem trabalhar de forma mais independente</li>
                    </ul>

                    <h3>Desafios e Complexidades</h3>
                    <ul>
                        <li><strong>Complexidade Operacional:</strong> Mais serviços = mais para monitorar e gerenciar</li>
                        <li><strong>Transações Distribuídas:</strong> Manter consistência entre serviços é difícil</li>
                        <li><strong>Overhead de Rede:</strong> Comunicação entre serviços adiciona latência</li>
                        <li><strong>Debugging Complexo:</strong> Rastrear problemas através de múltiplos serviços</li>
                        <li><strong>Custo Inicial:</strong> Infrastructure e tooling são mais caros no início</li>
                    </ul>

                    <h3>Quando NÃO Usar Microserviços</h3>
                    <p>Se sua aplicação é pequena ou tem um time reduzido, um monólito bem estruturado pode ser muito mais eficiente. Microserviços são para resolver problemas de escala organizacional e técnica.</p>

                    <h3>Quando Microserviços Fazem Sentido</h3>
                    <ul>
                        <li>Aplicações com diferentes requisitos de escala por componente</li>
                        <li>Times grandes com múltiplas equipes autônomas</li>
                        <li>Necessidade de tecnologias diferentes para diferentes problemas</li>
                        <li>Partes do sistema com ciclos de release independentes</li>
                    </ul>

                    <p>Lembre-se: você pode sempre começar com um monólito e migrar para microserviços quando realmente precisar. A transição prematura pode criar complexidade desnecessária.</p>
                ''',
                'meta_title': 'Microserviços: Guia Completo de Arquitetura',
                'meta_description': 'Entenda quando usar microserviços, vantagens, desvantagens e como implementar corretamente esta arquitetura.',
            },
            {
                'title': 'SEO em 2024: Estratégias Que Realmente Funcionam',
                'slug': 'seo-2024-estrategias',
                'excerpt': 'O algoritmo do Google mudou. Descubra as técnicas de SEO modernas que trazem resultados reais em 2024.',
                'category': categories['tutoriais'],
                'content': '''
                    <h2>O SEO Evoluiu</h2>
                    <p>Esqueça keyword stuffing e backlinks comprados. O SEO moderno é sobre experiência do usuário, conteúdo genuíno e sinais de qualidade reais.</p>

                    <h3>1. Core Web Vitals: A Prioridade Número Um</h3>
                    <p>Performance não é mais opcional. Google prioriza sites que carregam rápido e proporcionam experiência fluida.</p>
                    <ul>
                        <li>LCP (Largest Contentful Paint): Menos de 2.5s</li>
                        <li>FID (First Input Delay): Menos de 100ms</li>
                        <li>CLS (Cumulative Layout Shift): Menos de 0.1</li>
                    </ul>

                    <h3>2. Conteúdo E-E-A-T</h3>
                    <p>Google busca conteúdo que demonstra Experience, Expertise, Authoritativeness e Trustworthiness. Isso significa:</p>
                    <ul>
                        <li>Autores identificados com credenciais verificáveis</li>
                        <li>Conteúdo aprofundado baseado em experiência real</li>
                        <li>Citações e referências de fontes confiáveis</li>
                        <li>Transparência sobre quem está por trás do site</li>
                    </ul>

                    <h3>3. Search Intent é Rei</h3>
                    <p>Não basta ranquear para uma keyword. Você precisa satisfazer exatamente o que o usuário está buscando.</p>

                    <h3>4. Otimização para Featured Snippets</h3>
                    <p>Posição zero vale ouro. Estruture conteúdo com:</p>
                    <ul>
                        <li>Listas numeradas e com bullets</li>
                        <li>Tabelas comparativas</li>
                        <li>Respostas diretas em parágrafos curtos</li>
                        <li>Schema markup adequado</li>
                    </ul>

                    <h3>5. Mobile-First é Obrigatório</h3>
                    <p>Google indexa primariamente a versão mobile. Se seu site não funciona perfeitamente em smartphones, você está fora do jogo.</p>

                    <h3>O Que NÃO Fazer</h3>
                    <ul>
                        <li>❌ Conteúdo gerado por IA sem revisão humana</li>
                        <li>❌ Compra de backlinks ou esquemas de link building</li>
                        <li>❌ Keyword stuffing e técnicas ultrapassadas</li>
                        <li>❌ Cloaking ou qualquer forma de manipulação</li>
                    </ul>

                    <p>O futuro do SEO é criar genuinamente o melhor conteúdo para seu público. Algoritmos estão cada vez melhores em detectar valor real versus manipulação.</p>
                ''',
                'meta_title': 'SEO 2024: Guia Atualizado de Otimização para Google',
                'meta_description': 'Estratégias modernas de SEO que funcionam em 2024. Core Web Vitals, E-E-A-T, mobile-first e mais.',
            },
            {
                'title': 'CI/CD com GitHub Actions: Automatize Seu Deploy',
                'slug': 'cicd-github-actions-tutorial',
                'excerpt': 'Configure pipelines de CI/CD profissionais usando GitHub Actions. Deploy automatizado nunca foi tão simples.',
                'category': categories['tutoriais'],
                'content': '''
                    <h2>Por Que CI/CD é Essencial?</h2>
                    <p>Continuous Integration e Continuous Deployment transformam a forma como desenvolvemos software. Com CI/CD, cada commit pode ser testado, validado e deployado automaticamente.</p>

                    <h3>GitHub Actions: Integração Nativa</h3>
                    <p>GitHub Actions traz CI/CD diretamente para o repositório, sem necessidade de ferramentas externas. É simples, poderoso e gratuito para repositórios públicos.</p>

                    <h3>Seu Primeiro Workflow</h3>
                    <p>Crie um arquivo <code>.github/workflows/deploy.yml</code>:</p>

                    <pre><code>name: Deploy Application

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Production
        run: |
          npm run build
          # Seu comando de deploy aqui
</code></pre>

                    <h3>Boas Práticas</h3>
                    <ul>
                        <li><strong>Cache de Dependências:</strong> Use <code>actions/cache</code> para acelerar builds</li>
                        <li><strong>Secrets Seguros:</strong> Nunca exponha credenciais, use GitHub Secrets</li>
                        <li><strong>Ambientes Separados:</strong> Teste em staging antes de produção</li>
                        <li><strong>Rollback Automático:</strong> Configure reversão em caso de falha</li>
                    </ul>

                    <h3>Integrações Avançadas</h3>
                    <p>GitHub Actions se integra com praticamente tudo:</p>
                    <ul>
                        <li>AWS, Azure, Google Cloud para deploy</li>
                        <li>Docker para containerização</li>
                        <li>Kubernetes para orquestração</li>
                        <li>Slack/Discord para notificações</li>
                    </ul>

                    <h3>Exemplo Real: Deploy Next.js na Vercel</h3>
                    <pre><code>- name: Deploy to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    vercel-org-id: ${{ secrets.ORG_ID }}
    vercel-project-id: ${{ secrets.PROJECT_ID }}
    vercel-args: '--prod'
</code></pre>

                    <p>Com CI/CD, você ganha confiança para fazer deploys frequentes, reduz bugs em produção e libera a equipe para focar em desenvolvimento ao invés de processos manuais.</p>
                ''',
                'meta_title': 'GitHub Actions Tutorial: CI/CD Completo',
                'meta_description': 'Aprenda a configurar CI/CD com GitHub Actions. Tutorial completo com exemplos práticos de deploy automatizado.',
            },
        ]

        created_count = 0
        for article_data in articles_data:
            article, created = Article.objects.update_or_create(
                slug=article_data['slug'],
                company=company,
                defaults={
                    **article_data,
                    'author': user,
                    'is_public': True,
                    'status': Article.STATUS_PUBLISHED,
                    'published_at': timezone.now(),
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ Created: {article.title}'))
            else:
                self.stdout.write(self.style.WARNING(f'  ↻ Updated: {article.title}'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'✅ Done! {created_count} new articles created.'))
        self.stdout.write(self.style.SUCCESS(f'📊 Total public articles: {Article.objects.filter(is_public=True).count()}'))
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'🌐 View at: http://localhost:3005/p/artigos'))
