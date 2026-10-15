---
name: kickoff
description: Start a new project once - agree what to build with the user, split it into phases as GitHub issues, scaffold the Next.js app, write CLAUDE.md, create and protect the GitHub repo.
disable-model-invocation: true
---

# /kickoff

Run once per project, on Opus. Afterwards every phase runs with `/phase`.

## 1. Preconditions

Check all, report every failure at once, and stop if any fail:
- `gh auth status` succeeds; `ffmpeg -version` and `node -v` (24 or newer) work.
- This is a git repo on `main` with no `package.json` yet.

## 2. Agree what to build

Use `superpowers:brainstorming` on the architectural path for the whole product.
- The stack is decided (`stack-conventions`): do not ask about it. Data goes through Next.js
  by default. If a flow clearly needs TanStack Query or Zustand (for example a long-running
  job the screen polls), note it in the spec with the reason; the phase plan confirms it.
- If the user points to an earlier version, a doc or a repo, read it first and ask only what
  it leaves open.
- Save the approved spec as `docs/superpowers/specs/project-design.md`. It covers purpose,
  users, scope and out of scope, main flows, data model, and anything external (APIs, AI,
  secrets). Keep it to what a phase planner needs.

Do not invoke `writing-plans` here: each phase is planned in its own `/phase` run.

## 3. Roadmap

Split the spec into phases and show the list for approval. Each phase:
- ends in something a user can see and try (it gets a demo GIF),
- is about 8 tasks or fewer,
- has a goal, 3–6 acceptance criteria a test can check, and what it leaves out.

Phase 1 is the thinnest end-to-end slice of the core flow, not "setup". Number them
`01`, `02`, … Expect 3–8 phases; fewer and larger is not lighter, it is slower to review.

## 4. Repository

Ask in one message: the repo name (default: this folder's name) and public or private.
Note that branch protection on GitHub's free plan needs a public repo; with a private repo
the PR flow still works but `main` is not locked.

## 5. Scaffold

`bash .claude/skills/kickoff/scaffold.sh <name>`. It must end with "all gates pass"; if it
does not, fix the cause and rerun the failing gate, never the whole script.

## 6. CLAUDE.md

Write `CLAUDE.md` from `.claude/skills/kickoff/CLAUDE.template.md`, 50 lines or fewer. Fill
"Project specifics" only with facts an agent would get wrong without being told. Keep the
`@AGENTS.md` line: it loads Next.js's own agent rules.

## 7. Publish

1. Commit everything on `main`: `chore: kickoff — spec, roadmap, scaffold`.
2. `gh repo create <name> --<public|private> --source . --push`.
3. Labels: `gh label create phase --color 1D76DB` and `gh label create deferred --color FBCA04`
   (ignore "already exists").
4. One issue per phase: title `Phase NN: <name>`, label `phase`, body with `## Goal`,
   `## Acceptance criteria` (checkboxes), `## Out of scope`, and a link to the spec.
5. Public repo: `bash .claude/skills/kickoff/protect-main.sh <owner/name>`.

## 8. Hand over

Show the repo URL and the phase issues, then: "Run `/clear`, then `/phase` (stay on Opus)."
