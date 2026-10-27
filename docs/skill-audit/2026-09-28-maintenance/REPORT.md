# Source-first skill maintenance audit

**Date:** 28 September 2026  
**Scope:** The uploaded `opencode.zip` and the accompanying engineering directive.  
**Outcome:** Source review completed for all **43 supplied SKILL.md files**; **31 existing skill files corrected**, **12 preserved unchanged**. **60 Node tests and 87 Python tests pass locally.** Installation approval remains **BLOCKED / UNCONFIGURED**.

## 1. What was actually done

Inspected the archive before extraction, all 43 skill bodies, shared governance,
configuration, the existing audit gate and plugin, maintenance scripts, existing
regression fixtures and the affected callers/templates. Compared the instructions
with the supplied engineering rules: preserve working behavior, constrain the task,
use actual project evidence and never claim success without verification. The exact
maintenance loop now appears in the existing shared rule:

**INSPECT → VALIDATE → DETECT → CORRECT → REVIEW → VERIFY → USE**

Corrections were made to the existing source paths in an extracted working copy,
not to an installed OpenCode instance. No overlapping skill, new agent, separate
audit tool or new runtime dependency was created. The original upload is unchanged.
No model provider, game engine, application, production service or actual OpenCode
session was executed. This is not a claim that every skill or domain dependency is
production-ready.

The review was performed by the primary assistant. No independent reviewer,
subagent execution or model-behavior evaluation is implied by an instruction review.

## 2. Inventory and preservation

| Item | Result |
|---|---:|
| Original archived files | 350 |
| Skill bodies reviewed | 43 |
| Existing skill bodies changed | 31 |
| Existing skill bodies preserved byte-for-byte | 12 |
| Agent definitions preserved byte-for-byte | 59 |
| Command wrappers preserved byte-for-byte | 43 |
| Original files changed, including helpers/tests/docs | 38 |
| Original files deleted | 0 |
| New skills, agents or runtime dependencies | 0 |
| Frontmatter documents structurally checked | 145 |
| Syntax checks (Bash, Python, JavaScript) | 16 |

Archive inspection found no traversal/absolute paths, duplicate entries, symlinks,
encrypted members or oversized extraction targets. Prior audit reports and their
evidence were preserved, not rewritten to look like this review. Every original
file has before/after SHA-256 values in `source-manifest.json`; the exact original-
to-maintained diff is `source-changes.patch`.

Original ZIP SHA-256:
`1e4e5c1181a0ecac5629c532971dbdf52760e0c692a94e37e16b331cf4e1fa3c`

## 3. Findings and source corrections

The following are **24 finding groups**, not 24 independently reproduced runtime
bugs. M23 and M24 have executable reproductions. Other groups are source-level
logic contradictions or concrete instruction risks. The detailed edit register
retains exact old/new text and affected paths; the patch provides original/final
line context. An instruction correction is not proof that an LLM will always obey it.

| ID | Area | Observed problem | Targeted correction |
|---|---|---|---|
| M01 | Shared governance | Legacy capability names, repetitive approval and evidence assumptions were insufficiently explicit. | Added the exact requested loop and portable capability/evidence contract to the existing shared rule. |
| M02 | Asset audit | Fixed format/naming requirements and code-search-only orphan classification could produce false findings. | Bound standards to actual import/platform rules; uncertain resource references remain candidates, not deletion authority. |
| M03 | Code review | Universal complexity/length thresholds and mandatory abstractions encouraged unjustified rewrites. | Made thresholds conditional on adopted standards and preserved valid framework-specific patterns. |
| M04 | Design review | System-GDD headings were imposed on concept/pillar documents; absent systems index implied readiness. | Select the actual document template, distinguish reference consistency from runtime coupling, and require approval before a readiness recommendation. |
| M05 | Localization | English was mandatory; positional placeholders were condemned; code search was treated as proof of orphan keys. | Discover source locale and grammar; preserve translation schema; unknown staleness and dynamic references remain unknown. |
| M06 | Performance | Static inspection was forced into estimated budget passes, gains and one-hour quick wins. | Separate measured, modeled and unknown results; require comparable evidence for budget status and gains. |
| M07 | Prototyping | Every file was required to start with // and all error handling could be skipped. | Use language-valid markers, preserve shebangs/headers, mark non-comment formats in README, and retain essential validation/cleanup. |
| M08 | Scope analysis | Item-count percentages implied schedule safety; cuts or extra time were treated as authorization. | Separate approved scope from effort/risk; use explicit baseline and guard unknown/zero denominators. |
| M09 | Sprint planning | The advertised update subcommand lacked its own update procedure. | Added a bounded update branch preserving task IDs, completed work, approvals and sprint identity. |
| M10 | Technical debt | The report summed S/M/L/XL labels and divided uncalibrated categories. | Use size distributions or calibrated numeric units; require positive effort and separate marker candidates from confirmed issues. |
| M11 | Release communication | Historical releases could include HEAD; a refactor was translated into an unsupported hit-detection improvement. | Resolve base/target commits; preserve exact release evidence; do not invent player outcomes, triggers, performance gains or quotes. |
| M12 | Team orchestration | Repeated all-agent delegation and parallel-write instructions conflicted with one-writer scope. | Reference shared governance, delegate only needed audited roles, sequence shared writes and retain actual narrative/input targets. |
| M13 | Hotfix/release authorization | Generic release-base commands, universal backports/SLAs and agent-generated deployment authorization were unsafe assumptions. | Resolve actual affected revision/policy; preserve work; distinguish recommendations from operator authorization and configured monitoring. |
| M14 | Release/launch checklists | Template platforms, infrastructure and timing values could become invented project requirements or sign-offs. | Added explicit applicability/evidence rules and kept missing required checks BLOCKED; no automatic deployment or new infrastructure. |
| M15 | GDD resume | An existing GDD could be followed by unconditional skeleton creation; placeholders could be labeled complete. | Create skeletons only for new paths, preserve existing content, validate the name, and keep unresolved dependencies/status explicit. |
| M16 | System mapping | Optional support features were treated as mandatory; MVP included only foundation-layer dependencies. | Make support responsibilities proposals and include the full hard-dependency closure regardless of layer. |
| M17 | Stage/onboarding/template | File counts and template paths could imply coverage, completion or an empty project. | Discover actual roots and provenance; require real coverage evidence; corrected the existing report template as well as consumers. |
| M18 | Estimates/retrospectives | Velocity, effort ratios, marker trends and unassigned owners could become invented metrics or commitments. | Separate velocity/completion, retain compatible units, unknowns and proposed/unassigned owners; do not force unsupported numeric ranges. |
| M19 | Reverse documentation | Template paths lacked the actual prefix; examples used a fixed date and could blur observed behavior with intent. | Corrected paths and provenance markers; preserve existing destinations and separate facts, intent, hypotheses and proposals. |
| M20 | Engine setup | Discovery came after writes; omitted version implied latest; refresh was absent from primary dispatch. | Move discovery before recommendations/writes, retain installed pins, dispatch refresh explicitly and treat examples as unverified proposals. |
| M21 | Phase gates | Not-major-revision and heading counts could act as approval; required unknowns were not a distinct blocking verdict. | Require current evidence and BLOCKED status for missing required checks; record user overrides separately from a passed gate. |
| M22 | Brainstorming | Mandatory full template filling could invent design answers and overstate market/motivation evidence. | Keep open questions and design hypotheses explicit, preserve existing work and reuse prior answers. |
| M23 | Design-preview runtime | Reproduced escape-sequence output and an unbounded matching line; the old scan could hide read errors. | Reuse the safe reader, cap enumeration/input/output, reject controls/special files, preflight before preview/logging and preserve normal UTF-8/WIP output. |
| M24 | Regression fixture | Duplicate-model rejection depended on which agent glob returned and whether a model field already existed. | Use an explicit two-model fixture and assert its setup; retain the original rejection/no-partial-change expectations. |

### Reproduced preview defect: before and after

| Synthetic input | Original result | Corrected result |
|---|---|---|
| WIP line with terminal escape sequence | Exit 0; escape emitted; compaction log written | Exit 2; no stdout; no log written |
| One matching line exceeding 1 MiB | Exit 0; 1,049,204 bytes of stdout; log written | Exit 2; no stdout; no log written |

The existing reader now enforces a 1 MiB per-file input bound. The design scan also
caps directory entries at 4096, Markdown documents at 256, aggregate input at 8 MiB,
rendered matching lines at 100 and excerpt output at 32 KiB plus a summary. Long
lines and output truncation are identified. UTF-8 text and normal WIP advisories
remain supported. Controls, unsafe names, symlinks, FIFOs, non-regular files and
unreadable data block before preview/logging. This cap covers **design-preview
content**, not every Git/status message from the shell helper. It does not redact
secrets or provide a race-proof hostile-filesystem sandbox.

### Reproduced test-fixture defect

The baseline Python suite ran 66 tests with one failure in
`test_duplicate_model_field_preflight_changes_nothing`. Its fixture selected the
first glob result and inserted a model field as though every agent already had one.
An inheriting agent made that assumption false. The fix creates an explicit fixture
with two model fields and asserts the fixture condition. It preserves the original
expectations: reject the duplicate and make no partial changes. **The model editor
itself was not changed to make a bad test pass.**

## 4. Verification performed

| Check | Result | Meaning / boundary |
|---|---|---|
| Baseline Node suite | 60 passed | Existing gate/unit behavior reproduced |
| Baseline Python suite | 66 run, 1 failed | Fixture failure investigated; original log retained |
| Final Node suite | **60 passed; 0 failures/skips** | Local gate/plugin-function tests, not a running host |
| Final Python suite | **87 passed; 0 failures/errors/skips** | 66 existing tests retained plus 21 new checks |
| New executable hook cases | 14 passed | Limits, controls, UTF-8, special files, preflight and error propagation |
| New source-contract checks | 7 passed | Selected instruction regressions; not end-to-end model behavior |
| Bash/Python/JavaScript syntax | 16 passed | Parse/syntax only |
| Skill/agent/command frontmatter | 145 parsed | Required skill names/descriptions and duplicate keys checked |
| Explicit local references/delegation names | No unresolved references found | Does not discover every implicit/global dependency |
| Read-only inventory CLI | Exit 0 | INVENTORY_ONLY_NOT_SEMANTIC_APPROVAL |
| Unconfigured registry gate | **Expected exit 2** | Missing installation approval remains blocked |

Environment: Node.js **22.16.0**, Python **3.13.5**, Bash and Git in the local Linux
container. PyYAML **6.0.3** was used for an audit-only
frontmatter check; it was not added as a package/runtime dependency.

The full Python runs exceeded the tool invocation limit. Their available logs are
retained as attempts, not used to claim completion. The final suite was split into
8 isolated subprocess shards (11 tests in seven shards, 10 in one). Every one of
the 87 discovered test IDs appears exactly once in the completed shard records.
Parallel test processes used separate temporary repositories/resources. Some negative
model-update tests intentionally print an update-failed message; their assertions
verify safe rejection/rollback and pass.

Reproduction commands from the project root, after reviewing the scripts/tests:

```bash
node --test tests/skill-system/audit-gate.test.mjs
python3 -B -m unittest discover -s tests/skill-system -p 'test_repairs.py' -v
node .opencode/scripts/skill-audit.mjs inventory
node .opencode/scripts/skill-audit.mjs check .opencode/skills/skill-audit-repair/SKILL.md
```

The last command is expected to fail with exit 2 in this distribution. Do not create
fake validation records merely to turn it green. A local environment with a shorter
command time limit can run individual test classes or named tests; completed shard
JSON lists the exact test IDs used in this audit.

## 5. Per-skill review register

Every row below has **NOT RUN** host/domain-runtime status and
**BLOCKED_PENDING_INSTALLATION_AUDIT** use status. “Reviewed” means the SKILL.md body
was inspected; it does not certify its full domain-agent/template/external closure.
See `skill-review-register.json` for hashes, scope and explicit status fields.

| Existing skill | Source review outcome | Finding groups |
|---|---|---|
| `architecture-decision` | Reviewed; preserved unchanged | No targeted defect identified |
| `asset-audit` | Corrected; source re-reviewed | M02 |
| `balance-check` | Reviewed; preserved unchanged | No targeted defect identified |
| `brainstorm` | Corrected; source re-reviewed | M22 |
| `bug-report` | Reviewed; preserved unchanged | No targeted defect identified |
| `changelog` | Corrected; source re-reviewed | M11 |
| `code-review` | Corrected; source re-reviewed | M03 |
| `concurrency-analysis` | Reviewed; preserved unchanged | No targeted defect identified |
| `debugging-analysis` | Reviewed; preserved unchanged | No targeted defect identified |
| `design-review` | Corrected; source re-reviewed | M04 |
| `design-system` | Corrected; source re-reviewed | M15 |
| `estimate` | Corrected; source re-reviewed | M18 |
| `framework-engineering` | Reviewed; preserved unchanged | No targeted defect identified |
| `gate-check` | Corrected; source re-reviewed | M21 |
| `hotfix` | Corrected; source re-reviewed | M13 |
| `launch-checklist` | Corrected; source re-reviewed | M14 |
| `localize` | Corrected; source re-reviewed | M05 |
| `map-systems` | Corrected; source re-reviewed | M15, M16 |
| `milestone-review` | Reviewed; preserved unchanged | No targeted defect identified |
| `onboard` | Reviewed; preserved unchanged | No targeted defect identified |
| `patch-notes` | Corrected; source re-reviewed | M11 |
| `perf-profile` | Corrected; source re-reviewed | M06 |
| `playtest-report` | Reviewed; preserved unchanged | No targeted defect identified |
| `production-validation` | Reviewed; preserved unchanged | No targeted defect identified |
| `project-stage-detect` | Corrected; source re-reviewed | M17 |
| `prototype` | Corrected; source re-reviewed | M07 |
| `release-checklist` | Corrected; source re-reviewed | M14 |
| `repository-discovery` | Reviewed; preserved unchanged | No targeted defect identified |
| `retrospective` | Corrected; source re-reviewed | M18 |
| `reverse-document` | Corrected; source re-reviewed | M19 |
| `scope-check` | Corrected; source re-reviewed | M08 |
| `setup-engine` | Corrected; source re-reviewed | M20 |
| `skill-audit-repair` | Reviewed; preserved unchanged | No targeted defect identified |
| `sprint-plan` | Corrected; source re-reviewed | M09 |
| `start` | Corrected; source re-reviewed | M17 |
| `team-audio` | Corrected; source re-reviewed | M12 |
| `team-combat` | Corrected; source re-reviewed | M12 |
| `team-level` | Corrected; source re-reviewed | M12 |
| `team-narrative` | Corrected; source re-reviewed | M12 |
| `team-polish` | Corrected; source re-reviewed | M12 |
| `team-release` | Corrected; source re-reviewed | M12, M13 |
| `team-ui` | Corrected; source re-reviewed | M12 |
| `tech-debt` | Corrected; source re-reviewed | M10 |

## 6. What remains uncertain or blocked

**U01 — Actual OpenCode resolution and integration.** No OpenCode binary/session was
available for a host smoke test. The existing adapter checks a constructed local
skill/agent path. It does not cryptographically bind that path to the exact effective
host-resolved definition. Global/nested duplicates, configuration overrides or
same-named custom tools must be resolved in the installed host before any approval.
The documented project-root launch assumption remains. A generic SDK resolver was
not invented or layered onto this unverified boundary. The runtime registry stays
empty and UNCONFIGURED, so no dependent skill/agent was released for use here.

**U02 — Actual project and domain dependency closure.** All 43 skill bodies were
reviewed and explicit references checked, but the 59 domain agents, all supporting
engine references and every template were not each semantically re-certified.
Governance, executable helpers, tests and the directly affected template/consumer
were reviewed. Before use, inspect the full closure actually selected for the user's
project, including engine/framework versions, real tool capabilities and project rules.

**U03 — Production/application behavior.** No game, website, Flutter app, localization
runtime, store release, build pipeline, deployment, load test or security assessment
of a real application was performed. No legal/platform certification, performance
gain, source-locale choice or engine compatibility was inferred from this template.

**U04 — Other environments and adversarial concurrency.** Python 3.9 minimum support,
other Node versions, Windows/macOS and the user's filesystem were not executed.
Filesystem checks reduce accidental unsafe reads; they do not eliminate all TOCTOU
races or protect against a malicious operator able to change the files/gate itself.
Keep one writer and re-audit changed context. Review records are evidence-bound
assertions, not formal semantic proofs or a complete security sandbox.

**U05 — Instruction-following reliability.** Manual source review and text assertions
cannot prove that every model/provider will follow these instructions in every task.
Required installation-specific, adversarial scenario and domain-runtime evaluations
remain prerequisites for live approval. No skill was marked VALIDATED solely because
its Markdown parsed or the local helper tests passed.

## 7. External verification used

Official OpenCode documentation was consulted on 28 September 2026 to distinguish
supported skill metadata/discovery and plugin hooks from assumed runtime behavior:

- Agent Skills: https://opencode.ai/docs/skills/
- Plugins: https://opencode.ai/docs/plugins/
- Configuration: https://opencode.ai/docs/config/

These are web references, not proof of the user's installed version. In particular,
unknown skill-frontmatter fields are ignored by OpenCode; legacy `allowed-tools`,
`context`, or a capability name in prose must not be treated as enforced permissions
or automatic execution. Skills can also be discovered outside this local directory.

## 8. Delivery and safe adoption

The maintained archive retains the same top-level project directory and original
skill/agent/command names. Extract to a **new directory** and review the patch against
your actual project. Do not recursively overwrite global or project configuration,
copy test approvals, or replace unrelated work. Merge only reviewed source changes
and keep the original archive as rollback evidence. This response did not install
anything, alter an external account, deploy, commit, push or start a background job.

For rollback, restore only the affected original paths from the original archive,
then reconcile subsequent user edits rather than performing a broad reset. The source
manifest identifies exact originals and replacements. Historical audit reports are
retained as history and are not current installation approvals.

**Final status:** source maintenance and local verification completed at the scope
above; host integration, domain validation and live-use approval remain BLOCKED.
