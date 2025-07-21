document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');
  const status = document.getElementById('status');
  
  const modelStep = document.getElementById('modelStep');
  const providerSettings = document.getElementById('providerSettings');
  const promptStep = document.getElementById('promptStep');
  const saveSection = document.getElementById('saveSection');
  
  const providerRadios = document.querySelectorAll('input[name="provider"]');
  const providerOpenAI = document.getElementById('providerOpenAI');
  const providerGemini = document.getElementById('providerGemini');
  const providerCustom = document.getElementById('providerCustom');
  
  const openaiModels = document.getElementById('openaiModels');
  const geminiModels = document.getElementById('geminiModels');
  const customModel = document.getElementById('customModel');
  const openaiModel = document.getElementById('openaiModel');
  const geminiModel = document.getElementById('geminiModel');
  const customModelName = document.getElementById('customModelName');
  
  const openaiSettings = document.getElementById('openaiSettings');
  const geminiSettings = document.getElementById('geminiSettings');
  const customSettings = document.getElementById('customSettings');
  
  const openaiUrl = document.getElementById('openaiUrl');
  const openaiKey = document.getElementById('openaiKey');
  const geminiUrl = document.getElementById('geminiUrl');
  const geminiKey = document.getElementById('geminiKey');
  const authUrl = document.getElementById('authUrl');
  const chatUrl = document.getElementById('chatUrl');
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const temperature = document.getElementById('temperature');
  const systemRole = document.getElementById('systemRole');
  const userRole = document.getElementById('userRole');
  const systemPrompt = document.getElementById('systemPrompt');

  let currentProvider = '';
  let currentModel = '';

  providerRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      currentProvider = e.target.value;
      showModelStep();
      hideStepsAfter('model');
    });
  });

  openaiModel.addEventListener('change', (e) => {
    if (e.target.value) {
      currentModel = e.target.value;
      showProviderSettings();
    }
  });

  geminiModel.addEventListener('change', (e) => {
    if (e.target.value) {
      currentModel = e.target.value;
      showProviderSettings();
    }
  });

  customModelName.addEventListener('input', (e) => {
    if (e.target.value.trim()) {
      currentModel = e.target.value.trim();
      showProviderSettings();
    }
  });

  function showModelStep() {
    openaiModels.style.display = 'none';
    geminiModels.style.display = 'none';
    customModel.style.display = 'none';
    
    if (currentProvider === 'openai') {
      openaiModels.style.display = 'block';
    } else if (currentProvider === 'gemini') {
      geminiModels.style.display = 'block';
    } else if (currentProvider === 'custom') {
      customModel.style.display = 'block';
    }
    
    modelStep.style.display = 'block';
  }

  function showProviderSettings() {
    openaiSettings.style.display = 'none';
    geminiSettings.style.display = 'none';
    customSettings.style.display = 'none';
    
    if (currentProvider === 'openai') {
      openaiSettings.style.display = 'block';
    } else if (currentProvider === 'gemini') {
      geminiSettings.style.display = 'block';
    } else if (currentProvider === 'custom') {
      customSettings.style.display = 'block';
    }
    
    providerSettings.style.display = 'block';
    promptStep.style.display = 'block';
    saveSection.style.display = 'block';
  }

  function hideStepsAfter(step) {
    if (step === 'provider') {
      modelStep.style.display = 'none';
      providerSettings.style.display = 'none';
      promptStep.style.display = 'none';
      saveSection.style.display = 'none';
    } else if (step === 'model') {
      providerSettings.style.display = 'none';
      promptStep.style.display = 'none';
      saveSection.style.display = 'none';
    }
  }

  // Загрузка настроек с использованием sync storage для персистентности
  const loadSettings = () => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      console.warn('[SETTINGS] Chrome storage APIs not available, using default values');
      return;
    }
    
    chrome.storage.sync.get([
      'provider', 'apiUrl', 'model', 'systemPrompt',
      'authUrl', 'chatUrl', 'username', 'temperature', 'systemRole', 'userRole'
    ], (syncData) => {
      chrome.storage.local.get(['apiKey', 'password'], (localData) => {
        const data = { ...syncData, ...localData };
    let savedProvider = data.provider;
    if (!savedProvider) {
      if (data.model && data.model.startsWith('gpt-')) {
        savedProvider = 'openai';
      } else if (data.model && data.model.startsWith('gemini-')) {
        savedProvider = 'gemini';
      } else if (data.authUrl || data.chatUrl) {
        savedProvider = 'custom';
      } else {
        savedProvider = 'openai'; // по умолчанию
      }
    }

    currentProvider = savedProvider;
    document.querySelector(`input[name="provider"][value="${savedProvider}"]`).checked = true;
    showModelStep();

    if (data.model) {
      currentModel = data.model;
      if (savedProvider === 'openai') {
        openaiModel.value = data.model;
      } else if (savedProvider === 'gemini') {
        geminiModel.value = data.model;
      } else if (savedProvider === 'custom') {
        customModelName.value = data.model;
      }
      showProviderSettings();
    }

    openaiUrl.value = data.apiUrl || '';
    openaiKey.value = data.apiKey || '';
    geminiUrl.value = data.apiUrl || '';
    geminiKey.value = data.apiKey || '';
    authUrl.value = data.authUrl || '';
    chatUrl.value = data.chatUrl || '';
    username.value = data.username || '';
    password.value = data.password || '';
    temperature.value = data.temperature || 0.1;
    systemRole.value = data.systemRole || 'system';
    userRole.value = data.userRole || 'user';
        systemPrompt.value = data.systemPrompt || '';
      });
    });
  };

  const migrateSettings = () => {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      console.warn('[MIGRATION] Chrome storage APIs not available, skipping migration');
      loadSettings();
      return;
    }
    
    chrome.storage.local.get([
      'provider', 'apiUrl', 'model', 'systemPrompt',
      'authUrl', 'chatUrl', 'username', 'temperature', 'systemRole', 'userRole'
    ], (oldData) => {
      if (Object.keys(oldData).length > 0) {
        console.log('[MIGRATION] Migrating settings from local to sync storage');
        
        const syncData = {};
        const keysToMigrate = ['provider', 'apiUrl', 'model', 'systemPrompt', 'authUrl', 'chatUrl', 'username', 'temperature', 'systemRole', 'userRole'];
        
        keysToMigrate.forEach(key => {
          if (oldData[key] !== undefined) {
            syncData[key] = oldData[key];
          }
        });
        
        if (Object.keys(syncData).length > 0) {
          chrome.storage.sync.set(syncData, () => {
            console.log('[MIGRATION] Settings migrated successfully');
            chrome.storage.local.remove(keysToMigrate, () => {
              loadSettings();
            });
          });
        } else {
          loadSettings();
        }
      } else {
        loadSettings();
      }
    });
  };

  migrateSettings();

  // Сохранение настроек
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!currentProvider) {
      showError('Выберите провайдера!');
      return;
    }
    
    if (!currentModel) {
      showError('Выберите модель!');
      return;
    }

    if (currentProvider === 'openai' && !openaiKey.value.trim()) {
      showError('Введите API ключ OpenAI!');
      return;
    }
    
    if (currentProvider === 'gemini' && !geminiKey.value.trim()) {
      showError('Введите API ключ Gemini!');
      return;
    }
    
    if (currentProvider === 'custom') {
      if (!authUrl.value.trim() || !chatUrl.value.trim() || !username.value.trim() || !password.value.trim()) {
        showError('Заполните все поля для кастомного API!');
        return;
      }
    }

    const settingsData = {
      provider: currentProvider,
      model: currentModel,
      systemPrompt: systemPrompt.value.trim()
    };

    if (currentProvider === 'openai') {
      settingsData.apiUrl = openaiUrl.value.trim();
      settingsData.apiKey = openaiKey.value.trim();
      settingsData.customEndpointFormat = 'openai';
    } else if (currentProvider === 'gemini') {
      settingsData.apiUrl = geminiUrl.value.trim();
      settingsData.apiKey = geminiKey.value.trim();
      settingsData.customEndpointFormat = 'gemini';
    } else if (currentProvider === 'custom') {
      settingsData.authUrl = authUrl.value.trim();
      settingsData.chatUrl = chatUrl.value.trim();
      settingsData.username = username.value.trim();
      settingsData.password = password.value.trim();
      settingsData.temperature = parseFloat(temperature.value) || 0.1;
      settingsData.systemRole = systemRole.value.trim() || 'system';
      settingsData.userRole = userRole.value.trim() || 'user';
      settingsData.customEndpointFormat = 'token-auth';
    }

    const syncData = {
      provider: settingsData.provider,
      model: settingsData.model,
      systemPrompt: settingsData.systemPrompt,
      customEndpointFormat: settingsData.customEndpointFormat
    };

    const localData = {};

    if (currentProvider === 'openai') {
      syncData.apiUrl = settingsData.apiUrl;
      localData.apiKey = settingsData.apiKey;
    } else if (currentProvider === 'gemini') {
      syncData.apiUrl = settingsData.apiUrl;
      localData.apiKey = settingsData.apiKey;
    } else if (currentProvider === 'custom') {
      syncData.authUrl = settingsData.authUrl;
      syncData.chatUrl = settingsData.chatUrl;
      syncData.username = settingsData.username;
      syncData.temperature = settingsData.temperature;
      syncData.systemRole = settingsData.systemRole;
      syncData.userRole = settingsData.userRole;
      localData.password = settingsData.password;
    }

    if (typeof chrome === 'undefined' || !chrome.storage) {
      showError('Chrome storage APIs недоступны. Убедитесь, что страница открыта через расширение.');
      return;
    }
    
    chrome.storage.sync.set(syncData, () => {
      chrome.storage.local.set(localData, () => {
        showSuccess('Настройки сохранены и будут сохранены при обновлениях!');
      });
    });
  });

  function showError(message) {
    status.textContent = message;
    status.style.color = 'red';
    setTimeout(() => {
      status.textContent = '';
      status.style.color = '';
    }, 3000);
  }

  function showSuccess(message) {
    status.textContent = message;
    status.style.color = 'green';
    setTimeout(() => {
      status.textContent = '';
      status.style.color = '';
    }, 1500);
  }
});                                                        