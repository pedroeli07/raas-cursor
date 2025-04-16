// Script para depurar problemas na página de instalações
// Coloque este arquivo na pasta 'public' e adicione uma tag script no seu HTML
// OU cole no console do navegador para executar na página de instalações

(function() {
  console.log('=== Script de depuração de instalações iniciado ===');

  // Interceptar os logs do console para análise
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  const logs = [];
  
  // Substituir console.log para capturar todas as mensagens
  console.log = function() {
    logs.push({type: 'log', time: new Date().toISOString(), args: Array.from(arguments)});
    originalConsoleLog.apply(console, arguments);
  };
  
  console.error = function() {
    logs.push({type: 'error', time: new Date().toISOString(), args: Array.from(arguments)});
    originalConsoleError.apply(console, arguments);
  };
  
  console.warn = function() {
    logs.push({type: 'warn', time: new Date().toISOString(), args: Array.from(arguments)});
    originalConsoleWarn.apply(console, arguments);
  };
  
  // Interceptar erros não tratados
  window.addEventListener('error', function(event) {
    logs.push({
      type: 'uncaught-error', 
      time: new Date().toISOString(), 
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      error: event.error ? event.error.stack : 'No stack trace available'
    });
    console.error('Uncaught error:', event);
  });
  
  // Interceptar promessas rejeitadas não tratadas
  window.addEventListener('unhandledrejection', function(event) {
    logs.push({
      type: 'unhandled-rejection', 
      time: new Date().toISOString(), 
      reason: event.reason?.message || 'No reason provided',
      stack: event.reason?.stack || 'No stack trace available'
    });
    console.error('Unhandled promise rejection:', event);
  });
  
  // Monitorar o ciclo de vida dos componentes principais
  function monitorComponents() {
    // Tentar encontrar o botão "Nova Instalação"
    const newInstallationButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('Nova Instalação')
    );
    
    if (newInstallationButton) {
      console.log('Encontrou botão "Nova Instalação":', newInstallationButton);
      
      // Adicionar listener para monitorar os cliques no botão
      newInstallationButton.addEventListener('click', function(event) {
        console.log('Botão "Nova Instalação" clicado', {
          target: event.target,
          time: new Date().toISOString()
        });
      });
    } else {
      console.warn('Botão "Nova Instalação" não encontrado');
    }
    
    // Monitorar o modal de diálogo
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          const dialogAdded = Array.from(mutation.addedNodes).some(node => 
            node.nodeType === 1 && (node as Element).querySelector('[role="dialog"]')
          );
          
          const dialogRemoved = Array.from(mutation.removedNodes).some(node => 
            node.nodeType === 1 && (node as Element).querySelector('[role="dialog"]')
          );
          
          if (dialogAdded) {
            console.log('Modal de diálogo aberto', {time: new Date().toISOString()});
            
            // Verificar elementos dentro do diálogo
            const dialog = document.querySelector('[role="dialog"]');
            if (dialog) {
              console.log('Conteúdo do diálogo:', {
                title: dialog.querySelector('h2')?.textContent,
                fields: Array.from(dialog.querySelectorAll('label')).map(l => l.textContent)
              });
            }
          }
          
          if (dialogRemoved) {
            console.log('Modal de diálogo fechado', {time: new Date().toISOString()});
          }
        }
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  // Função para exportar todos os logs capturados
  window.exportDebugLogs = function() {
    const logString = JSON.stringify(logs, null, 2);
    const blob = new Blob([logString], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `instalacoes-debug-logs-${new Date().toISOString().replace(/:/g, '-')}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    console.log('Logs exportados');
  };
  
  // Adicionar botão de exportação de logs
  function addDebugControls() {
    const debugControls = document.createElement('div');
    debugControls.style.position = 'fixed';
    debugControls.style.bottom = '10px';
    debugControls.style.right = '10px';
    debugControls.style.zIndex = '9999';
    debugControls.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
    debugControls.style.padding = '10px';
    debugControls.style.borderRadius = '5px';
    
    const exportButton = document.createElement('button');
    exportButton.textContent = 'Exportar logs';
    exportButton.style.backgroundColor = '#4CAF50';
    exportButton.style.color = 'white';
    exportButton.style.border = 'none';
    exportButton.style.padding = '5px 10px';
    exportButton.style.cursor = 'pointer';
    exportButton.style.borderRadius = '3px';
    exportButton.onclick = window.exportDebugLogs;
    
    debugControls.appendChild(exportButton);
    document.body.appendChild(debugControls);
  }
  
  // Executar monitoramento quando a página estiver carregada
  if (document.readyState === 'complete') {
    monitorComponents();
    addDebugControls();
  } else {
    window.addEventListener('load', function() {
      monitorComponents();
      addDebugControls();
    });
  }
  
  console.log('=== Script de depuração instalado com sucesso ===');
})(); 