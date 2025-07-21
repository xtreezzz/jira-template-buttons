document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');
  const apiUrl = document.getElementById('apiUrl');
  const apiKey = document.getElementById('apiKey');
  const model = document.getElementById('model');
  const systemPrompt = document.getElementById('systemPrompt');
  const status = document.getElementById('status');

  const customEndpointFormat = document.getElementById('customEndpointFormat');
  const tokenAuthFields = document.getElementById('tokenAuthFields');
  const authUrl = document.getElementById('authUrl');
  const chatUrl = document.getElementById('chatUrl');
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const temperature = document.getElementById('temperature');
  const systemRole = document.getElementById('systemRole');
  const userRole = document.getElementById('userRole');

  function toggleTokenAuthFields() {
    if (customEndpointFormat.value === 'token-auth') {
      tokenAuthFields.style.display = 'block';
    } else {
      tokenAuthFields.style.display = 'none';
    }
  }

  customEndpointFormat.addEventListener('change', toggleTokenAuthFields);

  // Загрузка настроек
  chrome.storage.local.get([
    'apiUrl', 'apiKey', 'model', 'systemPrompt', 'customEndpointFormat',
    'authUrl', 'chatUrl', 'username', 'password', 'temperature', 'systemRole', 'userRole'
  ], (data) => {
    apiUrl.value = data.apiUrl || '';
    apiKey.value = data.apiKey || '';
    model.value = data.model || 'gpt-3.5-turbo';
    systemPrompt.value = data.systemPrompt || '';
    customEndpointFormat.value = data.customEndpointFormat || 'openai';
    authUrl.value = data.authUrl || '';
    chatUrl.value = data.chatUrl || '';
    username.value = data.username || '';
    password.value = data.password || '';
    temperature.value = data.temperature || 0.1;
    systemRole.value = data.systemRole || 'system';
    userRole.value = data.userRole || 'user';
    toggleTokenAuthFields();
  });

  // Сохранение настроек
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!apiKey.value.trim()) {
      status.textContent = 'API ключ обязателен!';
      status.style.color = 'red';
      setTimeout(() => {
        status.textContent = '';
        status.style.color = '';
      }, 3000);
      return;
    }
    
    if (!model.value.trim()) {
      status.textContent = 'Модель обязательна!';
      status.style.color = 'red';
      setTimeout(() => {
        status.textContent = '';
        status.style.color = '';
      }, 3000);
      return;
    }

    chrome.storage.local.set({
      apiUrl: apiUrl.value.trim(),
      apiKey: apiKey.value.trim(),
      model: model.value.trim(),
      systemPrompt: systemPrompt.value.trim(),
      customEndpointFormat: customEndpointFormat.value,
      authUrl: authUrl.value.trim(),
      chatUrl: chatUrl.value.trim(),
      username: username.value.trim(),
      password: password.value.trim(),
      temperature: parseFloat(temperature.value) || 0.1,
      systemRole: systemRole.value.trim() || 'system',
      userRole: userRole.value.trim() || 'user'
    }, () => {
      status.textContent = 'Сохранено!';
      status.style.color = 'green';
      setTimeout(() => {
        status.textContent = '';
        status.style.color = '';
      }, 1500);
    });
  });
});    