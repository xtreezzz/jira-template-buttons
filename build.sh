#!/bin/bash

echo "⚠️  Используйте 'npm run build' для сборки проекта"
echo "Для разработки: 'npm run build:dev'"
echo "Для production: 'npm run build'"

if [ ! -f "package.json" ]; then
    echo "Выполняется legacy сборка..."
    mkdir -p dist icons
    cp -r src/* dist/
    cp manifest.json dist/
    
    mkdir -p icons
    touch icons/icon48.png
    touch icons/icon128.png
    cp -r icons dist/
    
    echo "Legacy build completed!"
else
    echo "Запускается npm build..."
    npm run build
fi
