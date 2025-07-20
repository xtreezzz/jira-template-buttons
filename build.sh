#!/bin/bash
mkdir -p dist icons
cp src/content.js dist/
cp src/styles.css dist/

# Если у вас нет иконок, можно создать пустые файлы для теста
touch icons/icon48.png
touch icons/icon128.png

echo "Build completed!"
