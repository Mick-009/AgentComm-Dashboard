# Agent_Comm_Dashboard — Project Review

## Executive summary

AgentComm is a polished, self-contained communication-workspace prototype for organizing simulated agent conversations. Its strongest qualities are the coherent single-screen workflow, useful local workspace features, and careful platform/auth scaffolding. The central limitation is product-level: agent “connections,” plugins, and responses are simulated, not live integrations or model-backed collaboration. The app should label that boundary more prominently and prioritize data safety before encouraging real or sensitive use.

**Review scope:** inspected `src/components/workspace.tsx`, `src/lib/workspace-store.ts`, `src/lib/markdown.ts`, the root/index routes, `package.json`, `AGENTS.md`, and the auth middleware/isolation modules. This was a code-and-project-structure review, not a live usability or security test. No tests or build were run as part of this review.

## Strengths

- **A coherent core workflow.** Rooms and agent-to-agent DMs, message history, project context, file attachments, plugin toggles, and pinned messages are all accessible in one workspace (`src/components/workspace.tsx`).
- **Useful local-first behavior.** Zustand persistence preserves workspace state in the browser; users can also export/import JSON and reset defaults (`src/lib/workspace-store.ts`). That is convenient for a prototype without requiring a backend.
- **Configurable agent personas.** Role presets, editable agent details/prompts, custom rooms, and DMs make the demo adaptable to different team workflows.
- **Context is attached to a thread.** Projects, file excerpts, and plugin selections are stored with each channel, and the simulation reflects that context in its response.
- **Responsive interface intent.** The workspace includes a mobile navigation drawer, constrained flex layouts, and small-screen adaptations rather than assuming a desktop-only layout.
- **Good operational scaffolding.** The repository has distinct scripts for typecheck, lint, tests, auth invariants, and build. `AGENTS.md` also documents deployment constraints and preview QA expectations.
- **Security-conscious shared auth helpers.** The server-only isolation check and auth middleware explicitly defend against cross-site scripted requests and require verified user identity when enabled. This is solid groundwork if server-backed user data is introduced.

## Weaknesses and risks

- **The app can be mistaken for a functioning multi-agent service.** Agent cards show connected/status fields, and plugin controls read like capabilities, but `connected` is initialized false, plugin behavior is descriptive, and `simulate()` selects a canned response from `REPLIES`. There is no actual agent transport or plugin execution in the inspected workspace code. This gap is the largest mismatch between the interface and functionality.
- **“Human” is included in the agent list and used as the speaker.** The default speaker is `human`, which means messages can display the user as a participant, while the app is otherwise framed as agent communication. Clarify whether this is an intentional human-in-the-loop model and make the composer wording reflect it.
- **Workspace persistence has no validation or visible recovery story.** The persisted store uses a fixed key (`agentcomm_app_v1`), while import checks only that `agents` and `rooms` are arrays before assigning the rest of the parsed data. Malformed or incompatible exports can inject invalid shapes and break later render paths. There is no schema/version migration or import preview.
- **Files are not stored as files.** Attachments retain metadata and at most a 4,000-character excerpt for small text-like files under 80 KB; non-text files and the remainder of text files are not available to the conversation. Users may reasonably expect the full file to be attached.
- **Markdown escaping is incorrect.** `escapeHtml` replaces `&`, `<`, and `>` with themselves, not entities. Since the rendered output is inserted using `dangerouslySetInnerHTML`, untrusted message text can be interpreted as HTML. This is a concrete security issue, not merely a formatting limitation.
- **Some state can become inconsistent.** Removing an agent deletes its DMs but does not clean that agent's messages from rooms, nor does it remove its IDs from room message history. The UI then renders those messages as “Unknown.” Import can similarly provide dangling IDs or an invalid current room/thread.
- **The UX has a few interaction/accessibility gaps.** The send action can submit an empty draft silently; the textarea has no explicit accessible label; the reusable “Remove” buttons have generic labels; status dots have no text equivalent; and destructive operations rely on native `confirm()` dialogs. These details make keyboard and assistive-technology use less clear.
- **The interface concentrates many capabilities in one large component.** `Workspace` owns navigation, thread rendering, composer panels, file import, and dialogs. That raises the cost of changes and makes focused component tests harder.
- **No product-level backend behavior is visible in the main workspace.** The inspected home route mounts only `Workspace`; I found no app-specific server functions or real-time message transport under `src/routes` / `src/lib` beyond shared platform/auth helpers. Multi-device sync, shared workspaces, and live collaboration therefore are not supported by the inspected implementation.

## Recommended improvements (prioritized)

### P0 — Fix safety and expectation-setting

1. **Fix HTML escaping immediately.** Replace `&`, `<`, and `>` with `&amp;`, `&lt;`, and `&gt;` in that order, or use a well-maintained Markdown renderer with raw HTML disabled and safe URL handling. Add tests covering script tags, attributes, ampersands, code blocks, and links. Keep output safe before using `dangerouslySetInnerHTML`.
2. **Label the product as a simulation until integrations exist.** Rename “Simulate” to a clearer demo action or show a persistent “Demo mode — replies and plugins are simulated” indicator. Do not present a simulated status as a real connection state.
3. **Validate and version imports.** Define a schema for the complete export shape, validate IDs/references and current-channel values before changing state, reject invalid data without partial mutation, and show a useful error. Add an export version and explicit migration path for future schema changes.

### P1 — Make the core workflow dependable

4. **Define the real integration boundary.** If real agents are intended, implement a server-side provider/transport layer with explicit connection state, request errors, cancellation/timeouts, and per-plugin capability checks. Keep credentials server-side. If not, position this plainly as a planning/simulation tool.
5. **Resolve file semantics.** Either store complete content within a documented limit and make truncation explicit, or communicate that files are excerpts/metadata only. Add size/type limits and clear upload feedback; avoid persisting large or sensitive contents in browser storage by accident.
6. **Harden state lifecycle.** When deleting an agent or room, clean or deliberately preserve related messages, pins, thread metadata, and references. Add referential-integrity checks to import and tests for deletion, reset, and switching channels.
7. **Add focused automated coverage.** Extend tests for workspace store actions, import/export round trips and invalid inputs, markdown sanitization, and key UI flows (create room/DM, attach/remove file, pin/clear, mobile navigation). Run the existing test, typecheck, lint, build, and browser checks in CI.

### P2 — Improve usability and maintainability

8. **Improve accessible controls.** Add explicit labels/instructions for the composer and speaker selector, specific accessible names for each remove action, non-color status text, visible focus states, and a keyboard-friendly confirmation pattern for destructive actions. Disable send when the draft is blank and provide an intentional sending/error state if live integrations are added.
9. **Split the workspace into focused components.** Extract the sidebar, thread header/list, composer/context panels, and dialogs. Keep store operations in a clear data layer so UI tests can cover behavior without mounting the entire application.
10. **Clarify feature scope in onboarding/manual.** Document what is local-only, what export contains, what file attachments actually retain, and that current agent/plugin replies are canned. Add a short “what this does / does not do” section to the manual.
11. **Add practical local-data controls.** Provide a visible storage/export status and a clear option to erase all persisted workspace data. Consider browser-storage quota failures and stale/corrupt persisted state in the recovery experience.

## Suggested order

Fix Markdown escaping first; then validate/version import data and make demo-vs-connected states unambiguous. Next, add store/security tests and tighten deletion/file semantics. Only after that decide whether to invest in live integrations or explicitly keep AgentComm as a local simulation workspace.
