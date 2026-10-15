---
name: phase
description: Run the next roadmap phase (a GitHub issue labelled "phase") with Superpowers - plan it with the user, build it with subagents, and open a PR with a demo. Run it again after each stop; it picks up where the phase stands.
argument-hint: "[phase number]"
disable-model-invocation: true
---

# /phase

One phase = one GitHub issue labelled `phase`, titled `Phase NN: <name>`, one branch, one PR.
Superpowers does the work; this command adds the issue, the gates, the demo and the PR.
A phase takes two sessions: **Plan**, then **Build and ship**. Each run does one, then stops.

## Model per session

| Session | Model | Why |
|---|---|---|
| Plan | Opus | Questions and the plan are where quality is decided. |
| Build and ship | Sonnet | The main session only coordinates. Subagents get their models per task, and the final review runs on Opus. |

Check the model you are running as before starting. If it is wrong, stop and tell the user:
"Run `/model`, pick <model>, press `s` (this session only), then `/phase` again."

## Step 0: Where does the phase stand?

1. `git status --porcelain` must be empty. If not, show it and stop.
2. Pick the phase: the number in `$ARGUMENTS`, otherwise the lowest-numbered open issue from
   `gh issue list --label phase --state open --json number,title,body`. If there is none,
   say the roadmap is done and stop.
3. Slug = phase name in kebab case. Branch = `phase-NN-<slug>`.
   Plan file = `docs/superpowers/plans/phase-NN-<slug>.md`.
4. Decide:
   - An open PR for the branch exists (`gh pr list --head <branch>`) → **PR open** below.
   - The branch has the plan file committed → **Build and ship**.
   - Otherwise → **Plan**.

## Plan (Opus)

1. `git switch main && git pull --ff-only`, then `git switch -c <branch>` (or switch to it if
   it exists).
2. Read the phase issue, the project spec in `docs/superpowers/specs/` and `CLAUDE.md`.
   Read the code only as far as this phase touches it.
3. Use `superpowers:brainstorming` for this phase. Treat it as architectural unless the phase
   only changes an existing flow. The issue and project spec already answer the big
   questions: ask only what they leave open, one at a time. Keep the design short. Save the
   spec as `docs/superpowers/specs/phase-NN-<slug>-design.md`.
4. Use `superpowers:writing-plans`. The plan follows `stack-conventions` and names its tests
   per `quality-gates`. Its Global Constraints include a **Data** line for each screen the
   phase touches: how it reads, caches and writes data, picked from the Data table in
   `stack-conventions`. Adding TanStack Query or Zustand needs its own line naming the
   screen and the reason from that skill's "only when needed" list; tell the user about it
   when presenting the plan. **Size check:** if it needs more than about 8 tasks, propose splitting
   the phase in two (the second half becomes a new `phase` issue numbered `NN.1`) and plan
   only the first.
5. At the execution handoff, recommend subagent-driven development unless the tasks are
   tightly coupled. When the user approves the plan, commit the spec and plan
   (`docs(phase-NN): spec and plan`) and push the branch.
6. Comment on the issue: `gh issue comment <N> --body "Plan: <link to plan file on branch>"`.
7. Stop: "Plan approved. Run `/clear`, then `/model` → Sonnet → `s`, then `/phase`."

## Build and ship (Sonnet)

1. `git switch <branch>`. Run `npm ci` only if `package-lock.json` changed since `main`.
2. Use `superpowers:subagent-driven-development` (or `superpowers:executing-plans` if that
   was the approved choice) on the plan file. Every implementer, task reviewer and final
   reviewer brief carries these global constraints, verbatim:
   - "Follow `.claude/skills/stack-conventions/SKILL.md` and
     `.claude/skills/quality-gates/SKILL.md`."
   - "Data comes from Next.js: Server Components read it, Cache Components cache it, Server
     Actions write it. TanStack Query and Zustand are allowed only where the plan's Global
     Constraints name the screen and reason. Using them anywhere else, fetching in
     `useEffect`, or fetching on the client what a Server Component could read is an
     Important finding."
   - The plan's Data lines.
3. When it reaches `superpowers:finishing-a-development-branch`, do not show the menu: run its
   Step 1, then do the steps below (the user's standing choice is a PR).
4. Run both gates from `quality-gates` in full. Red after two fix attempts → stop and report.
5. Use the `pr-demo` skill for phase NN.
6. Write the PR body to a temp file:
   ```
   ## Summary
   <3–6 bullets: what the user can now do>

   Closes #<N>

   ## Demo
   ![Phase NN demo](<URL from make-demo.sh>)

   ## Decisions made during the build
   <every "Ruling:" line from the ledger, with what it costs if wrong; "None" if empty>

   ## Tests
   <commands run and their results>
   ```
   Then `git push -u origin <branch>` and
   `gh pr create --base main --title "Phase NN: <name>" --body-file <file>`.
7. Deferred minors and parked findings from the ledger: one issue each,
   `gh issue create --label deferred --title "<one line>" --body "From #<N>: <detail>"`.
8. `gh pr checks <PR> --watch`. If a check fails, fix it with
   `superpowers:systematic-debugging`, push, and watch again (two attempts, then stop).
9. Stop with: the PR link, the decisions list, and "Review and merge the PR, then `/clear`
   and `/phase` for the next one (Opus)."

## PR open

Show `gh pr checks` and unresolved review comments. If the user left review comments, fix
them on the branch with `superpowers:receiving-code-review`, rerun the gates, push, and
reply on each comment. Never merge: the user does.

## Never

- Merge a PR, push to `main`, or close an issue by hand.
- Create a git worktree (this project works in place on the phase branch).
- Start the next phase in the same session.
