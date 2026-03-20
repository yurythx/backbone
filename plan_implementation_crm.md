# Plano de Implementação: Módulo CRM (Vendas e Suporte)

## 1. Visão Geral
Implementar um CRM robusto inspirado no Monday.com, permitindo o gerenciamento de clientes e fluxos de trabalho (Kanban). Este módulo será o motor central para agendamentos e tarefas.

## 2. Backend (Django)

### App: `apps.crm`
- [ ] **Model `Contact`**: Clientes/Empresas (Nome, E-mail, Telefone, Empresa).
- [ ] **Model `Pipeline`**: Nome do fluxo (Ex: "Suporte TI", "Vendas Software").
- [ ] **Model `Stage`**: Etapas do funil vinculadas ao Pipeline (Ex: "Triagem", "Em Execução", "Aguardando Peça").
- [ ] **Model `Deal` (Negócio/Chamado)**:
  - `title`: Assunto.
  - `contact`: ForeignKey para `Contact`.
  - `stage`: ForeignKey para `Stage`.
  - `value`: Valor (opcional).
  - `closing_date`: Data prevista (Sincronizada com o Calendário).
  - `description`: Anotações e histórico.
  - `priority`: Enum (Baixa, Média, Alta, Crítica).
- [ ] **Integração `calendar`**: Sincronização automática de `closing_date` com `calendar.Event`.

## 3. Frontend (Next.js)

### Dashboard CRM
- [ ] **Kanban View**: Visualização por etapas com Drag & Drop.
- [ ] **Table View**: Edição em massa estilo planilha.
- [ ] **Modal de Detalhes**: Historico de interações e anotações ricas.

## 4. Próximos Passos
1. Criar app `apps.crm` e registrar no `settings.py`.
2. Criar migrations do CRM.
3. Desenvolver os endpoints de API.
