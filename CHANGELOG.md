# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

Each entry records the exact Pele build it vendors — plugin version and Pele
version move together, by release.

## [Unreleased] — 0.1.0 (planned)

### Added
- Initial public release (pending implementation).
- Renders ` ```mermaid ` fences in DSH assistant messages as SVG via vendored Pele.
- Streaming gate: source shown while the fence is still being written; render on finalization.
- Graceful degradation on every failure path (parse error / oversize / load failure → plain code block).
- SVG sanitization pass before DOM insertion; 32,768-character source cap.
- Theme bridge over DSH design-token aliases (`--dsw-alias-*`), automatic light/dark.

### Vendored
- Pele `1.13.0` — [release](https://github.com/obsidianmd/pele/releases/tag/1.13.0)
  - File: `lib/vendor/pele.global.js`, 733,670 bytes
  - sha256: `0b0a46c57a5a6971670c09f5ec4066705bd78505f90fd11adf6260325efa0910`
  - Tested against DSH `0.2.2-rc.5`

## Pele upgrade checklist (applies to any future release)

1. Download the Pele release `tgz` from [obsidianmd/pele releases](https://github.com/obsidianmd/pele/releases) and extract `pele.global.js`.
2. Record the file's sha256 in this CHANGELOG and refresh [NOTICE](NOTICE) if license text changed upstream.
3. Replace `lib/vendor/pele.global.js`, bump the `PELE_VERSION` constant in `lib/client.js`, bump the package version.
4. Skim Pele's release notes for behavioral changes (e.g. the 1.10.0 `%%` comment semantics change) and update docs if user-visible.
5. Run the smoke-test set from [CONTRIBUTING.md](CONTRIBUTING.md); all cases must pass or degrade gracefully.

[Unreleased]: https://github.com/Tazio7/dsh-mermaid-pele/compare/v0.0.0...HEAD
