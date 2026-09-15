import React from 'react';
import { useApp } from '../state/AppContext';
import { Screen } from '../components/Layout';
import { Chip, SectionTitle, Segmented } from '../components/ui/primitives';
import { importNotes, validatePack, type ImportReport } from '../engine/importer';
import type { ContentPack } from '../types/content';

export default function Import({ navigate }: { navigate: (to: string) => void }) {
  const app = useApp();
  const [raw, setRaw] = React.useState('');
  const [title, setTitle] = React.useState('My Notes');
  const [examLabel, setExamLabel] = React.useState('Custom');
  const [subjectTitle, setSubjectTitle] = React.useState('General');
  const [audience, setAudience] = React.useState<ContentPack['audience']>('competitive');
  const [report, setReport] = React.useState<ImportReport | null>(null);
  const [json, setJson] = React.useState('');
  const [editing, setEditing] = React.useState(false);
  const [issues, setIssues] = React.useState<ReturnType<typeof validatePack>>([]);
  const [status, setStatus] = React.useState<string | null>(null);

  const analyse = () => {
    if (raw.trim().length < 20) {
      setStatus('Paste at least a few lines of notes first.');
      return;
    }
    const r = importNotes(raw, {
      title: title.trim() || 'My Notes',
      examId: examLabel.trim().toLowerCase().replace(/\s+/g, '-'),
      examLabel: examLabel.trim() || 'Custom',
      subjectTitle: subjectTitle.trim() || 'General',
      audience,
    });
    setReport(r);
    setJson(JSON.stringify(r.pack, null, 2));
    setIssues(validatePack(r.pack));
    setStatus(null);
  };

  const install = async () => {
    try {
      const pack = JSON.parse(json) as ContentPack;
      const found = validatePack(pack);
      setIssues(found);
      const errors = found.filter((f) => f.severity === 'error');
      if (errors.length) {
        setStatus(`${errors.length} blocking issue(s) — open "Checks" to see them.`);
        return;
      }
      await app.addPack(pack);
      setStatus('Installed. Your notes are now a course.');
      setTimeout(() => navigate('/learn'), 900);
    } catch {
      setStatus('That JSON could not be parsed — check for a stray comma or quote.');
    }
  };

  return (
    <Screen title="Import Notes" subtitle="Turn your notes into a course">
      <div className="card p-3">
        <div className="mb-2 grid grid-cols-2 gap-2">
          <label className="text-[13px]">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Indian Polity" />
          </label>
          <label className="text-[13px]">
            Exam
            <input value={examLabel} onChange={(e) => setExamLabel(e.target.value)} placeholder="SSC / NEET / Custom" />
          </label>
        </div>
        <label className="text-[13px]">
          Subject
          <input value={subjectTitle} onChange={(e) => setSubjectTitle(e.target.value)} placeholder="General Awareness" />
        </label>
        <div className="mt-2">
          <div className="mb-1 text-[13px]">Teaching style</div>
          <Segmented
            value={audience}
            onChange={(v) => setAudience(v)}
            options={[
              { value: 'child', label: '🧒 Child' },
              { value: 'school', label: '🏫 School' },
              { value: 'college', label: '🎓 College' },
              { value: 'competitive', label: '🏆 Exam' },
            ]}
          />
        </div>
      </div>

      <div className="card mt-3 p-3">
        <div className="mb-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          Paste your notes
        </div>
        <textarea
          rows={9}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={"## Fundamental Rights\n\nFundamental Rights are the basic human rights guaranteed by Part III of the Constitution.\n\n- They are enforceable by courts\n- Article 32 gives the right to constitutional remedies\n- There were 7 rights originally; the 44th Amendment removed the Right to Property in 1978\n\nDirective Principles are non-justiciable, whereas Fundamental Rights are justiciable."}
          style={{ width: '100%' }}
        />
        <div className="mt-2 flex gap-2">
          <button className="btn btn-primary btn-sm" onClick={analyse}>
            🔍 Analyse & structure
          </button>
          {report && (
            <button className="btn btn-sm" onClick={() => setEditing((e) => !e)}>
              {editing ? 'Hide JSON' : '✏️ Edit JSON'}
            </button>
          )}
        </div>
      </div>

      {status && (
        <div className="card mt-3 p-3 text-[13px]" style={{ background: 'var(--surface2)' }}>
          {status}
        </div>
      )}

      {report && (
        <>
          <div className="mt-4">
            <SectionTitle>What was extracted</SectionTitle>
            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Sections" value={report.headings} />
              <MiniStat label="Definitions" value={report.definitions} />
              <MiniStat label="Facts" value={report.facts} />
              <MiniStat label="Dates" value={report.dates} />
              <MiniStat label="List items" value={report.lists} />
              <MiniStat label="Auto MCQs" value={report.autoQuestions} />
            </div>
          </div>

          <div className="card mt-3 p-3">
            <div className="text-[13px]">
              <strong>{report.pack.subjects[0]?.chapters.length ?? 0}</strong> chapters ·{' '}
              <strong>{report.pack.subjects[0]?.chapters.reduce((n, c) => n + c.topics.length, 0) ?? 0}</strong> topics ·{' '}
              <strong>{report.flashcards}</strong> flashcards
            </div>
            {report.clarifications > 0 && (
              <div className="mt-2 rounded-xl p-2 text-[13px]" style={{ background: 'var(--bad-soft)' }}>
                ⚠️ {report.clarifications} item(s) need <strong>source clarification</strong> — they were
                flagged, not guessed.
              </div>
            )}
            {report.warnings.map((w, i) => (
              <div key={i} className="mt-1.5 text-[12px]" style={{ color: 'var(--warn)' }}>
                • {w}
              </div>
            ))}
          </div>

          {editing && (
            <div className="card mt-3 p-3">
              <div className="mb-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Pack JSON — edit, then install
              </div>
              <textarea rows={14} value={json} onChange={(e) => setJson(e.target.value)} style={{ width: '100%', fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
            </div>
          )}

          <div className="mt-3">
            <SectionTitle>Checks</SectionTitle>
            {issues.length === 0 ? (
              <div className="card p-3 text-[13px]" style={{ color: 'var(--good)' }}>
                ✅ No problems found. Safe to install.
              </div>
            ) : (
              <div className="card divide-y" style={{ borderColor: 'var(--line)' }}>
                {issues.slice(0, 20).map((i, n) => (
                  <div key={n} className="p-2.5 text-[12px]">
                    <span style={{ color: i.severity === 'error' ? 'var(--bad)' : 'var(--warn)' }}>
                      {i.severity === 'error' ? '⛔' : '⚠️'}
                    </span>{' '}
                    <strong>{i.path}</strong> — {i.message}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-primary mt-3" onClick={install}>
            📥 Install pack
          </button>
        </>
      )}

      <div className="card mt-4 p-3">
        <div className="mb-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
          How notes are converted
        </div>
        <ul className="flex flex-col gap-1 text-[13px]" style={{ color: 'var(--muted)' }}>
          <li>1. Headings become chapters and topics.</li>
          <li>2. “X is/means/refers to …” lines become definitions and flashcards.</li>
          <li>3. Dates, numbers and figures become key facts and exam points.</li>
          <li>4. Lists become step-by-step or fact blocks.</li>
          <li>5. Safe cloze MCQs are auto-built from definitions — only when four plausible options exist.</li>
          <li>6. Anything unclear is flagged instead of invented.</li>
        </ul>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Chip>📄 Text / Markdown</Chip>
          <Chip>🖼 Pasted from PDF</Chip>
          <Chip>📝 Word</Chip>
          <Chip>🗃 Existing question banks</Chip>
        </div>
      </div>
      <div className="h-8" />
    </Screen>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-2.5 text-center">
      <div className="text-lg font-extrabold">{value}</div>
      <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
        {label}
      </div>
    </div>
  );
}
