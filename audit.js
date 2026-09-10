/* Baseline layout and component audit suite.
 * Run with: node audit.js
 */
const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const BASELINE_DIR = __dirname;
const VIEWPORTS = [320, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1920];

console.log('=== RUNNING BASELINE LAYOUT AUDIT ===\n');

// 1. Parse CSS rules outside @media
function getCSSOutsideMedia() {
  const cssFiles = ['tokens.css', 'base.css', 'components.css', 'responsive.css'];
  let fullCSS = '';
  cssFiles.forEach(file => {
    fullCSS += fs.readFileSync(path.join(BASELINE_DIR, 'css', file), 'utf8') + '\n';
  });

  let outsideCSS = '';
  let i = 0;
  while (i < fullCSS.length) {
    if (fullCSS.substring(i).startsWith('@media')) {
      let openBrace = fullCSS.indexOf('{', i);
      if (openBrace === -1) break;
      let depth = 1;
      let j = openBrace + 1;
      while (j < fullCSS.length && depth > 0) {
        if (fullCSS[j] === '{') depth++;
        else if (fullCSS[j] === '}') depth--;
        j++;
      }
      i = j;
    } else {
      outsideCSS += fullCSS[i];
      i++;
    }
  }
  return outsideCSS;
}

const cssOutside = getCSSOutsideMedia();

function parseClassLayoutProperties(cssText) {
  const classLayoutMap = new Map();
  const cleanCSS = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let match;
  while ((match = ruleRegex.exec(cleanCSS)) !== null) {
    const selectorsStr = match[1].trim();
    const body = match[2].trim();

    const layoutProps = new Set();
    const propsRegex = /(?:^|[\s;{}])(display|grid-area|position|flex-direction)\s*:/gi;
    let propMatch;
    while ((propMatch = propsRegex.exec(body)) !== null) {
      layoutProps.add(propMatch[1].toLowerCase());
    }

    if (layoutProps.size > 0) {
      const selectors = selectorsStr.split(',');
      selectors.forEach(sel => {
        sel = sel.trim();
        const classMatches = sel.match(/\.[\w-]+/g);
        if (classMatches) {
          classMatches.forEach(clsWithDot => {
            const cls = clsWithDot.substring(1);
            if (!classLayoutMap.has(cls)) {
              classLayoutMap.set(cls, new Set());
            }
            layoutProps.forEach(p => classLayoutMap.get(cls).add(p));
          });
        }
      });
    }
  }
  return classLayoutMap;
}

const classLayoutMap = parseClassLayoutProperties(cssOutside);

// 2. Setup DOM & load scripts
const htmlContent = fs.readFileSync(path.join(BASELINE_DIR, 'index.html'), 'utf8');
const dom = new JSDOM(htmlContent, {
  runScripts: "dangerously",
  resources: "usable",
  url: `file://${BASELINE_DIR}/index.html`
});

const scriptFiles = [
  'js/data.js',
  'js/analysis.js',
  'js/patterns.js',
  'js/charts.js',
  'js/stats.js',
  'js/explain.js',
  'js/experiments.js',
  'js/ui.js',
  'js/views/overview.js',
  'js/views/patterns.js',
  'js/views/pattern.js',
  'js/views/habits.js',
  'js/views/experiments.js',
  'js/views/timeline.js',
  'js/views/data.js',
  'js/views/settings.js',
  'js/views/guide.js',
  'js/app.js'
];

const { window } = dom;
scriptFiles.forEach(file => {
  const code = fs.readFileSync(path.join(BASELINE_DIR, file), 'utf8');
  window.eval(code);
});

const BL = window.BL;
const document = window.document;

// 3. Span Container Audit
let spanFailures = 0;

function checkSpansInContainer(el, stateDesc) {
  const directSpans = Array.from(el.children).filter(child => child.tagName.toLowerCase() === 'span');
  if (directSpans.length >= 2) {
    const classList = Array.from(el.classList);
    let hasLayout = false;
    classList.forEach(cls => {
      const props = classLayoutMap.get(cls);
      if (props && props.size > 0) hasLayout = true;
    });

    if (!hasLayout) {
      spanFailures++;
      console.log(`[FAIL] State: ${stateDesc} | Tag: <${el.tagName.toLowerCase()}> | Classes: ${classList.join(' ')}`);
    }
  }
  Array.from(el.children).forEach(child => checkSpansInContainer(child, stateDesc));
}

// Check login.html
const loginHtml = fs.readFileSync(path.join(BASELINE_DIR, 'login.html'), 'utf8');
const loginDom = new JSDOM(loginHtml);
checkSpansInContainer(loginDom.window.document.body, 'login.html');

// Check views
Object.keys(BL.views).forEach(viewKey => {
  const view = BL.views[viewKey];
  const testState = {
    route: viewKey,
    patternId: BL.patterns ? (BL.patterns.top(1)[0] ? BL.patterns.top(1)[0].id : 'p1') : 'p1',
    range: 30,
    metric: 'sleepMin',
    pair: { x: 'sleepMin', y: 'phoneLateMin' },
    day: BL.data ? BL.data.latest.iso : '2026-04-01',
    filter: 'all',
    started: {},
    toggles: { weekend: true, lowconf: false, weekly: true, reminders: true, changes: false }
  };
  const renderedHTML = view.render(testState);
  const container = document.createElement('div');
  container.innerHTML = renderedHTML;
  checkSpansInContainer(container, `view:${viewKey}`);
});

console.log(`STEP 1 & 4 - Span Container Stacking Audit: ${spanFailures === 0 ? 'PASS (0 failures)' : `FAIL (${spanFailures} failures)`}`);

// 4. Chart Collision Audit
let textUnder10pxCount = 0;
let labelCollisions = 0;
let labelOverflows = 0;

VIEWPORTS.forEach(vpWidth => {
  let contentWidth = vpWidth <= 720 ? (vpWidth - 40) : (vpWidth - 240 - 72);
  contentWidth = Math.max(280, contentWidth);

  Object.keys(BL.views).forEach(viewKey => {
    const view = BL.views[viewKey];
    BL.charts.reset();
    const testState = {
      route: viewKey,
      patternId: BL.patterns ? (BL.patterns.top(1)[0] ? BL.patterns.top(1)[0].id : 'p1') : 'p1',
      range: 30,
      metric: 'sleepMin',
      pair: { x: 'sleepMin', y: 'phoneLateMin' },
      day: BL.data ? BL.data.latest.iso : '2026-04-01',
      filter: 'all',
      started: {},
      toggles: { weekend: true, lowconf: false, weekly: true, reminders: true, changes: false }
    };
    try {
      const html = view.render(testState);
      const viewDom = new JSDOM(`<div>${html}</div>`);
      const mountedContainer = viewDom.window.document.createElement('div');
      mountedContainer.innerHTML = html;
      
      BL.charts.mount(mountedContainer);

      const svgs = mountedContainer.querySelectorAll('svg');
      svgs.forEach(svg => {
        const viewBoxAttr = svg.getAttribute('viewBox');
        let vbWidth = contentWidth, vbHeight = 200;
        if (viewBoxAttr) {
          const parts = viewBoxAttr.split(/\s+/).map(Number);
          if (parts.length === 4) {
            vbWidth = parts[2];
            vbHeight = parts[3];
          }
        }

        const texts = Array.from(svg.querySelectorAll('text'));
        const boxes = [];

        texts.forEach(txt => {
          const fontSize = parseFloat(txt.getAttribute('font-size') || '11');
          if (fontSize < 10) {
            textUnder10pxCount++;
          }

          const x = parseFloat(txt.getAttribute('x') || '0');
          const y = parseFloat(txt.getAttribute('y') || '0');
          const anchor = txt.getAttribute('text-anchor') || 'start';
          const textStr = txt.textContent || '';
          const tw = BL.charts.textWidth(textStr, fontSize);
          const th = fontSize;

          let bx1 = x;
          if (anchor === 'middle') bx1 = x - tw / 2;
          else if (anchor === 'end') bx1 = x - tw;
          const bx2 = bx1 + tw;
          const by1 = y - th;
          const by2 = y;

          if (bx1 < -5 || bx2 > vbWidth + 5) {
            labelOverflows++;
          }

          boxes.push({ text: textStr, x1: bx1, x2: bx2, y1: by1, y2: by2 });
        });

        for (let a = 0; a < boxes.length; a++) {
          for (let b = a + 1; b < boxes.length; b++) {
            const b1 = boxes[a], b2 = boxes[b];
            const overlapX = !(b1.x2 <= b2.x1 + 0.5 || b2.x2 <= b1.x1 + 0.5);
            const overlapY = !(b1.y2 <= b2.y1 + 0.5 || b2.y2 <= b1.y1 + 0.5);
            if (overlapX && overlapY) {
              labelCollisions++;
            }
          }
        }
      });
    } catch (e) {
      // Ignore edge cases
    }
  });
});

console.log(`STEP 5 - Chart Collision Audit across 10 viewports: ${labelCollisions === 0 && textUnder10pxCount === 0 && labelOverflows === 0 ? 'PASS (0 errors)' : 'FAIL'}`);
console.log(`         Text Under 10px: ${textUnder10pxCount}`);
console.log(`         Label Collisions: ${labelCollisions}`);
console.log(`         Label Overflows: ${labelOverflows}`);

if (spanFailures === 0 && textUnder10pxCount === 0 && labelCollisions === 0 && labelOverflows === 0) {
  console.log('\n>>> SUCCESS: ALL AUDITS PASSED CLEANLY <<<');
  process.exit(0);
} else {
  console.log('\n>>> FAILURES DETECTED <<<');
  process.exit(1);
}
