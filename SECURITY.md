# Security Policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report vulnerabilities privately through GitHub's **[Report a vulnerability](../../security/advisories/new)** form, which is on this repository's **Security** tab. Include:

- a description of the issue and its impact,
- steps to reproduce (a minimal request or payload is ideal),
- the version or commit you tested.

You should receive an acknowledgment within a few days. Please give reasonable time for a fix before public disclosure.

## Deployment security notes

CSP Reporting Server is intentionally small. Read these before exposing it to the internet:

- **The server has no built-in authentication.** Anyone who can reach it can read the dashboard, call `GET /api/reports`, and **delete all reports** with `DELETE /api/reports`. Put it behind an authenticating proxy, such as App Service Authentication (see `infra/`), or keep it on a private network.
- **Ingestion endpoints (`/reporting`, plus the legacy `/reports` and `/csp-report`) must stay anonymous**, because browsers send reports without credentials. They accept any origin (CORS reflects `Origin`) and have no rate limiting. The only abuse limits are a 1 MB body cap (`MAX_BODY_BYTES`) and a 5,000-report in-memory cap (`MAX_REPORTS`). The on-disk NDJSON file grows without bound.
- **Reports can contain sensitive data.** URLs, referrers, and script samples may include tokens, session IDs, or personal data. Treat stored reports accordingly and clear them when you're done.
- Report contents are untrusted input. The dashboard renders them with `textContent` only and is served under a strict `'self'`-only Content Security Policy.
