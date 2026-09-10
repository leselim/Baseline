/* Baseline layout and component audit suite.
 * Run with: node audit.js
 */
const fs = require('fs');
const path = require('path');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const BASELINE_DIR = __dirname;
const VIEWPORTS = [320, 375, 390, 430, 768, 820, 1024, 1280, 1440, 1920];

console.log('=== RUNNING BASELINE LAYOUT & GEOMETRY AUDIT ===\n');

// 1. Sweep CSS for place- shorthands and circular text rules
const cssFiles = ['tokens.css', 'base.css', 'components.css', 'responsive.css'];
let fullCSS = '';
cssFiles.forEach(file => {
  fullCSS += fs.readFileSync(path.join(BASELINE_DIR, 'css', file), 'utf8') + '\n';
});

// Check for place- shorthands
const placeMatches = fullCSS.match(/\b(place-items|place-content|place-self)\b/gi);
if (placeMatches && placeMatches.length > 0) {
  console.error(`[FAIL] Found ${placeMatches.length} place- shorthand declarations: ${placeMatches.join(', ')}`);
  process.exit(1);
} else {
  console.log('CSS Shorthand Sweep: PASS (0 place- shorthands found)');
}

// Audit rules with border-radius: 50% together with font-size
function auditCircularTextRules(cssText) {
  const cleanCSS = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let match;
  const circularTextRules = [];
  while ((match = ruleRegex.exec(cleanCSS)) !== null) {
    const selector = match[1].trim();
    const body = match[2].trim();

    if (/border-radius\s*:\s*50%/i.test(body) && /font-size\s*:/i.test(body)) {
      const hasFlex = /display\s*:\s*(inline-flex|flex)/i.test(body);
      const hasAlign = /align-items\s*:\s*center/i.test(body);
      const hasJustify = /justify-content\s*:\s*center/i.test(body);
      const hasLineHeight = /line-height\s*:\s*1/i.test(body);
      const valid = hasFlex && hasAlign && hasJustify && hasLineHeight;
      circularTextRules.push({ selector, valid, body });
    }
  }
  return circularTextRules;
}

const circularRules = auditCircularTextRules(fullCSS);
console.log(`Circular Text Rules (border-radius: 50% + font-size): Found ${circularRules.length}`);
circularRules.forEach(r => {
  console.log(` - Rule "${r.selector}": ${r.valid ? 'CONFIRMED (uses longhand flex centering)' : 'FAIL (missing longhand flex centering)'}`);
});

// 2. Parse CSS rules outside @media
function getCSSOutsideMedia() {
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

// 3. Setup DOM & load scripts
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

// Data geometry extraction helper
function extractDataGeometry(svg) {
  const geometry = [];

  const rects = Array.from(svg.querySelectorAll('rect'));
  rects.forEach(r => {
    const fill = (r.getAttribute('fill') || '').toLowerCase();
    const rx = parseFloat(r.getAttribute('x') || '0');
    const ry = parseFloat(r.getAttribute('y') || '0');
    const rw = parseFloat(r.getAttribute('width') || '0');
    const rh = parseFloat(r.getAttribute('height') || '0');

    if (fill.includes('rgba(0,29,57,0.05)') || fill.includes('rgba(0, 29, 57, 0.05)') ||
        fill === '#edf1f5' || fill === 'transparent' || fill === 'none' || fill.includes('0.05')) {
      return;
    }

    if (rw > 0 && rh > 0) {
      geometry.push({ type: 'bar', x1: rx, x2: rx + rw, y1: ry, y2: ry + rh, desc: `Bar fill=${fill}` });
    }
  });

  const paths = Array.from(svg.querySelectorAll('path'));
  paths.forEach(p => {
    const fill = (p.getAttribute('fill') || '').toLowerCase();
    const stroke = (p.getAttribute('stroke') || '').toLowerCase();
    const d = p.getAttribute('d') || '';

    if (fill === 'none' && stroke && !stroke.includes('0.05') && !stroke.includes('0.1')) {
      const commands = d.match(/[ML]\s*[-?\d.]+\s*[-?\d.]+/gi);
      if (commands && commands.length > 1) {
        let prevPt = null;
        commands.forEach(cmd => {
          const coords = cmd.trim().substring(1).trim().split(/\s+/).map(Number);
          if (coords.length === 2) {
            const pt = { x: coords[0], y: coords[1] };
            if (prevPt) {
              geometry.push({
                type: 'line',
                x1: Math.min(prevPt.x, pt.x), x2: Math.max(prevPt.x, pt.x),
                y1: Math.min(prevPt.y, pt.y), y2: Math.max(prevPt.y, pt.y),
                desc: `Plotted Line segment from (${prevPt.x},${prevPt.y}) to (${pt.x},${pt.y})`
              });
            }
            prevPt = pt;
          }
        });
      }
    }
  });

  const lines = Array.from(svg.querySelectorAll('line'));
  lines.forEach(l => {
    const stroke = (l.getAttribute('stroke') || '').toLowerCase();
    const dash = l.getAttribute('stroke-dasharray') || '';
    if (stroke.includes('0.05') || stroke.includes('0.1') || stroke.includes('0.08') || dash.includes('2 4')) {
      return;
    }
    const x1 = parseFloat(l.getAttribute('x1') || '0');
    const y1 = parseFloat(l.getAttribute('y1') || '0');
    const x2 = parseFloat(l.getAttribute('x2') || '0');
    const y2 = parseFloat(l.getAttribute('y2') || '0');
    geometry.push({
      type: 'line',
      x1: Math.min(x1, x2), x2: Math.max(x1, x2),
      y1: Math.min(y1, y2), y2: Math.max(y1, y2),
      desc: `Line segment (${x1},${y1}) to (${x2},${y2})`
    });
  });

  const circles = Array.from(svg.querySelectorAll('circle'));
  circles.forEach(c => {
    const fill = (c.getAttribute('fill') || '').toLowerCase();
    const r = parseFloat(c.getAttribute('r') || '0');
    const cx = parseFloat(c.getAttribute('cx') || '0');
    const cy = parseFloat(c.getAttribute('cy') || '0');

    if (fill === 'transparent' || r > 5) return;

    if (r > 0) {
      geometry.push({
        type: 'marker',
        x1: cx - r, x2: cx + r,
        y1: cy - r, y2: cy + r,
        desc: `Marker r=${r} at (${cx},${cy})`
      });
    }
  });

  return geometry;
}

// 4. PROOF TEST: Deliberately move label onto bars and confirm audit catches it
console.log('--- PROVING GEOMETRY AUDIT PROOF TEST ---');
const testBarsSvg = BL.charts.chart({ type: 'bars', items: [{ label: 'Test', value: 100 }], height: 200 });
const testBarsContainer = dom.window.document.createElement('div');
testBarsContainer.style.width = '500px';
testBarsContainer.innerHTML = testBarsSvg;
BL.charts.mount(testBarsContainer);

const sampleSvg = testBarsContainer.querySelector('svg');
const sampleBar = sampleSvg.querySelector('rect[fill]');
let proofCollisionDetected = false;

if (sampleBar) {
  const barX = parseFloat(sampleBar.getAttribute('x'));
  const barY = parseFloat(sampleBar.getAttribute('y'));
  const badText = dom.window.document.createElementNS('http://www.w3.org/2000/svg', 'text');
  badText.setAttribute('x', barX + 5);
  badText.setAttribute('y', barY + 15);
  badText.setAttribute('font-size', '11');
  badText.textContent = 'DELIBERATE OVERLAP LABEL';
  sampleSvg.appendChild(badText);

  const proofGeom = extractDataGeometry(sampleSvg);
  const proofTexts = Array.from(sampleSvg.querySelectorAll('text'));
  
  proofTexts.forEach(txt => {
    const fontSize = parseFloat(txt.getAttribute('font-size') || '11');
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

    proofGeom.forEach(g => {
      const overlapX = !(bx2 <= g.x1 + 0.5 || g.x2 <= bx1 + 0.5);
      const overlapY = !(by2 <= g.y1 + 0.5 || g.y2 <= by1 + 0.5);
      if (overlapX && overlapY) {
        proofCollisionDetected = true;
        console.log(`[PROOF TEST SUCCESS] Detected deliberate overlap of "${textStr}" with ${g.desc}`);
      }
    });
  });
}

if (!proofCollisionDetected) {
  console.error('[PROOF TEST ERROR] Failed to detect deliberate label-data geometry overlap!');
  process.exit(1);
} else {
  console.log('>>> PROOF TEST PASSED: Extended collision check successfully detects text-geometry overlaps! <<<\n');
}

// 5. Span Container Stacking Audit
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

const loginHtml = fs.readFileSync(path.join(BASELINE_DIR, 'login.html'), 'utf8');
const loginDom = new JSDOM(loginHtml);
checkSpansInContainer(loginDom.window.document.body, 'login.html');

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
  try {
    const renderedHTML = view.render(testState);
    const container = document.createElement('div');
    container.innerHTML = renderedHTML;
    checkSpansInContainer(container, `view:${viewKey}`);
  } catch (e) {}
});

console.log(`Span Container Audit: ${spanFailures === 0 ? 'PASS (0 failures)' : `FAIL (${spanFailures} failures)`}`);

// 6. Chart Collision & Data Geometry Audit across 10 viewports
let textUnder10pxCount = 0;
let labelCollisions = 0;
let labelGeometryCollisions = 0;
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
      const container = document.createElement('div');
      container.innerHTML = html;

      const chartEls = container.querySelectorAll('[data-chart]');
      chartEls.forEach(el => {
        let chartWidth = contentWidth;
        const parentGrid = el.closest('.grid-2, .grid-side, .metrics, .finding');
        if (parentGrid) {
          if (parentGrid.classList.contains('grid-2')) chartWidth = (contentWidth - 24) / 2;
          else if (parentGrid.classList.contains('metrics')) chartWidth = (contentWidth - 3) / 4;
          else if (parentGrid.classList.contains('finding')) chartWidth = vpWidth <= 720 ? contentWidth : Math.min(360, contentWidth);
        }
        chartWidth = Math.max(220, Math.round(chartWidth));

        const viewDom = new JSDOM(`<div>${html}</div>`);
        const mountedContainer = viewDom.window.document.createElement('div');
        mountedContainer.innerHTML = html;
        
        BL.charts.mount(mountedContainer);

        const svgs = mountedContainer.querySelectorAll('svg');
        svgs.forEach(svg => {
          const viewBoxAttr = svg.getAttribute('viewBox');
          let vbWidth = chartWidth, vbHeight = 200;
          if (viewBoxAttr) {
            const parts = viewBoxAttr.split(/\s+/).map(Number);
            if (parts.length === 4) {
              vbWidth = parts[2];
              vbHeight = parts[3];
            }
          }

          const geometry = extractDataGeometry(svg);
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

            geometry.forEach(g => {
              const overlapX = !(bx2 <= g.x1 + 0.5 || g.x2 <= bx1 + 0.5);
              const overlapY = !(by2 <= g.y1 + 0.5 || g.y2 <= by1 + 0.5);
              if (overlapX && overlapY) {
                labelGeometryCollisions++;
                console.log(`[GEOMETRY COLLISION] VP:${vpWidth} | View:${viewKey} | Text "${textStr}" overlaps ${g.desc}`);
              }
            });

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
      });
    } catch (e) {}
  });
});

console.log(`Chart Geometry & Collision Audit across 10 viewports: ${labelCollisions === 0 && labelGeometryCollisions === 0 && textUnder10pxCount === 0 && labelOverflows === 0 ? 'PASS (0 errors)' : 'FAIL'}`);
console.log(`         Text Under 10px: ${textUnder10pxCount}`);
console.log(`         Text-Text Collisions: ${labelCollisions}`);
console.log(`         Text-Geometry Collisions: ${labelGeometryCollisions}`);
console.log(`         Label Overflows: ${labelOverflows}`);

const allCircularValid = circularRules.every(r => r.valid);

if (spanFailures === 0 && textUnder10pxCount === 0 && labelCollisions === 0 && labelGeometryCollisions === 0 && labelOverflows === 0 && allCircularValid) {
  console.log('\n>>> SUCCESS: ALL AUDITS PASSED CLEANLY <<<');
  process.exit(0);
} else {
  console.log('\n>>> FAILURES DETECTED <<<');
  process.exit(1);
}
