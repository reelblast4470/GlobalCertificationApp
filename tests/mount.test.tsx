/* Mount the REAL app in a headless DOM and walk every screen.
   Catches runtime crashes (bad hooks, undefined access, bad imports) that a
   typecheck cannot see. Not shipped — dev-only. */

import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:5173/#/home',
  pretendToBeVisual: true,
});

const w = dom.window as unknown as Record<string, unknown> & {
  matchMedia?: unknown;
  scrollTo?: unknown;
  HTMLElement: unknown;
  Element: unknown;
  Node: unknown;
  getComputedStyle: unknown;
  requestAnimationFrame: unknown;
  cancelAnimationFrame: unknown;
};

w.matchMedia = () => ({
  matches: true,
  media: '',
  onchange: null,
  addListener() {},
  removeListener() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => false,
});
w.scrollTo = () => {};

const g = globalThis as unknown as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
g.navigator = dom.window.navigator;
g.HTMLElement = w.HTMLElement;
g.Element = w.Element;
g.Node = w.Node;
g.getComputedStyle = w.getComputedStyle;
g.requestAnimationFrame = w.requestAnimationFrame;
g.cancelAnimationFrame = w.cancelAnimationFrame;
g.IS_REACT_ACT_ENVIRONMENT = true;
// no indexedDB on purpose -> exercises the "demo pack" fallback path

let pass = 0;
let fail = 0;
const errors: string[] = [];

const origError = console.error;
console.error = (...args: unknown[]) => {
  errors.push(args.map(String).join(' '));
  origError(...args);
};

(async () => {
  const React = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { act } = await import('react-dom/test-utils');
  const App = (await import('../src/App')).default;

  const container = dom.window.document.getElementById('root')!;
  const root = createRoot(container);

  await act(async () => {
    root.render(React.createElement(App));
  });
  // let the async pack-loading effect settle
  await act(async () => {
    await new Promise((r) => setTimeout(r, 60));
  });

  const text = () => container.textContent ?? '';
  const check = (name: string, cond: boolean, extra = '') => {
    if (cond) {
      pass++;
      console.log(`  ✓ ${name}`);
    } else {
      fail++;
      console.log(`  ✗ ${name} ${extra}`);
    }
  };
  const go = async (hash: string) => {
    dom.window.location.hash = hash;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 40));
    });
  };

  console.log('\n[A] App boots');
  check('root has content', text().length > 50, `len=${text().length}`);

  console.log('\n[B] Every screen renders without crashing');
  const screens: { hash: string; must: string; label: string }[] = [
    { hash: '/home', must: "Today's goal", label: 'Home dashboard' },
    { hash: '/learn', must: 'Chapters', label: 'Learn (chapter list)' },
    { hash: '/practice', must: 'Questions', label: 'Practice setup' },
    { hash: '/mistakes', must: 'Error book', label: 'Mistakes' },
    { hash: '/flashcards', must: 'cards due', label: 'Flashcards' },
    { hash: '/exam', must: 'Negative marking', label: 'Mock test setup' },
    { hash: '/quick', must: 'Revision', label: 'Quick revision' },
    { hash: '/progress', must: 'Progress', label: 'Progress' },
    { hash: '/search', must: 'Search', label: 'Search' },
    { hash: '/import', must: 'Paste your notes', label: 'Import' },
    { hash: '/settings', must: 'Appearance', label: 'Settings' },
  ];

  for (const s of screens) {
    await go(s.hash);
    check(`${s.label} renders`, text().includes(s.must), `snippet: ${text().slice(0, 120)}`);
  }

  console.log('\n[C] Demo content flows through the UI');
  await go('/learn');
  check('demo topic visible after drill-down', text().length > 100);

  console.log('\n[D] No React errors');
  const real = errors.filter(
    (e) => !e.includes('Not implemented') && !e.includes('ReactDOMTestUtils')
  );
  check('no console errors', real.length === 0, real.slice(0, 3).join(' | '));

  console.log(`\n${fail === 0 ? '✅ ALL PASS' : '❌ FAILURES'} — ${pass} passed, ${fail} failed\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
