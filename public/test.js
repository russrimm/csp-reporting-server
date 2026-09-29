'use strict';

// Loaded in <head>, before the page's intentional violations, so every securitypolicyviolation event is captured.
(() => {
  const seen = [];
  let ready = false;

  const CHECKS = {
    style: (e) => e.blocked === 'inline' && e.directive.startsWith('style'),
    script: (e) => e.blocked === 'inline' && e.directive.startsWith('script'),
    img: (e) => e.directive === 'img-src',
    eval: (e) => e.blocked === 'eval',
  };

  const MODE_TEXT = {
    both: 'Both report-to and report-uri are set. Browsers that support report-to use it and ignore report-uri.',
    'report-to': 'Only report-to (Reporting API). The browser batches deliveries.',
    'report-uri': 'Only the legacy report-uri. Each violation is sent immediately.',
  };

  document.addEventListener('securitypolicyviolation', (e) => {
    seen.push({
      directive: String(e.effectiveDirective || e.violatedDirective || ''),
      blocked: String(e.blockedURI || ''),
      disposition: e.disposition,
      time: new Date(),
    });
    if (ready) update();
  });

  const fmtTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

  function setCheck(li, stateName, text) {
    li.dataset.state = stateName;
    li.querySelector('.check-state').textContent = text;
  }

  function update() {
    const root = document.documentElement;
    const styleApplied = getComputedStyle(root).outlineStyle === 'solid';
    const failed = {
      style: styleApplied,
      script: root.dataset.inlineScriptRan === 'true',
    };

    for (const li of document.querySelectorAll('[data-check]')) {
      const id = li.dataset.check;
      if (seen.some(CHECKS[id])) setCheck(li, 'blocked', 'Blocked');
      else if (failed[id]) setCheck(li, 'failed', 'Not blocked');
      else if (id === 'eval' && (li.dataset.state === 'idle' || li.dataset.state === 'failed')) continue;
      else setCheck(li, 'waiting', 'Waiting');
    }

    const list = document.getElementById('events');
    const count = document.getElementById('eventCount');
    count.textContent = seen.length ? `${seen.length}` : '';
    if (!seen.length) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'ev-empty';
      span.textContent = 'No violations observed yet.';
      li.append(span);
      list.replaceChildren(li);
      return;
    }
    list.replaceChildren(
      ...seen
        .slice()
        .reverse()
        .map((ev) => {
          const li = document.createElement('li');
          const time = document.createElement('time');
          time.dateTime = ev.time.toISOString();
          time.textContent = fmtTime.format(ev.time);
          const text = document.createElement('span');
          const code = document.createElement('code');
          code.textContent = ev.directive;
          text.append(code, ` blocked ${ev.blocked || '(unknown)'}`);
          li.append(time, text);
          return li;
        }),
    );
  }

  async function showHeaders() {
    const box = document.getElementById('headers');
    try {
      const res = await fetch(location.href, { cache: 'no-store' });
      const blocks = [
        ['Content-Security-Policy', res.headers.get('content-security-policy'), (v) => v.split(/;\s*/).join(';\n')],
        ['Reporting-Endpoints', res.headers.get('reporting-endpoints'), (v) => v],
      ].filter(([, v]) => v);
      box.replaceChildren(
        ...blocks.map(([name, value, format]) => {
          const div = document.createElement('div');
          div.className = 'header-block';
          const h = document.createElement('h3');
          h.textContent = name;
          const pre = document.createElement('pre');
          pre.textContent = format(value);
          div.append(h, pre);
          return div;
        }),
      );
    } catch (err) {
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = `Couldn't read the response headers (${err.message}). Reload the page to try again.`;
      box.replaceChildren(p);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    ready = true;

    const mode = new URLSearchParams(location.search).get('mode');
    const current = MODE_TEXT[mode] ? mode : 'both';
    document.getElementById('modeDesc').textContent = MODE_TEXT[current];
    for (const a of document.querySelectorAll('[data-mode]')) {
      if (a.matches('a') && a.dataset.mode === current) a.setAttribute('aria-current', 'page');
    }

    document.getElementById('runEval').addEventListener('click', () => {
      const li = document.querySelector('[data-check="eval"]');
      setCheck(li, 'waiting', 'Waiting');
      try {
        eval('1 + 1');
        setCheck(li, 'failed', 'Not blocked');
      } catch {
        // Expected: CSP blocks eval and fires securitypolicyviolation.
      }
      update();
    });

    update();
    showHeaders();
    // Image violations can land after DOMContentLoaded.
    window.addEventListener('load', update);
  });
})();
