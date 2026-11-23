# Contributing

Thanks for considering a contribution. This project is intentionally small:
hand-written browser JS, no build step, no dependency tree.

## Repo layout (planned)

```
dsh-mermaid-pele/
├── package.json          # name/version + dsh.client + dsh.bundle.patch manifest
├── cordis.patch.yml      # profile bundle patch row (id: mermaid)
├── index.js              # host-side entry: export function apply() {}
├── lib/
│   ├── client.js         # browser bundle: slot registration + MermaidFenceLayer
│   └── vendor/
│       └── pele.global.js  # vendored Pele, version pinned per release
├── README.md / README.zh-CN.md
├── LICENSE / NOTICE / CHANGELOG.md / SECURITY.md
└── .gitignore
```

## Ground rules

- No new runtime dependencies, ever. Pele is the only vendored artifact.
- No build/transpile step: `lib/client.js` is written as plain browser JS
  (the DSH client loader consumes it verbatim).
- Any failure must degrade to the plain code block. A change that can make the
  chat flow throw is a regression.

## Smoke-test set (the acceptance checklist)

Run all cases in a fresh session on the pinned DSH version; each must render,
and the SVG tag set should stay within the expected baseline
(g/path/polygon/rect/text/tspan/circle for the current Pele line — `circle`
appears only in mindmap node dots; measured on Pele 1.13.0):

1. `flowchart LR` — the sample from the README (request → confirm → close loop).
2. `sequenceDiagram` — a few participants, alt/opt blocks.
3. `pie` — series colors follow Mermaid palette variables.
4. `mindmap` — nested nodes.
5. A diagram containing `%%` comments (regression guard for comment semantics).
6. Oversize source (> 32,768 chars) — must stay a code block.
7. Invalid mermaid (deliberate syntax error) — must stay a code block, no console explosion.
8. Theme flip (light ↔ dark) on a rendered diagram — colors must follow.

A PR is accepted when: code matches the ground rules, the smoke set passes,
and README/CHANGELOG reflect any behavior change.

## Pele upgrade procedure

Pele is pinned per release; upgrading it is a deliberate, human-reviewed act.
Follow the checklist in [CHANGELOG.md](CHANGELOG.md), then run the full smoke
set against the new build before releasing.

## Releasing

1. Update CHANGELOG (move Unreleased → version, with the vendored Pele row).
2. Bump `package.json` version and the `PELE_VERSION` constant together.
3. Tag `vX.Y.Z`, push, and create a GitHub Release whose notes include the
   Pele version + sha256 row copied from the CHANGELOG.
4. Keep the repo topics filled in — searchability lives there, not in the
   name: `mermaid`, `dsh`, `dsh-plugin`, `pele`, `diagrams`, `markdown`,
   `code-fence`.
