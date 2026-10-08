# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `PanelBoundary` — a React error boundary that contains a render failure to a
  single widget instead of unmounting the terminal, with `resetKeys` so the
  panel recovers on the next instrument rather than stranding the user, and an
  `onError` hook for Sentry/Datadog.
- `toArray` / `toBook` — the feed-tolerance primitives the components now use.
- CI across Node 20 and 22: typecheck, tests, library build, site build, a
  registry-drift check, and `npm pack --dry-run`.

### Fixed

- **Every data-taking component crashed the React tree on a malformed feed
  payload.** `null`, `undefined`, a non-array, or a missing book snapshot threw
  out of render — 9 of 10 components tested. A socket that drops a field, a
  REST endpoint that returns `null` for "no rows yet", or a panel that mounts
  before its first payload lands would blank the whole screen. All 15
  data-taking components now fall through to their empty state instead.

### Changed

- `'use client'` on every component entry point, so the library drops into a
  React Server Components app (Next.js App Router) without a wrapper.
- Registry and documentation URLs now point at the real repository.
