// ==UserScript==
// @name         Jira Template Buttons (Minimal)
// ==/UserScript==

(function () {
    const TEMPLATE_KEY = 'jira_template_buttons_template';
    const BUTTONS_CLASS = 'jira-template-buttons-panel';
    const ADD_BTN_ID = 'jira-template-add-btn';
    const SAVE_BTN_ID = 'jira-template-save-btn';

    function log(...args) {
    }

    async function getTemplate() {
        return new Promise((resolve) => {
            chrome.storage.local.get([TEMPLATE_KEY], (data) => {
                resolve(data[TEMPLATE_KEY] || '');
            });
        });
    }

    function setTemplate(val) {
        chrome.storage.local.set({ [TEMPLATE_KEY]: val });
    }

    let cachedDescriptionField = null;
    let lastDOMCheck = 0;
    const DOM_CACHE_TIMEOUT = 1000; // Уменьшено до 1 секунды для лучшего обнаружения переходов

    function findDescriptionFieldGroup() {
        const now = Date.now();
        
        // Проверяем кэш и что элемент все еще в DOM и видим
        if (cachedDescriptionField && 
            (now - lastDOMCheck) < DOM_CACHE_TIMEOUT &&
            document.contains(cachedDescriptionField.textarea) &&
            cachedDescriptionField.textarea.offsetParent !== null) {
            return cachedDescriptionField;
        }

        const groups = document.querySelectorAll('.field-group');
        for (const group of groups) {
            const label = group.querySelector('label[for="description"]');
            const textarea = group.querySelector('textarea#description');
            if (label && textarea && textarea.offsetParent !== null) {
                cachedDescriptionField = { group, textarea };
                lastDOMCheck = now;
                return cachedDescriptionField;
            }
        }
        
        cachedDescriptionField = null;
        return null;
    }

    function isTinyMCEActive(textarea) {
        // Проверяем, есть ли активный TinyMCE для этого textarea
        if (!window.tinymce || !window.tinymce.editors) return false;
        for (const ed of window.tinymce.editors) {
            if (!ed.iframeElement) continue;
            // Проверяем, связан ли редактор с нужным textarea
            if (ed.id === textarea.id || (ed.iframeElement && ed.iframeElement.closest('.field-group') === textarea.closest('.field-group'))) {
                // Проверяем, что редактор видим и активен
                if (!ed.destroyed && ed.initialized && ed.iframeElement.offsetParent !== null) {
                    return ed;
                }
            }
        }
        return false;
    }

    async function insertTemplateUniversal(textarea) {
        const template = await getTemplate();
        // Попробовать активировать TinyMCE, если он должен быть
        textarea.focus();
        setTimeout(() => {
            if (
                window.tinymce &&
                window.tinymce.activeEditor &&
                !window.tinymce.activeEditor.destroyed &&
                window.tinymce.activeEditor.iframeElement &&
                window.tinymce.activeEditor.iframeElement.closest('.field-group') === textarea.closest('.field-group') &&
                window.tinymce.activeEditor.iframeElement.offsetParent !== null &&
                window.tinymce.activeEditor.mode.get && window.tinymce.activeEditor.mode.get() === 'design'
            ) {
                const ed = window.tinymce.activeEditor;
                ed.focus();
                ed.selection.select(ed.getBody(), true);
                ed.selection.collapse(false); // курсор в конец
                ed.insertContent(template);
                log('Template appended to TinyMCE');
                return;
            }
            // Если TinyMCE не активен — fallback на textarea
            if (textarea.offsetParent !== null) {
                const newValue = textarea.value + (textarea.value ? '\n' : '') + template;
                updateTextareaValue(textarea, newValue);
                log('Template appended to textarea');
                return;
            }
            log('Neither TinyMCE nor textarea is active/visible. Template not inserted.');
        }, 150); // 150 мс — задержка для инициализации TinyMCE
    }

    function saveTemplateUniversal(textarea) {
        const editor = isTinyMCEActive(textarea);
        let value = '';
        if (editor) {
            value = editor.getContent();
            log('Template saved from TinyMCE');
        } else {
            value = textarea.value;
            log('Template saved from textarea');
        }
        setTemplate(value);
    }

    function updateTextareaValue(textarea, value) {
        // Проверяем, есть ли активный TinyMCE для этого textarea
        const editor = isTinyMCEActive(textarea);
        
        if (editor) {
            editor.setContent(value);
            editor.fire('change');
            log('Updated via TinyMCE');
        } else {
            textarea.value = value;
            
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            
            textarea.dispatchEvent(new Event('keyup', { bubbles: true }));
            textarea.dispatchEvent(new Event('blur', { bubbles: true }));
            
            textarea.focus();
            
            log('Updated via textarea with multiple events');
        }
    }

    // --- LLM & History logic ---

    async function loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['apiUrl', 'model', 'systemPrompt', 'jiraTemplate'], (syncData) => {
                chrome.storage.local.get(['apiKey'], (localData) => {
                    resolve({
                        apiUrl: syncData.apiUrl || '',
                        apiKey: localData.apiKey || '',
                        model: syncData.model || 'gpt-3.5-turbo',
                        systemPrompt: syncData.systemPrompt || '',
                        jiraTemplate: syncData.jiraTemplate || ''
                    });
                });
            });
        });
    }

    function showPromptModal(currentPrompt, onSave) {
        // Простое модальное окно для редактирования промпта
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.3)';
        modal.style.zIndex = '9999';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        const box = document.createElement('div');
        box.style.background = '#fff';
        box.style.padding = '24px';
        box.style.borderRadius = '8px';
        box.style.minWidth = '320px';
        box.innerHTML = `<h3>Системный промпт</h3><textarea style="width:100%;height:100px;">${currentPrompt || ''}</textarea><br><button>Сохранить</button> <button type="button">Отмена</button>`;
        const textarea = box.querySelector('textarea');
        const saveBtn = box.querySelector('button');
        const cancelBtn = box.querySelectorAll('button')[1];
        saveBtn.onclick = () => {
            onSave(textarea.value);
            document.body.removeChild(modal);
        };
        cancelBtn.onclick = () => document.body.removeChild(modal);
        modal.appendChild(box);
        document.body.appendChild(modal);
    }

    function showTemplateModal(currentTemplate, onSave) {
        // Простое модальное окно для редактирования шаблона Jira
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.3)';
        modal.style.zIndex = '9999';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        const box = document.createElement('div');
        box.style.background = '#fff';
        box.style.padding = '24px';
        box.style.borderRadius = '8px';
        box.style.minWidth = '400px';
        box.style.maxWidth = '600px';
        box.innerHTML = `<h3>Шаблон Jira</h3><textarea style="width:100%;height:150px;" placeholder="Введите шаблон для few-shot prompting...">${currentTemplate || ''}</textarea><br><button>Сохранить</button> <button type="button">Отмена</button>`;
        const textarea = box.querySelector('textarea');
        const saveBtn = box.querySelector('button');
        const cancelBtn = box.querySelectorAll('button')[1];
        saveBtn.onclick = () => {
            onSave(textarea.value);
            document.body.removeChild(modal);
        };
        cancelBtn.onclick = () => document.body.removeChild(modal);
        modal.appendChild(box);
        document.body.appendChild(modal);
    }

    async function callLLM(prompt, text, textarea) {
        // Показать спиннер
        let spinner = document.createElement('span');
        spinner.textContent = '⏳';
        spinner.style.marginLeft = '8px';
        spinner.className = 'jira-llm-spinner';
        textarea.parentNode.insertBefore(spinner, textarea);
        
        return new Promise((resolve) => {
            // Проверяем, если это тестовая среда (по URL или специальному флагу)
            const isTestMode = window.location.href.includes('test-jira-page.html') || 
                              window.location.protocol === 'file:' ||
                              localStorage.getItem('jira-extension-test-mode') === 'true';
            
            if (isTestMode) {
                setTimeout(() => {
                    if (spinner && spinner.parentNode) {
                        spinner.remove();
                    }
                    
                    const mockResponses = [
                        "✨ Улучшенная версия текста:\n\nВаш текст был обработан и улучшен с помощью мокированного LLM. Это демонстрирует, что функция обновления textarea работает корректно и изменения сразу отображаются в форме.",
                        "🚀 Оптимизированный текст:\n\nТекст переработан для лучшей читаемости и структуры. Добавлены ключевые моменты и улучшена формулировка задачи.",
                        "📝 Переформулированное описание:\n\nОписание задачи структурировано и дополнено важными деталями. Улучшена ясность постановки задачи.",
                        "🎯 Уточненная постановка:\n\nЗадача переформулирована с акцентом на конкретные результаты и критерии приемки. Добавлена структура и логическая последовательность."
                    ];
                    
                    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
                    
                    console.log('[JiraTemplateButtons] Mock LLM response generated');
                    resolve({
                        output: randomResponse,
                        mock: true
                    });
                }, 1500); // Имитируем задержку API
                return;
            }
            
            try {
                chrome.runtime.sendMessage({ type: 'llm', prompt, text }, (response) => {
                    if (spinner && spinner.parentNode) {
                        spinner.remove();
                    }
                    
                    if (chrome.runtime.lastError) {
                        console.error('[JiraTemplateButtons] Runtime error:', chrome.runtime.lastError);
                        alert('Ошибка соединения с расширением: ' + chrome.runtime.lastError.message);
                        resolve(null);
                        return;
                    }
                    
                    if (response && response.success) {
                        resolve(response.data);
                    } else {
                        const errorMsg = response?.error || 'Неизвестная ошибка';
                        console.error('[JiraTemplateButtons] LLM error:', errorMsg);
                        
                        if (response?.debugInfo) {
                            console.error('[DEBUG] Custom API Request Failed:');
                            console.error('[DEBUG] Auth URL:', response.debugInfo.authUrl);
                            console.error('[DEBUG] Chat URL:', response.debugInfo.chatUrl);
                            console.error('[DEBUG] Model:', response.debugInfo.model);
                            console.error('[DEBUG] Error:', response.debugInfo.error);
                            console.error('[DEBUG] Timestamp:', response.debugInfo.timestamp);
                        }
                        
                        alert('Ошибка LLM: ' + errorMsg);
                        resolve(null);
                    }
                });
            } catch (error) {
                if (spinner && spinner.parentNode) {
                    spinner.remove();
                }
                console.error('[JiraTemplateButtons] Call error:', error);
                alert('Ошибка вызова LLM: ' + error.message);
                resolve(null);
            }
        });
    }

    // --- История версий ---
    let history = [];
    let historyIndex = -1;
    let historyLoaded = false;

    async function loadHistory() {
        if (historyLoaded) return;
        
        return new Promise((resolve) => {
            chrome.storage.local.get(['jira-helper-history', 'jira-helper-history-index'], (data) => {
                history = data['jira-helper-history'] || [];
                historyIndex = data['jira-helper-history-index'] || -1;
                historyLoaded = true;
                resolve();
            });
        });
    }

    async function saveVersion(text) {
        await loadHistory();
        
        const MAX_HISTORY = 50;
        history = history.slice(0, historyIndex + 1);
        history.push(text);
        
        if (history.length > MAX_HISTORY) {
            history = history.slice(-MAX_HISTORY);
        }
        
        historyIndex = history.length - 1;
        chrome.storage.local.set({ 
            'jira-helper-history': history, 
            'jira-helper-history-index': historyIndex 
        });
    }

    async function goBack(setDescription) {
        await loadHistory();
        
        if (historyIndex > 0) {
            historyIndex--;
            setDescription(history[historyIndex]);
            chrome.storage.local.set({ 'jira-helper-history-index': historyIndex });
        }
    }

    async function goForward(setDescription) {
        await loadHistory();
        
        if (historyIndex < history.length - 1) {
            historyIndex++;
            setDescription(history[historyIndex]);
            chrome.storage.local.set({ 'jira-helper-history-index': historyIndex });
        }
    }

    // --- Кнопки ---
    function createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = text;
        btn.style.marginRight = '8px';
        btn.onclick = onClick;
        return btn;
    }

    function addLLMButtonsToDescription(textarea, group) {
        if (group.querySelector('.jira-llm-buttons-panel')) return;
        const panel = document.createElement('div');
        panel.className = 'jira-llm-buttons-panel';
        panel.style.margin = '4px 0';

        // Кнопки
        const promptBtn = createButton('🔁 Уточнить системный промпт', async () => {
            const settings = await loadSettings();
            showPromptModal(settings.systemPrompt, (newPrompt) => {
                chrome.storage.sync.set({ systemPrompt: newPrompt });
            });
        });
        const templateBtn = createButton('📝 Уточнить шаблон', async () => {
            const settings = await loadSettings();
            showTemplateModal(settings.jiraTemplate, (newTemplate) => {
                chrome.storage.sync.set({ jiraTemplate: newTemplate });
            });
        });
        const improveBtn = createButton('⚙️ Улучшить постановку', async () => {
            try {
                const settings = await loadSettings();
                const text = textarea.value;
                const prompt = settings.systemPrompt || '';
                
                if (!text.trim()) {
                    alert('Введите текст для улучшения');
                    return;
                }
                
                const result = await callLLM(prompt, text, textarea);
                if (result && result.output) {
                    updateTextareaValue(textarea, result.output);
                    await saveVersion(result.output);
                }
            } catch (error) {
                console.error('[JiraTemplateButtons] Improve error:', error);
                alert('Ошибка при улучшении текста: ' + error.message);
            }
        });
        const backBtn = createButton('⬅️ Назад', async () => {
            try {
                await goBack((ver) => {
                    updateTextareaValue(textarea, ver);
                });
            } catch (error) {
                console.error('[JiraTemplateButtons] History back error:', error);
            }
        });
        const forwardBtn = createButton('➡️ Вперед', async () => {
            try {
                await goForward((ver) => {
                    updateTextareaValue(textarea, ver);
                });
            } catch (error) {
                console.error('[JiraTemplateButtons] History forward error:', error);
            }
        });

        panel.append(promptBtn, templateBtn, improveBtn, backBtn, forwardBtn);
        textarea.parentNode.insertBefore(panel, textarea);
    }

    // --- Встраивание в существующую механику ---
    function addButtonsToDescription() {
        const found = findDescriptionFieldGroup();
        if (!found) return;
        const { group, textarea } = found;
        addLLMButtonsToDescription(textarea, group);
    }

    function init() {
        log('Init called');
        addButtonsToDescription();
    }

    // Debounced MutationObserver для динамических изменений
    let initTimeout;
    const debouncedInit = () => {
        clearTimeout(initTimeout);
        initTimeout = setTimeout(() => {
            cachedDescriptionField = null;
            init();
        }, 300);
    };
    
    const observer = new MutationObserver(debouncedInit);
    observer.observe(document.body, { childList: true, subtree: true });

    // Первый запуск
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(init, 1000);
    });
    setTimeout(init, 2000);

    log('Jira Template Buttons script loaded');
})();
