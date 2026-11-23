# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| `0.1.x` (once released) | yes |
| older | no |

## Reporting a vulnerability

Please use GitHub **Security Advisories** (Security tab → Report a
vulnerability) for anything that might be exploitable. Do not open a public
issue for an untriaged security problem.

Include: affected plugin version, DSH version, the Mermaid source (or a
minimal repro) that triggers the problem, and expected vs actual behavior.

## Security design

Diagram sources originate from model output — **untrusted input**. The plugin
is built so that a malicious or broken diagram can, at worst, fail to render:

1. **No code execution by the renderer.** Pele is a declarative
   syntax→SVG renderer ("can't run code"); it parses Mermaid text and emits
   SVG markup. It does not evaluate expressions, fetch resources, or run
   scripts.
2. **Sanitized output.** The SVG Pele produces is parsed with `DOMParser` and
   rebuilt before insertion: `script`, `foreignObject`, `iframe`, `object`,
   `embed`, `image`, and `use` elements are dropped; `on*` event-handler
   attributes are dropped; `javascript:`, `vbscript:`, and `data:` URLs are
   dropped. What reaches the DOM is a plain shapes-and-text tree.
3. **Input cap.** Sources above 32,768 characters are never rendered.
4. **Fail-closed.** Any error in the render chain falls back to the ordinary
   code block. The plugin never blocks or corrupts the chat flow.

## Scope

- Client-side only: runs in the DSH web/desktop renderer.
- Holds no credentials, reads no conversation data beyond the fence being
  rendered, performs no network I/O, writes no storage.
- Out of scope: vulnerabilities in DSH itself (report upstream to the DSH
  maintainers) and in Pele (report upstream via
  [obsidianmd/pele](https://github.com/obsidianmd/pele/security)); this
  project will track and pick up upstream fixes through a new release.
