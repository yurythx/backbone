# Plano de Implementação: IT Help Desk (Service Desk)

## 1. Visão Geral
Transformar o sistema em um **Central de Atendimento de TI (Help Desk)**, onde chamados (tickets) são gerenciados via Kanban e os prazos (SLA) são refletidos automaticamente no Calendário.

## 2. Backend (Django)

### Novo App: `apps.helpdesk`
- [ ] **Model `Ticket`**:
  - `company`: (Tenant)
  - `title`: Assunto do chamado.
  - `description`: Detalhes técnicos / Anotações.
  - `priority`: Enum (Baixa, Média, Alta, Crítica).
  - `status`: Enum (Novo, Em Atendimento, Pendente, Resolvido, Cancelado).
  - `sla_deadline`: DateTime (Prazo fatal).
  - `technician`: ForeignKey para User.
  - `requester_name`: Nome do cliente/usuário.
  - `requester_email/phone`: Contato.
- [ ] **Integração `calendar`**:
  - [ ] Criar `signals.py`: Ao salvar um Ticket com `sla_deadline`, criar/atualizar um `Event` no Calendário com cor baseada na prioridade.
- [ ] **API**: ViewSet para tickets com filtros por status e técnico.

## 3. Frontend (Next.js)

### Kanban Board (`/helpdesk/kanban`)
- [ ] Criar visualização de colunas (Novo -> Em Atendimento -> Resolvido).
- [ ] Cartões de Ticket mostrando prioridade e tempo restante de SLA.
- [ ] Drag & Drop para mudar status.

### Integração Calendário (`/calendar`)
- [ ] Os tickets resolvidos aparecem riscados.
- [ ] Eventos de SLA em vermelho para prioridade "Crítica".
- [ ] Clique no evento no calendário abre o resumo do Ticket.

## 4. Diferenciais IT Service Desk (Estilo Monday)
- [ ] **Tabela de Chamados**: Filtros rápidos por cliente e tipo de problema.
- [ ] **Anotações Internas**: Campo para o técnico registrar o que foi feito (histórico técnico).

## 5. Próximos Passos
1. Criar estrutura de modelos no Backend.
2. Rodar migrations.
3. Desenvolver o hook `useHelpdesk` no Frontend.
