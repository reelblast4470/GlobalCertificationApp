# Content Pack Schema

A pack is one JSON file. Drop it in via **More → Import Notes → Edit JSON → Install**, or call
`installPack(pack)` from `data/registry.ts`. Packs live in IndexedDB; progress lives in localStorage.

```
ContentPack
└─ Subject  (id, title, icon)
   └─ Chapter (id, title, icon)
      └─ Topic (id, title, concepts[], questions[], flashcards[], keyFacts[], formulas[], commonConfusion, oneLineSummary)
         ├─ Concept   (id, title, blocks[], keywords[], rememberThis, mnemonic?)
         ├─ Question  (id, type, difficulty, prompt, options[], correct[], explanation, whyWrong{}, source, tags[])
         └─ Flashcard (id, front, back, trick?)
```

## Question

| Field | Required | Notes |
|---|---|---|
| `id` | ✅ | globally unique |
| `type` | ✅ | `direct` · `conceptual` · `application` · `statement` · `assertion-reason` · `match` · `multi` · `negative` |
| `difficulty` | ✅ | `easy` · `medium` · `hard` |
| `prompt` | ✅ | `NOT` / `EXCEPT` / `INCORRECT` are auto-highlighted in red |
| `statements` | for `statement`/`assertion-reason`/`match` | array of strings |
| `options` | ✅ | **exactly 4** by default; ids `a`–`d` |
| `correct` | ✅ | array of option ids — length > 1 requires `type: "multi"` |
| `explanation` | ✅ | shown after answering |
| `whyWrong` | recommended | `{ optionId: "reason" }` for every distractor |
| `source` | ✅ | **mandatory** — the reference back into the notes (accuracy rule) |
| `hintMnemonic` | optional | shown as a memory hook |
| `flag` | optional | `"source-clarification-required"` hides the question from practice until resolved |

### Distractor rules (enforced by `validatePack`)
- Plausible and drawn from common student mistakes, never filler.
- No duplicate option text; no option that is obviously correct by length.
- Avoid two defensible answers — if that happens, the source is ambiguous: flag it.

## Concept blocks

`blocks[]` are revealed one at a time in this order (the app re-sorts them automatically):

`simple` → `definition` → `steps` → `example` → `facts` → `compare` → `examPoint` → `keyword` → `trick`

| Kind | Fields |
|---|---|
| `simple` / `definition` / `example` / `examPoint` / `trick` | `title?`, `body` |
| `steps` / `facts` / `keyword` | `title?`, `items[]` |
| `compare` | `title?`, `pairs[{left, right}]` |

Inline markdown supported in `body` / `items`: `**bold**` and `` `code` ``.

## Topic quick-revision fields

`keyDefinition`, `keyFacts[]` (3–10), `formulas[]`, `commonConfusion`, `oneLineSummary` — these power
⚡ Quick Revision and are the 5–15 minute exam-eve path.

## Importer behaviour

`engine/importer.ts` turns pasted notes into a draft pack:

1. `#` / ALL-CAPS / `1.2` headings → chapters and topics.
2. `X is/are/means/refers to …` → definition block + flashcard + a cloze MCQ **only if 4 plausible options exist**.
3. Dates, percentages, article/section numbers → key facts and exam points.
4. Bullet/numbered lists → `steps` or `facts`.
5. `vs`, `whereas`, `unlike`, `difference between` → `compare` block.
6. `??`, `TBD`, `verify` → `clarifications[]` with "Source clarification required".
7. Same term defined two different ways → contradiction flagged, never resolved by guessing.

The draft is reviewable and editable as JSON before install — top it up with `conceptual`,
`application`, `statement` and `assertion-reason` questions for best exam coverage.

## Example

```json
{
  "id": "ssc-polity", "examId": "ssc", "examLabel": "SSC", "title": "Indian Polity",
  "audience": "competitive", "version": 1,
  "subjects": [{
    "id": "ga", "title": "General Awareness", "icon": "📘",
    "chapters": [{
      "id": "constitution", "title": "Constitution", "icon": "⚖️",
      "topics": [{
        "id": "fundamental-rights", "title": "Fundamental Rights",
        "keyDefinition": "Rights in Part III, enforceable by courts under Article 32.",
        "keyFacts": ["Part III", "Article 32", "44th Amendment 1978 removed Right to Property"],
        "oneLineSummary": "Part III rights, enforceable in court; property right removed in 1978.",
        "concepts": [{
          "id": "fr-concept", "title": "Fundamental Rights",
          "rememberThis": "Part III, Article 32, justiciable — unlike DPSP.",
          "mnemonic": { "for": "the six rights", "text": "Everyone Feels Free, Exploits Removed — Equality, Freedom, Exploitation, Religion, Culture, Education" },
          "blocks": [
            { "kind": "simple", "body": "Basic rights the Constitution guarantees against the State." },
            { "kind": "definition", "title": "Fundamental Rights", "body": "Rights in **Part III** enforceable by courts." },
            { "kind": "facts", "items": ["Article 32 = right to constitutional remedies", "Right to Property removed by the 44th Amendment, 1978"] },
            { "kind": "compare", "pairs": [{ "left": "Fundamental Rights — justiciable", "right": "DPSP — non-justiciable" }] }
          ]
        }],
        "flashcards": [
          { "id": "fc1", "front": "Which Part contains Fundamental Rights?", "back": "Part III", "trick": "III = 3 = FR" }
        ],
        "questions": [{
          "id": "fr-q1", "type": "direct", "difficulty": "easy",
          "prompt": "Fundamental Rights are contained in which Part of the Constitution?",
          "options": [
            { "id": "a", "text": "Part III" }, { "id": "b", "text": "Part IV" },
            { "id": "c", "text": "Part IVA" }, { "id": "d", "text": "Part V" }
          ],
          "correct": ["a"],
          "explanation": "Part III (Articles 12–35) contains Fundamental Rights; Part IV contains DPSP.",
          "whyWrong": {
            "b": "Part IV contains the Directive Principles, which are non-justiciable.",
            "c": "Part IVA contains Fundamental Duties, added by the 42nd Amendment.",
            "d": "Part V deals with the Union government."
          },
          "source": "Notes → Constitution → Fundamental Rights",
          "tags": ["polity", "part"]
        }]
      }]
    }]
  }]
}
```
