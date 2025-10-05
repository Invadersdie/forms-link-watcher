const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// Время запуска сервера
const serverStartTime = Date.now();

// Функция для чтения HTML файлов
function getHTMLContent() {
    const currentTime = Date.now();
    const elapsedSeconds = Math.floor((currentTime - serverStartTime) / 1000);
    
    // Через 60 секунд показываем withlink.html, иначе withoutlink.html
    const htmlFile = elapsedSeconds >= 60 ? 'withlink.html' : 'withoutlink.html';
    
    try {
        const filePath = path.join(__dirname, htmlFile);
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Добавляем информацию о статусе в конец страницы
        const statusInfo = `
        <div style="position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; font-size: 12px; z-index: 9999;">
            <strong>🔍 Тестовый сервер</strong><br>
            Прошло времени: ${elapsedSeconds} сек<br>
            Файл: ${htmlFile}<br>
            ${elapsedSeconds >= 60 ? '✅ Ссылка на форму активна!' : '⏳ Ожидание...'}
        </div>
        `;
        
        return content.replace('</body>', statusInfo + '</body>');
    } catch (error) {
        console.error('Ошибка чтения HTML файла:', error);
        return '<h1>Ошибка загрузки страницы</h1>';
    }
}

// Создаем HTTP сервер
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // Устанавливаем CORS заголовки для тестирования
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Главная страница
    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getHTMLContent());
    }
    // API endpoint для получения статуса
    else if (parsedUrl.pathname === '/api/status') {
        const currentTime = Date.now();
        const elapsedSeconds = Math.floor((currentTime - serverStartTime) / 1000);
        const hasFormsLink = elapsedSeconds >= 60;
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            serverStartTime: serverStartTime,
            currentTime: currentTime,
            elapsedSeconds: elapsedSeconds,
            hasFormsLink: hasFormsLink,
            currentFile: hasFormsLink ? 'withlink.html' : 'withoutlink.html'
        }));
    }
    // 404 для остальных запросов
    else {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
            <h1>404 - Страница не найдена</h1>
            <p>Доступные страницы:</p>
            <ul>
                <li><a href="/">Главная страница</a></li>
                <li><a href="/api/status">API статуса</a></li>
            </ul>
        `);
    }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Тестовый сервер запущен на http://localhost:${PORT}`);
    console.log(`📄 Используются реальные HTML файлы:`);
    console.log(`   - withoutlink.html (0-60 сек)`);
    console.log(`   - withlink.html (после 60 сек)`);
    console.log(`⏰ Время запуска: ${new Date().toLocaleString()}`);
    console.log(`\nДля остановки сервера нажмите Ctrl+C`);
});

// Обработка завершения процесса
process.on('SIGINT', () => {
    console.log('\n👋 Сервер остановлен');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n👋 Сервер остановлен');
    process.exit(0);
});
