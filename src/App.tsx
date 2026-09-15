import React from 'react';
import { AppProvider, useApp } from './state/AppContext';
import { BottomNav, type TabKey } from './components/Layout';
import Home from './screens/Home';
import Learn from './screens/Learn';
import Practice from './screens/Practice';
import Mistakes from './screens/Mistakes';
import Flashcards from './screens/Flashcards';
import Exam from './screens/Exam';
import Quick from './screens/Quick';
import Progress from './screens/Progress';
import Search from './screens/Search';
import Import from './screens/Import';
import Settings from './screens/Settings';

export type Route = {
  path: string;
  params: Record<string, string>;
};

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#/, '') || '/home';
  const [path, query] = hash.split('?');
  const params: Record<string, string> = {};
  if (query) new URLSearchParams(query).forEach((v, k) => (params[k] = v));
  return { path: path || '/home', params };
}

const TAB_BY_PATH: Record<string, TabKey> = {
  '/home': 'home',
  '/learn': 'learn',
  '/practice': 'practice',
  '/mistakes': 'mistakes',
  '/flashcards': 'more',
  '/exam': 'more',
  '/quick': 'more',
  '/progress': 'more',
  '/search': 'more',
  '/import': 'more',
  '/settings': 'more',
};

function Shell() {
  const app = useApp();
  const [route, setRoute] = React.useState<Route>(() => parseHash());
  const navigate = React.useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  React.useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // theme
  React.useEffect(() => {
    const t = app.user.settings.theme;
    const dark =
      t === 'dark' ||
      (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b1020' : '#f5f6fb');
  }, [app.user.settings.theme]);

  if (!app.ready) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <div className="text-center">
          <div className="text-4xl">🎓</div>
          <div className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            Loading your course…
          </div>
        </div>
      </div>
    );
  }

  const { path, params } = route;
  const tab = TAB_BY_PATH[path] ?? 'home';

  const screen = (() => {
    switch (path) {
      case '/learn':
        return <Learn navigate={navigate} initialTopicId={params.topic} />;
      case '/practice':
        return <Practice navigate={navigate} initialTopicId={params.topic} />;
      case '/mistakes':
        return <Mistakes navigate={navigate} />;
      case '/flashcards':
        return <Flashcards navigate={navigate} />;
      case '/exam':
        return <Exam navigate={navigate} />;
      case '/quick':
        return <Quick navigate={navigate} initialTopicId={params.topic} />;
      case '/progress':
        return <Progress navigate={navigate} />;
      case '/search':
        return <Search navigate={navigate} />;
      case '/import':
        return <Import navigate={navigate} />;
      case '/settings':
        return <Settings navigate={navigate} />;
      default:
        return <Home navigate={navigate} />;
    }
  })();

  return (
    <div className="app">
      {screen}
      <BottomNav tab={tab} navigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
