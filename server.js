const http = require('http');
const url = require('url');

// Время запуска сервера
const serverStartTime = Date.now();
const formsLink = 'https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=DQSIkWdsW0yxEjajBLZtrQAAAAAAAAAAAAMAAFbJEaBUQzJRUkZXRTVSVzJUUVpUUTBHMzRVWkVBNC4u';

// Функция для генерации HTML страницы
function generateHTML() {
    const currentTime = Date.now();
    const elapsedSeconds = Math.floor((currentTime - serverStartTime) / 1000);
    const remainingSeconds = Math.max(0, 60 - elapsedSeconds);
    
    let content = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Тестовая страница для расширения</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                min-height: 100vh;
            }
            .container {
                background: rgba(255, 255, 255, 0.1);
                padding: 30px;
                border-radius: 10px;
                backdrop-filter: blur(10px);
                text-align: center;
            }
            .timer {
                font-size: 24px;
                margin: 20px 0;
                padding: 20px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 10px;
            }
            .forms-link {
                font-size: 18px;
                margin: 20px 0;
                padding: 15px;
                background: rgba(76, 175, 80, 0.3);
                border-radius: 8px;
                border: 2px solid #4CAF50;
            }
            .forms-link a {
                color: #4CAF50;
                text-decoration: none;
                font-weight: bold;
            }
            .forms-link a:hover {
                text-decoration: underline;
            }
            .status {
                font-size: 16px;
                margin: 10px 0;
                padding: 10px;
                border-radius: 5px;
            }
            .waiting {
                background: rgba(255, 193, 7, 0.3);
                border: 1px solid #FFC107;
            }
            .ready {
                background: rgba(76, 175, 80, 0.3);
                border: 1px solid #4CAF50;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔍 Тестовая страница для расширения</h1>
            <p>Эта страница используется для тестирования Chrome расширения "Отслеживатель ссылок на формы"</p>
            
            <div class="timer">
                ⏱️ Прошло времени: ${elapsedSeconds} секунд
            </div>
    `;
    
    if (remainingSeconds > 0) {
        content += `
            <div class="status waiting">
                ⏳ Ожидание появления ссылки на форму... (осталось: ${remainingSeconds} сек)
            </div>
            <p>Ссылка на Microsoft Forms появится через ${remainingSeconds} секунд</p>
        `;
    } else {
        content += `
            <div class="status ready">
                ✅ Ссылка на форму готова!
            </div>
            <div class="forms-link">
                <p>📝 <strong>Ссылка на Microsoft Forms:</strong></p>
                <a href="${formsLink}" target="_blank">${formsLink}</a>
            </div>
            <p>Теперь расширение должно обнаружить эту ссылку и открыть её в новой вкладке!</p>
        `;
    }
    
    content += `
        </div>
        
        <script>
            // Автообновление страницы каждые 5 секунд для обновления таймера
            setTimeout(() => {
                location.reload();
            }, 5000);
        </script>
    </body>
    </html>
    `;
    
    return content;
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
        res.end(generateHTML());
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
            formsLink: hasFormsLink ? formsLink : null
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
    console.log(`📝 Ссылка на Microsoft Forms появится через 60 секунд`);
    console.log(`🔗 Ссылка: ${formsLink}`);
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
