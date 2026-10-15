---
name: pr-demo
description: Record a demo GIF of the current phase's main user flow and publish it for the pull request. Use after the phase's gates pass and before the PR is opened, or when a PR is missing its demo.
---

# PR demo

Every pull request shows what was built. The PR's `## Demo` section shows
`phase-<NN>/demo.gif` from the `pr-media` branch; this skill puts the file there. CI fails a
PR that has no image.

## Steps

1. **Pick the flow.** From the phase issue's acceptance criteria, choose the one flow that
   best shows the phase to someone who has not read the code. Keep it under about 20 seconds.
2. **Make sure a Playwright test drives that flow** in `e2e/`. If none does, write one: it is
   both the demo and a regression test. Add short pauses only if the result would otherwise
   flash by too fast to read.
3. **Record.** Run only that test: `npx playwright test e2e/<file>.spec.ts`. Recording is
   always on; the video lands in `test-results/<test-name>/video.webm`.
4. **Publish.** `bash .claude/skills/pr-demo/make-demo.sh <phase-number> <path-to-video>`
   converts it to a GIF, pushes it to `pr-media` and prints the image URL.
5. **Look at it.** Read the GIF and confirm it shows the flow working. A GIF of a blank or
   error page is a failed demo: fix and re-record.

For a phase with nothing visual, screenshot the most telling evidence (an API response, a
passing test run) and pass the `.png` to `make-demo.sh` instead.

If the PR is already open and its body lacks the image, add a `## Demo` section with
`![Phase <NN> demo](<printed URL>)` using `gh pr edit <number> --body-file <file>`.
