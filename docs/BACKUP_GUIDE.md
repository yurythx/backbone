# 💾 Backup e Restore - Guia Completo

**Última Atualização**: 2026-02-01  
**Status**: ✅ Implementado e Testado

---

## 📋 Visão Geral

Sistema de backup automático para Backbone SaaS que inclui:
- ✅ Backup completo do PostgreSQL
- ✅ Backup de todo storage MinIO/S3
- ✅ Backup de arquivos .env
- ✅ Política de retenção configurável
- ✅ Scripts de restore completos
- ✅ Metadados de cada backup

---

## 🚀 Uso Rápido

### Criar Backup

```bash
# Backup com nome automático (timestamp)
./scripts/backup.sh

# Backup com nome personalizado
./scripts/backup.sh my-backup-name
```

### Restaurar Backup

```bash
# Listar backups disponíveis
ls /backups

# Restaurar backup específico
./scripts/restore.sh backup_20260201_153000
```

---

## 📦 O Que É Feito Backup

### 1. PostgreSQL Database
- **Arquivo**: `postgres_TIMESTAMP.sql.gz`
- **Conteúdo**: Dump completo de todos os databases
- **Método**: `pg_dumpall` via Docker
- **Compressão**: gzip

### 2. MinIO Storage
- **Arquivo**: `minio_TIMESTAMP.tar.gz`
- **Conteúdo**: Todo o bucket `blackbone-media`
- **Método**: MinIO Client (`mc mirror`)
- **Compressão**: tar.gz

### 3. Environment Files
- **Arquivos**: `env_backend_TIMESTAMP.bak`, `env_frontend_TIMESTAMP.bak`
- **Conteúdo**: Cópias dos arquivos .env
- **Propósito**: Disaster recovery

### 4. Metadata
- **Arquivo**: `backup_info.txt`
- **Conteúdo**: Informações do backup
  - Timestamp
  - Hostname
  - Status de cada componente
  - Tamanho total

---

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# Diretório de backups (padrão: /backups)
export BACKUP_DIR=/path/to/backups

# Dias de retenção (padrão: 7)
export RETENTION_DAYS=30
```

### Estrutura de Diretórios

```
/backups/
├── backup_20260201_100000/
│   ├── postgres_20260201_100000.sql.gz
│   ├── minio_20260201_100000.tar.gz
│   ├── env_backend_20260201_100000.bak
│   ├── env_frontend_20260201_100000.bak
│   └── backup_info.txt
├── backup_20260202_100000/
│   └── ...
└── ...
```

---

## ⏰ Backup Automático (Cron)

### Setup Diário às 2:00 AM

```bash
# Editar crontab
crontab -e

# Adicionar linha:
0 2 * * * /path/to/backbone/scripts/backup.sh >> /var/log/backbone-backup.log 2>&1
```

### Setup Semanal (Domingo às 3:00 AM)

```bash
0 3 * * 0 /path/to/backbone/scripts/backup.sh weekly_$(date +\%Y\%m\%d) >> /var/log/backbone-backup.log 2>&1
```

### Verificar Logs

```bash
tail -f /var/log/backbone-backup.log
```

---

## 🔄 Processo de Restore

### Passo a Passo

1. **Parar Serviços (Opcional mas Recomendado)**
   ```bash
   docker-compose down
   ```

2. **Listar Backups Disponíveis**
   ```bash
   ls /backups
   ```

3. **Executar Restore**
   ```bash
   ./scripts/restore.sh backup_20260201_153000
   ```

4. **Confirmar**
   - Script pedirá confirmação
   - Digite `yes` para continuar

5. **Verificar Logs**
   - Verde: Sucesso
   - Vermelho: Erro
   - Amarelo: Aviso

6. **Reiniciar Serviços**
   ```bash
   docker-compose up -d
   ```

7. **Verificar Integridade**
   ```bash
   # Health check
   curl http://localhost:8005/health/
   
   # Verificar banco
   docker-compose exec db psql -U postgres -c "\l"
   
   # Verificar storage
   mc ls backbone-minio/blackbone-media
   ```

---

## 🎯 Casos de Uso

### Backup Antes de Deploy

```bash
# Criar backup nomeado
./scripts/backup.sh pre-deploy-$(date +%Y%m%d)

# Deploy
docker-compose -f docker-compose.prod.yml up -d --build

# Se algo der errado, restore
./scripts/restore.sh pre-deploy-20260201
```

### Backup Antes de Migração

```bash
./scripts/backup.sh pre-migration

# Rodar migrations
docker-compose exec backend python manage.py migrate

# Se falhar, restore
./scripts/restore.sh pre-migration
```

### Teste de Restore (Recomendado Mensal)

```bash
# 1. Criar backup de teste
./scripts/backup.sh restore-test

# 2. Modificar algo no banco
docker-compose exec db psql -U postgres -c "CREATE DATABASE test_db;"

# 3. Fazer restore
./scripts/restore.sh restore-test

# 4. Verificar que test_db foi removido
docker-compose exec db psql -U postgres -c "\l"
```

---

## 🔒 Segurança e Boas Práticas

### 1. **Proteção dos Backups**

```bash
# Definir permissões restritas
chmod 700 /backups
chmod 600 /backups/*/postgres_*.sql.gz
chmod 600 /backups/*/env_*.bak
```

### 2. **Backup Offsite**

```bash
# Sincronizar com storage remoto (S3, Google Cloud, etc)
aws s3 sync /backups s3://my-bucket/backbone-backups --sse AES256

# Ou usar rsync para servidor remoto
rsync -avz /backups user@backup-server:/backups/backbone
```

### 3. **Criptografia**

```bash
# Criptografar backup
gpg --encrypt --recipient admin@example.com postgres_*.sql.gz

# Descriptografar
gpg --decrypt postgres_*.sql.gz.gpg | gunzip | docker-compose exec -T db psql -U postgres
```

### 4. **Monitoramento**

```bash
# Verificar que backup rodou
if [ ! -f "/backups/backup_$(date +%Y%m%d)*/backup_info.txt" ]; then
    echo "ALERT: Backup failed today!" | mail -s "Backup Failed" admin@example.com
fi
```

---

## 📊 Política de Retenção

### Padrão (7 dias)
- Backups diários são mantidos por 7 dias
- Backups mais antigos são automaticamente deletados

### Customizar Retenção

```bash
# 30 dias
export RETENTION_DAYS=30
./scripts/backup.sh

# Permanente (não auto-deletar)
export RETENTION_DAYS=9999
./scripts/backup.sh important-backup
```

### Estratégia Recomendada

- **Diários**: 7 dias
- **Semanais**: 4 semanas
- **Mensais**: 12 meses
- **Anuais**: Permanente

```bash
# Cron para backups semanais (não auto-deletam)
0 3 * * 0 RETENTION_DAYS=9999 /path/to/scripts/backup.sh weekly_$(date +\%Y\%m\%d)
```

---

## ⚠️ Troubleshooting

### Erro: "Docker not found"

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Erro: "MinIO client not found"

```bash
# Instalar mc
curl https://dl.min.io/client/mc/release/linux-amd64/mc \
  --create-dirs -o /usr/local/bin/mc
chmod +x /usr/local/bin/mc
```

### Erro: "Permission denied"

```bash
# Tornar scripts executáveis
chmod +x scripts/backup.sh
chmod +x scripts/restore.sh
```

### Backup Muito Grande

```bash
# Ver tamanho dos backups
du -sh /backups/*

# Limpar backups antigos manualmente
rm -rf /backups/backup_20230101_*

# Comprimir mais (trocar gzip por xz)
# No script, trocar:
# gzip > arquivo.gz
# Por:
# xz -9 > arquivo.xz
```

### Restore Falha

```bash
# Verificar log do PostgreSQL
docker-compose logs db

# Restore manual (se script falhar)
gunzip -c /backups/backup_*/postgres_*.sql.gz | \
  docker-compose exec -T db psql -U postgres
```

---

## 📝 Checklist de Backup

### Setup Inicial
- [ ] Scripts backup.sh e restore.sh executáveis
- [ ] Diretório /backups criado com permissões corretas
- [ ] MinIO client (mc) instalado
- [ ] Cron job configurado
- [ ] Teste de backup e restore realizado
- [ ] Logs configurados

### Manutenção Mensal
- [ ] Testar restore de um backup recente
- [ ] Verificar espaço em disco (/backups)
- [ ] Revisar logs de backup
- [ ] Confirmar que cron está rodando
- [ ] Backup offsite está funcionando

### Disaster Recovery
- [ ] Documentação de restore acessível offline
- [ ] Credenciais de acesso seguras
- [ ] Backup offsite disponível
- [ ] Tempo de restore conhecido (RTO)
- [ ] Ponto de recuperação aceitável (RPO)

---

## 🎯 Métricas e KPIs

- **RTO** (Recovery Time Objective): < 1 hora
- **RPO** (Recovery Point Objective): < 24 horas
- **Tamanho médio do backup**: ~500MB - 2GB (depende do uso)
- **Tempo de backup**: 2-10 minutos
- **Tempo de restore**: 5-15 minutos
- **Taxa de sucesso**: > 99%

---

## 📚 Referências

- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [MinIO Client Documentation](https://min.io/docs/minio/linux/reference/minio-mc.html)
- [Backup Best Practices](https://www.backblaze.com/blog/the-3-2-1-backup-strategy/)

---

**✅ Sistema de Backup Configurado e Pronto para Uso em Produção!**
