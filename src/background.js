chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'llm') {
    chrome.storage.local.get(['apiUrl', 'apiKey', 'model', 'systemPrompt', 'customEndpointFormat'], async (settings) => {
      try {
        if (!settings.apiKey || !settings.model) {
          throw new Error('API ключ и модель должны быть настроены');
        }

        let endpoint = '';
        let headers = { 'Content-Type': 'application/json' };
        let body = {};
        let provider = 'custom';

        // Определяем провайдера и формат запроса
        if (settings.model === 'gpt-4o' || settings.model.startsWith('gpt-')) {
          provider = 'openai';
          endpoint = settings.apiUrl || 'https://api.openai.com/v1/chat/completions';
          headers['Authorization'] = `Bearer ${settings.apiKey}`;
          body = {
            model: settings.model,
            messages: [
              { role: 'system', content: message.prompt || '' },
              { role: 'user', content: message.text || '' }
            ]
          };
        } else if (settings.model.startsWith('gemini-')) {
          provider = 'gemini';
          const baseUrl = settings.apiUrl || 'https://generativelanguage.googleapis.com/v1beta';
          endpoint = `${baseUrl}/models/${settings.model}:generateContent?key=${settings.apiKey}`;
          const promptText = (message.prompt ? message.prompt + '\n' : '') + (message.text || '');
          body = {
            contents: [
              { parts: [ { text: promptText } ] }
            ]
          };
        } else {
          provider = 'custom';
          endpoint = settings.apiUrl;
          
          if (!endpoint) {
            throw new Error('Для кастомной модели необходимо указать API URL');
          }

          const format = settings.customEndpointFormat || 'openai';
          
          if (format === 'openai' || format === 'openai-compatible') {
            headers['Authorization'] = `Bearer ${settings.apiKey}`;
            body = {
              model: settings.model,
              messages: [
                { role: 'system', content: message.prompt || '' },
                { role: 'user', content: message.text || '' }
              ]
            };
          } else if (format === 'ollama') {
            body = {
              model: settings.model,
              prompt: (message.prompt ? message.prompt + '\n\n' : '') + (message.text || ''),
              stream: false
            };
          } else if (format === 'custom') {
            headers['Authorization'] = `Bearer ${settings.apiKey}`;
            body = {
              model: settings.model,
              prompt: message.prompt || '',
              input: message.text || '',
              system_prompt: message.prompt || '',
              user_input: message.text || ''
            };
          }
        }
        const isDev = chrome.runtime.getManifest().version.includes('dev');
        if (isDev) {
          console.log('[LLM] Provider:', provider);
          console.log('[LLM] Endpoint:', endpoint);
          console.log('[LLM] Headers:', { ...headers, Authorization: headers.Authorization ? '[MASKED]' : undefined });
          console.log('[LLM] Body:', { ...body, key: body.key ? '[MASKED]' : body.key });
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        });

        if (isDev) {
          console.log('[LLM] Response status:', response.status);
        }

        let data = null;
        try {
          data = await response.clone().json();
        } catch (e) {
          const textData = await response.clone().text();
          if (isDev) {
            console.log('[LLM] Response is not JSON:', textData);
          }
          throw new Error(`Ответ API не является валидным JSON: ${textData.substring(0, 200)}`);
        }

        if (isDev) {
          console.log('[LLM] Response data:', data);
        }

        if (!response.ok) {
          const errorMsg = data?.error?.message || data?.message || JSON.stringify(data);
          throw new Error(`LLM API error (${response.status}): ${errorMsg}`);
        }

        // Унифицируем ответ для content.js
        let output = '';
        
        if (provider === 'openai' && data?.choices?.[0]?.message?.content) {
          output = data.choices[0].message.content;
        } else if (provider === 'gemini' && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          output = data.candidates[0].content.parts[0].text;
        } else if (provider === 'custom') {
          output = data.response || data.output || data.text || data.content || 
                   data.choices?.[0]?.message?.content || data.choices?.[0]?.text ||
                   (typeof data === 'string' ? data : '');
        }

        if (!output) {
          throw new Error('Не удалось извлечь ответ из response API. Проверьте формат endpoint\'а.');
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