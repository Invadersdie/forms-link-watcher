// Скрипт popup для расширения "Отслеживатель ссылок на формы"

document.addEventListener('DOMContentLoaded', async () => {
    const targetUrlInput = document.getElementById('targetUrl');
    const scanIntervalSelect = document.getElementById('scanInterval');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const testBtn = document.getElementById('testBtn');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const logsContainer = document.getElementById('logs');

    // Load saved settings
    const settings = await chrome.storage.sync.get({
        targetUrl: '',
        scanInterval: 1, // 1 минута по умолчанию
        isActive: false
    });

    targetUrlInput.value = settings.targetUrl;
    scanIntervalSelect.value = settings.scanInterval;
    
    // Get current monitoring status from background
    try {
        const statusResponse = await chrome.runtime.sendMessage({ action: 'getStatus' });
        if (statusResponse.success) {
            updateStatus(statusResponse.isActive);
            if (statusResponse.settings) {
                targetUrlInput.value = statusResponse.settings.targetUrl || settings.targetUrl;
                scanIntervalSelect.value = statusResponse.settings.scanInterval || settings.scanInterval;
                console.log('Loaded settings from background:', statusResponse.settings);
            }
        } else {
            updateStatus(settings.isActive);
        }
    } catch (error) {
        console.log('Error getting status from background:', error);
        updateStatus(settings.isActive);
    }
    
    // Load logs
    loadLogs();

    // Event listeners
    startBtn.addEventListener('click', startMonitoring);
    stopBtn.addEventListener('click', stopMonitoring);
    testBtn.addEventListener('click', testScan);
    
    targetUrlInput.addEventListener('input', saveSettings);
    scanIntervalSelect.addEventListener('change', saveSettings);

    async function saveSettings() {
        const scanIntervalValue = parseFloat(scanIntervalSelect.value);
        console.log('Сохранение настроек - выбранный интервал:', scanIntervalSelect.value, 'parsed:', scanIntervalValue);
        
        const newSettings = {
            targetUrl: targetUrlInput.value,
            scanInterval: scanIntervalValue,
            isActive: settings.isActive
        };
        
        await chrome.storage.sync.set(newSettings);
        settings.targetUrl = newSettings.targetUrl;
        settings.scanInterval = newSettings.scanInterval;
        
        // If monitoring is active, restart with new settings
        if (settings.isActive) {
            await stopMonitoring();
            // Small delay to ensure clean stop
            await new Promise(resolve => setTimeout(resolve, 100));
            await startMonitoring();
        }
        
        addLog('info', 'Настройки сохранены');
    }

    async function startMonitoring() {
        if (!targetUrlInput.value.trim()) {
            addLog('error', 'Пожалуйста, введите URL сайта для мониторинга');
            return;
        }

        try {
            // Save settings
            const newSettings = {
                targetUrl: targetUrlInput.value,
                scanInterval: parseFloat(scanIntervalSelect.value),
                isActive: true
            };
            
            await chrome.storage.sync.set(newSettings);
            settings.isActive = true;
            
            // Start monitoring
            console.log('Отправляем настройки в background:', newSettings);
            await chrome.runtime.sendMessage({
                action: 'startMonitoring',
                settings: newSettings
            });
            
            updateStatus(true);
            addLog('success', `Мониторинг запущен для: ${targetUrlInput.value}`);
            addLog('info', `Интервал сканирования: ${scanIntervalSelect.value} минут`);
            
        } catch (error) {
            addLog('error', `Ошибка при запуске: ${error.message}`);
        }
    }

    async function stopMonitoring() {
        try {
            const newSettings = {
                targetUrl: targetUrlInput.value,
                scanInterval: parseFloat(scanIntervalSelect.value),
                isActive: false
            };
            
            await chrome.storage.sync.set(newSettings);
            settings.isActive = false;
            
            await chrome.runtime.sendMessage({ action: 'stopMonitoring' });
            
            updateStatus(false);
            addLog('info', 'Мониторинг остановлен');
            
        } catch (error) {
            addLog('error', `Ошибка при остановке: ${error.message}`);
        }
    }

    async function testScan() {
        if (!targetUrlInput.value.trim()) {
            addLog('error', 'Пожалуйста, введите URL сайта для мониторинга');
            return;
        }

        try {
            addLog('info', 'Начинаю тест сканирования...');
            
            const response = await chrome.runtime.sendMessage({
                action: 'testScan',
                url: targetUrlInput.value
            });
            
            if (response.success) {
                addLog('success', `Найдено ${response.formsFound} ссылок на формы`);
                if (response.formsFound > 0) {
                    addLog('info', 'Формы будут открыты в новых вкладках');
                }
            } else {
                addLog('error', `Ошибка сканирования: ${response.error}`);
            }
            
        } catch (error) {
            addLog('error', `Ошибка теста: ${error.message}`);
        }
    }

    function updateStatus(isActive) {
        if (isActive) {
            statusIndicator.className = 'status-indicator active';
            statusText.textContent = 'Мониторинг активен';
        } else {
            statusIndicator.className = 'status-indicator inactive';
            statusText.textContent = 'Мониторинг неактивен';
        }
    }

    function addLog(type, message) {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        
        logsContainer.appendChild(logEntry);
        logsContainer.scrollTop = logsContainer.scrollHeight;
        
        // Keep only last 20 log entries
        while (logsContainer.children.length > 20) {
            logsContainer.removeChild(logsContainer.firstChild);
        }
    }

    async function loadLogs() {
        try {
            const result = await chrome.storage.local.get(['logs']);
            if (result.logs) {
                result.logs.forEach(log => {
                    const logEntry = document.createElement('div');
                    logEntry.className = `log-entry ${log.type}`;
                    logEntry.textContent = `[${log.timestamp}] ${log.message}`;
                    logsContainer.appendChild(logEntry);
                });
                logsContainer.scrollTop = logsContainer.scrollHeight;
            }
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    }

    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'updateLog') {
            addLog(message.type, message.message);
        } else if (message.action === 'updateStatus') {
            updateStatus(message.isActive);
        }
    });
});
