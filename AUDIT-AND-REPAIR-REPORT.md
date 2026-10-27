# Skill Audit & Repair — delivery report

**Date:** 2026-09-28 (Asia/Tokyo). **Target:** the supplied `opencode-game-studio-main.zip`.
**Primary task:** enhancement with necessary dependency repairs. **Authorization:** the
user's explicit request to update the existing system and the attached upgrade brief.

## Result and boundary

The archive was updated in place in a working copy, not replaced with a new studio.
All 228 original files are retained; the original uploaded ZIP remains unchanged.
All 55 original agent profiles, 37 skill names, 11 domain rules and eight shell-helper
entry points remain. The updated system contains 59 profiles, 43 skills with 43 real
command wrappers, 12 rules and one local audit plugin. The MIT license is unchanged.

The main deliverable is the dedicated **Skill Audit & Repair** capability, integrated
through shared governance and a bounded local runtime check. Broader additions follow
the supplied engineering brief and reuse existing specialists rather than replicating
every requested role/skill name.

**Validation:** 47 Node tests and 45 Python tests passed (92 total, no skipped tests).
These are real local fixture/contract/regression tests, not an installed OpenCode or
engine end-to-end run. The registry intentionally remains UNCONFIGURED with no approved
records. The package is not certified as production-ready for an unknown installation.

## Mandatory rule

**AUDIT BEFORE EXTENSION — Never extend, compose, or depend on a skill until its correctness, compatibility, scope, and responsibilities have been verified. When a skill is defective, repair the existing skill first, validate the repair, then continue.**

Canonical location: `.opencode/rules/skill-integrity.md`.

## Scope and method

The complete archive inventory records paths, byte counts, line counts and SHA-256
hashes in `docs/skill-audit/original-inventory.json`. Audit work covered cross-cutting
instructions, entry points, configuration/permissions, executable helpers, skill/agent
responsibilities, state handling, common workflow conflicts and their dependencies.
The original imperative-instruction index was inspected to locate shared patterns.
Changed logic was then checked with positive, negative and regression fixtures.

Definitions and embedded examples were treated as source material, not instructions
to trust or execute. Executable reproductions used disposable directories/repositories;
no commits or pushes to the user's project, provider requests, deployments, engine
installs or changes to global configuration were made. Regression tests may create
disposable fixture commits. Four original defects were reproduced safely.

The audit does **not** certify every historical engine API example. All 55 engine-
reference Markdown files retain their original technical content with explicit
UNVERIFIED notices. The runtime refuses absent/invalid/stale local approval records,
so preservation is not confused with acceptance. Unsupported references need focused,
version-matched evidence before being relied on.

## Original defects and corrections

Exact original line ranges, quoted instructions, before/after hashes, classifications,
repair rationale and preserved behavior are recorded in `docs/skill-audit/findings.json`.
The following summaries describe that evidence; line numbers refer to the original ZIP,
not the edited files.

### AUD-01 — Unwired automatic hooks and foreign host event claims

**VERIFIED DEFECT / high**. Original location: `.opencode/docs/hooks-reference.md:3`.

**Evidence:** Original ZIP contains no .opencode/settings.json and no plugin directory. Official OpenCode plugin documentation specifies local JavaScript/TypeScript adapters and tool.execute.before, not the claimed configuration. See official sources below.

**Correction:** Added one local skill/task audit adapter; documented shell helpers as explicit helpers; relabeled uninstalled hook proposals and legacy input shapes. Did not automatically install Git hooks.

**Preserved:** All eight helper filenames and useful manual operations remain. No pretend automatic session integration replaces them.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-02 — Instruction loading depended on nonstandard entry point/import assumptions

**VERIFIED DEFECT / high**. Original location: `OPENCODE.md:19`.

**Evidence:** Original archive lacks AGENTS.md and root opencode.json. Official rules/config documentation describes AGENTS.md and instructions paths; @ references are not automatically imported by that rules file mechanism.

**Correction:** Added AGENTS.md and an explicit root instructions list; retained OPENCODE.md as overview and its references as navigation, with the missing Unreal link restored.

**Preserved:** Existing project overview, directory guidance and domain documents retain their roles.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-03 — Advertised slash workflows had no command definitions

**VERIFIED DEFECT / medium**. Original location: `README.md:100`.

**Evidence:** Original ZIP has 37 SKILL.md files and no .opencode/commands directory. Official command documentation requires command configuration or Markdown command templates.

**Correction:** Added thin wrappers for all 43 current skills, keeping each workflow in its existing canonical SKILL.md. Audit wrapper is bootstrap-only, not a trust bypass.

**Preserved:** All 37 original workflow names and skill paths remain; no duplicate workflow bodies were created.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-04 — Duplicate agent identity and conflicting modes

**VERIFIED DEFECT / medium**. Original location: `.opencode/opencode.json:17`.

**Evidence:** Original config duplicates 55 descriptions/model/mode fields while Markdown profiles declare subagent. These are competing sources of truth even when the host resolves a precedence order.

**Correction:** Made Markdown profiles the identity source; retained only relevant per-agent permission overlays in JSON. Kept original model choices but removed unsupported pricing assertions.

**Preserved:** All original 55 agent identities, domain responsibilities and subagent intent remain.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-05 — Overbroad and misleading permission configuration

**CONCRETE RISK / high**. Original location: `.opencode/opencode.json:7`.

**Evidence:** Original generic tool allow map is not a demonstrated all-tool permission control; the legacy settings example uses another host convention. Official OpenCode permission/config docs support singular permission and per-tool actions.

**Correction:** Used conservative ask defaults for writes, shell, external paths and delegation; documented actual merge/metadata limits. Removed the foreign-host settings example.

**Preserved:** Read-only discovery remains available; privileged actions still require host authorization. No sandbox guarantee is claimed.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-06 — Session shutdown destroyed unfinished recovery state

**VERIFIED DEFECT / high**. Original location: `.opencode/hooks/session-stop.sh:24`.

**Evidence:** Reproduced in an isolated original copy: helper exits 0 and deletes active.md containing INCOMPLETE work. Evidence: baseline-reproductions.json.

**Correction:** Removed only the deletion, retained snapshot logging, labeled recent Git activity accurately, and report detected log-path/write failures without deleting recovery state.

**Preserved:** Existing session-log path and summary/archive purpose remain; active checkpoints survive both success and logging failure.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-07 — Commit validation inspected working files, not committed bytes

**VERIFIED DEFECT / high**. Original location: `.opencode/hooks/validate-commit.sh:58`.

**Evidence:** Reproduced invalid staged JSON plus valid working-tree JSON: original helper exits 0. Reverse fixtures verify the repaired check distinguishes the index correctly.

**Correction:** Kept helper name/input compatibility; moved strict shared parsing into one helper and read NUL-delimited staged blob contents with bounded applicable-file checks. Advisory patterns are not proof of defects.

**Preserved:** Design-heading, gameplay-literal and owner-tag advisory intent remains, along with JSON validation. No commit is executed.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-08 — Model updater stopped after one edit and lacked recoverable multi-file handling

**VERIFIED DEFECT / high**. Original location: `change_model.sh:3`.

**Evidence:** Reproduced original script exit 1 with exactly one agent changed. Post-increment returns a failing shell status when incrementing zero under set -e. Evidence: baseline-reproductions.json.

**Correction:** Preserved the public script and model argument; added strict identifier/preflight, dry run, retained originals/manifest, per-file atomic replacement, rollback and concurrency-conflict handling.

**Preserved:** Existing model fields are updated; inherited models and body examples remain unchanged. Actual provider availability is explicitly not tested; multi-file writes are not called atomic.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-09 — Agent log parsing permitted forged lines and hid errors

**VERIFIED DEFECT / medium**. Original location: `.opencode/hooks/log-agent.sh:12`.

**Evidence:** Original jq decoding plus echo permits a newline in agent_name to create a forged log line; fallback grep is not a JSON parser and write errors are suppressed. Isolated reproduction appended to baseline evidence.

**Correction:** Strict JSON, bounded input, lowercase identifier validation, safe field allowlist, special/symlink target refusal and reported write failure. Reused the original log pathname and line format.

**Preserved:** Agent invocation audit intent remains; prompts and unrelated payload fields are not logged.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-10 — Context heuristics asserted unverified project facts

**VERIFIED DEFECT / medium**. Original location: `.opencode/hooks/session-start.sh:44`.

**Evidence:** The original implementation counts all BUG files without reading status, selects sprint by file modification time, and declares no source based on a limited src scan. A fixture with app/main.dart demonstrates the latter limitation.

**Correction:** Relabeled counts/statuses as unverified, limited-path advisory signals; preserved the scan and routed real discovery through evidence-based inspection.

**Preserved:** Useful context previews and gap suggestions remain without inventing active status or project type.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-11 — Compaction and status-line guarantees lacked implementations

**VERIFIED DEFECT / medium**. Original location: `.opencode/hooks/pre-compact.sh:3`.

**Evidence:** No status-line renderer or automatic hook wiring exists in the original inventory. Running a script does not establish that a host compaction occurred or retained all state.

**Correction:** Documented manual, potentially partial checkpoints; corrected log wording and recovery instructions; kept active state and version/context revalidation requirements.

**Preserved:** Compact state structure and context recovery guidance remain; no invented automation is introduced.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-12 — Engine setup inferred knowledge and licensing from stale constants

**VERIFIED DEFECT / medium**. Original location: `.opencode/skills/setup-engine/SKILL.md:174`.

**Evidence:** A multi-provider host does not establish a universal model training cutoff, and the repository provides no current verification for its fixed pricing/license table. These assertions cannot be used as project evidence.

**Correction:** Repaired only the knowledge-gap/verification and pricing guidance: use detected/pinned versions, actual official evidence and explicit unknowns; retain engine choice/setup workflow.

**Preserved:** Original setup-engine skill name, engine comparison purpose, technical preferences and version-aware references remain.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-13 — Retained engine references could be mistaken for verified project truth

**UNVERIFIED HYPOTHESIS / CONCRETE RISK / medium**. Original location: `docs/engine-reference/README.md:9`.

**Evidence:** These are historical engine/version/API claims without a demonstrated current project or engine runtime. Individual API validity was not exhaustively established; no replacement facts are invented.

**Correction:** Quarantined all 55 engine-reference Markdown files at their point of use with UNVERIFIED labels; corrected the README trust/verification policy. Preserve original examples for later version-matched review.

**Preserved:** All engine material remains available as untrusted reference data, not auto-approved guidance.

**Re-audit state:** CONTAINED / UNVERIFIED: actual version-specific semantic/API review required before reliance.

### AUD-14 — Collaboration boilerplate conflicted with scoped completion and existing approval

**VERIFIED DEFECT / medium**. Original location: `.opencode/agents/lead-programmer.md:44`.

**Evidence:** Repeated mandatory approval questions and optional test/refactor follow-ups conflict with the supplied authorized-repair request, required validation and stop-after-feature policy.

**Correction:** Targeted shared boilerplate edits: ask only unresolved questions, reuse exact granted authorization, validate before completion, record unrelated work without starting it. Added one canonical workflow reference.

**Preserved:** Collaborative design, user ownership, domain boundaries and review responsibilities remain; no agent gains independent scope authority.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-15 — Documentation made unsupported install, pricing, count and compatibility claims

**VERIFIED DEFECT / UNVERIFIED CLAIM / medium**. Original location: `README.md:6`.

**Evidence:** Original inventory has 55 agents, not 54. Official docs identify opencode-ai and auth login. Recursive global copying risks overwriting existing configuration; no provider billing or live-host tests were supplied.

**Correction:** Corrected counts and setup references, removed unconditional free/full-support claims, documented project-local reviewed merges and actual validation limits.

**Preserved:** Original README structure, studio hierarchy, credits, links and MIT license remain.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-16 — Required audit/repair lifecycle and invalid-dependency state were absent

**VERIFIED GAP / high**. Original location: `.opencode/agents/lead-programmer.md:16`.

**Evidence:** No original dedicated audit skill, registry, plugin, report template or regression suite appears in the complete baseline inventory; the user explicitly requested these capabilities.

**Correction:** Added one canonical integrity rule, dedicated skill/auditor, bounded bootstrap, evidence registry/checker and runtime adapter; declarations default to unreviewed and no self-approval records are shipped.

**Preserved:** Existing workflows remain canonical and are gated rather than rebuilt; exact requested AUDIT BEFORE EXTENSION wording is retained.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-17 — Engineering scope, state and ownership safeguards needed explicit common governance

**VERIFIED REQUIREMENT GAP / medium**. Original location: `.opencode/docs/coordination-rules.md:1`.

**Evidence:** The supplied 1,115-line upgrade brief explicitly requests discovery, feature scope lock, state/cache discipline, framework/backend/game modes, shared roles and completion gates beyond the original game-studio prompts.

**Correction:** Added a canonical lifecycle, five further focused engineering skills, three further complementary roles, and maps to existing specialists rather than creating duplicate agents for every requested label.

**Preserved:** Game design/prototype workflows remain legitimate; production requirements are conditional on the authorized task, not an excuse to deploy or fabricate completion.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

### AUD-18 — Two Unity reference links resolved to missing sibling paths

**VERIFIED DEFECT / low**. Original location: `docs/engine-reference/unity/PLUGINS.md:60`.

**Evidence:** Final local-link resolution found ../modules/input.md and ../modules/ui.md missing; the actual files are unity/modules/input.md and unity/modules/ui.md.

**Correction:** Corrected only the two relative link destinations to modules/input.md and modules/ui.md, then repeated the link scan. The template release-notes (link) token is intentional, not an installed dependency.

**Preserved:** Technical example content and the explicit UNVERIFIED status remain; fixing navigation does not approve engine API claims.

**Re-audit state:** REPAIRED; local checks passed / host acceptance pending where applicable.

## Requirements coverage

| User requirement | Delivered implementation |
|---|---|
| 1. Inspect before reliance | Skill sections 1–2; shared integrity applicability; bootstrap reads definitions as data |
| 2. Detect flawed/conflicting/obsolete/unsafe definitions | Ten-dimension audit matrix; evidence classification and failure checks |
| 3. Identify exact problematic instruction | Skill section 3 and report template require path, revision, line/section and quote |
| 4. Verify with available evidence | Reproduction/source/schema/official-doc evidence; unknowns remain BLOCKED or UNVERIFIED |
| 5. Allow justified modifications | Explicit repair authorization separate from audit-only permission |
| 6. Preserve valid behavior | Baseline/caller/contract capture plus positive and regression tests |
| 7. Never rebuild for a partial defect | Explicit in-place repair constraint; preserved public skill names and profile paths |
| 8. Smallest safe correction | Scope lock, minimal coherent patch and one writer; no unrelated cleanup |
| 9. Re-audit after change | Skill section 6; original failure plus relevant positive/negative/regression checks |
| 10. Block known-invalid dependencies | Status/context/source/evidence checks and mandatory governance/transitive closure before local skill/task use |
| 11. Record what and why | Report template, detailed findings, evidence logs, before/after change manifest |
| 12. Reuse corrected truth | Revision/context-bound current records; stale data blocked; report history preserved |

The audit capability can audit its own source, but cannot declare itself correct by
assertion. A bounded primary-agent/manual bootstrap reviews governance and the audit
implementation once; a dependency cycle is reviewed as a bounded group rather than
causing infinite recursive delegation.

## New files and canonical responsibilities

The core skill is `.opencode/skills/skill-audit-repair/SKILL.md`; its role is
`.opencode/agents/skill-auditor.md`. `skill-integrity.md` owns audit policy;
`engineering-workflow.md` owns the shared implementation lifecycle;
`audit-runtime.md` owns the record/bootstrap/runtime contract. Thin command wrappers
route to canonical skills instead of duplicating their bodies.

Five additional focused skills support repository discovery, structured debugging,
framework engineering, concurrency review and production validation. Three additional
profiles cover project discovery, backend engineering and concurrency review. Existing
architecture, game/UI, security, performance, testing and production profiles keep
those domains. Capability/role maps make aliases and ownership explicit.

The shared lifecycle covers real-project discovery; one primary task classification;
FEATURE SCOPE LOCK; valid-state reuse and invalidation; memory compaction without
losing constraints/failures; one-writer concurrency; bounded structured diagnostics;
existing-feature/API/data ownership; UI/RTL/accessibility; game authority and networking;
web/backend/framework work; testing and conditional production validation; honest
completion and STOP. It explicitly distinguishes a completed scoped prototype from
a production feature and missing required checks from inapplicable checks.

## Runtime behavior and limits

The local plugin uses `tool.execute.before` for `skill` and `task`. Its checker is
read-only: it validates source/evidence fingerprints, declared transitive dependencies,
mandatory governance, context, reviewer fields and PASS/justified-N/A records. Missing,
invalid, pending, blocked, stale, malformed or unconfigured records stop those calls.
Duplicate JSON keys, invalid/future dates and unsafe paths are rejected. Cycles do
not omit checks. Changed bytes alone cannot clear an INVALID state.

A hash and review record are **not proof of semantics**. The reviewer must declare the
real dependency closure, verify evidence quality and resolve local/global identity.
External environment changes require a context change/re-audit. Effective host startup
instructions, direct agent selection, arbitrary shell/custom tools and malicious edits
to the gate itself are not comprehensively intercepted. Files can change between
checking and loading: use a single writer and reload after changes. This is not an
operating-system sandbox, signed supply-chain attestation or universal safety guarantee.

All eight shell helpers remain manual unless a separately audited adapter installs
real wiring. Post-write checks cannot undo a write. Push warnings do not enforce
branch protection or run tests. Context helpers do not prove compaction/completion.
Model updates use recoverable originals and per-file atomic writes, not a multi-file
transaction; crash or concurrent-edit reconciliation may require manual recovery.

## Validation actually performed

| Check | Result | Evidence |
|---|---|---|
| Node gate / plugin-function contract fixtures | PASS — 47 tests, no failures/skips | `docs/skill-audit/node-tests.txt` |
| Python executable regressions / structure fixtures | PASS — 45 tests, no failures/skips | `docs/skill-audit/python-tests.txt` |
| Original failure reproductions | Four isolated original behaviors captured | `docs/skill-audit/baseline-reproductions.json` |
| Final syntax/structure and preservation checks | Results in accompanying JSON | `docs/skill-audit/static-validation.json` |
| Original-to-current file hashes | No original deletion; license preserved | `docs/skill-audit/change-manifest.json` |
| Actual OpenCode-host loading/tool interception | NOT RUN / required installation acceptance | CLI is not installed in the editing environment |
| Full official JSON-schema validator | NOT RUN | Schema download was unavailable; JSON syntax, referenced files and documented contracts were checked separately |
| Actual game engines, provider availability, production deployment | NOT RUN / outside this template update | No project engine/provider/deployment was configured |

Run commands after inspecting the tests:

```bash
node --test tests/skill-system/audit-gate.test.mjs
python3 -m unittest discover -s tests/skill-system -p 'test_*.py' -v
node .opencode/scripts/skill-audit.mjs inventory
node .opencode/scripts/skill-audit.mjs check .opencode/skills/skill-audit-repair/SKILL.md
```

The last command is expected to return 2 in the distributed UNCONFIGURED state.
That is the intended bootstrap block, not a failed regression. Test fixtures create
approved records only inside temporary directories; no real definition was silently
promoted to VALIDATED. Expected error messages in negative tests are not hidden failures.

Test environment:

- **node:** v22.16.0
- **python:** Python 3.13.5
- **git:** git version 2.47.3
- **bash:** GNU bash, version 5.2.37(1)-release (x86_64-pc-linux-gnu)
- **platform:** Linux-6.18.44-x86_64-with-glibc2.41
- **opencode:** NOT INSTALLED — live host integration NOT RUN
- **official_schema:** Full downloaded JSON schema validation NOT RUN; download unavailable in this environment


## Installation acceptance still required

Before starting OpenCode, inspect the executable local plugin and helpers. Keep this
installation project-local; do not blindly copy it over existing/global settings.
Use the primary agent and ordinary reviewed read-only tools for bootstrap, following
`audit-runtime.md`. Confirm actual version, effective merged permissions, resolved
skill/agent identities, command discovery and plugin invocation. Record the precise
use scope, dependencies and real acceptance-test results before approving records.
Test the missing/invalid/stale cases in a disposable project, not by damaging a live
skill. The repaired definitions become the source of truth only after the applicable
installation-specific review passes.

## Rollback and preservation

The original uploaded ZIP is the baseline; it was not modified. The delivery includes
a unified patch and a hash manifest. Reconcile an extracted copy or reverse a reviewed
patch only on unchanged matching bytes; do not overwrite concurrent user edits. No
original agent/skill was deleted or renamed. Model changes retain their own backups
and manifests; failed logging retains active recovery state.

The change manifest excludes only itself to avoid a self-referential hash. Evidence
and report files are not preapproved audit-registry entries. Original and current
hashes identify the exact reviewed copies rather than suggesting an unknown future
installation is automatically valid.

## Official documentation used for compatibility findings

Consulted 2026-09-28. These pages support the host-contract corrections, not a claim
that this environment executed the host:

- OpenCode plugins: https://opencode.ai/docs/plugins/
- Rules and instruction loading: https://opencode.ai/docs/rules/
- Configuration and merge behavior: https://opencode.ai/docs/config/
- Skill discovery/frontmatter: https://opencode.ai/docs/skills/
- Commands: https://opencode.ai/docs/commands/
- Agent definitions: https://opencode.ai/docs/agents/
- Permissions: https://opencode.ai/docs/permissions/
- CLI/authentication: https://opencode.ai/docs/cli/
- Installation: https://opencode.ai/docs/
- Tool parameter source: https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/opencode/src/tool/skill.ts
- Task parameter source: https://raw.githubusercontent.com/anomalyco/opencode/dev/packages/opencode/src/tool/task.ts

## Final task state

**CURRENT TASK:** update the existing studio with audited minimal repairs and Skill Audit & Repair.
**STATUS:** archive implementation and local validation complete; installation-specific runtime approval remains blocked/unconfigured.
**CHANGED:** targeted repairs, shared audit/engineering governance, focused capabilities, runtime adapter, tests and evidence.
**VALIDATED:** 92 local tests; final static/preservation results supplied separately.
**FAILED:** no failures in the final local test suites.
**UNRESOLVED:** live OpenCode acceptance, effective external configuration, actual engine/API/provider compatibility.
**OUT-OF-SCOPE:** production deployment, global installation, exhaustive verification of historical engine examples.
**NEXT ALLOWED TASK:** installation-specific bootstrap when requested/authorized; no dependent unreviewed engineering work.
