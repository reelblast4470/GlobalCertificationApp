# Exam Coach — MVP

Mobile-first, offline-capable PWA that turns study notes into a learn → recall → test → correct → repeat → revise → master loop.

**Live dev server:** `exam-coach/` (Vite, port 5173)
**Production build:** `npm run build` → `dist/` (static, deploy anywhere)

## What is built (all 12 MVP items)

| # | Feature | Where |
|---|---------|-------|
| 1 | Mobile dashboard (greeting, streak, continue learning, today's goal, weak topics, quick actions) | `screens/Home.tsx` |
| 2 | Subject → Chapter → Topic navigation | `screens/Learn.tsx` |
| 3 | Concept learning w/ progressive reveal + "Remember This" | `screens/Learn.tsx` |
| 4 | MCQ practice (mixed / revision / weak / error modes) | `screens/Practice.tsx`, `components/QuizRunner.tsx` |
| 5 | Instant explanations + why-others-are-wrong + Explain Again | `components/QuestionCard.tsx` |
| 6 | Score tracking, XP, levels | `engine/gamification.ts`, `state/AppContext.tsx` |
| 7 | Wrong-answer notebook with inferred mistake reason | `screens/Mistakes.tsx`, `engine/mistakes.ts` |
| 8 | Flashcards (Again/Hard/Good/Easy → SRS) | `screens/Flashcards.tsx` |
| 9 | Spaced revision (1→3→7→14→30 ladder) | `engine/srs.ts` |
| 10 | Mock test (timer, palette, mark, clear, negative marking, result + strategy) | `screens/Exam.tsx`, `engine/exam.ts` |
| 11 | Progress dashboard (accuracy, mastery, charts, achievements) | `screens/Progress.tsx` |
| 12 | PWA + mobile responsive + dark/light | `public/`, `index.css` |

Plus: ⚡ Quick Revision, 🔍 instant search, 📥 note importer, ⚙️ settings, data export/import.

## Architecture

```
src/
  types/      content.ts (packs, topics, questions) · progress.ts (student state)
  engine/     srs · mastery · mistakes · exam · selector · planner · search · importer · storage · idb
  data/       registry.ts (pack loading) · packs/demo.ts (placeholder content)
  state/      AppContext.tsx — every mutation funnels through here
  components/ QuestionCard · QuizRunner · Layout · ui/primitives
  screens/    Home · Learn · Practice · Mistakes · Flashcards · Exam · Quick · Progress · Search · Import · Settings
```

**Content and UI are fully separated.** Nothing is hard-coded in a component — screens render whatever `ContentPack` JSON is installed. Adding notes never requires a rebuild of the UI.

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static output in dist/
npm run typecheck
node --experimental-strip-types ...  # or: npx esbuild tests/engine.test.ts --bundle --platform=node --outfile=/tmp/t.cjs && node /tmp/t.cjs
```

Run the engine test suite:
```bash
npx esbuild tests/engine.test.ts --bundle --platform=node --format=cjs --outfile=/tmp/t.cjs && node /tmp/t.cjs
```
66 assertions covering the ladder, mastery bands, exam scoring/negative marking, mistake inference, importer fidelity, selection, search and planning.

## Current content

Only the **placeholder demo pack** is installed (`data/packs/demo.ts`) so every screen is testable.
Paste the real notes → the importer (More → Import Notes) converts them → the demo pack is replaced.

## Accuracy rule

Every question carries a `source` pointing back into the notes. The importer never invents a fact:
it skips question generation when it cannot build four plausible options from the source, and it
raises **"Source clarification required"** for unclear or contradictory lines instead of guessing.
`validatePack()` blocks install on: missing source, missing/duplicate answers, multiple correct
answers without `type: "multi"`, duplicate ids.
