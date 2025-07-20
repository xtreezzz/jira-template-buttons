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

    function addButtonsToDescription() {
        const found = findDescriptionFieldGroup();
        if (!found) return;
        const { group, textarea } = found;
        if (group.querySelector('.' + BUTTONS_CLASS)) return;

        const panel = document.createElement('div');
        panel.className = BUTTONS_CLASS;
        panel.style.margin = '4px 0';

        const addBtn = document.createElement('button');
        addBtn.id = ADD_BTN_ID;
        addBtn.type = 'button';
        addBtn.textContent = 'Add template';
        addBtn.style.marginRight = '8px';
        addBtn.onclick = (e) => {
            e.preventDefault();
            insertTemplateUniversal(textarea);
        };

        const saveBtn = document.createElement('button');
        saveBtn.id = SAVE_BTN_ID;
        saveBtn.type = 'button';
        saveBtn.textContent = 'Save template';
        saveBtn.onclick = (e) => {
            e.preventDefault();
            saveTemplateUniversal(textarea);
        };

        panel.appendChild(addBtn);
        panel.appendChild(saveBtn);

        // Вставляем панель перед textarea
        textarea.parentNode.insertBefore(panel, textarea);
        log('Buttons added to description field-group');
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
