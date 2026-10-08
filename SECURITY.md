# Security

## Scope

trading-ui renders data you hand it. It does not connect to any venue, fetch
from any endpoint, store credentials, or persist anything outside React state.
The mock feed is a seeded random walk computed locally. That makes the realistic
attack surface small: rendering untrusted strings, and the dependency tree.

## Reporting

Report a vulnerability through GitHub's private advisory flow:
**Security → Report a vulnerability** on this repository. Please do not open a
public issue for something exploitable.

Include what you did, what happened, and the version or commit. A reproduction
against the demo site is ideal.

Expect an acknowledgement within a few days. If a fix is warranted it ships as
a patch release with the advisory published alongside it.

## Notes for integrators

- Symbol and instrument names render as text, never as HTML. Keep it that way
  if you fork a component.
- `PanelBoundary` contains render faults, not event-handler or async faults —
  React boundaries never caught those. Validate feed payloads at the socket.
- The library has no network code. If a dependency acquires some, that is worth
  reporting.
