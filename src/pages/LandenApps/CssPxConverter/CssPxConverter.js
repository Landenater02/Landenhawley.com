import React, { useMemo, useState,useEffect } from 'react';

export default function CssPxConverter() {
    
    useEffect(() => {
        document.title = "CSS PX to REM/EM Converter";
    }, []);
    var description = "Translate your CSS code to use flexible units of measurement. This is most useful for converting legacy CSS, or CSS of unknown quality to translate better with text resizers and different screen sizes"
    const metaDesc = document.querySelector("meta[name='description']");
    if (metaDesc) {
        metaDesc.setAttribute("content", description);
    }  

    const [css, setCss] = useState(
        `/* Paste your CSS here */
.container { padding: 24px; margin-top: 32px; }
.button { font-size: 18px; line-height: 24px; }
.card { width: 320px; height: 200px; }
.bordery { border: 1px solid #ccc; border-radius: 8px; }
@media (min-width: 768px) {
  .container { padding: 32px; }
}
`);


    const [unit, setUnit] = useState('rem'); // 'rem' or 'em'
    const [base, setBase] = useState(16);    // px per 1 rem/em

    const output = useMemo(() => convertCssPx(css, unit, base), [css, unit, base]);

    return (
        <main className="container section stack">
            <section className="stack">
                <h1>CSS px to {unit}</h1>
                <p className="lead">
                    Converts unflexible px values to {unit}, allowing for more flexible web development and styling.
                </p>
                <p> Note - this tool skips media query conditions and properties like border, outline,
                    box-shadow, and border-radius. 0px remains 0.</p>
            </section>

            <section className="grid grid--2">
                <div className="card stack">
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                type="button"
                                className={`btn ${unit === 'rem' ? 'btn--primary' : ''}`}
                                onClick={() => setUnit('rem')}
                            >
                                rem
                            </button>
                            <button
                                type="button"
                                className={`btn ${unit === 'em' ? 'btn--primary' : ''}`}
                                onClick={() => setUnit('em')}
                            >
                                em
                            </button>
                        </div>

                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label className="label" htmlFor="base">Base px</label>
                            <input
                                id="base"
                                className="input"
                                type="number"
                                min={1}
                                step={1}
                                value={base}
                                onChange={(e) => {
                                    const n = Number(e.target.value);
                                    setBase(Number.isFinite(n) && n > 0 ? n : 16);
                                }}
                                style={{ width: 96 }}
                            />
                        </div>
                    </div>

                    <textarea
                        className="textarea"
                        rows={18}
                        value={css}
                        onChange={(e) => setCss(e.target.value)}
                        placeholder="Paste CSS with px values here"
                        spellCheck={false}
                        style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' }}
                    />
                </div>

                <div className="card stack">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                        <h3 style={{ margin: 0 }}>Converted CSS</h3>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => navigator.clipboard.writeText(output)}
                            title="Copy to clipboard"
                        >
                            Copy
                        </button>
                    </div>
                    <pre><code>{output}</code></pre>
                </div>
            </section>
        </main>
    );
}

/* ===== Converter ===== */

function convertCssPx(input, unit, basePx) {
    if (!input) return '';

    // Normalize line endings
    let css = input.replace(/\r\n?/g, '\n');

    // Split around @media blocks so we can skip converting px in the @media prelude
    const parts = [];
    let lastIndex = 0;
    const mediaRegex = /@media[^{]*\{/gi;
    let m;

    while ((m = mediaRegex.exec(css)) !== null) {
        const preludeStart = m.index;
        const braceOpenIndex = mediaRegex.lastIndex - 1;

        if (preludeStart > lastIndex) {
            parts.push({ type: 'chunk', text: css.slice(lastIndex, preludeStart) });
        }

        // find matching closing brace for this media block
        let i = braceOpenIndex + 1;
        let depth = 1;
        while (i < css.length && depth > 0) {
            if (css[i] === '{') depth++;
            else if (css[i] === '}') depth--;
            i++;
        }

        const prelude = css.slice(preludeStart, braceOpenIndex + 1); // includes "@media (...) {"
        const body = css.slice(braceOpenIndex + 1, i - 1);
        parts.push({ type: 'media', prelude, body });
        lastIndex = i;
    }

    if (lastIndex < css.length) {
        parts.push({ type: 'chunk', text: css.slice(lastIndex) });
    }

    const processed = parts.map(p => {
        if (p.type === 'chunk') {
            return processDeclarations(p.text, unit, basePx);
        } else {
            const convertedBody = processDeclarations(p.body, unit, basePx);
            return `${p.prelude}${convertedBody}}`;
        }
    });

    return processed.join('');
}

function processDeclarations(css, unit, basePx) {
    const excludedProps = new Set([
        'border',
        'border-top',
        'border-right',
        'border-bottom',
        'border-left',
        'border-width',
        'outline',
        'box-shadow',
        'border-radius'
    ]);

    // Convert px numbers in declaration values, skipping excluded properties
    return css.replace(/([a-z-]+)\s*:\s*([^;{}]+);/gi, (full, prop, value) => {
        const propName = String(prop).toLowerCase();

        if (excludedProps.has(propName)) return full;
        if (propName.startsWith('border')) return full;

        const tokens = [];
        const protect = (re) => {
            value = value.replace(re, (s) => {
                const key = `__T${tokens.length}__`;
                tokens.push(s);
                return key;
            });
        };

        // Do not touch urls or quoted strings
        protect(/url\(\s*[^)]+\)/gi);
        protect(/"([^"\\]|\\.)*"/g);
        protect(/'([^'\\]|\\.)*'/g);

        value = value.replace(/(\d*\.?\d+)px\b/gi, (m, numStr) => {
            const n = parseFloat(numStr);
            if (!isFinite(n)) return m;
            if (n === 0) return '0';
            const conv = n / basePx;
            return trimNumber(conv) + unit;
        });

        // restore protected tokens
        value = value.replace(/__T(\d+)__/g, (s, i) => tokens[Number(i)]);

        return `${prop}: ${value};`;
    });
}

function trimNumber(n) {
    const s = Number(n).toFixed(4);
    return s.replace(/\.?0+$/, '');
}