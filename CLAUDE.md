# Meltdown — rules for AI coding agents

SPEC.md is the single source of truth, but it is long. Do not read it whole: that wastes the
team's token budget. Read SPEC sections 0 and 6, then only the sections listed for your
current task in SPEC 19.6 ("task → sections" map). Open other sections only when those
sections point you there. If this file and SPEC.md ever disagree, SPEC.md wins.

## Team
- A = Alikhan — frontend
- B = Tamiris — AI & backend
- C = Rulan — product, pitch, captain, and backup developer for A and B

## Who you work for
Ask which person you are helping if it is not stated. Only edit files that person owns
(SPEC.md section 6). If a change is needed in someone else's file, stop and say what change
is needed and why.

When Rulan takes over an A or B task (handoff, SPEC 19.5): read the handoff note he gives
you, continue on the existing branch, and do not restart the task from scratch. During the
handoff Rulan temporarily owns that task's files.

## Saving tokens
- One task per session. Do not re-read files you already read in this session.
- Read only the files the task needs; do not scan the whole project.
- Prefer small, targeted edits over rewriting whole files.
- Do not start long-running processes (dev server, watchers) yourself unless asked.

## Hard rules
1. Follow the contracts in SPEC.md sections 7–10 exactly: types, function names, routes,
   JSON shapes, storage keys, constants. Do not rename or "improve" them.
2. Do not add dependencies. Allowed: next, react, react-dom, @anthropic-ai/sdk, zod,
   server-only, @vercel/analytics, posthog-js, tailwindcss (+ what create-next-app adds),
   vitest, tsx, typescript, eslint and their @types. Anything else needs approval from C.
3. Do not build P2 features or anything not in SPEC.md. P1 only after milestone M3.
4. Never call the Anthropic API from client code. Every module that touches the API starts
   with `import "server-only";` and lives in `src/lib/ai/*.server.ts`.
5. Model calls: model from `ANTHROPIC_MODEL` (default `claude-opus-5-5`), effort from
   `ANTHROPIC_EFFORT` (default `low`). Never send `temperature`, `top_p`, `top_k`,
   `thinking: { type: "disabled" }`, `budget_tokens`, or an assistant prefill — they return 400.
   Use structured outputs (`output_config.format`) and validate with zod.
6. The mood score is computed by `src/lib/engine/mood.ts`, never by the model. Technique
   explanations and sources come from `src/data/techniques.json`, never from the model.
7. Every AI failure must fall back to the heuristic path (`finalize*` with heuristic output)
   and return 200 with `meta.source = "fallback"`. Never surface a raw error to the user.
8. Never log, store or send to analytics the parent's or child's text.
9. All UI strings come from `src/content/copy.ts`. Colors and fonts come from the tokens in
   `src/app/globals.css`.
10. Never commit secrets. `.env.local` stays out of git. Do not print API keys.
11. No `any`, no `@ts-ignore`, no `dangerouslySetInnerHTML`.
12. Do not use `useSearchParams` (read `window.location.search` inside `useEffect`). Read
    route params with `useParams()`. Pages that read localStorage render a skeleton until
    `useHydrated()` is true.
13. Unit tests must not import `*.server.ts` files.

## Before you say a task is done
- `npm run check` passes (lint + typecheck + unit tests) and `npm run build` succeeds.
- The task meets its acceptance criteria in SPEC.md section 14 (or its row in section 19).
- Report what you changed, which files, and anything you could not verify.

## When SPEC.md is unclear
Do not invent product behavior. State the question and the options, and ask the person you
work for. Person C records the decision in SPEC.md section 25 (changelog).
