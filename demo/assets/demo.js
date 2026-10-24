const $ = globalThis.fQuery;
const { Editor } = globalThis.UI;
const themeKey = 'frostui-editor-demo-theme';

const setTheme = (theme) => {
    if (theme === 'system') {
        document.documentElement.removeAttribute('data-ui-theme');
    } else {
        document.documentElement.setAttribute('data-ui-theme', theme);
    }
    document.querySelector('#demo-theme').value = theme;
};

const logEvent = (message) => {
    const log = document.querySelector('#event-log');
    const entry = document.createElement('div');
    entry.className = 'small font-monospace py-2 border-bottom';
    entry.textContent = message;
    log.append(entry);
    while (log.children.length > 50) {
        log.firstElementChild.remove();
    }
    log.scrollTop = log.scrollHeight;
};

$.ready(() => {
    let storedTheme;
    try {
        storedTheme = localStorage.getItem(themeKey);
    } catch {
        // Theme controls still work when storage is unavailable.
    }
    const requestedTheme = new URLSearchParams(location.search).get('theme') || storedTheme;
    setTheme(['light', 'dark'].includes(requestedTheme) ? requestedTheme : 'system');
    document.querySelector('#demo-theme').addEventListener('change', (event) => {
        const theme = event.currentTarget.value;
        setTheme(theme);
        try {
            localStorage.setItem(themeKey, theme);
        } catch {
            // Keep the selected theme for this page.
        }
    });

    Editor.plugins.greeting = {
        content: 'Hello',
        title: 'Insert greeting',
        action() {
            this.insertText('Hello from a custom plugin! ');
        },
    };
    Editor.init(document.querySelector('#compact-editor'), {
        buttons: [['bold', 'italic', 'underline'], ['source']],
    });
    Editor.init(document.querySelector('#custom-editor'), {
        buttons: [
            ['style', 'font', 'fontSize', 'color'],
            ['bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'removeFormat'],
            ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'],
            ['unorderedList', 'orderedList', 'indent', 'outdent', 'hr'],
            ['greeting', 'undo', 'redo', 'source'],
        ],
    });

    Editor.init(document.querySelector('#upload-editor'), {
        async imageUpload(files) {
            const status = document.querySelector('#upload-status');
            status.textContent = 'Reading images…';
            let inserted = 0;
            try {
                for (const file of files) {
                    if (!/^image\/(png|jpeg|gif|webp|avif)$/.test(file.type)) {
                        throw new Error('Choose a PNG, JPEG, GIF, WebP, or AVIF image.');
                    }
                    // Simulate a service delay, then use the default cancellable uploader.
                    await new Promise((resolve) => setTimeout(resolve, 300));
                    if (!this.node) {
                        return;
                    }
                    await Editor.defaults.imageUpload.call(this, [file]);
                    if (!this.node) {
                        return;
                    }
                    inserted++;
                }
                status.textContent = `Inserted ${inserted} image(s). No files were sent to a server.`;
            } catch (error) {
                if (this.node) {
                    status.textContent = `Image upload failed: ${error.message}`;
                }
            }
        },
    });

    const methodNode = document.querySelector('#methods-editor');
    $.addEvent(methodNode, 'init.ui.editor change.ui.editor focus.ui.editor blur.ui.editor', (event) => {
        logEvent(`${event.type}.ui.editor — ${methodNode.value}`);
    });
    // Explicit initialization is required; data attributes only configure options.
    $('[data-demo-editor]').editor();
    let methodInstance = Editor.init(methodNode);

    document.querySelector('#document-form').addEventListener('submit', (event) => {
        event.preventDefault();
        const value = new FormData(event.currentTarget).get('document');
        document.querySelector('#form-output').textContent = value === null ?
            'The disabled document is omitted from FormData.' : value;
    });
    document.querySelector('#document-form').addEventListener('reset', () => {
        document.querySelector('#form-output').textContent = 'Reset to the original document.';
    });
    document.querySelector('#toggle-disabled').addEventListener('click', (event) => {
        const fieldset = document.querySelector('#document-fieldset');
        fieldset.disabled = !fieldset.disabled;
        event.currentTarget.textContent = fieldset.disabled ? 'Enable fieldset' : 'Disable fieldset';
    });
    document.querySelector('#clear-log').addEventListener('click', () => {
        document.querySelector('#event-log').replaceChildren();
    });
    for (const button of document.querySelectorAll('[data-demo-method]')) {
        // Preserve the editing selection when invoking a method with the pointer.
        button.addEventListener('mousedown', (event) => event.preventDefault());
        button.addEventListener('click', () => {
            const method = button.dataset.demoMethod;
            const output = document.querySelector('#method-output');
            if (method === 'init') {
                methodInstance = Editor.init(methodNode);
                output.textContent = 'Initialized.';
                return;
            }
            if (!methodInstance) {
                output.textContent = 'Use Init to create an instance first.';
                return;
            }
            if (method === 'dispose') {
                methodInstance.dispose();
                methodInstance = null;
                output.textContent = 'Disposed. The native textarea is restored.';
                return;
            }
            if (method === 'refresh') {
                methodNode.value = '<h2>Loaded with refresh()</h2><p>A programmatic update.</p>';
            }
            methodInstance[method](...(method === 'insertText' ? ['Text from the API. '] : []));
            output.textContent = `${method}() called.`;
        });
    }
});
