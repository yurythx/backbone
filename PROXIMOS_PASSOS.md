# Roadmap de Evolução - Ecossistema Backbone

Este documento serve como guia para as futuras implementações e melhorias do ecossistema, focado em escalabilidade, experiência do usuário e robustez administrativa.

---

## 🚀 Prioridades Imediatas

### 1. Experiência de Edição (CMS & Artigos)
*   **Editor Visual (Rich Text)**: Integração do **Tiptap** ou **Quill** para substituir os campos de texto simples.
    *   *Objetivo*: Permitir negrito, listas, tabelas e inserção dinâmica de imagens.
*   **Gestor de Mídia (Media Library)**: Criar uma galeria central para upload e reuso de imagens/arquivos entre Artigos e Páginas.
*   **Preview em Tempo Real**: Botão para visualizar como a página/artigo ficará antes de publicar.

### 2. White-Label & Customização
*   **Gestão de Favicon**: Permitir que cada tenant suba seu próprio ícone de aba de navegador.
*   **Configurações de SMTP**: Interface para empresas configurarem seus próprios servidores de e-mail (SendGrid, Mailgun, etc.) para notificações.
*   **Rodapé Customizado**: Editor para links de redes sociais e textos legais por empresa.

---

## 🛠️ Evolução Técnica e Estrutural

### 3. Segurança e Permissões (RBAC)
*   **Papéis Customizados**: Criar níveis de acesso como `Editor de Conteúdo`, `Suporte ao Cliente` e `Administrador Financeiro`.
*   **Logs de Auditoria**: Registro de quem alterou cada recurso (Páginas, Artigos, Configurações).

### 4. Inteligência e Analytics
*   **Dashboard de Métricas**: Visualização de:
    *   Artigos mais lidos.
    *   Volume de mensagens no Messenger.
    *   Status de ativação de módulos por tenant.
*   **SEO Automático**: Gerador de sitemap.xml e meta-tags dinâmicas baseadas no conteúdo das páginas.

---

## 💬 Comunicação (Messenger)
*   **Envio de Arquivos**: Suporte para PDF, imagens e áudio via WebSocket.
*   **Histórico Persistente**: Otimização do carregamento de mensagens antigas (Infinity Scroll).

---

## 📍 Guia de Navegação Interna
- [x] **Gestão de Páginas**: Localizado em `/cms` (Foca no app `pages`).
- [x] **Gestão de Artigos**: Localizado em `/artigos` (Foca no app `articles`).
- [x] **Área Administrative**: Localizado em `/admin` (Exibição exclusiva da Sidebar).

> [!TIP]
> Para qualquer nova funcionalidade, lembre-se de manter a lógica **Multi-tenant**, garantindo que as modificações de um cliente nunca afetem as configurações de outro.
