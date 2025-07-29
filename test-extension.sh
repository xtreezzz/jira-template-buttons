#!/bin/bash

echo "🧪 Запуск тестовой среды для Jira Template Buttons Extension"
echo "============================================================"

if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен. Устанавливаем Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "✅ Docker установлен. Перезапустите терминал и запустите скрипт снова."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose не установлен. Устанавливаем..."
    sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

echo "🔨 Сборка расширения..."
./build.sh

echo "🚀 Запуск тестовых серверов..."
docker-compose up -d

echo ""
echo "✅ Тестовая среда запущена!"
echo ""
echo "📋 Инструкции по тестированию:"
echo "1. Откройте Chrome и перейдите в chrome://extensions/"
echo "2. Включите 'Режим разработчика'"
echo "3. Нажмите 'Загрузить распакованное расширение'"
echo "4. Выберите папку: $(pwd)/dist"
echo "5. Откройте тестовую страницу: http://localhost:8080"
echo "6. Альтернативный сервер: http://localhost:3000/test-jira-page.html"
echo ""
echo "🧪 Что тестировать:"
echo "- Переключение между режимами просмотра и редактирования"
echo "- Появление кнопок расширения в режиме редактирования"
echo "- Работу кнопки 'Улучшить постановку' с мокированным LLM"
echo "- Немедленное отображение изменений в форме"
echo "- Кнопки истории (Назад/Вперед)"
echo "- Редактирование системного промпта и Jira шаблона"
echo ""
echo "🛑 Для остановки: docker-compose down"
