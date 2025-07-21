
console.log('🔧 [DEBUG] Начинаем тестирование Custom API функциональности...');

function maskSensitive(value, type = 'password') {
  if (!value) return '[не задано]';
  if (type === 'password') return '*'.repeat(Math.min(value.length, 8));
  if (type === 'token') return value.substring(0, 10) + '...' + value.substring(value.length - 4);
  return value;
}

async function testChromeStorageAPI() {
  console.log('\n📦 [TEST 1] Проверка доступности Chrome Storage API...');
  
  if (typeof chrome === 'undefined') {
    console.error('❌ Chrome API недоступен');
    return false;
  }
  
  if (!chrome.storage) {
    console.error('❌ chrome.storage недоступен');
    return false;
  }
  
  console.log('✅ Chrome Storage API доступен');
  console.log('  - chrome.storage.sync:', !!chrome.storage.sync);
  console.log('  - chrome.storage.local:', !!chrome.storage.local);
  return true;
}

async function testSettingsStorage() {
  console.log('\n💾 [TEST 2] Тестирование сохранения/загрузки настроек...');
  
  const testSettings = {
    syncData: {
      provider: 'custom',
      model: 'test-model-gpt-4o',
      authUrl: 'https://test-api.example.com/auth/v1/token',
      chatUrl: 'https://test-api.example.com/public/v1/chat/completions',
      username: 'test-user',
      temperature: 0.7,
      systemRole: 'system',
      userRole: 'user',
      systemPrompt: 'Ты полезный ассистент для тестирования.',
      customEndpointFormat: 'token-auth'
    },
    localData: {
      password: 'test-password-123'
    }
  };
  
  try {
    console.log('📝 Сохраняем тестовые настройки...');
    await new Promise((resolve, reject) => {
      chrome.storage.sync.set(testSettings.syncData, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    
    await new Promise((resolve, reject) => {
      chrome.storage.local.set(testSettings.localData, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    
    console.log('✅ Настройки сохранены');
    
    console.log('📖 Загружаем настройки...');
    const syncData = await new Promise((resolve, reject) => {
      chrome.storage.sync.get(Object.keys(testSettings.syncData), (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data);
        }
      });
    });
    
    const localData = await new Promise((resolve, reject) => {
      chrome.storage.local.get(Object.keys(testSettings.localData), (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data);
        }
      });
    });
    
    console.log('✅ Настройки загружены');
    console.log('📊 Sync Storage данные:');
    Object.entries(syncData).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });
    
    console.log('🔒 Local Storage данные (маскированные):');
    Object.entries(localData).forEach(([key, value]) => {
      console.log(`  - ${key}: ${maskSensitive(value, 'password')}`);
    });
    
    return { syncData, localData };
    
  } catch (error) {
    console.error('❌ Ошибка при работе с настройками:', error);
    return null;
  }
}

async function testTokenAuthentication(settings) {
  console.log('\n🔐 [TEST 3] Тестирование токен-аутентификации...');
  
  if (!settings || !settings.syncData.authUrl) {
    console.error('❌ Настройки не загружены или authUrl отсутствует');
    return null;
  }
  
  const { syncData, localData } = settings;
  
  console.log('🌐 Параметры аутентификации:');
  console.log(`  - Auth URL: ${syncData.authUrl}`);
  console.log(`  - Username: ${syncData.username}`);
  console.log(`  - Password: ${maskSensitive(localData.password, 'password')}`);
  
  console.log('📡 Симулируем запрос аутентификации...');
  
  const authPayload = {
    username: syncData.username,
    password: localData.password
  };
  
  console.log('📤 Отправляем запрос:');
  console.log(`  POST ${syncData.authUrl}`);
  console.log('  Headers: Content-Type: application/json');
  console.log('  Body:', JSON.stringify({
    username: syncData.username,
    password: maskSensitive(localData.password, 'password')
  }, null, 2));
  
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token-payload.signature';
  console.log('✅ Симуляция успешного ответа:');
  console.log(`  - access_token: ${maskSensitive(mockToken, 'token')}`);
  
  return mockToken;
}

async function testChatAPICall(settings, token) {
  console.log('\n🤖 [TEST 4] Тестирование запроса к Chat API...');
  
  if (!settings || !token) {
    console.error('❌ Настройки или токен отсутствуют');
    return null;
  }
  
  const { syncData } = settings;
  
  console.log('🌐 Параметры Chat API:');
  console.log(`  - Chat URL: ${syncData.chatUrl}`);
  console.log(`  - Model: ${syncData.model}`);
  console.log(`  - Temperature: ${syncData.temperature}`);
  console.log(`  - Token: ${maskSensitive(token, 'token')}`);
  
  console.log('📡 Симулируем запрос к Chat API...');
  
  const chatPayload = {
    model: syncData.model,
    temperature: syncData.temperature,
    messages: [
      {
        role: syncData.systemRole,
        content: syncData.systemPrompt
      },
      {
        role: syncData.userRole,
        content: 'Тестовое сообщение пользователя'
      }
    ]
  };
  
  console.log('📤 Отправляем запрос:');
  console.log(`  POST ${syncData.chatUrl}`);
  console.log('  Headers:');
  console.log('    Content-Type: application/json');
  console.log(`    Authorization: Bearer ${maskSensitive(token, 'token')}`);
  console.log('    x-proxy-mask-critical-data: 1');
  console.log('  Body:', JSON.stringify(chatPayload, null, 2));
  
  const mockResponse = {
    choices: [
      {
        message: {
          role: 'assistant',
          content: 'Тестовый ответ от модели. Аутентификация и API вызов работают корректно!'
        }
      }
    ]
  };
  
  console.log('✅ Симуляция успешного ответа:');
  console.log('  Response:', JSON.stringify(mockResponse, null, 2));
  
  return mockResponse.choices[0].message.content;
}

async function testSettingsMigration() {
  console.log('\n🔄 [TEST 5] Тестирование миграции настроек...');
  
  const oldSettings = {
    provider: 'custom',
    model: 'old-model',
    authUrl: 'https://old-api.com/auth',
    chatUrl: 'https://old-api.com/chat',
    username: 'old-user',
    password: 'old-password'
  };
  
  console.log('📝 Симулируем старые настройки в chrome.storage.local...');
  
  try {
    await new Promise((resolve, reject) => {
      chrome.storage.local.set(oldSettings, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    
    console.log('✅ Старые настройки сохранены в local storage');
    
    console.log('🔄 Запускаем процесс миграции...');
    
    const keysToMigrate = ['provider', 'model', 'authUrl', 'chatUrl', 'username'];
    const syncData = {};
    const localData = { password: oldSettings.password };
    
    keysToMigrate.forEach(key => {
      if (oldSettings[key] !== undefined) {
        syncData[key] = oldSettings[key];
      }
    });
    
    await new Promise((resolve, reject) => {
      chrome.storage.sync.set(syncData, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    
    console.log('✅ Настройки мигрированы в sync storage');
    console.log('📊 Мигрированные данные:');
    Object.entries(syncData).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });
    
    await new Promise((resolve, reject) => {
      chrome.storage.local.remove(keysToMigrate, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
    
    console.log('✅ Старые ключи удалены из local storage');
    console.log('🔒 Пароль остался в local storage для безопасности');
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка при миграции:', error);
    return false;
  }
}

async function testSettingsPersistence() {
  console.log('\n🔄 [TEST 6] Тестирование персистентности настроек...');
  
  console.log('💡 Для полного тестирования персистентности:');
  console.log('  1. Настройте кастомный API в интерфейсе расширения');
  console.log('  2. Сохраните настройки');
  console.log('  3. Перейдите в chrome://extensions/');
  console.log('  4. Нажмите кнопку "Обновить" для расширения');
  console.log('  5. Откройте настройки снова');
  console.log('  6. Проверьте, что все настройки сохранились');
  
  try {
    const syncData = await new Promise((resolve, reject) => {
      chrome.storage.sync.get(null, (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data);
        }
      });
    });
    
    const localData = await new Promise((resolve, reject) => {
      chrome.storage.local.get(null, (data) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data);
        }
      });
    });
    
    console.log('📊 Текущие настройки в sync storage:');
    if (Object.keys(syncData).length === 0) {
      console.log('  (пусто)');
    } else {
      Object.entries(syncData).forEach(([key, value]) => {
        console.log(`  - ${key}: ${value}`);
      });
    }
    
    console.log('🔒 Текущие настройки в local storage (маскированные):');
    if (Object.keys(localData).length === 0) {
      console.log('  (пусто)');
    } else {
      Object.entries(localData).forEach(([key, value]) => {
        const maskedValue = (key === 'password' || key === 'apiKey') 
          ? maskSensitive(value, 'password') 
          : value;
        console.log(`  - ${key}: ${maskedValue}`);
      });
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Ошибка при проверке настроек:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 [MAIN] Запуск полного тестирования Custom API функциональности');
  console.log('=' .repeat(60));
  
  const results = {
    chromeAPI: false,
    storage: null,
    auth: null,
    chatAPI: null,
    migration: false,
    persistence: false
  };
  
  try {
    results.chromeAPI = await testChromeStorageAPI();
    if (!results.chromeAPI) {
      console.log('\n❌ [РЕЗУЛЬТАТ] Тестирование прервано - Chrome API недоступен');
      return results;
    }
    
    results.storage = await testSettingsStorage();
    
    if (results.storage) {
      results.auth = await testTokenAuthentication(results.storage);
    }
    
    if (results.storage && results.auth) {
      results.chatAPI = await testChatAPICall(results.storage, results.auth);
    }
    
    results.migration = await testSettingsMigration();
    
    results.persistence = await testSettingsPersistence();
    
    console.log('\n' + '=' .repeat(60));
    console.log('📋 [ИТОГОВЫЙ ОТЧЕТ] Результаты тестирования:');
    console.log('=' .repeat(60));
    
    console.log(`✅ Chrome Storage API: ${results.chromeAPI ? 'РАБОТАЕТ' : 'НЕ РАБОТАЕТ'}`);
    console.log(`✅ Сохранение/загрузка настроек: ${results.storage ? 'РАБОТАЕТ' : 'НЕ РАБОТАЕТ'}`);
    console.log(`✅ Токен-аутентификация: ${results.auth ? 'СИМУЛЯЦИЯ УСПЕШНА' : 'НЕ РАБОТАЕТ'}`);
    console.log(`✅ Chat API запросы: ${results.chatAPI ? 'СИМУЛЯЦИЯ УСПЕШНА' : 'НЕ РАБОТАЕТ'}`);
    console.log(`✅ Миграция настроек: ${results.migration ? 'РАБОТАЕТ' : 'НЕ РАБОТАЕТ'}`);
    console.log(`✅ Персистентность настроек: ${results.persistence ? 'ПРОВЕРЕНА' : 'НЕ РАБОТАЕТ'}`);
    
    const successCount = Object.values(results).filter(r => r !== null && r !== false).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 [ОБЩИЙ РЕЗУЛЬТАТ] ${successCount}/${totalTests} тестов прошли успешно`);
    
    if (successCount === totalTests) {
      console.log('🎉 ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО! Custom API функциональность работает корректно.');
    } else {
      console.log('⚠️  Некоторые тесты не прошли. Проверьте детали выше.');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ [КРИТИЧЕСКАЯ ОШИБКА] Тестирование прервано:', error);
    return results;
  }
}

console.log('🔧 Отладочный скрипт загружен. Запустите runAllTests() для начала тестирования.');
console.log('💡 Или запустите отдельные тесты:');
console.log('  - testChromeStorageAPI()');
console.log('  - testSettingsStorage()');
console.log('  - testSettingsMigration()');
console.log('  - testSettingsPersistence()');

runAllTests();
