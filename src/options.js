document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');
  const apiUrl = document.getElementById('apiUrl');
  const apiKey = document.getElementById('apiKey');
  const model = document.getElementById('model');
  const systemPrompt = document.getElementById('systemPrompt');
  const status = document.getElementById('status');

  const customEndpointFormat = document.getElementById('customEndpointFormat');

  // Загрузка настроек
  chrome.storage.local.get(['apiUrl', 'apiKey', 'model', 'systemPrompt', 'customEndpointFormat'], (data) => {
    apiUrl.value = data.apiUrl || '';
    apiKey.value = data.apiKey || '';
    model.value = data.model || 'gpt-3.5-turbo';
    systemPrompt.value = data.systemPrompt || '';
    customEndpointFormat.value = data.customEndpointFormat || 'openai';
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
      customEndpointFormat: customEndpointFormat.value
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