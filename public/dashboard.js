'use strict';

(() => {
  const MAX_ROWS = 500;
  const MAX_REPORTS = 5000;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  const $ = (id) => document.getElementById(id);
  const els = {
    live: $('live'),
    liveText: $('liveText'),
    summary: $('summary'),
    chartSvg: $('chartSvg'),
    chart: $('chart'),
    chartTip: $('chartTip'),
    axisStart: $('axisStart'),
    axisMid: $('axisMid'),
    axisEnd: $('axisEnd'),
    appName: $('appName'),
    epReportTo: $('epReportTo'),
    epReportUri: $('epReportUri'),
    copyHeaders: $('copyHeaders'),
    facetDirective: $('facetDirective'),
    facetDirectiveMeta: $('facetDirectiveMeta'),
    facetBlocked: $('facetBlocked'),
    facetBlockedMeta: $('facetBlockedMeta'),
    facetSource: $('facetSource'),
    facetSourceMeta: $('facetSourceMeta'),
    search: $('search'),
    clearAll: $('clearAll'),
    chips: $('chips'),
    tableWrap: $('tableWrap'),
    rows: $('rows'),
    listFoot: $('listFoot'),
    emptyNone: $('emptyNone'),
    emptyFiltered: $('emptyFiltered'),
    snippet: $('snippet'),
    copySnippet: $('copySnippet'),
    clearFilters: $('clearFilters'),
    inspector: $('inspector'),
    inspTitle: $('inspTitle'),
    inspSub: $('inspSub'),
    inspBody: $('inspBody'),
    inspPrev: $('inspPrev'),
    inspNext: $('inspNext'),
    inspClose: $('inspClose'),
  };

  const state = {
    reports: [],
    filters: { directive: null, blocked: null, source: null, disposition: '', q: '' },
    selectedId: null,
    newIds: new Set(),
    visible: [],
    loaded: false,
    renderQueued: false,
  };

  // ---------- Helpers ----------

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k.startsWith('data-') || k.startsWith('aria-') || k === 'role' || k === 'title' || k === 'type' || k === 'tabindex') {
          node.setAttribute(k, v === true ? '' : String(v));
        } else node[k] = v;
      }
    }
    for (const child of children) {
      if (child == null || child === false) continue;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  function svg(tag, attrs) {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, String(v));
    return node;
  }

  const fmtNumber = new Intl.NumberFormat('en-US');
  const fmtTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
  const fmtDateTime = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
  const fmtDay = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

  function relTime(iso) {
    const diff = Math.max(0, Date.now() - new Date(iso).getTime());
    const s = Math.round(diff / 1000);
    if (s < 10) return 'just now';
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return d < 30 ? `${d}d ago` : fmtDay.format(new Date(iso));
  }

  function family(directive) {
    const d = String(directive || '').toLowerCase();
    if (d.startsWith('script') || d.includes('trusted-types')) return 'script';
    if (d.startsWith('style')) return 'style';
    if (d === 'img-src' || d === 'media-src' || d === 'font-src') return 'media';
    if (d === 'connect-src' || d === 'worker-src' || d === 'manifest-src' || d === 'prefetch-src') return 'connect';
    if (['frame-src', 'child-src', 'frame-ancestors', 'form-action', 'navigate-to', 'fenced-frame-src'].includes(d)) return 'frame';
    return 'other';
  }

  const directiveOf = (r) => r.effectiveDirective || (r.type && r.type !== 'csp-violation' ? r.type : 'unknown');
  const blockedOf = (r) => (r.blockedURL == null || r.blockedURL === '' ? '(none)' : String(r.blockedURL));
  const dispositionOf = (r) => (r.disposition === 'report' ? 'report' : r.disposition === 'enforce' ? 'enforce' : 'other');

  function splitUrl(value) {
    try {
      const u = new URL(value);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        return { host: `${u.protocol}//${u.host}`, rest: `${u.pathname}${u.search}${u.hash}` };
      }
    } catch {
      // Not a URL (e.g., "inline", "eval").
    }
    return { host: '', rest: value };
  }

  function urlNode(value) {
    if (value == null || value === '') return el('span', { class: 'muted', text: '—' });
    const { host, rest } = splitUrl(String(value));
    return el('span', null, host ? el('span', { class: 'url-host', text: host }) : null, rest);
  }

  function pagePath(value) {
    if (!value) return '—';
    try {
      const u = new URL(value);
      return `${u.host}${u.pathname}${u.search}`;
    } catch {
      return value;
    }
  }

  function dispositionPill(r) {
    const d = dispositionOf(r);
    if (d === 'enforce') return el('span', { class: 'pill pill-enforce', text: 'Enforced' });
    if (d === 'report') return el('span', { class: 'pill pill-report', text: 'Report-only' });
    return el('span', { class: 'pill pill-neutral', text: r.type || 'Report' });
  }

  function directiveNode(r) {
    const name = directiveOf(r);
    return el('span', { class: 'directive', 'data-family': family(name) }, el('span', { class: 'swatch', 'aria-hidden': 'true' }), name);
  }

  async function copyText(text, button) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = el('textarea', { value: text });
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    if (!button) return;
    button.dataset.copied = 'true';
    const label = button.getAttribute('aria-label');
    if (label) button.setAttribute('aria-label', 'Copied');
    const textNode = button.childElementCount === 0 ? button.textContent : null;
    if (textNode) button.textContent = 'Copied';
    setTimeout(() => {
      delete button.dataset.copied;
      if (label) button.setAttribute('aria-label', label);
      if (textNode) button.textContent = textNode;
    }, 1400);
  }

  // ---------- Filtering & aggregation ----------

  function matches(r, skip) {
    const f = state.filters;
    if (skip !== 'directive' && f.directive && directiveOf(r) !== f.directive) return false;
    if (skip !== 'blocked' && f.blocked && blockedOf(r) !== f.blocked) return false;
    if (skip !== 'source' && f.source && r.source !== f.source) return false;
    if (f.disposition && dispositionOf(r) !== f.disposition) return false;
    if (f.q) {
      const q = f.q.toLowerCase();
      const hay = [directiveOf(r), r.blockedURL, r.documentURL, r.source, r.sourceFile, r.sample, r.type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }

  function countBy(list, keyFn) {
    const map = new Map();
    for (const r of list) {
      const k = keyFn(r);
      map.set(k, (map.get(k) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  }

  // ---------- Rendering ----------

  function scheduleRender() {
    if (state.renderQueued) return;
    state.renderQueued = true;
    requestAnimationFrame(() => {
      state.renderQueued = false;
      render();
    });
  }

  function render() {
    const filtered = state.reports.filter((r) => matches(r));
    filtered.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : a.receivedAt > b.receivedAt ? -1 : 0));
    state.visible = filtered;

    renderSummary(filtered);
    renderChart(filtered);
    renderFacet('directive', els.facetDirective, els.facetDirectiveMeta, directiveOf, 12);
    renderFacet('blocked', els.facetBlocked, els.facetBlockedMeta, blockedOf, 8);
    renderFacet('source', els.facetSource, els.facetSourceMeta, (r) => r.source || 'default', 8);
    renderChips();
    renderRows(filtered);
    syncUrl();
    state.newIds.clear();

    if (state.selectedId) {
      const current = state.reports.find((r) => r.id === state.selectedId);
      if (current) renderInspector(current);
      else closeInspector();
    }
  }

  function stat(value, label, cls, onClick, pressed, hint) {
    if (!onClick) return el('span', { class: `stat ${cls || ''}` }, el('strong', { text: value }), label);
    const btn = el(
      'button',
      { class: `stat stat-btn ${cls || ''}`, type: 'button', 'aria-pressed': pressed == null ? null : String(pressed), title: hint },
      el('strong', { text: value }),
      label,
    );
    btn.addEventListener('click', onClick);
    return btn;
  }

  function renderSummary(list) {
    const enforced = list.filter((r) => dispositionOf(r) === 'enforce').length;
    const reportOnly = list.filter((r) => dispositionOf(r) === 'report').length;
    const apps = new Set(list.map((r) => r.source)).size;
    const latest = list[0];
    const disp = state.filters.disposition;
    const toggle = (value) => () => setFilter('disposition', disp === value ? '' : value);
    els.summary.replaceChildren(
      ...[
        stat(fmtNumber.format(list.length), list.length === 1 ? 'report' : 'reports', '', () => setFilter('disposition', ''), null, 'Show all dispositions'),
        stat(fmtNumber.format(enforced), 'enforced', 'stat-enforce', toggle('enforce'), disp === 'enforce', 'Show only enforced reports'),
        stat(fmtNumber.format(reportOnly), 'report-only', 'stat-report', toggle('report'), disp === 'report', 'Show only report-only reports'),
        stat(fmtNumber.format(apps), apps === 1 ? 'app' : 'apps', '', () => {
          const first = els.facetSource.querySelector('button');
          first?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          first?.focus({ preventScroll: true });
        }, null, 'Jump to the Apps breakdown'),
        latest
          ? el('span', { class: 'stat', title: fmtDateTime.format(new Date(latest.receivedAt)) }, `Latest ${relTime(latest.receivedAt)}`)
          : null,
      ].filter(Boolean),
    );
  }

  const BUCKETS = [
    60e3, 5 * 60e3, 15 * 60e3, 30 * 60e3, 3600e3, 3 * 3600e3, 6 * 3600e3, 12 * 3600e3, 86400e3, 7 * 86400e3,
  ];

  function formatTick(ms, bucket) {
    const d = new Date(ms);
    return bucket >= 86400e3 ? fmtDay.format(d) : bucket >= 3600e3 ? `${fmtDay.format(d)}, ${fmtTime.format(d)}` : fmtTime.format(d);
  }

  function renderChart(list) {
    const now = Date.now();
    const oldest = list.length ? new Date(list[list.length - 1].receivedAt).getTime() : now - 3600e3;
    const span = Math.max(now - oldest, 30 * 60e3);
    const bucket = BUCKETS.find((b) => span / b <= 48) || BUCKETS[BUCKETS.length - 1];
    const bins = Math.min(48, Math.max(24, Math.ceil(span / bucket)));
    const end = Math.ceil(now / bucket) * bucket;
    const start = end - bins * bucket;

    const counts = Array.from({ length: bins }, () => ({ enforce: 0, report: 0, other: 0 }));
    for (const r of list) {
      const t = new Date(r.receivedAt).getTime();
      if (t < start) continue;
      const i = Math.min(bins - 1, Math.floor((t - start) / bucket));
      counts[i][dispositionOf(r)] += 1;
    }
    const max = Math.max(1, ...counts.map((c) => c.enforce + c.report + c.other));

    const W = bins * 10;
    const H = 96;
    const svgEl = els.chartSvg;
    svgEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svgEl.replaceChildren();
    svgEl.append(
      svg('line', { class: 'gridline', x1: 0, x2: W, y1: H / 2, y2: H / 2, 'vector-effect': 'non-scaling-stroke' }),
      svg('line', { class: 'baseline', x1: 0, x2: W, y1: H - 0.5, y2: H - 0.5, 'vector-effect': 'non-scaling-stroke' }),
    );

    counts.forEach((c, i) => {
      const g = svg('g', { class: 'bar-group' });
      const x = i * 10 + 1.5;
      g.append(svg('rect', { class: 'bar-hit', x: i * 10, y: 0, width: 10, height: H }));
      let y = H;
      for (const key of ['enforce', 'report', 'other']) {
        if (!c[key]) continue;
        const h = Math.max(2, (c[key] / max) * (H - 6));
        y -= h;
        g.append(svg('rect', { class: `bar-${key}`, x, y, width: 7, height: h, rx: 1 }));
      }
      g.dataset.index = String(i);
      svgEl.append(g);
    });

    const total = list.length;
    svgEl.setAttribute('aria-label', `${total} reports over the last ${bins} intervals, peak ${max} per interval`);
    els.chart.dataset.start = String(start);
    els.chart.dataset.bucket = String(bucket);
    els.chart._counts = counts;
    els.axisStart.textContent = formatTick(start, bucket);
    els.axisMid.textContent = formatTick(start + (bins / 2) * bucket, bucket);
    els.axisEnd.textContent = 'Now';
  }

  function showChartTip(e) {
    const g = e.target.closest('.bar-group');
    if (!g) {
      els.chartTip.hidden = true;
      return;
    }
    const i = Number(g.dataset.index);
    const c = els.chart._counts[i];
    const bucket = Number(els.chart.dataset.bucket);
    const from = Number(els.chart.dataset.start) + i * bucket;
    const box = els.chart.getBoundingClientRect();
    const bar = g.getBoundingClientRect();
    const total = c.enforce + c.report + c.other;
    els.chartTip.replaceChildren(
      ...[
        el('strong', { text: `${fmtNumber.format(total)} ${total === 1 ? 'report' : 'reports'}` }),
        ` · ${formatTick(from, bucket)}`,
        total ? el('br') : null,
        total ? `${c.enforce} enforced · ${c.report} report-only` : null,
      ].filter(Boolean),
    );
    els.chartTip.style.setProperty('--x', String(bar.left - box.left + bar.width / 2));
    els.chartTip.style.setProperty('--y', '0');
    els.chartTip.hidden = false;
  }

  function renderFacet(dim, listEl, metaEl, keyFn, limit) {
    const base = state.reports.filter((r) => matches(r, dim));
    const entries = countBy(base, keyFn);
    const active = state.filters[dim];
    const max = entries.length ? entries[0][1] : 1;
    let shown = entries.slice(0, limit);
    if (active && !shown.some(([k]) => k === active)) {
      const hit = entries.find(([k]) => k === active);
      shown = shown.concat([hit || [active, 0]]);
    }
    metaEl.textContent = entries.length ? `${fmtNumber.format(entries.length)}` : '';

    if (!shown.length) {
      listEl.replaceChildren(el('li', { class: 'facet-empty', text: 'Nothing yet' }));
      return;
    }

    listEl.replaceChildren(
      ...shown.map(([key, count]) => {
        const pressed = active === key;
        const fam = dim === 'directive' ? family(key) : null;
        const label =
          dim === 'directive'
            ? el('span', { class: 'facet-label directive', 'data-family': fam }, el('span', { class: 'swatch', 'aria-hidden': 'true' }), key)
            : el('span', { class: `facet-label${dim === 'blocked' ? ' url' : ''}`, title: key }, el('bdi', { text: key }));
        const bar = el('i');
        bar.style.setProperty('--pct', String(Math.round((count / max) * 100)));
        const btn = el(
          'button',
          {
            class: 'facet-item',
            type: 'button',
            'aria-pressed': pressed ? 'true' : 'false',
            'data-family': fam,
            title: `${key}: ${count} ${count === 1 ? 'report' : 'reports'}`,
          },
          label,
          el('span', { class: 'facet-count', text: fmtNumber.format(count) }),
          el('span', { class: 'facet-bar', 'aria-hidden': 'true' }, bar),
        );
        btn.addEventListener('click', () => setFilter(dim, pressed ? null : key));
        return el('li', null, btn);
      }),
    );
  }

  const CHIP_LABELS = { directive: 'Directive', blocked: 'Blocked', source: 'App' };

  function renderChips() {
    const f = state.filters;
    const chips = Object.keys(CHIP_LABELS)
      .filter((k) => f[k])
      .map((k) => {
        const remove = el(
          'button',
          { type: 'button', 'aria-label': `Remove ${CHIP_LABELS[k]} filter` },
        );
        remove.append(xIcon());
        remove.addEventListener('click', () => setFilter(k, null));
        return el('span', { class: 'chip' }, `${CHIP_LABELS[k]}`, el('b', { text: f[k], title: f[k] }), remove);
      });
    els.chips.replaceChildren(...chips);
    els.chips.hidden = chips.length === 0;
  }

  function xIcon() {
    const s = svg('svg', { viewBox: '0 0 10 10', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'aria-hidden': 'true' });
    s.append(svg('path', { d: 'm2 2 6 6M8 2 2 8' }));
    return s;
  }

  function renderRows(list) {
    const hasAny = state.reports.length > 0;
    els.emptyNone.hidden = hasAny || !state.loaded;
    els.emptyFiltered.hidden = !hasAny || list.length > 0;
    els.tableWrap.hidden = list.length === 0;

    const focusedId = document.activeElement && document.activeElement.closest('#rows tr')?.dataset.id;
    const slice = list.slice(0, MAX_ROWS);
    const frag = document.createDocumentFragment();
    for (const r of slice) {
      const tr = el(
        'tr',
        {
          tabindex: '0',
          'data-id': r.id,
          'data-selected': r.id === state.selectedId ? 'true' : 'false',
          class: state.newIds.has(r.id) ? 'is-new' : null,
        },
        el('td', { class: 'cell-time', title: fmtDateTime.format(new Date(r.receivedAt)), text: relTime(r.receivedAt) }),
        el('td', null, directiveNode(r)),
        el('td', { class: 'cell-url', title: blockedOf(r) }, urlNode(r.blockedURL)),
        el('td', { class: 'cell-page', title: r.documentURL || '', text: pagePath(r.documentURL) }),
        el('td', { class: 'cell-source', title: r.source, text: r.source }),
        el('td', null, dispositionPill(r)),
      );
      frag.append(tr);
    }
    els.rows.replaceChildren(frag);

    els.listFoot.hidden = list.length <= MAX_ROWS;
    els.listFoot.textContent = `Showing the newest ${fmtNumber.format(MAX_ROWS)} of ${fmtNumber.format(list.length)} reports. Narrow the filters to see older ones.`;

    if (focusedId) els.rows.querySelector(`tr[data-id="${CSS.escape(focusedId)}"]`)?.focus({ preventScroll: true });
  }

  // ---------- Inspector ----------

  const FALLBACK = {
    'script-src-elem': ['script-src'],
    'script-src-attr': ['script-src'],
    'style-src-elem': ['style-src'],
    'style-src-attr': ['style-src'],
    'worker-src': ['child-src', 'script-src'],
    'frame-src': ['child-src'],
  };

  function parsePolicy(policy) {
    return String(policy || '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => {
        const [name, ...values] = s.split(/\s+/);
        return { name: name.toLowerCase(), values: values.join(' ') };
      });
  }

  function violatedName(directives, effective) {
    const names = new Set(directives.map((d) => d.name));
    const eff = String(effective || '').toLowerCase();
    if (names.has(eff)) return eff;
    for (const alt of FALLBACK[eff] || []) if (names.has(alt)) return alt;
    if (eff.endsWith('-src') && names.has('default-src')) return 'default-src';
    return null;
  }

  function highlightJson(value) {
    const text = JSON.stringify(value, null, 2);
    const frag = document.createDocumentFragment();
    const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.append(text.slice(last, m.index));
      if (m[1]) {
        frag.append(el('span', { class: m[2] ? 'j-key' : 'j-str', text: m[1] }));
        if (m[2]) frag.append(m[2]);
      } else if (m[3]) frag.append(el('span', { class: 'j-lit', text: m[0] }));
      else frag.append(el('span', { class: 'j-num', text: m[0] }));
      last = re.lastIndex;
    }
    frag.append(text.slice(last));
    return frag;
  }

  function copyButton(getText, label) {
    const btn = el('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: label || 'Copy' });
    btn.addEventListener('click', () => copyText(getText(), btn));
    return btn;
  }

  function section(title, action, ...content) {
    return el('section', { class: 'section' }, el('div', { class: 'section-head' }, el('h3', { text: title }), action), ...content);
  }

  const FORMAT_LABELS = { 'reporting-api': 'Reporting API (report-to)', 'report-uri': 'Legacy (report-uri)' };

  function renderInspector(r) {
    const name = directiveOf(r);
    els.inspTitle.replaceChildren(
      el('span', { class: 'swatch', 'data-family': family(name), 'aria-hidden': 'true' }),
      name,
    );
    els.inspSub.replaceChildren(
      dispositionPill(r),
      el('span', { title: fmtDateTime.format(new Date(r.receivedAt)) }, `${fmtDateTime.format(new Date(r.receivedAt))} · ${relTime(r.receivedAt)}`),
      el('span', null, `App `, el('strong', { text: r.source })),
    );

    const facts = [
      ['Page', r.documentURL, true],
      ['Source file', r.sourceFile ? `${r.sourceFile}${r.lineNumber ? `:${r.lineNumber}` : ''}${r.columnNumber ? `:${r.columnNumber}` : ''}` : null, true],
      ['Sample', r.sample, true],
      ['Status code', r.statusCode],
      ['Referrer', r.referrer, true],
      ['Report type', r.type],
      ['Format', FORMAT_LABELS[r.format] || r.format],
      ['Content-Type', r.contentType, true],
      ['User agent', r.userAgent],
      ['Report age', r.age != null ? `${fmtNumber.format(r.age)} ms` : null],
      ['Received from', r.remoteAddress, true],
    ].filter(([, v]) => v != null && v !== '');

    const dl = el('dl', { class: 'facts' });
    for (const [k, v, mono] of facts) dl.append(el('dt', { text: k }), el('dd', { class: mono ? 'mono' : null, text: String(v) }));

    const parts = [
      section(
        'Blocked',
        null,
        el('div', { class: 'blocked-value' }, el('code', { text: blockedOf(r) }), copyButton(() => blockedOf(r))),
      ),
      section('Details', null, dl),
    ];

    const policy = parsePolicy(r.originalPolicy);
    if (policy.length) {
      const hit = violatedName(policy, r.effectiveDirective);
      const ul = el('ul', { class: 'policy' });
      for (const d of policy) {
        ul.append(
          el(
            'li',
            { 'data-hit': d.name === hit ? 'true' : null },
            el('span', { class: 'p-name', text: d.name }),
            el('span', { class: 'p-values', text: d.values || '(no sources)' }),
          ),
        );
      }
      const note =
        hit && hit !== String(r.effectiveDirective || '').toLowerCase()
          ? el('p', { class: 'policy-note' }, 'No ', el('code', { text: r.effectiveDirective }), ' directive, so ', el('code', { text: hit }), ' applied.')
          : null;
      parts.push(section('Policy', copyButton(() => r.originalPolicy), ul, note));
    }

    const pre = el('pre', { class: 'raw' });
    pre.append(highlightJson(r.raw ?? r));
    parts.push(section('Raw report', copyButton(() => JSON.stringify(r.raw ?? r, null, 2)), pre));

    const actions = el('div', { class: 'inspector-actions' });
    const addAction = (label, dim, value) => {
      if (!value) return;
      const b = el('button', { class: 'btn btn-sm', type: 'button', text: label });
      b.addEventListener('click', () => setFilter(dim, value));
      actions.append(b);
    };
    addAction('Filter by this directive', 'directive', name);
    addAction('Filter by this blocked URL', 'blocked', blockedOf(r));
    addAction('Filter by this app', 'source', r.source);
    parts.push(actions);

    els.inspBody.replaceChildren(...parts);

    const idx = state.visible.findIndex((x) => x.id === r.id);
    els.inspPrev.disabled = idx <= 0;
    els.inspNext.disabled = idx === -1 || idx >= state.visible.length - 1;
  }

  function openInspector(id, { focus = true } = {}) {
    const r = state.reports.find((x) => x.id === id);
    if (!r) return;
    state.selectedId = id;
    for (const tr of els.rows.querySelectorAll('tr[data-selected="true"]')) tr.setAttribute('data-selected', 'false');
    els.rows.querySelector(`tr[data-id="${CSS.escape(id)}"]`)?.setAttribute('data-selected', 'true');
    renderInspector(r);
    els.inspBody.scrollTop = 0;
    els.inspector.dataset.open = 'true';
    if (focus) els.inspClose.focus({ preventScroll: true });
  }

  function closeInspector() {
    if (els.inspector.dataset.open !== 'true') return;
    const id = state.selectedId;
    state.selectedId = null;
    els.inspector.dataset.open = 'false';
    for (const tr of els.rows.querySelectorAll('tr[data-selected="true"]')) tr.setAttribute('data-selected', 'false');
    if (id) els.rows.querySelector(`tr[data-id="${CSS.escape(id)}"]`)?.focus({ preventScroll: true });
  }

  function stepInspector(delta) {
    const idx = state.visible.findIndex((x) => x.id === state.selectedId);
    const next = state.visible[idx + delta];
    if (!next) return;
    openInspector(next.id, { focus: false });
    els.rows.querySelector(`tr[data-id="${CSS.escape(next.id)}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  // ---------- Filters & URL state ----------

  function setFilter(dim, value) {
    state.filters[dim] = value;
    if (dim === 'disposition') {
      for (const b of document.querySelectorAll('[data-disposition]')) {
        b.setAttribute('aria-pressed', b.dataset.disposition === value ? 'true' : 'false');
      }
    }
    render();
  }

  function clearFilters() {
    Object.assign(state.filters, { directive: null, blocked: null, source: null, q: '' });
    els.search.value = '';
    setFilter('disposition', '');
  }

  function readUrl() {
    const p = new URLSearchParams(location.search);
    for (const k of ['directive', 'blocked', 'source']) if (p.get(k)) state.filters[k] = p.get(k);
    const d = p.get('disposition');
    if (d === 'enforce' || d === 'report') state.filters.disposition = d;
    if (p.get('q')) {
      state.filters.q = p.get('q');
      els.search.value = state.filters.q;
    }
    for (const b of document.querySelectorAll('[data-disposition]')) {
      b.setAttribute('aria-pressed', b.dataset.disposition === state.filters.disposition ? 'true' : 'false');
    }
  }

  function syncUrl() {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(state.filters)) if (v) p.set(k, v);
    const qs = p.toString();
    const target = qs ? `${location.pathname}?${qs}` : location.pathname;
    if (target !== location.pathname + location.search) history.replaceState(null, '', target);
  }

  // ---------- Connect panel ----------

  function appSlug() {
    const v = els.appName.value.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return v || 'my-app';
  }

  function endpoints() {
    const app = encodeURIComponent(appSlug());
    const url = `${location.origin}/reporting/${app}`;
    return { to: url, uri: url };
  }

  function headerText() {
    const { to, uri } = endpoints();
    return (
      `Reporting-Endpoints: csp-endpoint="${to}"\n` +
      `Content-Security-Policy-Report-Only: default-src 'self'; report-to csp-endpoint; report-uri ${uri}`
    );
  }

  function renderEndpoints() {
    const { to, uri } = endpoints();
    const setUrl = (node, url) => {
      const i = url.lastIndexOf('/') + 1;
      node.replaceChildren(url.slice(0, i), el('b', { text: url.slice(i) }));
      node.title = url;
      node.dataset.value = url;
    };
    setUrl(els.epReportTo, to);
    setUrl(els.epReportUri, uri);

    const lines = headerText().split('\n');
    els.snippet.replaceChildren(
      ...lines.flatMap((line, i) => {
        const at = line.indexOf(':');
        return [el('span', { class: 'k', text: line.slice(0, at + 1) }), line.slice(at + 1), i < lines.length - 1 ? '\n' : ''];
      }),
    );
  }

  // ---------- Data ----------

  function setLive(stateName, text) {
    els.live.dataset.state = stateName;
    els.liveText.textContent = text;
  }

  async function load() {
    try {
      const res = await fetch('/api/reports', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      state.reports = data.reports.slice(-MAX_REPORTS);
      state.loaded = true;
      render();
    } catch (err) {
      setLive('down', `Couldn't load reports (${err.message}). Retrying…`);
    }
  }

  function connect() {
    const es = new EventSource('/api/stream');
    let opened = false;
    es.addEventListener('open', () => {
      setLive('live', 'Live');
      // Reload after a reconnect so nothing that arrived while disconnected is missed.
      if (opened) load();
      opened = true;
    });
    es.addEventListener('error', () => setLive('down', 'Reconnecting…'));
    es.addEventListener('report', (e) => {
      const r = JSON.parse(e.data);
      state.reports.push(r);
      if (state.reports.length > MAX_REPORTS) state.reports.splice(0, state.reports.length - MAX_REPORTS);
      state.newIds.add(r.id);
      scheduleRender();
    });
    es.addEventListener('cleared', () => {
      state.reports = [];
      closeInspector();
      render();
    });
  }

  // ---------- Events ----------

  els.search.addEventListener('input', () => {
    state.filters.q = els.search.value.trim();
    render();
  });

  for (const b of document.querySelectorAll('[data-disposition]')) {
    b.addEventListener('click', () => setFilter('disposition', b.dataset.disposition));
  }

  els.clearFilters.addEventListener('click', clearFilters);

  els.clearAll.addEventListener('click', async () => {
    const n = state.reports.length;
    if (!n) return;
    if (!confirm(`Delete all ${fmtNumber.format(n)} stored reports? This can't be undone.`)) return;
    els.clearAll.disabled = true;
    try {
      const res = await fetch('/api/reports', { method: 'DELETE' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      alert(`Couldn't clear reports (${err.message}). Check that the server is reachable and try again.`);
    } finally {
      els.clearAll.disabled = false;
    }
  });

  els.rows.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (tr) openInspector(tr.dataset.id, { focus: false });
  });

  els.rows.addEventListener('keydown', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openInspector(tr.dataset.id);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = e.key === 'ArrowDown' ? tr.nextElementSibling : tr.previousElementSibling;
      next?.focus();
      if (next && state.selectedId) openInspector(next.dataset.id, { focus: false });
    }
  });

  els.inspClose.addEventListener('click', closeInspector);
  els.inspPrev.addEventListener('click', () => stepInspector(-1));
  els.inspNext.addEventListener('click', () => stepInspector(1));

  els.chart.addEventListener('pointermove', showChartTip);
  els.chart.addEventListener('pointerleave', () => {
    els.chartTip.hidden = true;
  });

  document.addEventListener('keydown', (e) => {
    const typing = e.target.matches('input, textarea, select, [contenteditable="true"]');
    if (e.key === 'Escape') {
      if (els.inspector.dataset.open === 'true') closeInspector();
      else if (typing && e.target === els.search && els.search.value) {
        els.search.value = '';
        state.filters.q = '';
        render();
      }
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === '/') {
      e.preventDefault();
      els.search.focus();
      els.search.select();
    } else if (els.inspector.dataset.open === 'true' && (e.key === 'j' || e.key === 'k')) {
      stepInspector(e.key === 'j' ? 1 : -1);
    }
  });

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-copy-from]');
    if (btn) copyText($(btn.dataset.copyFrom).dataset.value, btn);
  });

  els.copyHeaders.addEventListener('click', () => copyText(headerText(), els.copyHeaders));
  els.copySnippet.addEventListener('click', () => copyText(headerText(), els.copySnippet));

  els.appName.addEventListener('input', () => {
    renderEndpoints();
    try {
      localStorage.setItem('appName', els.appName.value);
    } catch {
      // Storage unavailable; the value still applies for this session.
    }
  });

  // ---------- Boot ----------

  try {
    const saved = localStorage.getItem('appName');
    if (saved) els.appName.value = saved;
  } catch {
    // Ignore.
  }
  readUrl();
  renderEndpoints();
  render();
  load();
  connect();
  setInterval(render, 30000);
})();
