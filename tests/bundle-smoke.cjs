/**
 * End-to-end smoke test of the SHIPPED Streamlit bundle.
 *
 * Loads static/exam-coach.html exactly as a browser would (scripts executed),
 * stubs what jsdom lacks, and asserts the React app actually mounts and renders
 * the dashboard inside the page. This is the closest thing to "does it work on
 * Streamlit" without a real browser.
 *
 * Run: node tests/bundle-smoke.cjs
 */

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const bundlePath = path.join(__dirname, '..', 'static', 'exam-coach.html');
let html = fs.readFileSync(bundlePath, 'utf8');

// jsdom cannot execute type="module"; the Vite bundle is a single self-contained
// chunk with no imports or exports, so it is safe to run as a classic script.
const moduleScript = html.match(/<script type="module">\n([\s\S]*?)\n<\/script>/);
if (!moduleScript) {
  console.error('✗ no inlined module script found in bundle');
  process.exit(1);
}
// NOTE: leave the `<\/script>` escape in place — un-escaping it would let the
// HTML parser terminate the script early and produce a bogus SyntaxError.
const js = moduleScript[1];
if (/^\s*(import|export)\s/m.test(js)) {
  console.error('✗ bundle contains ES module syntax — cannot run in jsdom');
  process.exit(1);
}
// Strip every <script> block: the bundle is executed via window.eval() instead.
// Embedding 264 KB of minified JS back into HTML makes the parser brittle (any
// </script> sequence in a string ends the tag early), and eval avoids that entirely.
html = html.replace(/<script[\s\S]*?<\/script>/g, '');

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e) => {
  // "Not implemented" noise (navigation, layout) is expected in jsdom
  if (!/Not implemented/.test(e.message)) errors.push(e.message + '\n' + (e.stack || ''));
});
virtualConsole.on('error', (m) => errors.push(String(m)));

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'https://exam-coach.streamlit.app/',
  virtualConsole,
  beforeParse(window) {
    // jsdom implements neither of these; the app feature-detects but still needs them
    window.matchMedia = () => ({
      matches: true,
      media: '',
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    });
    window.scrollTo = () => {};
    // no window.indexedDB -> exercises the "no installed packs" fallback
  },
});

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} ${extra}`);
  }
};

// execute the bundle in the window context, exactly as a browser would
try {
  dom.window.eval(js);
} catch (e) {
  console.error('✗ bundle threw while executing:', e && e.message);
  process.exit(1);
}

setTimeout(() => {
  const doc = dom.window.document;
  const root = doc.getElementById('root');
  const text = (root && root.textContent) || '';

  console.log('\n[Streamlit bundle — executed in a DOM]');
  check('React mounted into #root', !!root && root.children.length > 0);
  check('dashboard rendered', text.includes('get a step ahead'), `snippet: ${text.slice(0, 120)}`);
  check('today\'s goal rendered', text.includes("Today's goal"));
  check('bottom nav rendered', text.includes('Practice') && text.includes('Mistakes'));
  check('quick actions rendered', text.includes('Flashcards') || text.includes('Mock Test'));

  // storage must work inside Streamlit's allow-same-origin iframe
  let storageOk = false;
  try {
    dom.window.localStorage.setItem('__t', '1');
    storageOk = dom.window.localStorage.getItem('__t') === '1';
  } catch (e) {
    storageOk = false;
  }
  check('localStorage usable (progress will persist)', storageOk);

  const real = errors.filter((e) => !/Not implemented|Could not parse CSS/i.test(e));
  check('no runtime errors', real.length === 0, real.slice(0, 2).join(' | ').slice(0, 400));

  console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
}, 1200);
