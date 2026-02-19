// Global Error Handler
window.onerror = function (msg, url, lineNo, columnNo, error) {
    const errorMsg = `
    ❌ Erro Detectado:
    Mensagem: ${msg}
    Arquivo: ${url ? url.split('/').pop() : 'N/A'}
    Linha: ${lineNo}
    Coluna: ${columnNo}
    Erro: ${error ? error.stack : 'N/A'}
    `;
    console.error(errorMsg);
    alert(errorMsg);
    return false;
};

window.onunhandledrejection = function (event) {
    const errorMsg = `
    ❌ Promessa Rejeitada:
    Razão: ${event.reason}
    `;
    console.error(errorMsg);
    alert(errorMsg);
};

console.log('✅ Global Error Handler Initialized');
