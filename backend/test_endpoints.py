#!/usr/bin/env python
"""
Script de teste para validar estrutura de resposta dos endpoints padronizados.
Executa dentro do container backend para testar diretamente.
"""
import json
from django.test import Client
from django.contrib.auth import get_user_model
from apps.core.models import Company

# Configuração
User = get_user_model()
client = Client()

# Obter ou criar empresa de teste
company, _ = Company.objects.get_or_create(
    slug='test-company',
    defaults={'name': 'Test Company', 'domain': 'test.local'}
)

# Criar usuário de teste se necessário
user, _ = User.objects.get_or_create(
    username='test_admin',
    defaults={
        'email': 'admin@test.com',
        'is_staff': True,
        'is_superuser': True,
        'company': company
    }
)
if not user.check_password('admin123'):
    user.set_password('admin123')
    user.company = company
    user.save()

# Login
client.force_login(user)

# Lista de endpoints para testar
ENDPOINTS = [
    '/api/licensing/plans/',
    '/api/licensing/features/',
    '/api/notifications/notifications/',
    '/api/articles/tags/',
    '/api/articles/categories/',
    '/api/media/files/',
    '/api/pages/',
    '/api/accounts/roles/',
    '/api/accounts/invitations/',
]

print("=" * 60)
print("TESTE DE ENDPOINTS PADRONIZADOS")
print("=" * 60)
print()

results = []

for endpoint in ENDPOINTS:
    try:
        response = client.get(endpoint, HTTP_X_COMPANY_SLUG='test-company')
        status = response.status_code
        
        if status == 200:
            data = response.json()
            is_array = isinstance(data, list)
            is_paginated = isinstance(data, dict) and 'results' in data
            
            result = {
                'endpoint': endpoint,
                'status': status,
                'is_array': is_array,
                'is_paginated': is_paginated,
                'count': len(data) if is_array else (len(data.get('results', [])) if is_paginated else 0),
                'success': is_array and not is_paginated
            }
            results.append(result)
            
            # Print resultado
            status_emoji = "✅" if result['success'] else "❌"
            print(f"{status_emoji} {endpoint}")
            print(f"   Status: {status}")
            print(f"   É Array: {is_array}")
            print(f"   É Paginado: {is_paginated}")
            print(f"   Itens: {result['count']}")
            print()
        else:
            results.append({
                'endpoint': endpoint,
                'status': status,
                'success': False,
                'error': f'HTTP {status}'
            })
            print(f"❌ {endpoint}")
            print(f"   Status: {status}")
            print()
            
    except Exception as e:
        results.append({
            'endpoint': endpoint,
            'success': False,
            'error': str(e)
        })
        print(f"❌ {endpoint}")
        print(f"   Erro: {e}")
        print()

# Resumo
print("=" * 60)
print("RESUMO")
print("=" * 60)
total = len(results)
success = sum(1 for r in results if r.get('success'))
failed = total - success

print(f"Total de Endpoints: {total}")
print(f"✅ Sucesso: {success}")
print(f"❌ Falhas: {failed}")
print()

if failed > 0:
    print("ENDPOINTS COM PROBLEMAS:")
    for r in results:
        if not r.get('success'):
            print(f"  - {r['endpoint']}: {r.get('error', 'Estrutura incorreta')}")
