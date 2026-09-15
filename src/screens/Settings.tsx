import React from 'react';
import { useApp } from '../state/AppContext';
import { Screen } from '../components/Layout';
import { Chip, Segmented } from '../components/ui/primitives';
import { exportProgress } from '../engine/storage';
import { exportPack } from '../data/registry';
import { isDemo } from '../data/registry';

export default function Settings({ navigate }: { navigate: (to: string) => void }) {
  const app = useApp();
  const { user, packs } = app;
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [installEvent, setInstallEvent] = React.useState<Event | null>(null);

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const download = (name: string, data: string) => {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Screen title="Settings" subtitle="Make it fit how you study">
      {/* appearance */}
      <div className="card p-3">
        <div className="mb-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Appearance
        </div>
        <Segmented
          value={user.settings.theme}
          onChange={(v) => app.updateSettings({ theme: v })}
          options={[
            { value: 'dark', label: '🌙 Dark' },
            { value: 'light', label: '☀️ Light' },
            { value: 'system', label: '📱 System' },
          ]}
        />
      </div>

      {/* exam defaults */}
      <div className="card mt-3 p-3">
        <div className="mb-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Mock test defaults
        </div>
        <div className="mb-2">
          <div className="mb-1 text-[13px]">Negative marking</div>
          <Segmented
            value={String(user.settings.negativeMarking)}
            onChange={(v) => app.updateSettings({ negativeMarking: Number(v) })}
            options={[
              { value: '0', label: 'None' },
              { value: '0.25', label: '-0.25' },
              { value: '0.33', label: '-0.33' },
              { value: '0.5', label: '-0.50' },
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[13px]">
            Questions
            <input
              type="number"
              min={5}
              max={200}
              value={user.settings.examLength}
              onChange={(e) => app.updateSettings({ examLength: Number(e.target.value) })}
            />
          </label>
          <label className="text-[13px]">
            Minutes
            <input
              type="number"
              min={5}
              max={300}
              value={user.settings.examMinutes}
              onChange={(e) => app.updateSettings({ examMinutes: Number(e.target.value) })}
            />
          </label>
        </div>
      </div>

      {/* practice */}
      <div className="card mt-3 p-3">
        <div className="mb-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Practice
        </div>
        <div className="mb-2">
          <div className="mb-1 text-[13px]">Option order</div>
          <Segmented
            value={user.settings.optionShuffle ? 'shuffle' : 'fixed'}
            onChange={(v) => app.updateSettings({ optionShuffle: v === 'shuffle' })}
            options={[
              { value: 'shuffle', label: 'Shuffle each time' },
              { value: 'fixed', label: 'Fixed order' },
            ]}
          />
        </div>
        <div>
          <div className="mb-1 text-[13px]">Daily question goal</div>
          <input
            type="number"
            min={5}
            max={300}
            value={user.settings.dailyGoalQuestions}
            onChange={(e) => app.updateSettings({ dailyGoalQuestions: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* content */}
      <div className="card mt-3 p-3">
        <div className="mb-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Content packs
        </div>
        <div className="flex flex-col gap-2">
          {packs.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl p-2" style={{ background: 'var(--surface2)' }}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold">{p.title}</div>
                <div className="text-[11px]" style={{ color: 'var(--muted)' }}>
                  {p.examLabel} · v{p.version} · {new Date(p.generatedAt ?? Date.now()).toLocaleDateString()}
                </div>
              </div>
              <button className="btn btn-sm" onClick={() => download(`${p.id}.json`, exportPack(p))}>
                Export
              </button>
              {!isDemo(p) && (
                <button
                  className="btn btn-sm btn-danger"
                  onClick={async () => {
                    if (confirm(`Remove "${p.title}"? Your progress data stays.`)) await app.deletePack(p.id);
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button className="btn btn-sm mt-2" onClick={() => navigate('/import')}>
          📥 Import more notes
        </button>
      </div>

      {/* data */}
      <div className="card mt-3 p-3">
        <div className="mb-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Your data
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-sm" onClick={() => download(`exam-coach-progress-${new Date().toISOString().slice(0, 10)}.json`, exportProgress(user))}>
            ⬆️ Export progress
          </button>
          <label className="btn btn-sm" style={{ cursor: 'pointer' }}>
            ⬇️ Import progress
            <input
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const ok = app.importProgressJSON(text);
                alert(ok ? 'Progress imported.' : 'That file is not a valid progress backup.');
              }}
            />
          </label>
        </div>
        <button className="btn btn-sm btn-danger mt-2" onClick={() => setConfirmReset(true)}>
          🗑 Reset all progress
        </button>
        <div className="mt-2 text-[11px]" style={{ color: 'var(--muted)' }}>
          Everything is stored on this device. Nothing is uploaded anywhere.
        </div>
      </div>

      {/* pwa */}
      <div className="card mt-3 p-3">
        <div className="mb-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Install & offline
        </div>
        {installEvent ? (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              (installEvent as unknown as { prompt: () => void }).prompt();
              setInstallEvent(null);
            }}
          >
            📲 Install app
          </button>
        ) : (
          <div className="text-[13px]" style={{ color: 'var(--muted)' }}>
            On Android Chrome: menu → <strong>Install app</strong>. On iPhone Safari: Share →{' '}
            <strong>Add to Home Screen</strong>. Once installed it works with no internet.
          </div>
        )}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip>{navigator.onLine ? '🌐 Online' : '📴 Offline'}</Chip>
          <Chip>💾 Auto-saved locally</Chip>
        </div>
      </div>

      <div className="card mt-3 p-3 text-[12px]" style={{ color: 'var(--muted)' }}>
        <strong>Accuracy rule:</strong> every question in this app is generated from your own notes and
        carries a source reference. Anything unclear in the source is marked{' '}
        <em>“Source clarification required”</em> instead of being guessed.
      </div>

      {confirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,.6)' }} onClick={() => setConfirmReset(false)} />
          <div className="pop card relative w-full max-w-[340px] p-4">
            <h3 className="text-base font-bold">Reset all progress?</h3>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              This clears XP, streaks, mastery, the error book and your schedule. Content packs stay.
            </p>
            <div className="mt-4 flex gap-2">
              <button className="btn" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  app.resetAll();
                  setConfirmReset(false);
                }}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="h-8" />
    </Screen>
  );
}
