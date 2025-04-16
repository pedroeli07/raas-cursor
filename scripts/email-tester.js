// Email Tester Script for RaaS Solar
// Similar to installation-simulator.js but for testing email functionality

console.log("Simulação de Envio de Emails - RaaS Solar");

const { Resend } = require('resend');

// Create a Resend client instance with the provided API key
const resend = new Resend('re_Uyc7aGLB_795G4WeBC5TdMwDRSbZBYfyq');

// Email types to test
const emailTypes = [
  {
    type: 'simple',
    name: 'Email Simples',
    subject: 'RaaS Solar - Email de Teste',
    html: '<p>Olá! Este é um email de teste simples da plataforma RaaS Solar.</p><p><strong>Teste realizado em:</strong> ' + new Date().toLocaleString('pt-BR') + '</p>'
  },
  {
    type: 'invitation',
    name: 'Convite',
    subject: 'Convite para RaaS Solar',
    html: `
      <p>Olá Usuário,</p>
      <p>Você foi convidado para se juntar à plataforma RaaS Solar como ADMIN.</p>
      <p>Clique no link abaixo para completar seu registro. Este link expira em 24 horas:</p>
      <p><a href="http://localhost:3000/register?token=test-token-12345">Aceitar Convite</a></p>
      <p>Se você não estava esperando este convite, por favor ignore este email.</p>
    `
  },
  {
    type: 'verification',
    name: 'Verificação de Email',
    subject: 'Verificação de Email - RaaS Solar',
    html: `
      <p>Olá Usuário,</p>
      <p>Bem-vindo à plataforma RaaS Solar! Para confirmar seu endereço de email, utilize o código abaixo:</p>
      <p style="font-size: 24px; font-weight: bold; text-align: center; padding: 12px; background-color: #f3f4f6; margin: 16px 0; letter-spacing: 3px;">123456</p>
      <p>Este código expirará em 30 minutos.</p>
    `
  },
  {
    type: '2fa',
    name: 'Autenticação de Dois Fatores',
    subject: 'Código de Autenticação - RaaS Solar',
    html: `
      <p>Olá Usuário,</p>
      <p>Para continuar seu login na plataforma RaaS Solar, utilize o código de verificação abaixo:</p>
      <p style="font-size: 24px; font-weight: bold; text-align: center; padding: 12px; background-color: #f3f4f6; margin: 16px 0; letter-spacing: 3px;">654321</p>
      <p>Este código expirará em 10 minutos.</p>
    `
  },
  {
    type: 'reset',
    name: 'Redefinição de Senha',
    subject: 'Redefinição de Senha - RaaS Solar',
    html: `
      <p>Olá Usuário,</p>
      <p>Recebemos uma solicitação para redefinir sua senha.</p>
      <p>Clique no link abaixo para criar uma nova senha. Este link expira em 1 hora:</p>
      <p><a href="http://localhost:3000/reset-password?token=test-token-12345">Redefinir Senha</a></p>
      <p>Se você não solicitou esta redefinição, por favor ignore este email.</p>
    `
  }
];

// Set recipient email
// IMPORTANTE: Em uma conta de teste do Resend, emails só podem ser enviados para o email verificado
const verifiedEmail = 'pedro-eli@hotmail.com'; // Email verificado na conta Resend

// Function to send test emails
async function testEmails() {
  console.log(`\n1. Iniciando testes de envio para email verificado: ${verifiedEmail}`);
  console.log('NOTA: Com conta gratuita do Resend, emails só podem ser enviados para o email verificado');
  console.log('---------------------------------------------------------------');

  // Send each email type sequentially
  for (const emailType of emailTypes) {
    console.log(`\n2. Enviando email: ${emailType.name} (${emailType.type})`);
    
    try {
      console.log(`[DEBUG] Preparando para enviar email ${emailType.type}`);
      
      const startTime = Date.now();
      const result = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: verifiedEmail,
        subject: emailType.subject,
        html: emailType.html
      });
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      if (result.error) {
        console.log(`[ERRO] Falha ao enviar email ${emailType.type}`);
        console.log(result.error);
      } else {
        console.log(`[SUCESSO] Email ${emailType.type} enviado! ID: ${result.data?.id}`);
        console.log(`[INFO] Tempo de resposta: ${duration.toFixed(2)} segundos`);
      }
    } catch (error) {
      console.log(`[ERRO] Exceção ao enviar email ${emailType.type}:`);
      console.log(error);
    }
    
    // Small delay between sends
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n3. Teste de envio concluído!');
  console.log('Verifique sua caixa de entrada em ' + verifiedEmail);
  console.log('IMPORTANTE: Se os emails não chegarem, verifique também a pasta de spam');
}

// Run the tests
testEmails()
  .catch(error => {
    console.error('Erro ao executar testes:', error);
  }); 