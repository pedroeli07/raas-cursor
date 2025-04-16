#!/bin/bash

# Script para verificar erros de build e lint que possam impedir o deploy no Vercel

echo "Iniciando verificação do projeto para deploy no Vercel"
echo "===================================================="

# Verifica dependências
echo "Verificando dependências..."
if ! npm list 2>/dev/null | grep -q "node-fetch"; then
  echo "Instalando dependência: node-fetch"
  npm install --save node-fetch
fi

# Verifica erros de lint
echo "Executando verificação de lint..."
npm run lint > lint_results.txt 2>&1
if [ $? -ne 0 ]; then
  echo "⚠️ Erros de lint encontrados. Verifique o arquivo lint_results.txt para detalhes."
else
  echo "✅ Nenhum erro de lint encontrado."
fi

# Executa build de produção
echo "Executando build de produção..."
npm run build > build_log.txt 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Erro no build. Verifique o arquivo build_log.txt para detalhes."
  echo "Os seguintes erros foram encontrados:"
  grep -A 5 "error" build_log.txt
else
  echo "✅ Build concluído com sucesso!"
fi

# Verificações adicionais para o Vercel
echo "Verificando configurações do Next.js para o Vercel..."

# Verifica se há rotas API usando funções assíncronas que não retornam nada
echo "Verificando handlers de API..."
grep -r "export async function" --include="*.ts" --include="*.tsx" src/app/api | grep -v "return" > api_handlers_check.txt
if [ -s api_handlers_check.txt ]; then
  echo "⚠️ Encontradas funções de API que podem não retornar valores. Verifique o arquivo api_handlers_check.txt."
else
  echo "✅ Handlers de API parecem estar corretos."
fi

# Verifica se há problemas com importações de arquivos
echo "Verificando importações de módulos..."
grep -r "from '" --include="*.ts" --include="*.tsx" src | grep -v "node_modules" | grep -v "@/" | grep -v "./" | grep -v "../" > imports_check.txt
if [ -s imports_check.txt ]; then
  echo "⚠️ Importações potencialmente problemáticas encontradas. Verifique o arquivo imports_check.txt."
else
  echo "✅ Importações parecem estar corretas."
fi

# Verifica se há problemas com variáveis de ambiente
echo "Verificando variáveis de ambiente..."
if grep -r "process.env" --include="*.ts" --include="*.tsx" src > env_check.txt; then
  echo "ℹ️ Variáveis de ambiente encontradas. Certifique-se de que estão configuradas no Vercel. Veja env_check.txt para detalhes."
else
  echo "✅ Nenhuma variável de ambiente encontrada."
fi

echo "===================================================="
echo "Verificação concluída. Revise os logs para garantir um deploy sem problemas no Vercel." 