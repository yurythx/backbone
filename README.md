# 🦴 Backbone - Multi-Tenant SaaS Platform

> Enterprise-grade, white-label SaaS platform with built-in CMS, licensing, and multi-tenancy support.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![Django](https://img.shields.io/badge/django-5.0+-green.svg)](https://www.djangoproject.com/)
[![Next.js](https://img.shields.io/badge/next.js-14+-black.svg)](https://nextjs.org/)

---

## 🚀 Quick Start

```bash
# Clone and navigate
git clone <repository_url>
cd backbone

# Start with Docker Compose
docker-compose up -d --build

# Access
Frontend: http://localhost:3005
Backend API: http://localhost:8005
Admin: http://localhost:8005/admin
```

Docs index: see [docs/SYSTEM_OVERVIEW.md](docs/SYSTEM_OVERVIEW.md)

---

## ✨ Features

### 🏢 Multi-Tenancy & White-Label
- **Company Isolation**: Complete data separation per tenant
- **Custom Branding**: Colors, logos, fonts, custom CSS/JS
- **Dynamic Theming**: Real-time theme switching
- **Google Fonts Integration**: Custom typography per tenant

### 📝 Content Management System (CMS)
- **Pages & Articles**: Rich text editor (Tiptap)
- **Categories & Tags**: Organized content structure
- **SEO Optimization**: Meta tags, sitemaps, robots.txt
- **Media Management**: MinIO-powered file storage
- **Comments System**: Engagement features

### 👥 User Management
- **JWT Authentication**: Secure token-based auth
- **LDAP Authentication**: Multi-tenant LDAP integration
- **Role-Based Access Control (RBAC)**: Granular permissions
- **User Invitations**: Team collaboration
- **Onboarding System**: Guided setup for new tenants
- **Profile Management**: Avatar, preferences, API keys
- **Password Reset**: Email-based recovery

### 💳 Licensing & Monetization
- **Tiered Plans**: Free, Pro, Enterprise
- **Feature Gating**: Middleware-based access control
- **License Management**: Subscription tracking

### 📊 Analytics & Insights
- **Dashboard Metrics**: Traffic, performance, engagement
- **Audit Logging**: Complete activity trail
- **Prometheus Monitoring**: System health metrics

### 💬 Communication
- **Messenger**: Real-time chat (WebSockets)
- **Web Push Notifications**: VAPID-based notifications
- **Webhooks**: Event-driven integrations

### 🔐 Security
- **CSP Headers**: Content Security Policy
- **CORS Configuration**: Cross-origin management
- **API Keys**: Programmatic access control

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Django 5.0, Django REST Framework |
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **Storage** | MinIO (S3-compatible) |
| **Task Queue** | Celery + Redis |
| **WebSockets** | Django Channels |
| **Monitoring** | Prometheus + Grafana |

---

## 📂 Project Structure

```
backbone/
├── backend/                 # Django API
│   ├── apps/               # Django apps
│   │   ├── accounts/       # Authentication & users
│   │   ├── api_keys/       # API key management
│   │   ├── articles/       # CMS articles
│   │   ├── core/           # Core models & utilities
│   │   ├── licensing/      # Subscription management
│   │   ├── media/          # File uploads
│   │   ├── messenger/      # Real-time chat
│   │   ├── module_manager/ # White-label modules
│   │   ├── notifications/  # Push notifications
│   │   ├── pages/          # CMS pages
│   │   ├── seo/            # SEO tools
│   │   └── webhooks/       # Webhook subscriptions
│   ├── config/             # Django settings
│   ├── requirements.txt    # Production dependencies
│   └── requirements-dev.txt # Dev dependencies
├── frontend/               # Next.js app
│   ├── src/
│   │   ├── app/            # Next.js 14 App Router
│   │   ├── components/     # Reusable UI components
│   │   ├── features/       # Feature-specific code
│   │   └── lib/            # Utilities & configs
├── docs/                   # Documentation (product-focused)
│   ├── SYSTEM_OVERVIEW.md
│   ├── MULTI_TENANT_CHEATSHEET.md
│   ├── MESSENGER.md
│   ├── ARTICLES.md
│   ├── NOTIFICATIONS.md
│   ├── MODULES.md
│   └── PAGES.md
├── scripts/                # Utilities (backup, restore)
└── docker-compose.yml      # Local development
```

---

## 📚 Documentation

- Index: [docs/SYSTEM_OVERVIEW.md](docs/SYSTEM_OVERVIEW.md)
- Multi-tenant cheatsheet: [docs/MULTI_TENANT_CHEATSHEET.md](docs/MULTI_TENANT_CHEATSHEET.md)
- Modules:
  - [docs/MESSENGER.md](docs/MESSENGER.md)
  - [docs/ARTICLES.md](docs/ARTICLES.md)
  - [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md)
  - [docs/MODULES.md](docs/MODULES.md)
  - [docs/PAGES.md](docs/PAGES.md)

---

## 🔧 Development

### Prerequisites
- Docker & Docker Compose
- Python 3.11+ (for local dev)
- Node.js 20+ (for local dev)

### Local Setup
```bash
# Backend (local)
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 8005

# Frontend (local)
cd frontend
npm install
npm run dev
```

### Docker Setup (Recommended)
```bash
docker-compose up -d --build
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

### Seed Data
```bash
docker-compose exec backend python manage.py seed_cms
docker-compose exec backend python manage.py seed_plans
```

---

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

---

## 📦 Deployment

### Production (Automated Script)

For a quick and automated deployment on a VPS (Ubuntu/Debian), use the script at `scripts/deploy.sh`.

1. **Configure Environment**:
   Copy the example config and fill in your details:
   ```bash
   cp .env.prod.example .env
   nano .env
   ```

2. **Run Deployment**:
   Give execution permissions and run the script:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

   This script will automatically:
   - Backup the database (if running)
   - Pull the latest code
   - Rebuild containers
   - Run migrations and collect static files
   - Seed initial data

### Production (Manual / Cloudflare Tunnel)
See [ops/DEPLOY_CLOUDFLARE.md](ops/DEPLOY_CLOUDFLARE.md) for detailed instructions on manual deployment or using Cloudflare Tunnels.

```bash
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🤝 Contributing

Contributions are welcome. Please open an issue or submit a pull request with clear description and rationale.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Django REST Framework
- Next.js Team
- shadcn/ui components
- Tailwind CSS

---

**Built with ❤️ for modern SaaS applications**
