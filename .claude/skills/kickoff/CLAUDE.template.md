# <project name>

<Two or three sentences: what this is, who it is for, what is explicitly out of scope.>

@AGENTS.md

## Commands

- `npm run dev` — start the app
- `npm run check` — format, lint, typecheck, unit tests, build
- `npm run e2e` — browser tests (recorded)

## How work happens

- The roadmap is the GitHub issues labelled `phase`. Each runs with `/phase`: one branch, one
  PR, closed by merging. Do not write feature code outside it; for a small fix, use
  Superpowers' bounded path on a branch and open a PR.
- The product spec is `docs/superpowers/specs/project-design.md`.
- Superpowers preferences for this project:
  - No git worktrees: work in place on the phase branch.
  - When finishing a branch, always push and open a pull request; never merge locally.
  - Specs and plans are named `phase-NN-<slug>` (see `/phase`).

## Hard rules

- Follow `.claude/skills/stack-conventions/SKILL.md` and
  `.claude/skills/quality-gates/SKILL.md`.
- Never push to `main`, merge a pull request, or bypass a hook or check. The user merges.
- Every pull request carries a demo GIF (`pr-demo` skill).
- Ask before adding a dependency or changing lint, TypeScript, Next.js or CI configuration.

## Project specifics

<Only facts an agent would get wrong without being told: domain terms, external services,
environment variables, known traps. Delete this section if there are none.>
