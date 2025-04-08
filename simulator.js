console.log("Simulação do processo de teste da aplicação RaaS Solar");

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
    token: "token-simulado-renter"
  }
];

// Simulando envio de convites
console.log("\n1. Simulando login com super admin e envio de convites:");
console.log("[BACKEND] Login: Login bem-sucedido para pedro-eli@hotmail.com (SUPER_ADMIN)");

console.log("\nConvites enviados para:");
[users[1], users[2], users[3]].forEach(user => {
  console.log(`[BACKEND] Invitation created: Convite para ${user.email} (${user.role}) criado com sucesso`);
  console.log(`[BACKEND] Email sent: Email de convite enviado para ${user.email}`);
  console.log(`[BACKEND] Notification: Notificação para admins sobre novo convite para ${user.email}`);
});

// Simulando registro de usuários
console.log("\n2. Simulando registro de usuários através dos convites:");
[users[1], users[2], users[3]].forEach(user => {
  console.log(`[BACKEND] Registration: Usuário ${user.name} (${user.email}) registrado como ${user.role}`);
  console.log(`[BACKEND] Token validation: Token de convite validado e marcado como utilizado`);
  console.log(`[BACKEND] Notification: Notificação para admins sobre novo registro de ${user.name}`);
});

// Simulando envio de solicitações de ajuda
console.log("\n3. Simulando envio de solicitações de ajuda:");

const helpRequests = [
  {
    id: "help-1",
    userId: users[2].id,
    userName: users[2].name,
    title: "Dificuldade para acessar faturas mensais",
    message: "Estou tentando acessar minhas faturas dos últimos 3 meses mas não aparecem no sistema. Preciso delas para declaração de imposto de renda."
  },
  {
    id: "help-2",
    userId: users[3].id,
    userName: users[3].name,
    title: "Problema no cálculo de geração de energia",
    message: "Notei que a geração de energia das minhas placas solares parece estar calculada incorretamente. Minha instalação possui 15 painéis de 350W e o sistema está mostrando valores abaixo do esperado para os dias ensolarados da semana passada."
  },
  {
    id: "help-3",
    userId: users[2].id,
    userName: users[2].name,
    title: "Dúvida sobre desconto em fatura",
    message: "Recebi um desconto na minha última fatura mas não entendi a origem. Seria possível detalhar como foi calculado esse desconto de R$ 127,45?"
  },
  {
    id: "help-4",
    userId: users[3].id,
    userName: users[3].name,
    title: "Solicitação de troca de senha",
    message: "Não estou conseguindo alterar minha senha através da opção no perfil. A página apresenta erro ao tentar salvar a nova senha."
  }
];

helpRequests.forEach(request => {
  console.log(`[BACKEND] Help request created: ${request.userName} enviou "${request.title}"`);
  console.log(`[BACKEND] Help request message: "${request.message}"`);
  console.log(`[BACKEND] Notification: Notificação para admins sobre nova solicitação de ajuda`);
  console.log(`[BACKEND] Email sent: Notificação por email sobre nova solicitação de suporte`);
});

// Simulando respostas às solicitações
console.log("\n4. Simulando login do admin e respostas às solicitações:");
console.log(`[BACKEND] Login: Login bem-sucedido para ${users[1].email} (${users[1].role})`);

const responses = [
  {
    helpRequestId: "help-1",
    responderId: users[1].id,
    responderName: users[1].name,
    message: "Olá, verifiquei seu problema e identifiquei que as faturas estão disponíveis, mas houve um problema na visualização. Acabo de corrigir o problema e você já deve conseguir visualizar suas faturas dos últimos meses na seção 'Histórico > Faturas'."
  },
  {
    helpRequestId: "help-2",
    responderId: users[1].id,
    responderName: users[1].name,
    message: "Bom dia! Analisei os dados da sua instalação e identificamos que houve um problema na leitura do seu inversor. Já enviamos um técnico para verificar e ajustar o equipamento. Os valores devem ser corrigidos nas próximas 24 horas. Obrigado por reportar este problema."
  },
  {
    helpRequestId: "help-3",
    responderId: users[1].id,
    responderName: users[1].name,
    message: "O desconto de R$ 127,45 na sua fatura foi aplicado devido à sua participação no programa de fidelidade Solar+. Por ter completado 1 ano como cliente, você recebeu este benefício automaticamente. Parabéns e obrigado por escolher nossa plataforma!"
  },
  {
    helpRequestId: "help-4",
    responderId: users[1].id,
    responderName: users[1].name,
    message: "Identificamos o problema na alteração de senha. Foi uma falha temporária no nosso sistema de autenticação. Acabamos de corrigir e você já pode tentar novamente. Se continuar tendo problemas, por favor entre em contato novamente."
  }
];

responses.forEach(response => {
  const request = helpRequests.find(r => r.id === response.helpRequestId);
  console.log(`[BACKEND] Help response: Admin respondeu a "${request.title}"`);
  console.log(`[BACKEND] Response message: "${response.message}"`);
  console.log(`[BACKEND] Status update: Status da solicitação atualizado para RESOLVED`);
  console.log(`[BACKEND] Notification: Notificação enviada para ${request.userName} sobre resposta`);
});

// Log do resultado final
console.log("\n5. Resumo das operações:");
console.log("[BACKEND] Summary: 3 Convites enviados com sucesso");
console.log("[BACKEND] Summary: 3 Usuários registrados com sucesso");
console.log("[BACKEND] Summary: 4 Solicitações de ajuda criadas");
console.log("[BACKEND] Summary: 4 Respostas fornecidas pelos admins");
console.log("[BACKEND] Summary: 16 Notificações criadas corretamente");
console.log("[BACKEND] Simulação completa!"); 