# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primarily a single developer (the owner) who is developing web apps and tightening their Content Security Policy. They point their apps at this collector, reproduce behavior, and use the dashboard to see what the policy blocks.

## Product Purpose
A small, self-hosted collector for browser Reporting API reports, with a focus on CSP violations. Its main job is triage: making it fast to see which directives and which blocked URLs are firing, so the owner can fix the policy or the offending code. Success means the owner can go from "reports are arriving" to "I know what to allow or remove" in seconds.

## Positioning
Zero-dependency, self-hosted, and single-purpose. It accepts both the modern Reporting API (`report-to`, `application/reports+json`) and legacy `report-uri` (`application/csp-report`), normalizes them into one shape, and streams them live. Reports never leave infrastructure the owner controls.

## Operating Context
- The owner's apps send `Reporting-Endpoints` + `Content-Security-Policy` headers pointing to `/reporting/<app-name>`, which accepts both report-to and report-uri. `<app-name>` is any single path segment the owner picks (for example, `/reporting/my-app`) and is the "source" used to tell apps apart. The older `/reports` and `/csp-report` paths remain as aliases.
- Chromium batches report-to deliveries (up to about 1 minute). Firefox uses report-uri only.
- The dashboard is used alongside a browser DevTools console while reproducing violations. It updates live over Server-Sent Events.
- Deployed on Azure App Service (F1). The dashboard, `/api/*`, and `/test` require Entra ID sign-in, while ingestion and `/health` are anonymous. Also run locally over http://localhost:9000 or https://localhost:9443.
- `/test` is a built-in page served with a strict CSP that intentionally triggers four violations (inline style, inline script, cross-origin image, eval). It supports `?mode=report-to|report-uri|both`.

## Capabilities and Constraints
- Report fields: receivedAt, source, type, format (reporting-api | report-uri), effectiveDirective, disposition (enforce | report), blockedURL, documentURL, sourceFile/line/column, sample, statusCode, referrer, originalPolicy, userAgent, and the raw report.
- API: `GET /api/reports?type=&source=`, `DELETE /api/reports`, `GET /api/stream` (SSE: `report`, `cleared` events), `GET /health`.
- Storage: NDJSON file plus an in-memory cache (default 5,000 reports). Single instance.
- Technical constraints: no build step, no runtime dependencies, and no external assets or CDNs. The dashboard is static HTML plus vanilla JS served by the Node server, which should keep working under a strict CSP of its own (`'self'` only, no inline script).
- Other report types (deprecation, intervention, coep, and so on) may arrive and must still display.

## Brand Commitments
Name: "CSP Reporting Server". No logo or visual identity exists yet. Use US English only in UI copy.

Visual commitment (the owner chose this after two re-rolls): a clean, modern developer tool with no governing metaphor, carried by excellent typography, spacing, and data visualization. Supports light and dark modes. The craft bar is Linear, Vercel, and GitHub. It must not read as a generic SaaS or marketing dashboard (no gradients, big hero, or fluff).

## Evidence on Hand
No real user data, testimonials, or metrics. The only report data comes from the owner's own apps and the `/test` page. Do not fabricate counts, customers, or claims.

## Product Principles
1. Triage first: directive and blocked URL are the primary lenses, and grouping and counts beat raw chronology.
2. Truthful and raw when needed: every normalized view must allow drilling into the exact raw report.
3. Zero-friction setup: the endpoint URLs to paste into an app should always be one glance and one click away.
4. Self-contained: nothing external is loaded, and the tool must obey the same kind of strict CSP it helps enforce.

## Accessibility & Inclusion
No product-specific requirement was established. Meet WCAG 2.2 AA as the baseline.
