console.log("Simulação do processo de teste de instalações RaaS Solar");

// Dados de usuários para simulação
const users = [
  {
    id: "super-admin-id",
    email: "pedro-eli@hotmail.com",
    name: "Pedro Eli",
    role: "SUPER_ADMIN",
    token: "token-simulado-super-admin"
  },
  {
    id: "admin-id",
    email: "admin@example.com",
    name: "Admin User",
    role: "ADMIN",
    token: "token-simulado-admin"
  },
  {
    id: "customer-id",
    email: "cliente@example.com",
    name: "Cliente Solar",
    role: "CUSTOMER",
    token: "token-simulado-cliente"
  },
  {
    id: "renter-id",
    email: "inquilino@example.com",
    name: "Inquilino de Energia",
    role: "ENERGY_RENTER",
    token: "token-simulado-inquilino"
  }
];

// Dados de distribuidoras simuladas (Corrigido com base na sua informação)
const distributors = [
  {
    id: "cemig-id",
    name: "CEMIG",
    price_per_kwh: 0.976 // Preço base da CEMIG
  },
  {
    id: "neoenergia-id",
    name: "NEOENERGIA",
    price_per_kwh: 0.765
  }
];

// Dados das instalações baseadas na fatura
const installations = [
  {
    installationNumber: "3014657899",
    nickname: "Porks Castelo",
    type: "GENERATOR", // Usina geradora
    owner: "renter-id", // Inquilino de Energia
    distributor: "cemig-id"
  },
  {
    installationNumber: "3011883117",
    nickname: "Porks Savassi",
    type: "CONSUMER", // Consumidor de energia
    owner: "customer-id", // Cliente Solar
    distributor: "cemig-id"
  },
  {
    installationNumber: "3004402254",
    nickname: "Bebedouro",
    type: "CONSUMER",
    owner: "customer-id",
    distributor: "cemig-id"
  },
  {
    installationNumber: "3013110767",
    nickname: "GBBH - Lj 02",
    type: "CONSUMER",
    owner: "customer-id",
    distributor: "cemig-id"
  },
  {
    installationNumber: "3013096188",
    nickname: "GBBH - Lj 01",
    type: "CONSUMER",
    owner: "customer-id",
    distributor: "cemig-id"
  }
];

// Simulação de dados de energia baseados na fatura (mês de fevereiro/2024)
const energyData = [
  {
    installation: "3014657899", // Porks Castelo
    referencia: "02/2024",
    consumo: 3266,
    compensacao: 2034,
    recebimento: 2034,
    saldo_atual: 0
  },
  {
    installation: "3011883117", // Porks Savassi
    referencia: "02/2024",
    consumo: 2440,
    compensacao: 1551.8,
    recebimento: 1469,
    saldo_atual: 0
  },
  {
    installation: "3004402254", // Bebedouro
    referencia: "02/2024",
    consumo: 7440,
    compensacao: 7340,
    recebimento: 7797,
    saldo_atual: 693.4
  }
];

// Função para simular o processamento dos dados e exibir os resultados
function simulateProcessing() {
  console.log("\n1. Simulando cadastro das distribuidoras:");
  distributors.forEach(dist => {
    console.log(`[BACKEND] Distributor created: ${dist.name} cadastrada com preço base de R$ ${dist.price_per_kwh.toFixed(3)} por kWh`);
  });

  console.log("\n2. Simulando cadastro das instalações:");
  installations.forEach(inst => {
    const ownerUser = users.find(u => u.id === inst.owner);
    const distributorInfo = distributors.find(d => d.id === inst.distributor);
    console.log(`[BACKEND] Installation created: ${inst.nickname} (${inst.installationNumber}) - ${inst.type === "GENERATOR" ? "Geradora" : "Consumidora"}`);
    console.log(`[BACKEND] Installation details: Proprietário: ${ownerUser.name}, Distribuidora: ${distributorInfo.name}`);
  });

  console.log("\n3. Simulando upload de dados de energia (mês 02/2024):");
  energyData.forEach(data => {
    const inst = installations.find(i => i.installationNumber === data.installation);
    console.log(`[BACKEND] Energy data processed: ${inst.nickname} (${data.installation})`);
    console.log(`[BACKEND] Energy details: Consumo: ${data.consumo} kWh, Compensação: ${data.compensacao} kWh, Recebimento: ${data.recebimento} kWh, Saldo: ${data.saldo_atual} kWh`);
  });

  console.log("\n4. Calculando valores da fatura para cliente Gracie Barra BH:");
  const clientName = "Gracie Barra BH";
  const totalConsumo = energyData.reduce((sum, data) => sum + data.consumo, 0);
  const totalCompensacao = energyData.reduce((sum, data) => sum + data.compensacao, 0);
  
  // Preço base da CEMIG
  const precoKwhCemig = distributors[0].price_per_kwh;
  
  // Desconto de 20% (conforme fatura)
  const percentualDesconto = 20;
  const valorKwhFaturado = precoKwhCemig * (1 - percentualDesconto / 100);
  
  // Valor que seria pago sem o desconto
  const valorSemDesconto = totalConsumo * precoKwhCemig;
  const descontoCalculado = valorSemDesconto - (totalConsumo * valorKwhFaturado);

  // Valor final a pagar (Consumo * Preço Faturado)
  const valorFinal = totalConsumo * valorKwhFaturado;

  console.log(`[BACKEND] Fatura para ${clientName}`);
  console.log(`[BACKEND] Valor kWh CEMIG (Base): R$ ${precoKwhCemig.toFixed(3)}`);
  console.log(`[BACKEND] Desconto Aplicado: ${percentualDesconto}%`);
  console.log(`[BACKEND] Valor kWh Faturado (Com Desconto): R$ ${valorKwhFaturado.toFixed(3)}`);
  console.log(`[BACKEND] Total Consumido: ${totalConsumo} kWh`);
  console.log(`[BACKEND] Total Compensado (Referência): ${totalCompensacao.toFixed(1)} kWh`);
  console.log(`[BACKEND] Valor Total (Sem Desconto): R$ ${valorSemDesconto.toFixed(2)}`);
  console.log(`[BACKEND] Valor do Desconto Calculado: R$ ${descontoCalculado.toFixed(2)}`);
  console.log(`[BACKEND] VALOR A PAGAR (Consumo * kWh Faturado): R$ ${valorFinal.toFixed(2)}`);
  
  console.log("\n5. Simulação de benefícios ambientais:");
  // Cálculo aproximado de CO2 evitado (baseado na informação da imagem)
  const co2_por_kwh = 17.888 / totalCompensacao; // kg de CO2 por kWh
  const co2_evitado = totalCompensacao * co2_por_kwh;
  console.log(`[BACKEND] CO2 evitado: ${co2_evitado.toFixed(3)} kg`);
  console.log(`[BACKEND] Economia financeira: R$ ${valorFinal.toFixed(2)}`);
}

// Iniciar simulação
simulateProcessing(); 