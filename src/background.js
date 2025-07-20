chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'llm') {
    chrome.storage.local.get(['apiUrl', 'apiKey', 'model', 'systemPrompt'], async (settings) => {
      try {
        let endpoint = '';
        let headers = { 'Content-Type': 'application/json' };
        let body = {};
        let isOpenAI = false;
        let isGemini = false;
        // Определяем провайдера по модели
        if (settings.model === 'gpt-4o') {
          isOpenAI = true;
          endpoint = 'https://api.openai.com/v1/chat/completions';
          headers['Authorization'] = `Bearer ${settings.apiKey}`;
          body = {
            model: settings.model,
            messages: [
              { role: 'system', content: message.prompt || '' },
              { role: 'user', content: message.text || '' }
            ]
          };
        } else if (settings.model === 'gemini-2.0-flash') {
          isGemini = true;
          endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${settings.apiKey}`;
          const promptText = (message.prompt ? message.prompt + '\n' : '') + (message.text || '');
          body = {
            contents: [
              { parts: [ { text: promptText } ] }
            ]
          };
        } else if (settings.model === 'gemini-2.5-flash' || settings.model === 'gemini-pro') {
          isGemini = true;
          endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${settings.model}:generateContent?key=${settings.apiKey}`;
          const promptText = (message.prompt ? message.prompt + '\n' : '') + (message.text || '');
          body = {
            contents: [
              { parts: [ { text: promptText } ] }
            ]
          };
        } else {
          // fallback: использовать то, что указано в настройках
          endpoint = settings.apiUrl;
          headers['Authorization'] = `Bearer ${settings.apiKey}`;
          body = {
            model: settings.model,
            prompt: message.prompt,
            input: message.text
          };
        }
        console.log('[LLM] Provider:', isOpenAI ? 'OpenAI' : isGemini ? 'Gemini' : 'Custom');
        console.log('[LLM] Endpoint:', endpoint);
        console.log('[LLM] Headers:', headers);
        console.log('[LLM] Body:', body);
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        });
        console.log('[LLM] Response status:', response.status);
        let data = null;
        try {
          data = await response.clone().json();
        } catch (e) {
          data = await response.clone().text();
        }
        console.log('[LLM] Response data:', data);
        if (!response.ok) throw new Error('LLM API error: ' + JSON.stringify(data));
        // Унифицируем ответ для content.js
        let output = '';
        if (isOpenAI && data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
          output = data.choices[0].message.content;
        } else if (isGemini && data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) {
          output = data.candidates[0].content.parts[0].text;
        } else if (data && data.output) {
          output = data.output;
        }
        sendResponse({ success: true, data: { output, raw: data } });
      } catch (e) {
        console.error('[LLM] Error:', e);
        sendResponse({ success: false, error: e.message });
      }
    });
    return true; // async response
  }
}); 