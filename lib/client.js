/**
 * dsh-mermaid-pele — Mermaid diagram rendering for DSH chat code fences.
 *
 * Registers a language-keyed layer on the `conversation.chat.markdown.fence`
 * slot for fences tagged `mermaid`. Rendering runs on the Pele engine
 * (Obsidian's Mermaid renderer), loaded from the package-local chunk
 * `client.pele.js` via `require.async`. Until the chunk resolves — or for any
 * fence the renderer declines — the layer falls back to the stock code block.
 *
 * Degradation ladder (each rung falls through to the stock code block):
 *   1. fence still streaming        -> children (a half-drawn diagram is an error)
 *   2. source larger than 32768     -> children (bounded work per fence)
 *   3. chunk unavailable            -> children (module-level cache, retried next fence)
 *   4. render throws / empty SVG    -> children
 *   5. sanitized SVG                -> replaceChildren(importNode)
 */
window.__ModuleLoader__.load({
  id: 'dsh-mermaid-pele',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useEffect, useRef, useState } = React;

    const SLOT_NAME = 'conversation.chat.markdown.fence';
    const LAYER_ID = 'dsh-mermaid-pele/fence';
    const LAYER_KEY = 'mermaid';
    const LAYER_ORDER = 100;
    const PELE_VERSION = '1.13.0';
    const MAX_SOURCE_CHARS = 32768;
    const STYLE_ID = 'dsh-mermaid-pele-styles';

    // ------------------------------------------------------------------
    // Pele chunk: one promise per page load; failures reset so a later
    // fence can retry (transient transport errors must not poison the
    // whole session).
    // ------------------------------------------------------------------
    let peleChunkPromise = null;
    function loadPeleChunk() {
      if (peleChunkPromise === null) {
        peleChunkPromise = require.async('./client.pele.js').then((exports) => {
          if (!exports || !exports.pele || typeof exports.pele.render !== 'function') {
            throw new Error('dsh-mermaid-pele: pele chunk did not export a renderer');
          }
          if (exports.version !== PELE_VERSION) {
            console.error('[dsh-mermaid-pele] pele chunk version mismatch:', exports.version, 'expected', PELE_VERSION);
          }
          return exports.pele;
        });
        peleChunkPromise.catch(() => {
          peleChunkPromise = null;
        });
      }
      return peleChunkPromise;
    }

    // ------------------------------------------------------------------
    // SVG sanitizer. Pele cannot run code, but defense in depth is free:
    // drop active elements/attributes before anything reaches the DOM.
    // ------------------------------------------------------------------
    const FORBIDDEN_TAGS = ['script', 'foreignobject', 'iframe', 'object', 'embed', 'image', 'use'];

    function sanitizeSvg(svgText) {
      let doc;
      try {
        doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      } catch {
        return null;
      }
      const root = doc.documentElement;
      if (!root || root.nodeName === 'parsererror' || root.querySelector('parsererror')) return null;
      if (String(root.nodeName).toLowerCase() !== 'svg') return null;

      const doomed = [];
      const all = root.querySelectorAll('*');
      for (let i = 0; i < all.length; i++) {
        const el = all[i];
        const tag = String(el.nodeName).toLowerCase();
        if (FORBIDDEN_TAGS.indexOf(tag) !== -1) {
          doomed.push(el);
          continue;
        }
        const attrs = Array.prototype.slice.call(el.attributes);
        for (let j = 0; j < attrs.length; j++) {
          const name = attrs[j].name.toLowerCase();
          const value = String(attrs[j].value).trim().toLowerCase();
          if (name.indexOf('on') === 0) {
            el.removeAttribute(attrs[j].name);
            continue;
          }
          if (/^(javascript|vbscript):/.test(value)) {
            el.removeAttribute(attrs[j].name);
            continue;
          }
          if ((name === 'href' || name === 'xlink:href' || name === 'src') && value.indexOf('data:') === 0) {
            el.removeAttribute(attrs[j].name);
          }
        }
      }
      for (let k = 0; k < doomed.length; k++) {
        const el = doomed[k];
        if (el.parentNode) el.parentNode.removeChild(el);
      }
      return root;
    }

    // ------------------------------------------------------------------
    // Styles: injected once per page load as a kernel-tracked plugin style
    // (<style data-plugin data-plugin-css>); removal on deactivation is the
    // kernel's job. Theme bridge maps Pele's variables onto DSH design
    // aliases, so diagrams follow the light/dark theme automatically.
    // ------------------------------------------------------------------
    const CSS = [
      '.dsh-mermaid-pele-block{',
      '  --pele-fg: var(--dsw-alias-label-primary, currentColor);',
      '  --pele-line: var(--dsw-alias-brand-primary, currentColor);',
      '  --pele-accent: var(--dsw-alias-brand-primary, currentColor);',
      '  --pele-surface: var(--dsw-alias-bg-layer-2, transparent);',
      '  --pele-border: var(--dsw-alias-border-l2, currentColor);',
      '  --pele-bg: transparent;',
      '  display: block;',
      '  max-width: 100%;',
      '  overflow-x: auto;',
      '  padding: 6px 2px;',
      '  color: var(--dsw-alias-label-primary, inherit);',
      '  font-family: var(--dsh-font-family-text, inherit);',
      '}',
      '.dsh-mermaid-pele-block svg{max-width:100%;height:auto;display:block;margin:0 auto;}',
      '.dsh-mermaid-pele-block svg text,.dsh-mermaid-pele-block svg tspan{',
      '  font-family: var(--dsh-font-family-text, inherit);',
      '}',
    ].join('\n');

    function ensureStyles() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.setAttribute('data-plugin', '');
      style.setAttribute('data-plugin-css', STYLE_ID);
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    // ------------------------------------------------------------------
    // Render surface: renders once the fence settles; any failure swaps the
    // whole block back to the stock code block.
    // ------------------------------------------------------------------
    function MermaidBlock({ code, fallback }) {
      const ref = useRef(null);
      const [failed, setFailed] = useState(false);

      useEffect(() => {
        let cancelled = false;
        setFailed(false);
        loadPeleChunk()
          .then((pele) => {
            if (cancelled) return;
            let result = null;
            try {
              result = pele.render(code);
            } catch {
              setFailed(true);
              return;
            }
            const svg = result && typeof result.svg === 'string' ? result.svg : '';
            if (!svg.trim()) {
              setFailed(true);
              return;
            }
            const clean = sanitizeSvg(svg);
            if (!clean) {
              setFailed(true);
              return;
            }
            const host = ref.current;
            if (!host || cancelled) return;
            host.replaceChildren(document.importNode(clean, true));
          })
          .catch(() => {
            if (!cancelled) setFailed(true);
          });
        return () => {
          cancelled = true;
        };
      }, [code]);

      if (failed) return fallback;
      return h('div', {
        className: 'dsh-mermaid-pele-block',
        'data-dsh-mermaid-pele': '',
        ref(el) {
          ref.current = el;
        },
      });
    }

    // ------------------------------------------------------------------
    // The fence layer (hoc): same contract as Chat's own math/diff layers.
    // ------------------------------------------------------------------
    function MermaidFenceLayer(props) {
      const code = props.code;
      const streaming = props.streaming;
      const children = props.children;
      if (streaming) return children;
      if (typeof code !== 'string' || code.length === 0 || code.length > MAX_SOURCE_CHARS) return children;
      return h(MermaidBlock, { code, fallback: children });
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ensureStyles();
        ctx.slots.inject(SLOT_NAME, () =>
          ctx.slots.register(
            { name: SLOT_NAME, key: LAYER_KEY, id: LAYER_ID, order: LAYER_ORDER },
            MermaidFenceLayer,
          ),
        );
      },
    };
  },
});
