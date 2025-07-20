// ==UserScript==
// @name         Jira Template Buttons (Minimal)
// ==/UserScript==

(function () {
    const TEMPLATE_KEY = 'jira_template_buttons_template';
    const BUTTONS_CLASS = 'jira-template-buttons-panel';
    const ADD_BTN_ID = 'jira-template-add-btn';
    const SAVE_BTN_ID = 'jira-template-save-btn';

    function log(...args) {
        console.log('[JiraTemplateButtons]', ...args);
    }

    function getTemplate() {
        return localStorage.getItem(TEMPLATE_KEY) || '';
    }

    function setTemplate(val) {
        localStorage.setItem(TEMPLATE_KEY, val);
    }

    function findDescriptionFieldGroup() {
        const groups = document.querySelectorAll('.field-group');
        for (const group of groups) {
            const label = group.querySelector('label[for="description"]');
            const textarea = group.querySelector('textarea#description');
            if (label && textarea) {
                return { group, textarea };
            }
        }
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

    function insertTemplateUniversal(textarea) {
        const template = getTemplate();
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
                textarea.value += (textarea.value ? '\n' : '') + template;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
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

    // --- LLM & History logic ---

    async function loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['apiUrl', 'apiKey', 'model', 'systemPrompt'], (data) => {
                resolve({
                    apiUrl: data.apiUrl || '',
                    apiKey: data.apiKey || '',
                    model: data.model || 'gpt-3.5-turbo',
                    systemPrompt: data.systemPrompt || ''
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

    async function callLLM(prompt, text, textarea) {
        // Показать спиннер
        let spinner = document.createElement('span');
        spinner.textContent = '⏳';
        spinner.style.marginLeft = '8px';
        textarea.parentNode.insertBefore(spinner, textarea);
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'llm', prompt, text }, (response) => {
                spinner.remove();
                if (response && response.success) {
                    resolve(response.data);
                } else {
                    alert('Ошибка LLM: ' + (response && response.error ? response.error : 'Unknown error'));
                    resolve(null);
                }
            });
        });
    }

    // --- История версий ---
    let history = [];
    let historyIndex = -1;

    function saveVersion(text) {
        history = history.slice(0, historyIndex + 1);
        history.push(text);
        historyIndex = history.length - 1;
        chrome.storage.local.set({ 'jira-helper-history': history, 'jira-helper-history-index': historyIndex });
    }

    function goBack(setDescription) {
        if (historyIndex > 0) {
            historyIndex--;
            setDescription(history[historyIndex]);
            chrome.storage.local.set({ 'jira-helper-history-index': historyIndex });
        }
    }

    function goForward(setDescription) {
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
                chrome.storage.local.set({ systemPrompt: newPrompt });
            });
        });
        const improveBtn = createButton('⚙️ Улучшить постановку', async () => {
            const settings = await loadSettings();
            const text = textarea.value;
            const prompt = settings.systemPrompt || '';
            const result = await callLLM(prompt, text, textarea);
            if (result && result.output) {
                const newText = `Вход:\n${text}\n\nВыход:\n${result.output}`;
                textarea.value = newText;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                saveVersion(newText);
            }
        });
        const backBtn = createButton('⬅️ Назад', () => {
            goBack((ver) => {
                textarea.value = ver;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });
        const forwardBtn = createButton('➡️ Вперед', () => {
            goForward((ver) => {
                textarea.value = ver;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });

        panel.append(promptBtn, improveBtn, backBtn, forwardBtn);
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

    // MutationObserver для динамических изменений
    const observer = new MutationObserver(() => {
        init();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Первый запуск
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(init, 1000);
    });
    setTimeout(init, 2000);

    log('Jira Template Buttons script loaded');
})();
