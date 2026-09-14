// Shared TOML editor: highlighted text, synchronized scrolling and line comments.
(function() {
    const escape = text => text.replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    } [c]));

    function highlight(source) {
        let result = '',
            i = 0;
        const token = (type, text) => `<span class="toml-${type}">${escape(text)}</span>`;
        while (i < source.length) {
            const rest = source.slice(i);
            const key = /^(?:[A-Za-z_][\w.-]*|"[^"\n]+"|'[^'\n]+')(?=\s*=)/.exec(rest);
            if (key) {
                result += token('key', key[0]);
                i += key[0].length;
                continue;
            }
            if (rest[0] === '#') {
                const end = source.indexOf('\n', i);
                const text = source.slice(i, end < 0 ? source.length : end);
                result += token('comment', text);
                i += text.length;
                continue;
            }
            if (rest[0] === '"' || rest[0] === "'") {
                const quote = rest[0],
                    triple = rest.startsWith(quote.repeat(3));
                const delimiter = triple ? quote.repeat(3) : quote;
                let end = i + delimiter.length;
                while (end < source.length) {
                    if (quote === '"' && source[end] === '\\') {
                        end += 2;
                        continue;
                    }
                    if (source.startsWith(delimiter, end)) {
                        end += delimiter.length;
                        break;
                    }
                    end++;
                }
                result += token('string', source.slice(i, end));
                i = end;
                continue;
            }
            const section = (i === 0 || source[i - 1] === '\n') && /^[ \t]*\[\[?[A-Za-z_][\w.-]*\]\]?/.exec(rest);
            if (section) {
                result += token('section', section[0]);
                i += section[0].length;
                continue;
            }
            const value = /^(?:true|false)\b|^[+-]?(?:\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?|inf|nan)\b/.exec(rest);
            if (value) {
                result += token(/true|false/.test(value[0]) ? 'boolean' : 'number', value[0]);
                i += value[0].length;
                continue;
            }
            result += escape(source[i++]);
        }
        return result;
    }

    function selectedLines(text, start, end) {
        const first = start === 0 ? 0 : text.lastIndexOf('\n', start - 1) + 1;
        const effectiveEnd = end > start && text[end - 1] === '\n' ? end - 1 : end;
        const next = text.indexOf('\n', effectiveEnd),
            last = next < 0 ? text.length : next;
        const lines = text.slice(first, last).split('\n');
        return {first, last, lines};
    }

    function commentMode(text, start, end) {
        const meaningful = selectedLines(text, start, end).lines.filter(line => line.trim());
        return meaningful.length > 0 && meaningful.every(line => /^\s*#/.test(line)) ? 'uncomment' : 'comment';
    }

    function commentSelection(text, start, end, mode = 'toggle') {
        const {first, last, lines} = selectedLines(text, start, end);
        const meaningful = lines.filter(line => line.trim());
        const uncomment = mode === 'uncomment' || (mode === 'toggle' && meaningful.length > 0 && meaningful.every(line => /^\s*#/.test(line)));
        const replacement = lines.map(line => !line.trim() ? line : uncomment ? line.replace(/^(\s*)# ?/, '$1') : line.replace(/^(\s*)/, '$1# ')).join('\n');
        return {
            text: text.slice(0, first) + replacement + text.slice(last),
            start: first,
            end: first + replacement.length
        };
    }

    function create(value, label, onChange) {
        const wrapper = document.createElement('section');
        wrapper.className = 'toml-editor';
        const toolbar = document.createElement('div');
        toolbar.className = 'toml-toolbar';
        const surface = document.createElement('div');
        surface.className = 'toml-surface';
        const pre = document.createElement('pre');
        pre.className = 'toml-highlight';
        pre.setAttribute('aria-hidden', 'true');
        const area = document.createElement('textarea');
        area.className = 'code-editor';
        area.value = value;
        area.spellcheck = false;
        area.wrap = 'off';
        area.setAttribute('aria-label', label);
        const button = document.createElement('button');
        button.type = 'button';
        const updateButton = () => {
            button.textContent = commentMode(area.value, area.selectionStart, area.selectionEnd) === 'uncomment' ? '# 解除注释' : '# 注释';
        };
        const update = () => {
            pre.innerHTML = highlight(area.value) + '\n';
            pre.scrollTop = area.scrollTop;
            pre.scrollLeft = area.scrollLeft;
            updateButton();
        };
        const change = () => {
            update();
            onChange(area.value);
        };
        const apply = mode => {
            const scrollPositions = [];
            for (let el = area; el; el = el.parentElement) scrollPositions.push([el, el.scrollTop, el.scrollLeft]);
            const next = commentSelection(area.value, area.selectionStart, area.selectionEnd, mode);
            area.value = next.text;
            area.focus({preventScroll: true});
            area.setSelectionRange(next.start, next.end);
            change();
            for (const [el, top, left] of scrollPositions) {
                el.scrollTop = top;
                el.scrollLeft = left;
            }
            update();
        };
        button.onmousedown = event => event.preventDefault();
        button.onclick = () => apply('toggle');
        toolbar.append(button);
        const hint = document.createElement('span');
        hint.textContent = 'TOML · Ctrl / 切换注释';
        toolbar.append(hint);
        area.addEventListener('input', change);
        area.addEventListener('scroll', update);
        for (const event of ['select', 'selectionchange', 'keyup', 'mouseup', 'focus']) area.addEventListener(event, updateButton);
        area.addEventListener('keydown', event => {
            if ((event.ctrlKey || event.metaKey) && event.key === '/') {
                event.preventDefault();
                event.stopPropagation();
                apply('toggle');
            } else if (event.key === 'Tab') {
                event.preventDefault();
                area.setRangeText('  ', area.selectionStart, area.selectionEnd, 'end');
                change();
            }
        });
        surface.append(pre, area);
        wrapper.append(toolbar, surface);
        update();
        return wrapper;
    }
    globalThis.RazorToml = {
        highlight,
        commentSelection,
        commentMode,
        create
    };
})();
