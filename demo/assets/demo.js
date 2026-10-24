const $ = globalThis.fQuery;
const { Editor } = globalThis.UI;
const themeKey = 'frostui-editor-demo-theme';

const setTheme = (theme) => {
    if (theme === 'system') {
        $(document.documentElement).removeAttribute('data-ui-theme');
    } else {
        $(document.documentElement).setAttribute('data-ui-theme', theme);
    }

    $('[data-demo-theme]').setValue(theme);
};

const logEvent = (message, className = 'text-body-secondary') => {
    const log = $.findOne('#event-log');
    const entry = $.create('div', {
        class: ['small', 'font-monospace', 'py-2', 'border-bottom', className],
        text: message,
    });

    $.append(log, entry);

    while ($.children(log).length > 50) {
        $.remove($.child(log)[0]);
    }

    $.setScrollY(log, $.height(log, { boxSize: $.SCROLL_BOX }));
};

$.ready(() => {
    let storedTheme;

    try {
        storedTheme = localStorage.getItem(themeKey);
    } catch {
        // The demo remains usable when browser storage is unavailable.
    }

    const requestedTheme = new URLSearchParams(location.search).get('theme');
    const initialTheme = requestedTheme || storedTheme;

    setTheme(['light', 'dark'].includes(initialTheme) ? initialTheme : 'system');

    $('[data-demo-theme]').addEvent('change', (event) => {
        const theme = $.getValue(event.currentTarget);

        setTheme(theme);

        try {
            if (theme === 'system') {
                localStorage.removeItem(themeKey);
            } else {
                localStorage.setItem(themeKey, theme);
            }
        } catch {
            // Theme selection still applies for the current page.
        }
    });

    Editor.plugins.greeting = {
        content: 'Hello',
        title: 'Insert greeting',
        action() {
            this.insertText('Hello from a custom plugin! ');
        },
    };
    Editor.init($.findOne('#compact-editor'), {
        buttons: [['bold', 'italic', 'underline'], ['source']],
    });
    Editor.init($.findOne('#custom-editor'), {
        buttons: [
            ['style', 'font', 'fontSize', 'color'],
            ['bold', 'italic', 'underline', 'strikethrough', 'subscript', 'superscript', 'removeFormat'],
            ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify'],
            ['unorderedList', 'orderedList', 'indent', 'outdent', 'hr'],
            ['greeting', 'undo', 'redo', 'source'],
        ],
    });

    Editor.init($.findOne('#upload-editor'), {
        async imageUpload(files) {
            const status = $.findOne('#upload-status');

            $.setText(status, 'Reading images…');

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

                $.setText(status, `Inserted ${inserted} image(s). No files were sent to a server.`);
            } catch (error) {
                if (this.node) {
                    $.setText(status, `Image upload failed: ${error.message}`);
                }
            }
        },
    });

    const methodNode = $.findOne('#methods-editor');

    $.addEvent(methodNode, 'init.ui.editor change.ui.editor focus.ui.editor blur.ui.editor', (event) => {
        logEvent(`${event.type}.ui.editor — ${$.getValue(methodNode)}`);
    });
    // Explicit initialization is required; data attributes only configure options.
    $('[data-demo-editor]').editor();

    let methodInstance = Editor.init(methodNode);

    $('#document-form').addEvent('submit', (event) => {
        event.preventDefault();

        const value = new FormData(event.currentTarget).get('document');

        $('#form-output').setText(value === null ?
            'The disabled document is omitted from FormData.' : value);
    });
    $('#document-form').addEvent('reset', () => {
        $('#form-output').setText('Reset to the original document.');
    });
    $('#toggle-disabled').addEvent('click', (event) => {
        const fieldset = $.findOne('#document-fieldset');

        const disabled = !$.getProperty(fieldset, 'disabled');

        $.setProperty(fieldset, 'disabled', disabled);
        $.setText(event.currentTarget, disabled ? 'Enable fieldset' : 'Disable fieldset');
    });
    $('#clear-log').addEvent('click', () => {
        $('#event-log').empty();
    });

    for (const button of $.find('[data-demo-method]')) {
        // Preserve the editing selection when invoking a method with the pointer.
        $.addEvent(button, 'mousedown', (event) => event.preventDefault());
        $.addEvent(button, 'click', () => {
            const method = $.getDataset(button, 'demoMethod');
            const output = $.findOne('#method-output');

            if (method === 'init') {
                methodInstance = Editor.init(methodNode);
                $.setText(output, 'Initialized.');

                return;
            }

            if (!methodInstance) {
                $.setText(output, 'Use Init to create an instance first.');

                return;
            }

            if (method === 'dispose') {
                methodInstance.dispose();
                methodInstance = null;
                $.setText(output, 'Disposed. The native textarea is restored.');

                return;
            }

            if (method === 'refresh') {
                $.setValue(methodNode, '<h2>Loaded with refresh()</h2><p>A programmatic update.</p>');
            }

            methodInstance[method](...(method === 'insertText' ? ['Text from the API. '] : []));
            $.setText(output, `${method}() called.`);
        });
    }
});
