---
name: quality-gates
description: The definition of done for this project. Read before writing a plan, before saying any work is complete, and before opening a pull request.
---

# Quality gates

Work is done only when every gate below passes on the current code. "It should pass" is not
a pass: run the command and read the output.

## Gates

| Gate | Command |
|---|---|
| Format, lint, types, unit tests, build | `npm run check` |
| Browser tests (recorded) | `npm run e2e` |

## Rules

- **Every behavior change comes with a test.** Logic and client components get a Vitest
  test next to the file. Each user-facing flow in the phase's acceptance criteria gets a
  Playwright test in `e2e/`.
- **Plans name their tests.** A task that adds behavior names the test that proves it.
- **Run the gates before the commit that ends a task** (an implementer may run only the
  tests for its files plus `npm run lint` and `npm run typecheck`), and run both gates in
  full before the pull request.
- **Never bypass a gate.** No `--no-verify`, no skipped or deleted tests, no loosened lint,
  TypeScript or Next.js settings, no `eslint-disable` to get past an error. Changing a gate's
  configuration needs the user's explicit approval.
- **A red gate you cannot fix in two attempts is a stop.** Report what fails and why
  instead of working around it.
- **Report honestly.** State which commands ran and their result. Never describe a gate as
  passing unless you saw it pass in this session.
