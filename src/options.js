document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('settings-form');
  const apiUrl = document.getElementById('apiUrl');
  const apiKey = document.getElementById('apiKey');
  const model = document.getElementById('model');
  const systemPrompt = document.getElementById('systemPrompt');
  const status = document.getElementById('status');

  // Загрузка настроек
  chrome.storage.local.get(['apiUrl', 'apiKey', 'model', 'systemPrompt'], (data) => {
    apiUrl.value = data.apiUrl || '';
    apiKey.value = data.apiKey || '';
    model.value = data.model || 'gpt-3.5-turbo';
    systemPrompt.value = data.systemPrompt || '';
  });

  // Сохранение настроек
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    chrome.storage.local.set({
      apiUrl: apiUrl.value,
      apiKey: apiKey.value,
      model: model.value,
      systemPrompt: systemPrompt.value
    }, () => {
      status.textContent = 'Сохранено!';
      setTimeout(() => status.textContent = '', 1500);
    });
  });
}); 