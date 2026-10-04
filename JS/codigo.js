// Código con colores.
// Parte de la lógica de la app: los archivos de JS/ se cargan en el orden de
// index.html y comparten el ámbito global (ver CLAUDE.md).

// ==========================================
// CÓDIGO CON COLORES
// Resaltado propio (sin librerías, funciona sin internet): tokenizeCode()
// separa el código en piezas (palabra clave, texto, comentario, número...)
// y la vista previa y el Word les dan color. El lenguaje se elige en la
// tarjeta o se detecta solo (detectCodeLanguage).
// ==========================================

const CODE_LANGUAGES = {
    auto: { label: 'Detectar solo' },
    python: {
        label: 'Python', line: ['#'], block: [], strings: ['\"\"\"', "'''", '"', "'"], decorators: true,
        keywords: 'and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case None True False self',
        builtins: 'print len range int float str list dict set tuple bool input open type isinstance enumerate zip map filter sum min max abs round sorted reversed super object Exception ValueError TypeError KeyError'
    },
    javascript: {
        label: 'JavaScript / TypeScript', line: ['//'], block: [['/*', '*/']], strings: ['`', '"', "'"], decorators: true,
        keywords: 'break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return super switch this throw try typeof var void while with yield async await static get set null undefined true false interface type enum implements public private protected readonly as',
        builtins: 'console document window Math JSON Array Object String Number Boolean Promise Map Set Date RegExp Error parseInt parseFloat setTimeout fetch require module exports any string number boolean void never unknown'
    },
    java: {
        label: 'Java', line: ['//'], block: [['/*', '*/']], strings: ['"', "'"], decorators: true, typeCase: true,
        keywords: 'abstract assert break case catch class continue default do else enum extends final finally for if implements import instanceof interface native new package private protected public return static super switch synchronized this throw throws transient try volatile while var record true false null',
        builtins: 'int long short byte float double char boolean void String System Integer Double List ArrayList Map HashMap Scanner Math Object'
    },
    c: {
        label: 'C', line: ['//'], block: [['/*', '*/']], strings: ['"', "'"], preprocessor: true,
        keywords: 'auto break case const continue default do else enum extern for goto if inline register restrict return sizeof static struct switch typedef union volatile while NULL true false',
        builtins: 'int long short char float double void unsigned signed bool size_t FILE printf scanf malloc free puts gets strlen strcpy'
    },
    cpp: {
        label: 'C++', line: ['//'], block: [['/*', '*/']], strings: ['"', "'"], preprocessor: true, typeCase: true,
        keywords: 'alignas auto break case catch class const constexpr continue default delete do else enum explicit export extern for friend goto if inline mutable namespace new noexcept nullptr operator private protected public return sizeof static struct switch template this throw try typedef typename union using virtual volatile while true false',
        builtins: 'int long short char float double void unsigned signed bool string vector map set std cout cin endl size_t printf'
    },
    csharp: {
        label: 'C#', line: ['//'], block: [['/*', '*/']], strings: ['"', "'"], typeCase: true,
        keywords: 'abstract as base break case catch class const continue default delegate do else enum event explicit extern finally fixed for foreach goto if implicit in interface internal is lock namespace new operator out override params private protected public readonly ref return sealed sizeof static struct switch this throw try typeof unchecked unsafe using virtual void volatile while var async await get set true false null',
        builtins: 'int long short byte float double decimal char bool string object Console List Dictionary Math Task'
    },
    php: {
        label: 'PHP', line: ['//', '#'], block: [['/*', '*/']], strings: ['"', "'"], variables: true,
        keywords: 'abstract and array as break case catch class clone const continue declare default do echo else elseif empty endif endforeach endwhile extends final finally fn for foreach function global if implements include include_once instanceof interface isset list namespace new or print private protected public require require_once return static switch throw trait try unset use var while yield true false null',
        builtins: 'strlen count array_push array_map explode implode str_replace json_encode json_decode isset print_r var_dump'
    },
    sql: {
        label: 'SQL', line: ['--'], block: [['/*', '*/']], strings: ["'", '"'], caseInsensitive: true,
        keywords: 'select from where insert into values update set delete create table alter drop index view primary key foreign references not null unique default and or in is like between join inner left right outer full on group by order having limit offset as distinct union all exists case when then else end begin commit rollback database if',
        builtins: 'int integer varchar char text date datetime timestamp float double decimal boolean count sum avg min max now coalesce'
    },
    html: { label: 'HTML / XML', markup: true },
    css: { label: 'CSS', css: true },
    plain: { label: 'Texto sin colores' }
};

// Para cada lenguaje, las listas de palabras como conjuntos
Object.values(CODE_LANGUAGES).forEach(lang => {
    lang.kwSet = new Set((lang.keywords || '').split(/\s+/).filter(Boolean));
    lang.biSet = new Set((lang.builtins || '').split(/\s+/).filter(Boolean));
});

// Colores (los mismos en la hoja y en el Word)
const CODE_TOKEN_COLORS = {
    kw: 'CF222E', str: '0A3069', com: '6E7781', num: '0550AE', fn: '8250DF',
    type: '953800', tag: '116329', attr: '0550AE', var: '953800', pre: 'CF222E'
};

/**
 * Adivina el lenguaje por el contenido.
 */
function detectCodeLanguage(code) {
    const c = String(code || '');
    if (!c.trim()) return 'plain';
    if (/<\?php/.test(c)) return 'php';
    if (/^\s*<(!doctype|\?xml|[a-z][\w-]*[\s>])/i.test(c) && /<\/[a-z][\w-]*>|\/>/i.test(c)) return 'html';
    if (/^\s*#\s*include\s*[<"]/m.test(c)) return /\bstd::|\bcout\b|\bcin\b|\bnamespace\b|\btemplate\s*</.test(c) ? 'cpp' : 'c';
    if (/^\s*(SELECT|INSERT\s+INTO|CREATE\s+(TABLE|DATABASE|VIEW)|UPDATE\s+\w+\s+SET|DELETE\s+FROM|ALTER\s+TABLE|DROP\s+TABLE)\b/im.test(c)) return 'sql';
    if (/\busing\s+System\b|Console\.Write/.test(c)) return 'csharp';
    if (/System\.out\.print|\bpublic\s+(static\s+)?(class|void)\b|\bpublic\s+static\s+void\s+main\b/.test(c)) return 'java';
    if (/^\s*def\s+\w+\s*\(.*\)\s*(->[^:]+)?:\s*$/m.test(c) || /^\s*from\s+[\w.]+\s+import\b/m.test(c) ||
        /^\s*import\s+[\w.]+(\s+as\s+\w+)?\s*$/m.test(c) || /^\s*(elif|except)\b.*:\s*$/m.test(c) ||
        (/^\s*(if|for|while|else|class)\b.*:\s*$/m.test(c) && !/[{;]\s*$/m.test(c)) || (/\bprint\(/.test(c) && !/;\s*$/m.test(c))) return 'python';
    if (/\$[a-z_]\w*\s*=/i.test(c) && /;\s*$/m.test(c)) return 'php';
    if (/\b(function|const|let|var)\s+\w+|=>|console\.log|document\.|require\(|^\s*export\s|^\s*import\s.+\sfrom\s/m.test(c)) return 'javascript';
    if (/^\s*[.#@]?[\w-][\w\s.#:>,[\]="'-]*\{[\s\S]*?[\w-]+\s*:[^;{}]+;/m.test(c)) return 'css';
    if (/\b(int|void|char|float|double)\s+\w+\s*\(.*\)\s*\{/.test(c)) return 'c';
    return 'plain';
}

function getCodeLanguage(block) {
    const chosen = block && CODE_LANGUAGES[block.language] ? block.language : 'auto';
    return chosen === 'auto' ? detectCodeLanguage(block ? block.content : '') : chosen;
}

function describeDetectedLanguage(code) {
    if (!String(code || '').trim()) return '';
    const lang = detectCodeLanguage(code);
    return lang === 'plain' ? 'Sin colores (no se reconoció el lenguaje)' : `Se detectó: ${CODE_LANGUAGES[lang].label}`;
}

/**
 * Piezas del código: [{ t: tipo ('' = normal), v: texto }].
 */
function tokenizeCode(code, language) {
    const text = String(code || '').replace(/\r\n?/g, '\n');
    const spec = CODE_LANGUAGES[language];
    if (!spec || language === 'plain' || language === 'auto') return [{ t: '', v: text }];
    if (spec.markup) return tokenizeMarkup(text);
    if (spec.css) return tokenizeCss(text);

    const tokens = [];
    const push = (t, v) => {
        if (!v) return;
        const last = tokens[tokens.length - 1];
        if (last && last.t === t) last.v += v; else tokens.push({ t, v });
    };
    const isIdStart = ch => /[A-Za-z_\u00C0-\u024F]/.test(ch);
    const isIdChar = ch => /[\w\u00C0-\u024F]/.test(ch);
    const NUM = /(?:0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)[fFlLuUmMdD]?/y;
    const n = text.length;
    let i = 0;
    let lineStart = true;

    while (i < n) {
        const ch = text[i];
        let done = false;

        for (const [open, close] of spec.block) {
            if (text.startsWith(open, i)) {
                let end = text.indexOf(close, i + open.length);
                end = end === -1 ? n : end + close.length;
                push('com', text.slice(i, end));
                i = end;
                done = true;
                break;
            }
        }
        if (done) continue;

        if (spec.preprocessor && ch === '#' && lineStart) {
            let end = text.indexOf('\n', i);
            if (end === -1) end = n;
            push('pre', text.slice(i, end));
            i = end;
            continue;
        }

        for (const marker of spec.line) {
            if (text.startsWith(marker, i)) {
                let end = text.indexOf('\n', i);
                if (end === -1) end = n;
                push('com', text.slice(i, end));
                i = end;
                done = true;
                break;
            }
        }
        if (done) continue;

        for (const quote of spec.strings) {
            if (text.startsWith(quote, i)) {
                let j = i + quote.length;
                while (j < n) {
                    if (text[j] === '\\') { j += 2; continue; }
                    if (text.startsWith(quote, j)) { j += quote.length; break; }
                    if (quote.length === 1 && quote !== '`' && text[j] === '\n') break;
                    j++;
                }
                j = Math.min(j, n);
                push('str', text.slice(i, j));
                i = j;
                done = true;
                break;
            }
        }
        if (done) continue;

        if (ch === '\n') {
            push('', ch);
            lineStart = true;
            i++;
            continue;
        }
        if (ch === ' ' || ch === '\t') {
            push('', ch);
            i++;
            continue;
        }
        lineStart = false;

        if (/\d/.test(ch) && !(i > 0 && isIdChar(text[i - 1]))) {
            NUM.lastIndex = i;
            const m = NUM.exec(text);
            if (m) {
                push('num', m[0]);
                i += m[0].length;
                continue;
            }
        }

        if (spec.variables && ch === '$' && i + 1 < n && isIdStart(text[i + 1])) {
            let j = i + 1;
            while (j < n && isIdChar(text[j])) j++;
            push('var', text.slice(i, j));
            i = j;
            continue;
        }

        if (spec.decorators && ch === '@' && i + 1 < n && isIdStart(text[i + 1])) {
            let j = i + 1;
            while (j < n && (isIdChar(text[j]) || text[j] === '.')) j++;
            push('attr', text.slice(i, j));
            i = j;
            continue;
        }

        if (isIdStart(ch) || (ch === '$' && language === 'javascript')) {
            let j = i + 1;
            while (j < n && (isIdChar(text[j]) || (text[j] === '$' && language === 'javascript'))) j++;
            const word = text.slice(i, j);
            const key = spec.caseInsensitive ? word.toLowerCase() : word;
            let k = j;
            while (k < n && (text[k] === ' ' || text[k] === '\t')) k++;
            let type = '';
            if (spec.kwSet.has(key)) type = 'kw';
            else if (spec.biSet.has(key)) type = 'type';
            else if (text[k] === '(') type = 'fn';
            else if (spec.typeCase && /^[A-Z][a-z0-9]/.test(word)) type = 'type';
            push(type, word);
            i = j;
            continue;
        }

        push('', ch);
        i++;
    }
    return tokens;
}

function tokenizeMarkup(text) {
    const tokens = [];
    const push = (t, v) => { if (v) tokens.push({ t, v }); };
    let i = 0;
    const n = text.length;
    while (i < n) {
        if (text.startsWith('<!--', i)) {
            let end = text.indexOf('-->', i + 4);
            end = end === -1 ? n : end + 3;
            push('com', text.slice(i, end));
            i = end;
            continue;
        }
        const tag = /<\/?[A-Za-z!?][\w:.-]*/y;
        tag.lastIndex = i;
        const m = tag.exec(text);
        if (m) {
            push('tag', m[0]);
            i += m[0].length;
            // Atributos hasta ">"
            while (i < n && text[i] !== '>' && !text.startsWith('/>', i) && !text.startsWith('?>', i)) {
                const ch = text[i];
                if (ch === '"' || ch === "'") {
                    let end = text.indexOf(ch, i + 1);
                    end = end === -1 ? n : end + 1;
                    push('str', text.slice(i, end));
                    i = end;
                } else if (/[\w:-]/.test(ch)) {
                    let j = i;
                    while (j < n && /[\w:.-]/.test(text[j])) j++;
                    push('attr', text.slice(i, j));
                    i = j;
                } else {
                    push('', ch);
                    i++;
                }
            }
            const close = text.startsWith('/>', i) || text.startsWith('?>', i) ? 2 : (text[i] === '>' ? 1 : 0);
            push('tag', text.slice(i, i + close));
            i += close;
            continue;
        }
        let next = text.indexOf('<', i + 1);
        if (next === -1) next = n;
        push('', text.slice(i, next));
        i = next;
    }
    return tokens;
}

function tokenizeCss(text) {
    const tokens = [];
    const push = (t, v) => { if (v) tokens.push({ t, v }); };
    let i = 0;
    let depth = 0;
    const n = text.length;
    while (i < n) {
        const ch = text[i];
        if (text.startsWith('/*', i)) {
            let end = text.indexOf('*/', i + 2);
            end = end === -1 ? n : end + 2;
            push('com', text.slice(i, end));
            i = end;
        } else if (ch === '"' || ch === "'") {
            let end = text.indexOf(ch, i + 1);
            end = end === -1 ? n : end + 1;
            push('str', text.slice(i, end));
            i = end;
        } else if (ch === '{' || ch === '}') {
            depth += ch === '{' ? 1 : -1;
            if (depth < 0) depth = 0;
            push('', ch);
            i++;
        } else if (ch === '@') {
            let j = i + 1;
            while (j < n && /[\w-]/.test(text[j])) j++;
            push('kw', text.slice(i, j));
            i = j;
        } else if (depth > 0 && ch === '#' && /[\da-fA-F]/.test(text[i + 1] || '')) {
            let j = i + 1;
            while (j < n && /[\da-fA-F]/.test(text[j])) j++;
            push('num', text.slice(i, j));
            i = j;
        } else if (depth > 0 && /[\d.]/.test(ch) && /\d/.test(text[ch === '.' ? i + 1 : i] || '')) {
            let j = i;
            while (j < n && /[\d.]/.test(text[j])) j++;
            while (j < n && /[a-z%]/i.test(text[j])) j++;
            push('num', text.slice(i, j));
            i = j;
        } else if (/[\w-]/.test(ch)) {
            let j = i;
            while (j < n && /[\w-]/.test(text[j])) j++;
            const word = text.slice(i, j);
            let k = j;
            while (k < n && /\s/.test(text[k])) k++;
            push(depth > 0 ? (text[k] === ':' ? 'attr' : '') : 'tag', word);
            i = j;
        } else {
            push('', ch);
            i++;
        }
    }
    return tokens;
}

/**
 * Las piezas repartidas por línea: [[{ t, v }, ...], ...]
 */
function codeTokenLines(code, language) {
    const lines = [[]];
    tokenizeCode(code, language).forEach(token => {
        token.v.split('\n').forEach((piece, i) => {
            if (i > 0) lines.push([]);
            if (piece) lines[lines.length - 1].push({ t: token.t, v: piece });
        });
    });
    return lines;
}

function escapeCodeText(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Memoria del resaltado (se repite con cada tecla de otros bloques)
const codeHighlightCache = new Map();

function highlightCodeLines(code, language) {
    const key = language + '\u0000' + (code || '');
    if (codeHighlightCache.has(key)) return codeHighlightCache.get(key);
    const lines = codeTokenLines(code, language).map(tokens => tokens
        .map(token => token.t ? `<span class="tok-${token.t}">${escapeCodeText(token.v)}</span>` : escapeCodeText(token.v))
        .join(''));
    if (codeHighlightCache.size > 200) codeHighlightCache.clear();
    codeHighlightCache.set(key, lines);
    return lines;
}

/**
 * <pre> de la hoja: una línea por <span class="code-line"> (así se parte entre
 * hojas por líneas y los números de línea siguen la cuenta).
 */
function renderCodePreview(block) {
    const language = getCodeLanguage(block);
    const lines = highlightCodeLines(block.content, language);
    return `<pre class="code-preview code-lang-${language}${block.lineNumbers ? ' has-line-numbers' : ''}"><code>${lines.map(line => `<span class="code-line">${line || ' '}</span>`).join('')}</code></pre>`;
}

function updateCodeLanguage(id, language) {
    const block = reportData.find(b => b.id === id);
    if (!block) return;
    block.language = CODE_LANGUAGES[language] ? language : 'auto';
    refreshDetectedLanguages();
    renderPreview();
}

function updateCodeLineNumbers(id, on) {
    const block = reportData.find(b => b.id === id);
    if (!block) return;
    block.lineNumbers = !!on;
    renderPreview();
}

/**
 * El texto "Se detectó: ..." de las tarjetas de código en modo automático.
 */
function refreshDetectedLanguages() {
    document.querySelectorAll('#editor-container [data-code-detected]').forEach(label => {
        const block = reportData.find(b => String(b.id) === label.dataset.codeDetected);
        if (!block) return;
        const text = (block.language || 'auto') === 'auto' ? describeDetectedLanguage(block.content) : '';
        if (label.textContent !== text) label.textContent = text;
    });
}
