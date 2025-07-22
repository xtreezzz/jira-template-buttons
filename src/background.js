chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'llm') {
    chrome.storage.sync.get([
      'apiUrl', 'model', 'systemPrompt', 'jiraTemplate', 'customEndpointFormat', 'customAuthType',
      'authUrl', 'chatUrl', 'username', 'temperature', 'systemRole', 'userRole'
    ], async (syncData) => {
      chrome.storage.local.get(['apiKey', 'password'], async (localData) => {
        const settings = { ...syncData, ...localData };
        
        let enhancedPrompt = message.prompt || '';
        if (settings.jiraTemplate && settings.jiraTemplate.trim()) {
          enhancedPrompt = `${enhancedPrompt}\n\nПример хорошо оформленной Jira задачи:\n${settings.jiraTemplate.trim()}\n\nИспользуйте этот пример как образец для форматирования и структуры.`;
        }
        
      try {
        if (settings.customEndpointFormat === 'token-auth') {
          if (!settings.model) {
            throw new Error('Модель должна быть настроена');
          }
        } else {
          if (!settings.apiKey || !settings.model) {
            throw new Error('API ключ и модель должны быть настроены');
          }
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
              { role: 'system', content: enhancedPrompt },
              { role: 'user', content: message.text || '' }
            ]
          };
        } else if (settings.model.startsWith('gemini-')) {
          provider = 'gemini';
          const baseUrl = settings.apiUrl || 'https://generativelanguage.googleapis.com/v1beta';
          endpoint = `${baseUrl}/models/${settings.model}:generateContent?key=${settings.apiKey}`;
          const promptText = (enhancedPrompt ? enhancedPrompt + '\n' : '') + (message.text || '');
          body = {
            contents: [
              { parts: [ { text: promptText } ] }
            ]
          };
        } else {
          provider = 'custom';
          const format = settings.customEndpointFormat || 'openai';
          
          if (format === 'token-direct') {
            endpoint = settings.chatUrl;
            headers = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${settings.apiKey}`
            };

            const messages = [];
            if (enhancedPrompt) {
              messages.push({ role: settings.systemRole || 'system', content: enhancedPrompt });
            }
            if (message.text) {
              messages.push({ role: settings.userRole || 'user', content: message.text });
            }

            body = {
              model: settings.model,
              temperature: settings.temperature || 0.1,
              messages: messages
            };
          } else if (format === 'token-auth') {
            if (!settings.authUrl || !settings.chatUrl || !settings.username || !settings.password) {
              throw new Error('Для токен-аутентификации необходимо указать authUrl, chatUrl, username и password');
            }

            console.log('[DEBUG] Attempting authentication to:', settings.authUrl);
            
            const authResponse = await fetch(settings.authUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                username: settings.username,
                password: settings.password
              })
            });

            console.log('[DEBUG] Auth response status:', authResponse.status);
            console.log('[DEBUG] Auth response headers:', Object.fromEntries(authResponse.headers.entries()));

            if (!authResponse.ok) {
              const authError = await authResponse.text();
              console.log('[DEBUG] Auth error response:', authError);
              throw new Error(`Ошибка аутентификации (${authResponse.status}): ${authError}`);
            }

            const authData = await authResponse.json();
            console.log('[DEBUG] Auth response data:', { ...authData, access_token: authData.access_token ? '[RECEIVED]' : '[NOT RECEIVED]' });
            const accessToken = authData.access_token;
            
            if (!accessToken) {
              throw new Error('Не удалось получить access_token из ответа аутентификации');
            }

            endpoint = settings.chatUrl;
            headers = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'x-proxy-mask-critical-data': '1'
            };

            const messages = [];
            if (enhancedPrompt) {
              messages.push({ role: settings.systemRole || 'system', content: enhancedPrompt });
            }
            if (message.text) {
              messages.push({ role: settings.userRole || 'user', content: message.text });
            }

            body = {
              model: settings.model,
              temperature: settings.temperature || 0.1,
              messages: messages
            };
          } else {
            endpoint = settings.apiUrl;
            
            if (!endpoint) {
              throw new Error('Для кастомной модели необходимо указать API URL');
            }

            if (format === 'openai' || format === 'openai-compatible') {
              headers['Authorization'] = `Bearer ${settings.apiKey}`;
              body = {
                model: settings.model,
                messages: [
                  { role: 'system', content: enhancedPrompt },
                  { role: 'user', content: message.text || '' }
                ]
              };
            } else if (format === 'custom') {
              headers['Authorization'] = `Bearer ${settings.apiKey}`;
              body = {
                model: settings.model,
                prompt: enhancedPrompt,
                input: message.text || '',
                system_prompt: enhancedPrompt,
                user_input: message.text || ''
              };
            }
          }
        }
        const isDev = chrome.runtime.getManifest().version.includes('dev');
        if (isDev) {
          console.log('[LLM] Provider:', provider);
          console.log('[LLM] Endpoint:', endpoint);
          console.log('[LLM] Headers:', { ...headers, Authorization: headers.Authorization ? '[MASKED]' : undefined });
          console.log('[LLM] Body:', { ...body, key: body.key ? '[MASKED]' : body.key });
        }

        if (settings.customEndpointFormat === 'token-auth') {
          console.log('[DEBUG] Custom API Debug Info:');
          console.log('[DEBUG] Auth URL:', settings.authUrl);
          console.log('[DEBUG] Chat URL:', settings.chatUrl);
          console.log('[DEBUG] Username:', settings.username ? '[SET]' : '[NOT SET]');
          console.log('[DEBUG] Password:', settings.password ? '[SET]' : '[NOT SET]');
          console.log('[DEBUG] Model:', settings.model);
          console.log('[DEBUG] Temperature:', settings.temperature);
          console.log('[DEBUG] System Role:', settings.systemRole);
          console.log('[DEBUG] User Role:', settings.userRole);
          console.log('[DEBUG] System Prompt:', enhancedPrompt ? `"${enhancedPrompt.substring(0, 100)}${enhancedPrompt.length > 100 ? '...' : ''}"` : '[EMPTY]');
          console.log('[DEBUG] User Message:', message.text ? `"${message.text.substring(0, 100)}${message.text.length > 100 ? '...' : ''}"` : '[EMPTY]');
          console.log('[DEBUG] Request Body:', JSON.stringify(body, null, 2));
        }

        console.log('[DEBUG] Making request to:', endpoint);
        console.log('[DEBUG] Request headers:', { ...headers, Authorization: headers.Authorization ? '[MASKED]' : undefined });
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        });

        console.log('[DEBUG] Response status:', response.status);
        console.log('[DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));
        
        if (isDev) {
          console.log('[LLM] Response status:', response.status);
        }

        let data = null;
        try {
          data = await response.clone().json();
        } catch (e) {
          const textData = await response.clone().text();
          console.log('[DEBUG] Response is not JSON, raw text:', textData.substring(0, 500));
          if (isDev) {
            console.log('[LLM] Response is not JSON:', textData);
          }
          throw new Error(`Ответ API не является валидным JSON: ${textData.substring(0, 200)}`);
        }

        console.log('[DEBUG] Response data:', JSON.stringify(data, null, 2));
        
        if (isDev) {
          console.log('[LLM] Response data:', data);
        }

        if (!response.ok) {
          const errorMsg = data?.error?.message || data?.message || JSON.stringify(data);
          console.log('[DEBUG] API Error - Status:', response.status, 'Message:', errorMsg);
          throw new Error(`LLM API error (${response.status}): ${errorMsg}`);
        }

        // Унифицируем ответ для content.js
        let output = '';
        
        if (provider === 'openai' && data?.choices?.[0]?.message?.content) {
          output = data.choices[0].message.content;
        } else if (provider === 'gemini' && data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          output = data.candidates[0].content.parts[0].text;
        } else if (provider === 'custom') {
          if (settings.customEndpointFormat === 'token-auth') {
            output = data.choices?.[0]?.message?.content || '';
            console.log('[DEBUG] Extracted output from token-auth response:', output ? `"${output.substring(0, 100)}${output.length > 100 ? '...' : ''}"` : '[EMPTY]');
          } else {
            output = data.response || data.output || data.text || data.content || 
                     data.choices?.[0]?.message?.content || data.choices?.[0]?.text ||
                     (typeof data === 'string' ? data : '');
          }
        }

        if (!output) {
          console.log('[DEBUG] Failed to extract output. Available response fields:', Object.keys(data || {}));
          throw new Error('Не удалось извлечь ответ из response API. Проверьте формат endpoint\'а.');
        }

        console.log('[DEBUG] Final extracted output:', output ? `"${output.substring(0, 100)}${output.length > 100 ? '...' : ''}"` : '[EMPTY]');

        if (settings.customEndpointFormat === 'token-auth') {
          const debugInfo = {
            authUrl: settings.authUrl,
            chatUrl: settings.chatUrl,
            model: settings.model,
            requestSuccess: true,
            responseStatus: response.status,
            timestamp: new Date().toISOString()
          };
          sendResponse({ success: true, data: { output, raw: data }, debugInfo });
        } else {
          sendResponse({ success: true, data: { output, raw: data } });
        }
      } catch (e) {
        console.error('[LLM] Error:', e);
        if (settings.customEndpointFormat === 'token-auth') {
          const debugInfo = {
            authUrl: settings.authUrl,
            chatUrl: settings.chatUrl,
            model: settings.model,
            error: e.message,
            timestamp: new Date().toISOString()
          };
          sendResponse({ success: false, error: e.message, debugInfo });
        } else {
          sendResponse({ success: false, error: e.message });
        }
      }
      });
    });
    return true; // async response
  }
});                                                                                                                                                                                              