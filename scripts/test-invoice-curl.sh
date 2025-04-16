#!/bin/bash

# Script para testar a API de geração de faturas usando curl

echo "Testando API de geração de faturas..."

# Obtém a data atual e a data de vencimento (7 dias à frente)
ISSUE_DATE=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
DUE_DATE=$(date -u -d "+7 days" +"%Y-%m-%dT%H:%M:%S.000Z")

# Teste com cálculo por compensação
echo "Teste 1: Gerando fatura com cálculo por compensação..."
curl -X POST http://localhost:3000/api/invoices/generate \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "cust_001",
    "installationNumbers": ["3013110767", "3013096188"],
    "calculationType": "compensation",
    "period": "01/2025",
    "kwhRate": 0.956,
    "discount": 20,
    "issueDate": "'$ISSUE_DATE'",
    "dueDate": "'$DUE_DATE'",
    "selectedColumns": ["periodo", "consumo", "geracao", "compensacao"]
  }' > compensation_result.json

echo "Resultado salvo em compensation_result.json"

# Teste com cálculo por recebimento
echo "Teste 2: Gerando fatura com cálculo por recebimento..."
curl -X POST http://localhost:3000/api/invoices/generate \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "cust_001",
    "installationNumbers": ["3013110767", "3013096188"],
    "calculationType": "receipt",
    "period": "01/2025",
    "kwhRate": 0.956,
    "discount": 20,
    "issueDate": "'$ISSUE_DATE'",
    "dueDate": "'$DUE_DATE'",
    "selectedColumns": ["periodo", "consumo", "recebimento"]
  }' > receipt_result.json

echo "Resultado salvo em receipt_result.json"
echo "Testes concluídos." 