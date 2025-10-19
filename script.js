// Variáveis globais
let selectedFiles = [];
let analysisResults = [];
let isAnalyzing = false;
let apiKeys = [];
let currentKeyIndex = 0;

// Elementos DOM
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const analyzeBtn = document.getElementById('analyzeBtn');
const downloadCsvBtn = document.getElementById('downloadCsvBtn');
const clearBtn = document.getElementById('clearBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const imagesGrid = document.getElementById('imagesGrid');
const messagesSection = document.getElementById('messagesSection');
const activeKeysCount = document.getElementById('activeKeysCount');
const testAllKeysBtn = document.getElementById('testAllKeysBtn');
const diagnoseApiBtn = document.getElementById('diagnoseApiBtn');
const clearApiKeysBtn = document.getElementById('clearApiKeysBtn');

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadSavedApiKeys();
    updateButtonStates();
});

// Event Listeners
function initializeEventListeners() {
    // Upload de arquivos
    fileInput.addEventListener('change', handleFileSelect);
    uploadArea.addEventListener('click', () => fileInput.click());
    
    // Drag and Drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Botões
    analyzeBtn.addEventListener('click', startAnalysis);
    downloadCsvBtn.addEventListener('click', downloadCSV);
    clearBtn.addEventListener('click', clearAll);
    testAllKeysBtn.addEventListener('click', testAllApiKeys);
    diagnoseApiBtn.addEventListener('click', diagnoseApiProblems);
    clearApiKeysBtn.addEventListener('click', clearApiKeysOnly);
    
    // API Keys
    initializeApiKeyListeners();
}

// Manipulação de arquivos
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    addFiles(files);
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = Array.from(event.dataTransfer.files);
    const imageFiles = files.filter(file => 
        file.type.startsWith('image/') && 
        ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
    );
    
    addFiles(imageFiles);
}

function addFiles(files) {
    const validFiles = files.filter(file => {
        const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type);
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
        return isValidType && isValidSize;
    });
    
    if (validFiles.length !== files.length) {
        showMessage('Alguns arquivos foram ignorados. Apenas imagens JPG, PNG e WEBP até 10MB são aceitas.', 'error');
    }
    
    selectedFiles = [...selectedFiles, ...validFiles];
    
    if (selectedFiles.length > 100) {
        selectedFiles = selectedFiles.slice(0, 100);
        showMessage('Máximo de 100 imagens atingido. Apenas as primeiras 100 foram selecionadas.', 'info');
    }
    
    updateButtonStates();
    displaySelectedFiles();
}

// Gerenciamento de API Keys
function initializeApiKeyListeners() {
    // Adicionar listeners para todos os campos de API key
    for (let i = 1; i <= 5; i++) {
        const apiKeyInput = document.getElementById(`apiKey${i}`);
        const toggleBtn = document.querySelector(`[data-target="apiKey${i}"]`);
        const statusSpan = document.getElementById(`status${i}`);
        
        if (apiKeyInput && toggleBtn && statusSpan) {
            // Input change listener
            apiKeyInput.addEventListener('input', () => {
                updateApiKeyStatus(i);
                updateActiveKeysCount();
                updateButtonStates();
                saveApiKeys(); // Salvar automaticamente quando mudar
            });
            
            // Toggle visibility listener
            toggleBtn.addEventListener('click', () => {
                toggleApiKeyVisibility(i);
            });
            
            // Validação em tempo real
            apiKeyInput.addEventListener('blur', () => {
                validateApiKey(i);
            });
        }
    }
}

function updateApiKeyStatus(index) {
    const input = document.getElementById(`apiKey${index}`);
    const status = document.getElementById(`status${index}`);
    
    if (!input || !status) return;
    
    const value = input.value.trim();
    
    if (value === '') {
        status.textContent = 'Vazio';
        status.className = 'api-key-status empty';
    } else if (value.length < 20) {
        status.textContent = 'Inválida';
        status.className = 'api-key-status error';
    } else {
        status.textContent = 'Ativa';
        status.className = 'api-key-status active';
    }
}

function toggleApiKeyVisibility(index) {
    const input = document.getElementById(`apiKey${index}`);
    const toggleBtn = document.querySelector(`[data-target="apiKey${index}"]`);
    
    if (!input || !toggleBtn) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        toggleBtn.textContent = '🙈';
    } else {
        input.type = 'password';
        toggleBtn.textContent = '👁️';
    }
}

async function validateApiKey(index) {
    const input = document.getElementById(`apiKey${index}`);
    const status = document.getElementById(`status${index}`);
    
    if (!input || !status) return;
    
    const value = input.value.trim();
    if (!value || value.length < 20) return;
    
    try {
        status.textContent = 'Testando...';
        status.className = 'api-key-status empty';
        
        // Teste simples da API - tentar diferentes modelos (modelos testados e funcionando)
        const testModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        let testResponse;
        
        for (const testModel of testModels) {
            try {
                testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${value}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: "Teste de conectividade" }]
                        }]
                    })
                });
                
                if (testResponse.ok) {
                    status.textContent = 'Válida';
                    status.className = 'api-key-status active';
                    console.log(`API Key ${index} validada com sucesso usando modelo ${testModel}`);
                    break; // Sucesso, sair do loop
                } else if (testResponse.status === 404) {
                    console.log(`Modelo ${testModel} não disponível para API Key ${index}, tentando próximo...`);
                    continue; // Tentar próximo modelo
                } else {
                    console.log(`API Key ${index} inválida com modelo ${testModel}: ${testResponse.status}`);
                    break; // Outro erro, parar
                }
            } catch (error) {
                console.log(`Erro ao testar modelo ${testModel} para API Key ${index}:`, error);
                continue; // Tentar próximo modelo
            }
        }
        
        if (!testResponse || !testResponse.ok) {
            status.textContent = 'Inválida';
            status.className = 'api-key-status error';
            console.log(`API Key ${index} não funcionou com nenhum modelo testado`);
        }
    } catch (error) {
        status.textContent = 'Erro';
        status.className = 'api-key-status error';
        console.log(`Erro ao validar API Key ${index}:`, error);
    }
}

function updateActiveKeysCount() {
    let activeCount = 0;
    
    for (let i = 1; i <= 5; i++) {
        const input = document.getElementById(`apiKey${i}`);
        if (input && input.value.trim().length >= 20) {
            activeCount++;
        }
    }
    
    if (activeKeysCount) {
        activeKeysCount.textContent = activeCount;
    }
    
    // Atualizar array de chaves ativas
    apiKeys = [];
    for (let i = 1; i <= 5; i++) {
        const input = document.getElementById(`apiKey${i}`);
        if (input && input.value.trim().length >= 20) {
            apiKeys.push(input.value.trim());
        }
    }
    
    return activeCount;
}

function getNextApiKey() {
    if (apiKeys.length === 0) {
        throw new Error('Nenhuma chave da API válida encontrada');
    }
    
    const key = apiKeys[currentKeyIndex];
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    return key;
}

// Funções para salvar e carregar chaves da API
function saveApiKeys() {
    const keysToSave = {};
    
    for (let i = 1; i <= 5; i++) {
        const input = document.getElementById(`apiKey${i}`);
        if (input && input.value.trim()) {
            keysToSave[`apiKey${i}`] = input.value.trim();
        }
    }
    
    try {
        localStorage.setItem('geminiApiKeys', JSON.stringify(keysToSave));
        console.log('Chaves da API salvas com sucesso');
    } catch (error) {
        console.error('Erro ao salvar chaves da API:', error);
    }
}

function loadSavedApiKeys() {
    try {
        const savedKeys = localStorage.getItem('geminiApiKeys');
        if (savedKeys) {
            const keys = JSON.parse(savedKeys);
            
            for (let i = 1; i <= 5; i++) {
                const key = keys[`apiKey${i}`];
                if (key) {
                    const input = document.getElementById(`apiKey${i}`);
                    if (input) {
                        input.value = key;
                        updateApiKeyStatus(i);
                    }
                }
            }
            
            updateActiveKeysCount();
            console.log('Chaves da API carregadas com sucesso');
        }
    } catch (error) {
        console.error('Erro ao carregar chaves da API:', error);
    }
}

function clearSavedApiKeys() {
    try {
        localStorage.removeItem('geminiApiKeys');
        console.log('Chaves da API removidas do armazenamento');
    } catch (error) {
        console.error('Erro ao limpar chaves da API:', error);
    }
}

function clearApiKeysOnly() {
    // Limpar apenas as chaves da API, mantendo as imagens
    for (let i = 1; i <= 5; i++) {
        const input = document.getElementById(`apiKey${i}`);
        if (input) {
            input.value = '';
            updateApiKeyStatus(i);
        }
    }
    
    // Limpar chaves salvas do localStorage
    clearSavedApiKeys();
    
    updateActiveKeysCount();
    updateButtonStates();
    
    showMessage('Chaves da API removidas com sucesso!', 'success');
}

async function testAllApiKeys() {
    testAllKeysBtn.disabled = true;
    testAllKeysBtn.innerHTML = '<span class="spinner"></span> Testando...';
    
    let validKeys = 0;
    let totalKeys = 0;
    
    // Primeiro, testar conectividade básica
    try {
        const testKey = apiKeys[0];
        if (testKey) {
            await testApiConnectivity(testKey);
        }
    } catch (error) {
        console.log('Erro no teste de conectividade:', error);
    }
    
    for (let i = 1; i <= 5; i++) {
        const input = document.getElementById(`apiKey${i}`);
        if (input && input.value.trim().length >= 20) {
            totalKeys++;
            await validateApiKey(i);
            
            const status = document.getElementById(`status${i}`);
            if (status && status.textContent === 'Válida') {
                validKeys++;
            }
        }
    }
    
    testAllKeysBtn.disabled = false;
    testAllKeysBtn.innerHTML = '🧪 Testar Todas as Chaves';
    
    if (totalKeys === 0) {
        showMessage('Nenhuma chave da API encontrada para testar.', 'info');
    } else {
        showMessage(`Teste concluído: ${validKeys} de ${totalKeys} chaves válidas.`, validKeys > 0 ? 'success' : 'error');
    }
    
    updateActiveKeysCount();
    updateButtonStates();
}

async function testApiConnectivity(apiKey) {
    try {
        // Testar listagem de modelos disponíveis
        const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        
        if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json();
            console.log('Modelos disponíveis:', modelsData.models?.map(m => m.name) || 'Nenhum modelo encontrado');
            
            // Atualizar lista de modelos baseada nos disponíveis
            if (modelsData.models && modelsData.models.length > 0) {
                const availableModels = modelsData.models
                    .filter(m => m.name.includes('gemini'))
                    .map(m => m.name.split('/').pop())
                    .filter(name => name);
                
                console.log('Modelos Gemini disponíveis:', availableModels);
                return availableModels;
            }
        } else {
            console.log('Erro ao listar modelos:', modelsResponse.status, modelsResponse.statusText);
        }
    } catch (error) {
        console.log('Erro no teste de conectividade:', error);
    }
    return [];
}

async function diagnoseApiProblems() {
    diagnoseApiBtn.disabled = true;
    diagnoseApiBtn.innerHTML = '<span class="spinner"></span> Diagnosticando...';
    
    let diagnosticResults = [];
    
    // Testar primeira chave disponível
    const testKey = apiKeys[0];
    if (!testKey) {
        showMessage('Nenhuma chave da API encontrada para diagnóstico.', 'error');
        diagnoseApiBtn.disabled = false;
        diagnoseApiBtn.innerHTML = '🔍 Diagnosticar API';
        return;
    }
    
    try {
        // 1. Testar conectividade básica
        diagnosticResults.push('🔍 Testando conectividade básica...');
        const models = await testApiConnectivity(testKey);
        
        if (models.length > 0) {
            diagnosticResults.push(`✅ Modelos disponíveis: ${models.join(', ')}`);
        } else {
            diagnosticResults.push('❌ Nenhum modelo Gemini encontrado');
        }
        
        // 2. Testar cada modelo individualmente
        diagnosticResults.push('🧪 Testando modelos individualmente...');
        const testModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'];
        
        for (const model of testModels) {
            try {
                const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${testKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: "Teste" }] }]
                    })
                });
                
                if (testResponse.ok) {
                    diagnosticResults.push(`✅ ${model}: Funcionando`);
                } else {
                    diagnosticResults.push(`❌ ${model}: Erro ${testResponse.status}`);
                }
            } catch (error) {
                diagnosticResults.push(`❌ ${model}: ${error.message}`);
            }
        }
        
        // 3. Mostrar resultados
        const diagnosticText = diagnosticResults.join('\n');
        console.log('Diagnóstico da API:', diagnosticText);
        
        showMessage(`Diagnóstico concluído. Verifique o console (F12) para detalhes completos.`, 'info');
        
    } catch (error) {
        showMessage(`Erro durante diagnóstico: ${error.message}`, 'error');
    }
    
    diagnoseApiBtn.disabled = false;
    diagnoseApiBtn.innerHTML = '🔍 Diagnosticar API';
}

function displaySelectedFiles() {
    if (selectedFiles.length === 0) {
        imagesGrid.innerHTML = '';
        return;
    }
    
    imagesGrid.innerHTML = '';
    selectedFiles.forEach((file, index) => {
        const imageCard = createImageCard(file, index);
        imagesGrid.appendChild(imageCard);
    });
}

function createImageCard(file, index) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.id = `image-card-${index}`;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        card.innerHTML = `
            <img src="${e.target.result}" alt="${file.name}" class="image-preview">
            <div class="image-info">
                <div class="image-name">${file.name}</div>
                <div class="analysis-result result-error">
                    <span>⏳</span>
                    <span>Aguardando análise...</span>
                </div>
                <div class="analysis-details">Clique em "Analisar Imagens" para começar</div>
            </div>
        `;
    };
    reader.readAsDataURL(file);
    
    return card;
}

// Análise com Gemini API
async function startAnalysis() {
    if (selectedFiles.length === 0) {
        showMessage('Selecione pelo menos uma imagem para analisar.', 'error');
        return;
    }
    
    const activeKeys = updateActiveKeysCount();
    if (activeKeys === 0) {
        showMessage('Por favor, insira pelo menos uma chave da API Gemini válida.', 'error');
        return;
    }
    
    isAnalyzing = true;
    analysisResults = [];
    
    // Mostrar barra de progresso
    progressSection.style.display = 'block';
    updateProgress(0, selectedFiles.length);
    
    // Desabilitar botões
    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = '<span class="spinner"></span> Analisando...';
    
    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            updateProgress(i + 1, selectedFiles.length);
            progressText.textContent = `Analisando: ${file.name}`;
            
            try {
                const result = await analyzeImageWithGemini(file);
                analysisResults.push({
                    fileName: file.name,
                    result: result,
                    status: 'success'
                });
                updateImageCard(i, result, 'success');
            } catch (error) {
                console.error(`Erro ao analisar ${file.name}:`, error);
                const errorResult = {
                    hasCopyright: 'unknown',
                    confidence: 0,
                    details: `Erro na análise: ${error.message}`
                };
                analysisResults.push({
                    fileName: file.name,
                    result: errorResult,
                    status: 'error'
                });
                updateImageCard(i, errorResult, 'error');
            }
            
            // Pequena pausa para não sobrecarregar a API
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        showMessage(`Análise concluída! ${analysisResults.length} imagens processadas.`, 'success');
        downloadCsvBtn.disabled = false;
        
    } catch (error) {
        showMessage(`Erro durante a análise: ${error.message}`, 'error');
    } finally {
        isAnalyzing = false;
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '🔍 Analisar Imagens';
        progressSection.style.display = 'none';
    }
}

async function analyzeImageWithGemini(file) {
    const apiKey = getNextApiKey();
    
    // Converter imagem para base64
    const base64 = await fileToBase64(file);
    
    const prompt = `
    Analise esta imagem para bancos comerciais (Adobe Stock, Vecteezy, Freepik). Verifique:
    - Direitos autorais/marcas/logotipos
    - Pessoas identificáveis
    - Conteúdo protegido
    - Qualidade comercial

    Responda APENAS no formato JSON:
    {
        "hasCopyright": "yes|no|possible",
        "confidence": 0.0-1.0,
        "details": "resumo curto (máximo 50 palavras)",
        "suitableForStock": true|false,
        "risks": ["risco1", "risco2"],
        "commercialPotential": "high|medium|low",
        "recommendedPlatforms": ["Adobe Stock", "Vecteezy", "Freepik"]
    }
    
    Seja conciso e objetivo. Máximo 50 palavras no details.
    `;
    
    // Tentar diferentes modelos em ordem de preferência (modelos testados e funcionando)
    const models = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-exp',
        'gemini-2.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
    ];
    
    let response;
    let lastError;
    
    for (const model of models) {
        try {
            response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: file.type,
                                    data: base64
                                }
                            }
                        ]
                    }]
                })
            });
            
            if (response.ok) {
                console.log(`Modelo ${model} funcionou!`);
                break;
            } else if (response.status === 404) {
                console.log(`Modelo ${model} não encontrado, tentando próximo...`);
                lastError = new Error(`Modelo ${model} não disponível`);
                continue;
            } else {
                break; // Outro tipo de erro, parar e tratar
            }
        } catch (error) {
            console.log(`Erro com modelo ${model}:`, error);
            lastError = error;
            continue;
        }
    }
    
    if (!response) {
        console.error('Nenhum modelo da Gemini funcionou. Último erro:', lastError);
        throw new Error('Nenhum modelo da Gemini disponível. Verifique sua chave da API e se os modelos estão disponíveis na sua região.');
    }
    
    if (!response.ok) {
        let errorMessage = '';
        const errorData = await response.json().catch(() => ({}));
        
        switch (response.status) {
            case 400:
                errorMessage = 'Chave da API inválida ou malformada';
                if (errorData.error?.message) {
                    errorMessage += `: ${errorData.error.message}`;
                }
                break;
            case 401:
                errorMessage = 'Chave da API não autorizada. Verifique se está correta';
                break;
            case 403:
                errorMessage = 'Acesso negado. Verifique se a API Gemini está habilitada em seu projeto';
                break;
            case 404:
                errorMessage = 'Modelo não encontrado. Verifique se o modelo está disponível na sua região';
                break;
            case 429:
                errorMessage = 'Limite de requisições atingido. Tente novamente em alguns minutos';
                break;
            case 500:
                errorMessage = 'Erro interno do servidor. Tente novamente mais tarde';
                break;
            default:
                errorMessage = `Erro da API: ${response.status} ${response.statusText}`;
                if (errorData.error?.message) {
                    errorMessage += ` - ${errorData.error.message}`;
                }
        }
        
        throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Resposta inválida da API');
    }
    
    const responseText = data.candidates[0].content.parts[0].text;
    
    try {
        // Tentar extrair JSON da resposta
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        } else {
            // Fallback se não conseguir extrair JSON
            return {
                hasCopyright: 'unknown',
                confidence: 0.5,
                details: responseText
            };
        }
    } catch (parseError) {
        return {
            hasCopyright: 'unknown',
            confidence: 0.5,
            details: responseText
        };
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = error => reject(error);
    });
}

function updateImageCard(index, result, status) {
    const card = document.getElementById(`image-card-${index}`);
    if (!card) return;
    
    const resultDiv = card.querySelector('.analysis-result');
    const detailsDiv = card.querySelector('.analysis-details');
    
    let icon, text, className;
    
    if (status === 'error') {
        icon = '❌';
        text = 'Erro na análise';
        className = 'result-error';
    } else {
        // Verificar se é adequada para banco de imagens
        const suitableForStock = result.suitableForStock !== false;
        
        switch (result.hasCopyright) {
            case 'no':
                if (suitableForStock) {
                    icon = '✅';
                    text = 'Adequada para banco de imagens';
                    className = 'result-safe';
                } else {
                    icon = '⚠️';
                    text = 'Possível problema para banco';
                    className = 'result-warning';
                }
                break;
            case 'yes':
                icon = '🚫';
                text = 'Não adequada - Direitos autorais';
                className = 'result-error';
                break;
            case 'possible':
                icon = '⚠️';
                text = 'Riscos identificados';
                className = 'result-warning';
                break;
            default:
                icon = '❓';
                text = 'Análise inconclusiva';
                className = 'result-error';
        }
    }
    
    resultDiv.className = `analysis-result ${className}`;
    resultDiv.innerHTML = `<span>${icon}</span> <span>${text}</span>`;
    
    // Construir detalhes concisos
    let detailsText = result.details || 'Sem detalhes disponíveis';
    
    // Adicionar apenas informações essenciais de forma compacta
    const additionalInfo = [];
    
    if (result.risks && result.risks.length > 0) {
        additionalInfo.push(`⚠️ Riscos: ${result.risks.join(', ')}`);
    }
    
    if (result.commercialPotential) {
        const potentialEmoji = result.commercialPotential === 'high' ? '🔥' : 
                              result.commercialPotential === 'medium' ? '⭐' : '📈';
        additionalInfo.push(`${potentialEmoji} ${result.commercialPotential.toUpperCase()}`);
    }
    
    if (result.recommendedPlatforms && result.recommendedPlatforms.length > 0) {
        additionalInfo.push(`🎯 ${result.recommendedPlatforms.join(', ')}`);
    }
    
    if (additionalInfo.length > 0) {
        detailsText += `\n${additionalInfo.join(' • ')}`;
    }
    
    detailsDiv.textContent = detailsText;
}

function updateProgress(current, total) {
    const percentage = (current / total) * 100;
    progressFill.style.width = `${percentage}%`;
}

// Download CSV
function downloadCSV() {
    if (analysisResults.length === 0) {
        showMessage('Nenhum resultado para exportar.', 'error');
        return;
    }
    
    const csvContent = generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `analise_direitos_autorais_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

function generateCSV() {
    const headers = [
        'Arquivo', 
        'Status', 
        'Confiança', 
        'Adequada',
        'Potencial',
        'Plataformas',
        'Riscos',
        'Resumo'
    ];
    
    const rows = analysisResults.map(result => {
        let status;
        switch (result.result.hasCopyright) {
            case 'no':
                status = result.result.suitableForStock !== false ? '✅ Adequada' : '⚠️ Problema';
                break;
            case 'yes':
                status = '❌ Direitos autorais';
                break;
            case 'possible':
                status = '⚠️ Riscos';
                break;
            default:
                status = '❓ Inconclusiva';
        }
        
        const suitableForStock = result.result.suitableForStock !== undefined 
            ? (result.result.suitableForStock ? 'Sim' : 'Não')
            : 'N/A';
            
        const commercialPotential = result.result.commercialPotential || 'N/A';
        
        const recommendedPlatforms = result.result.recommendedPlatforms && result.result.recommendedPlatforms.length > 0 
            ? result.result.recommendedPlatforms.join(', ')
            : 'N/A';
            
        const risks = result.result.risks && result.result.risks.length > 0 
            ? result.result.risks.join(', ')
            : 'Nenhum';
        
        return [
            result.fileName,
            status,
            Math.round((result.result.confidence || 0) * 100) + '%',
            suitableForStock,
            commercialPotential,
            recommendedPlatforms,
            risks,
            result.result.details || 'Sem detalhes'
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });
    
    return [headers.join(','), ...rows].join('\n');
}

// Utilitários
function updateButtonStates() {
    const hasFiles = selectedFiles.length > 0;
    const hasApiKey = updateActiveKeysCount() > 0;
    const hasResults = analysisResults.length > 0;
    
    analyzeBtn.disabled = !hasFiles || !hasApiKey || isAnalyzing;
    downloadCsvBtn.disabled = !hasResults;
    clearBtn.disabled = !hasFiles && !hasResults;
}

function clearAll() {
    selectedFiles = [];
    analysisResults = [];
    fileInput.value = '';
    imagesGrid.innerHTML = '';
    progressSection.style.display = 'none';
    messagesSection.innerHTML = '';
    
    // Limpar todas as chaves da API
    for (let i = 1; i <= 5; i++) {
        const input = document.getElementById(`apiKey${i}`);
        if (input) {
            input.value = '';
            updateApiKeyStatus(i);
        }
    }
    
    // Limpar chaves salvas do localStorage
    clearSavedApiKeys();
    
    updateActiveKeysCount();
    updateButtonStates();
}

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    messagesSection.appendChild(messageDiv);
    
    // Remover mensagem após 5 segundos
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 5000);
}

// Prevenção de drag and drop na página inteira
document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
});
