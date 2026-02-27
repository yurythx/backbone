from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils.text import slugify
from django.utils import timezone
from faker import Faker
import random

from apps.core.models import Company
from apps.licensing.models import Plan, License
from apps.module_manager.models import Module, TenantModule
from apps.articles.models import Article, Category
from apps.pages.models import Page
from apps.messenger.models import Conversation, Message

User = get_user_model()

class Command(BaseCommand):
    help = 'Populates the database with dummy data (20 items per entity)'

    def handle(self, *args, **kwargs):
        self.fake = Faker()
        
        self.stdout.write('Ensuring basic plans and modules exist...')
        self.plan_pro, _ = Plan.objects.get_or_create(name="Enterprise", defaults={'price': 199.99, 'is_active': True})
        
        self.modules = {
            'pages': Module.objects.get_or_create(name="Pages", code="pages", is_default=True)[0],
            'articles': Module.objects.get_or_create(name="Articles", code="articles", is_default=True)[0],
            'messenger': Module.objects.get_or_create(name="Messenger", code="messenger", is_default=True)[0]
        }

        self.stdout.write('Starting population process...')
        
        with transaction.atomic():
            # 1. Populate EXISTING companies (BlackBone, IronMinds, etc)
            existing_companies = Company.objects.all()
            for company in existing_companies:
                self.stdout.write(f'  Populating existing company: {company.name}')
                self.populate_company(company)

            # 2. Create NEW companies if we have less than 5 total (to avoid over-populating on repeated runs)
            # or just create a few new ones as requested previously
            # The user asked for "20 items in the bank", maybe they meant total? 
            # But the previous prompt was "20 units of each item".
            # Let's create 5 NEW companies just to be safe and populate them.
            for i in range(5):
                company_name = self.fake.company()
                company_slug = slugify(company_name) + "-" + str(random.randint(10000, 99999))
                
                company = Company.objects.create(
                    name=company_name,
                    slug=company_slug,
                    domain=self.fake.domain_name() + str(i)
                )
                self.stdout.write(f'  Created and Populating NEW Company: {company.name}')
                
                # Assign License & Modules
                License.objects.create(company=company, plan=self.plan_pro, start_date=timezone.now(), is_active=True)
                for module in self.modules.values():
                    TenantModule.objects.create(company=company, module=module, is_active=True)
                
                self.populate_company(company)

        self.stdout.write(self.style.SUCCESS('Database populated successfully!'))

    def populate_company(self, company):
        # 1. Ensure Users (aim for at least 20)
        current_users_count = User.objects.filter(company=company).count()
        users_needed = 20 - current_users_count
        if users_needed > 0:
            for _ in range(users_needed):
                username = self.fake.user_name() + str(random.randint(10000, 99999))
                User.objects.create_user(
                    username=username,
                    email=f"{username}@{company.domain}",
                    password="password123",
                    company=company
                )
        
        # Reload users
        company_users = list(User.objects.filter(company=company))
        if not company_users:
            return # Safety check

        # 2. Pages (aim for 20)
        if Page.objects.filter(company=company).count() < 20:
            for _ in range(20):
                title = self.fake.catch_phrase()
                Page.objects.create(
                    company=company,
                    title=title,
                    slug=slugify(title) + "-" + str(random.randint(10000,99999)),
                    content=self.fake.text(max_nb_chars=1000),
                    status='published'
                )


        # 3. Categories (aim for 20)
        if Category.objects.filter(company=company).count() < 20:
            for _ in range(20):
                name = self.fake.word().capitalize() + " " + str(random.randint(1000,9999))
                Category.objects.create(
                    company=company,
                    name=name,
                    slug=slugify(name)
                )
        
        categories = list(Category.objects.filter(company=company))

        # 4. Articles (aim for 20)
        if Article.objects.filter(company=company).count() < 20:
            for _ in range(20):
                title = self.fake.sentence()
                Article.objects.create(
                    company=company,
                    title=title,
                    slug=slugify(title) + "-" + str(random.randint(10000,99999)),
                    content=self.fake.text(max_nb_chars=3000),
                    author=random.choice(company_users),
                    category=random.choice(categories) if categories else None,
                    status=Article.STATUS_PUBLISHED,
                    published_at=timezone.now()
                )

        # 5. Conversations / Groups (aim for 20)
        if Conversation.objects.filter(company=company).count() < 20:
            for _ in range(20):
                c = Conversation.objects.create(
                    company=company,
                    title=self.fake.bs().capitalize(),
                    is_group=True
                )
                # Add 2-5 random participants
                parts = random.sample(company_users, k=min(len(company_users), random.randint(2, 5)))
                c.participants.set(parts)
                
                # Messages
                for _ in range(20):
                    Message.objects.create(
                        company=company,
                        conversation=c,
                        sender=random.choice(parts),
                        content=self.fake.sentence()
                    )
