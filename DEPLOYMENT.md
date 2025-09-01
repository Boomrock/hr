# Инструкции по деплою HR Chat Companion

## 🚀 Быстрый деплой на Vercel (Рекомендуется)

### 1. Подготовка
```bash
# Убедитесь, что проект готов к деплою
npm run build
```

### 2. Деплой через Vercel CLI
```bash
# Установка Vercel CLI
npm i -g vercel

# Вход в аккаунт
vercel login

# Деплой
vercel

# Для продакшена
vercel --prod
```

### 3. Деплой через веб-интерфейс
1. Зайдите на [vercel.com](https://vercel.com)
2. Подключите ваш GitHub репозиторий
3. Vercel автоматически определит настройки
4. Нажмите "Deploy"

## 🌐 Деплой на Netlify

### 1. Через Netlify CLI
```bash
# Установка CLI
npm install -g netlify-cli

# Вход в аккаунт
netlify login

# Деплой
npm run build
netlify deploy --prod --dir=dist
```

### 2. Через веб-интерфейс
1. Зайдите на [netlify.com](https://netlify.com)
2. Перетащите папку `dist` в область деплоя
3. Или подключите GitHub репозиторий

## 🔥 Деплой на Firebase Hosting

### 1. Установка Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Инициализация проекта
```bash
firebase login
firebase init hosting
```

### 3. Деплой
```bash
npm run build
firebase deploy
```

## 📄 Деплой на GitHub Pages

### 1. Установка gh-pages
```bash
npm install --save-dev gh-pages
```

### 2. Настройка package.json
Добавьте в package.json:
```json
{
  "homepage": "https://yourusername.github.io/your-repo-name",
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

### 3. Деплой
```bash
npm run deploy
```

## 🚂 Деплой на Railway

### 1. Установка Railway CLI
```bash
npm install -g @railway/cli
```

### 2. Деплой
```bash
railway login
railway init
railway up
```

## ⚙️ Настройка переменных окружения

### Для Vercel
1. В настройках проекта добавьте переменную:
   - `VITE_OPENAI_API_KEY` = ваш API ключ

### Для Netlify
1. В настройках Environment Variables добавьте:
   - `VITE_OPENAI_API_KEY` = ваш API ключ

### Для Firebase
1. В Firebase Console добавьте переменную окружения

## 🔧 Устранение проблем

### Проблема: Белый экран после деплоя
**Решение:** Проверьте, что в `vite.config.ts` установлен правильный `base`:
```typescript
base: mode === 'production' ? './' : '/'
```

### Проблема: 404 ошибки при обновлении страницы
**Решение:** Убедитесь, что настроены редиректы в конфигурационных файлах

### Проблема: API ключ не работает
**Решение:** Проверьте переменные окружения на платформе хостинга

## 📊 Сравнение платформ

| Платформа | Бесплатный план | Простота | Производительность | Рекомендация |
|-----------|----------------|----------|-------------------|--------------|
| Vercel | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🥇 |
| Netlify | ✅ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 🥈 |
| Firebase | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🥉 |
| GitHub Pages | ✅ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Railway | ✅ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## 🎯 Рекомендация

Для вашего HR Chat Companion проекта **рекомендую Vercel** по следующим причинам:

1. **Отличная поддержка React + Vite**
2. **Автоматический деплой из GitHub**
3. **Быстрая настройка**
4. **Хорошая производительность**
5. **Бесплатный план для личных проектов**

## 🚀 Быстрый старт с Vercel

```bash
# 1. Установите Vercel CLI
npm i -g vercel

# 2. Войдите в аккаунт
vercel login

# 3. Деплой
vercel

# 4. Для продакшена
vercel --prod
```

Ваш проект будет доступен по ссылке вида: `https://your-project.vercel.app` 