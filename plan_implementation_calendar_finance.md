# Plano de Implementação: Módulos de Calendário e Financeiro

## Contexto
O projeto "Backbone" é um SaaS Multi-tenant com Django (Backend) e Next.js (Frontend). A arquitetura utiliza isolamento por `tenant_id` (via `BaseTenantModel` e middleware). O objetivo é adicionar dois novos módulos core: **Agenda (Calendar)** e **Financeiro (Finance)**, seguindo as melhores práticas de isolamento, performance e UX.

## 1. Dependências e Configuração Inicial

### Backend (Django)
- [ ] Adicionar `python-dateutil` ao `requirements.txt` (já deve existir, mas garantir para recorrência).
- [ ] Criar apps Django: `apps.calendar` e `apps.finance`.
- [ ] Registrar apps em `config/settings.py`.

### Frontend (Next.js)
- [ ] Instalar bibliotecas de calendário:
  ```bash
  npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/core
  ```
- [ ] O projeto já possui `@tanstack/react-table` e `date-fns`.

## 2. Backend: Modelagem de Dados

### Módulo Agenda (`apps.calendar`)
- [ ] **Model `Event`**:
  - Herdar de `BaseTenantModel`.
  - Campos: `uuid`, `title`, `description`, `start_datetime`, `end_datetime`, `is_all_day`.
  - Recorrência: `rrule` (TextField) para regras RFC 5545.
  - `color_category` (ChoiceField ou FK para Category).
  - `owner` (FK para User).
- [ ] **Serializer**: `EventSerializer` com validação de datas.
- [ ] **Service**: `CalendarService` para lógica de expansão de recorrência usando `dateutil.rrule`.
- [ ] **Views**: `EventViewSet` com filtro por range de datas (`?start=...&end=...`).

### Módulo Financeiro (`apps.finance`)
- [ ] **Model `Category`**: Categorias de transação (Receita/Despesa). Herdar de `BaseTenantModel`.
- [ ] **Model `Transaction`**:
  - Herdar de `BaseTenantModel`.
  - Campos: `amount` (Decimal, 2 casas), `type` (IN/OUT), `status` (PENDING/PAID/OVERDUE).
  - `due_date`, `payment_date`.
  - `competence_date` (para regime de competência).
  - `linked_event` (FK opcional para `calendar.Event`).
- [ ] **Views**: `TransactionViewSet` com agregação para dashboard (saldo, fluxo de caixa).

## 3. Backend: Lógica de Negócio e RBAC

### Permissões
- [ ] Criar permissões no `module_manager`:
  - `calendar.view_event`, `calendar.manage_event`
  - `finance.view_financial`, `finance.manage_financial`
- [ ] Aplicar `HasModuleAccess` e `HasRolePermission` nas ViewSets.

### Otimização (The "Expand" Pattern)
- [ ] No `EventViewSet.list`, interceptar query params `start` e `end`.
- [ ] Se houver eventos recorrentes no banco, expandi-los em memória para instâncias virtuais dentro do range solicitado antes de serializar.

## 4. Frontend: Implementação

### Agenda (`/calendar`)
- [ ] Criar rota `(dashboard)/calendar/page.tsx`.
- [ ] Componente `CalendarView` encapsulando FullCalendar.
- [ ] Hook `useCalendar` com React Query para buscar eventos.
- [ ] Modal de Criação/Edição de Evento (com suporte a recorrência básica).

### Financeiro (`/finance`)
- [ ] Criar rota `(dashboard)/finance/page.tsx`.
- [ ] Tabela de Transações usando TanStack Table.
- [ ] Cards de Resumo (Receitas, Despesas, Saldo).
- [ ] Integração: Ao criar uma transação, permitir vincular a um evento de agenda existente (ou criar um).

## 5. Execução (Fase 1: Scaffolding)
- [ ] Criar estrutura de pastas no Backend.
- [ ] Definir Models iniciais.
- [ ] Criar Migrations.
