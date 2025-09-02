# Инструкции по развертыванию HR Chat Companion

## 🚀 Быстрый старт

### 1. Клонирование репозитория
```bash
git clone https://github.com/RockInMyHead/hr.git
cd hr
```

### 2. Установка зависимостей
```bash
npm install
```

### 3. Настройка переменных окружения
```bash
cp env.example .env
# Отредактируйте .env файл и добавьте ваш OpenAI API ключ
```

### 4. Запуск проекта
```bash
# Терминал 1: Backend сервер
npm start

# Терминал 2: Frontend разработка
npm run dev
```

## 🌐 Развертывание на продакшене

### Вариант 1: Vercel (Рекомендуется)

1. **Подключите GitHub репозиторий к Vercel**
2. **Настройте переменные окружения:**
   - `OPENAI_API_KEY` - ваш OpenAI API ключ
   - `VITE_OPENAI_MODEL` - модель OpenAI (по умолчанию: gpt-4o-mini)

3. **Настройте build команды:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Вариант 2: Netlify

1. **Подключите GitHub репозиторий к Netlify**
2. **Настройте build команды:**
   - Build command: `npm run build`
   - Publish directory: `dist`
3. **Добавьте переменные окружения в настройках**

### Вариант 3: Heroku

1. **Создайте Procfile:**
```
web: npm start
```

2. **Настройте переменные окружения:**
```bash
heroku config:set OPENAI_API_KEY=your_key_here
heroku config:set NODE_ENV=production
```

3. **Деплой:**
```bash
git push heroku main
```

## 🔧 Настройка для продакшена

### 1. Обновите server.js для продакшена
```javascript
// В server.js добавьте:
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}
```

### 2. Настройте CORS для продакшена
```javascript
// Обновите CORS настройки:
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'],
  credentials: true
}));
```

### 3. Добавьте health check endpoint
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});
```

## 📊 Мониторинг и логирование

### 1. Логирование запросов
```javascript
// Добавьте в server.js:
app.use(morgan('combined'));
```

### 2. Обработка ошибок
```javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
```

## 🔒 Безопасность

### 1. Rate Limiting
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100 // максимум 100 запросов с одного IP
});

app.use('/api/', limiter);
```

### 2. Helmet для безопасности
```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
app.use(helmet());
```

## 📝 Переменные окружения

### Обязательные
- `OPENAI_API_KEY` - ваш OpenAI API ключ

### Опциональные
- `PORT` - порт сервера (по умолчанию: 3000)
- `NODE_ENV` - окружение (development/production)
- `ALLOWED_ORIGINS` - разрешенные домены для CORS
- `VITE_OPENAI_MODEL` - модель OpenAI

## 🐛 Устранение неполадок

### Проблема: CORS ошибки
**Решение:** Проверьте настройки CORS в server.js и убедитесь, что ваш домен добавлен в `origin`

### Проблема: OpenAI API ошибки
**Решение:** Проверьте правильность API ключа и лимиты OpenAI

### Проблема: База данных не создается
**Решение:** Убедитесь, что у процесса есть права на запись в директорию

## 📞 Поддержка

Если у вас возникли проблемы:
1. Проверьте логи сервера
2. Убедитесь, что все переменные окружения настроены
3. Проверьте, что порты не заняты другими процессами
4. Создайте issue в GitHub репозитории
