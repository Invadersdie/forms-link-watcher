// Фоновый скрипт "Отслеживатель ссылок на формы" v2.0

let monitoringActive = false;
let scanIntervalId = null;
let knownForms = new Set();
let currentSettings = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
    console.log('Отслеживатель ссылок на формы установлен/обновлен');
    
    // Load settings and start monitoring if it was active
    const settings = await chrome.storage.sync.get({
        targetUrl: '',
        scanInterval: 1, // 1 минута по умолчанию
        isActive: false
    });
    
    if (settings.isActive && settings.targetUrl) {
        await startMonitoring(settings);
    }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.url) {
        // Legacy support for content script
        openFormTab(message.url);
    } else if (message.action) {
        handleAction(message, sendResponse);
        return true; // Keep message channel open for async response
    }
});

async function handleAction(message, sendResponse) {
    try {
        switch (message.action) {
            case 'startMonitoring':
                await startMonitoring(message.settings);
                sendResponse({ success: true });
                break;
                
            case 'stopMonitoring':
                await stopMonitoring();
                sendResponse({ success: true });
                break;
                
            case 'testScan':
                const result = await scanWebsite(message.url);
                sendResponse(result);
                break;
                
            case 'getStatus':
                // Get saved settings as fallback
                const savedSettings = await chrome.storage.sync.get({
                    targetUrl: '',
                    scanInterval: 1,
                    isActive: false
                });
                
                sendResponse({
                    success: true,
                    isActive: monitoringActive,
                    settings: currentSettings || savedSettings
                });
                break;
                
            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    } catch (error) {
        console.error('Error handling action:', error);
        sendResponse({ success: false, error: error.message });
    }
}

async function startMonitoring(settings) {
    try {
        // Stop existing monitoring if any
        await stopMonitoring();
        
        // Store current settings
        currentSettings = settings;
        
        // Clear existing interval
        if (scanIntervalId) {
            clearInterval(scanIntervalId);
            scanIntervalId = null;
        }
        
        monitoringActive = true;
        
        // Do initial scan
        await scanWebsite(settings.targetUrl);
        
        // Start periodic scanning using setInterval for all intervals
        const intervalMs = settings.scanInterval * 60 * 1000; // Convert minutes to milliseconds
        const intervalSeconds = intervalMs / 1000;
        
        // Ensure minimum interval of 1 second to prevent too frequent requests
        const finalIntervalMs = Math.max(intervalMs, 1000);
        
        console.log(`Настройка интервала: ${settings.scanInterval} минут (${intervalMs}ms = ${intervalSeconds} секунд, финальный: ${finalIntervalMs}ms)`);
        
        scanIntervalId = setInterval(async () => {
            if (monitoringActive && currentSettings) {
                console.log(`Сработал setInterval - начинаем сканирование (интервал: ${settings.scanInterval} мин)`);
                await scanWebsite(currentSettings.targetUrl);
            }
        }, finalIntervalMs);
        
        await logMessage('info', `Мониторинг запущен для: ${settings.targetUrl}`);
        await logMessage('info', `Интервал сканирования: ${settings.scanInterval} минут`);
        
        // Notify popup
        try {
            await chrome.runtime.sendMessage({
                action: 'updateStatus',
                isActive: true
            });
        } catch (e) {
            // Popup might not be open, ignore error
        }
        
    } catch (error) {
        await logMessage('error', `Ошибка запуска мониторинга: ${error.message}`);
        throw error;
    }
}

async function stopMonitoring() {
    try {
        // Clear JavaScript interval
        if (scanIntervalId) {
            clearInterval(scanIntervalId);
            scanIntervalId = null;
        }
        
        monitoringActive = false;
        currentSettings = null;
        knownForms.clear();
        
        await logMessage('info', 'Мониторинг остановлен');
        
        // Notify popup
        try {
            await chrome.runtime.sendMessage({
                action: 'updateStatus',
                isActive: false
            });
        } catch (e) {
            // Popup might not be open, ignore error
        }
        
    } catch (error) {
        await logMessage('error', `Ошибка остановки мониторинга: ${error.message}`);
        throw error;
    }
}


async function scanWebsite(url) {
    try {
        await logMessage('info', `Сканирование страницы: ${url}`);

        // Fetch the webpage
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            credentials: 'omit'
        });
        
        if (!response.ok) {
            await resetCookies();
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const html = await response.text();
        
        // Extract Microsoft Forms links using regex (both domains)
        const formsRegex = /https:\/\/(?:forms\.office\.com|forms\.cloud\.microsoft)\/[^"'\s<>]+/g;
        const foundLinks = html.match(formsRegex) || [];
        
        // Remove duplicates and filter out new links
        const uniqueLinks = [...new Set(foundLinks)];
        const newLinks = uniqueLinks.filter(link => !knownForms.has(link));
        
        // Add new links to known set
        newLinks.forEach(link => knownForms.add(link));
        
        await logMessage('success', `Найдено ${uniqueLinks.length} ссылок, ${newLinks.length} новых`);
        
        // Open new forms in tabs
        for (const link of newLinks) {
            await openFormTab(link);
            await logMessage('info', `Открыта новая форма: ${link}`);
            
            // Small delay between opening tabs
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        return {
            success: true,
            formsFound: uniqueLinks.length,
            newForms: newLinks.length,
            links: uniqueLinks
        };
        
    } catch (error) {
        await logMessage('error', `Ошибка сканирования ${url}: ${error.message}`);
        return {
            success: false,
            error: error.message,
            formsFound: 0
        };
    }
}

async function resetCookies() {
       await chrome.cookies.remove({
            url: `https://formularz-rodziny-cudzoziemcow.mazowieckie.pl/`,
            name: "bm_sv"
          }, async (details) => {
            await logMessage ('error', `Удалён cookie: ${details.message}`);
          });
}

async function openFormTab(url) {
    try {
        await chrome.tabs.create({ 
            url: url,
            active: true // Open in background
        });
    } catch (error) {
        await logMessage('error', `Ошибка открытия вкладки: ${error.message}`);
    }
}

async function logMessage(type, message) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        type,
        message,
        timestamp
    };
    
    try {
        // Store in local storage
        const result = await chrome.storage.local.get(['logs']);
        const logs = result.logs || [];
        
        logs.push(logEntry);
        
        // Keep only last 100 log entries
        if (logs.length > 100) {
            logs.splice(0, logs.length - 100);
        }
        
        await chrome.storage.local.set({ logs });
        
        // Notify popup if it's open
        try {
            await chrome.runtime.sendMessage({
                action: 'updateLog',
                type,
                message
            });
        } catch (e) {
            // Popup might not be open, ignore error
        }
        
        console.log(`[${type.toUpperCase()}] ${message}`);
        
    } catch (error) {
        console.error('Error logging message:', error);
    }
}
