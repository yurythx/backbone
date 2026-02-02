# Guia de Contribuição

## Fluxo de Trabalho
- Crie branchs descritivas: `sprint-<n>/<feature-ou-fix>`
- Faça commits pequenos e claros
- Abra PR com descrição, checklist e evidências (testes passando)

## Padronização de Código
Instale e ative pre-commit:
```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

Configurações:
- `pyproject.toml` define regras de black/isort/ruff
- `.pre-commit-config.yaml` registra hooks (trailing whitespace, mixed line ending, etc.)

## Testes
Execute sempre antes de abrir PR:
```bash
python manage.py test
```

## Multi-tenant
- Sempre envie `X-Company-Slug` nas requisições autenticadas
- Evite retornar dados sem filtro por tenant

## Segurança
- Não commitar `.env`, credenciais, `db.sqlite3`, `media/`, `staticfiles/`
- Use validação de senha do Django para novos usuários
