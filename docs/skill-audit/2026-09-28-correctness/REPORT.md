# Skill Audit & Repair — targeted correctness revision

**Record:** SAR-2026-09-28-CORRECTNESS  
**Review date:** 2026-09-28, Asia/Tokyo  
**Evidence timestamp:** 2026-09-27T23:19:24.680911+00:00  
**Source:** uploaded `opencode-game-studio(1).zip` and the supplied upgrade requirements  
**Decision:** requested source update completed and locally regression-verified. Installation-specific permission to rely on definitions is **not granted** by this report.

## 1. Outcome and preservation

The supplied package already contained **Skill Audit & Repair**, its auditor agent,
command, shared integrity rule, evidence-cache checker and plugin. They were inspected
and strengthened in place. A second auditor or competing ruleset was not created.
This follows the accompanying requirement to upgrade the existing system rather than
replace its intent or remove useful constraints.

All **326 original files remain**: **10 modified, 316 byte-identical, none removed**.
The **59 agents, 43 skills, 43 command wrappers, 12 rules and 8 shell hooks** retain
their existing names and responsibilities. No new runtime dependency, agent, skill,
command, model selection, permission grant, deployment or registry approval was added.
New files under this report directory are audit evidence, manifests and the focused patch.
The user's original ZIP was not overwritten.

The requested rule remains verbatim in `.opencode/rules/skill-integrity.md`:

> **AUDIT BEFORE EXTENSION — Never extend, compose, or depend on a skill until its correctness, compatibility, scope, and responsibilities have been verified. When a skill is defective, repair the existing skill first, validate the repair, then continue.**

## 2. Scope, authorization and evidence standard

The user explicitly authorized repair of this supplied skill system. Work was confined
to its existing audit capability, directly related definition-update/content-preview
failure paths, tests and documentation. Original bytes were retained separately and
all edits were made in a staged copy. No user's project, live service, repository
commit, external account, installed policy or production system was changed.

The review covered the relevant governance, auditor/command/skill, registry checker,
plugin, helper scripts, hooks, configuration, tests and changed consumers as source.
All executable helpers and test fixtures were inspected before execution. Broad
package inventory and frontmatter checks do **not** certify the specialized game,
engine, frontend, backend or deployment behavior of every library entry.
[The per-file coverage ledger](coverage.json) separates focused source review,
structural-only checks and inventoried but semantically unapproved content.

Findings distinguish **verified defects** from **concrete risks/clarifications**.
Tests use temporary directories and synthetic canaries, not private production data.
No independent reviewer or live OpenCode session is claimed. Historical audit reports
in the source remain unchanged and are not approval of this revision.

## 3. Findings and smallest corrections

The machine-readable [findings record](findings.json) contains original exact quotes,
line ranges, before/after SHA-256 values, impact, preservation and test names.
Line numbers below refer to the original attachment, not this revised copy.

### SAR-01 — IN_REVIEW omitted from prose no-reliance lists

**VERIFIED DEFECT · Medium: policy/runtime consistency**

**Original location:** `.opencode/rules/skill-integrity.md:67-69`; `.opencode/skills/skill-audit-repair/SKILL.md:76-78`.

The prose enumerated several unusable states but omitted IN_REVIEW, even though the runtime already accepts only VALIDATED. The added policy regression fails on the baseline. This is a prose consistency defect, not a demonstrated runtime authorization bypass.

**Correction:** Add IN_REVIEW and a canonical allow-list for current, use-specific VALIDATED records; block malformed/unknown states and unavailable required evidence. Refer to the same rule from the workflow and skill.

**Preserved:** No runtime gate, registry schema, public names, or permissions changed.

### SAR-02 — Read-only findings need an explicit stop-and-report path

**CONCRETE RISK · Low: workflow clarification**

**Original location:** `.opencode/skills/skill-audit-repair/SKILL.md:111-113`; `.opencode/skills/skill-audit-repair/SKILL.md:37-39`; `.opencode/rules/skill-integrity.md:80-82`.

Audit-only already prohibited writes while the record step said to write a report. The existing principle that evidence overrides cache did not spell out immediate no-reliance after a new finding without registry-write permission. These are ambiguous handoffs, not a reproduced executable bypass.

**Correction:** Explicit response/task-state report in read-only mode, immediate stop on the defective revision, authorized-only persisted revocation, and separate audit completion from permission to use the target.

**Preserved:** Read-only remains read-only; repair/evidence writes still need authorization. No permission expansion.

### SAR-03 — Absolute self-approval wording obscures bounded bootstrap review

**CONCRETE RISK · Low: responsibility clarification**

**Original location:** `.opencode/agents/skill-auditor.md:16-18`; `.opencode/agents/skill-auditor.md:19-21`.

The agent disallowed self-approval in absolute wording while also permitting manual primary-agent bootstrap. The audit skill already describes bounded evidence-backed inspection without recursive delegation. This risks deadlock or inventing an independent reviewer, rather than proving one occurred.

**Correction:** Prohibit trust by self-assertion and gate bypass; explicitly allow the already defined, bounded manual bootstrap review.

**Preserved:** Ownership stays with the technical director; no invented reviewer, automatic approval, new agent, or delegation bypass.

### SAR-04 — Model replacement drops CR in a non-final CRLF header field

**VERIFIED DEFECT · Low: file-format integrity**

**Original location:** `.opencode/scripts/change-model.py:64-66`.

Replacing model before another frontmatter field consumes the carriage return. The added CRLF fixture reproduces a mixed-line-ending result on the baseline; the original last-field CRLF test does not cover this position.

**Correction:** Exclude both CR and LF from the replacement match.

**Preserved:** LF, CRLF, following fields, Markdown bodies and existing inheritance behavior are preserved for supported forms.

### SAR-05 — Multiline model values leave continuation lines after replacement

**VERIFIED DEFECT · Medium: definition integrity**

**Original location:** `.opencode/scripts/change-model.py:58-60`; `.opencode/scripts/change-model.py:64-66`.

The one-line substitution replaced a block-scalar or multiline quoted model opener and left its continuation. Disposable fixtures demonstrate malformed/incomplete edits. All existing suite tests still passed before these cases were added.

**Correction:** Refuse non-scalar/decorated values, incomplete quoted scalars, and model continuations during complete preflight, before any files or backups are written. Nested data of a following top-level field remains allowed.

**Preserved:** No whole-file serialization or YAML runtime dependency. Existing backup, rollback, conflict and dry-run mechanisms remain.

### SAR-06 — Unsupported root YAML shapes are silently skipped in bulk model changes

**VERIFIED DEFECT · Medium: incomplete bulk update**

**Original location:** `.opencode/scripts/change-model.py:62-64`.

Quoted/encoded root keys, root flow mappings, all-root indentation and a root merge can escape the canonical model-line match. The baseline then changes other files instead of rejecting an unsupported effective configuration. Four root-shape subtests and the quoted-key case reproduce it.

**Correction:** Narrow the editor to conventional block mappings with unquoted root keys and canonical single-line model fields. Refuse unsupported root shapes/key spellings before any write; document parser-aware editing as the alternative.

**Preserved:** All shipped agent representations remain supported. Inheriting profiles are not given invented overrides; no claim of a complete YAML validator.

### SAR-07 — Compaction WIP scan reads linked design content

**VERIFIED DEFECT · Medium: unintended local content exposure**

**Original location:** `.opencode/hooks/pre-compact.sh:65-69`; `.opencode/hooks/pre-compact.sh:68-70`.

The compaction helper validates its checkpoint but reads design/gdd Markdown using -f and grep, which follow symlinks. Safe canary fixtures demonstrate a linked file or linked gdd directory reaching output; this is local content exposure, not proven remote exfiltration.

**Correction:** Reject symlink design namespace components and matched Markdown documents before linked content is read; exit 2 with a non-content diagnostic.

**Preserved:** Ordinary WIP detection, existing checkpoint protections and state-retention behavior remain. No claim of a race-resistant filesystem sandbox.

### SAR-08 — Coverage and regression evidence need explicit boundaries

**CONCRETE RISK · Low: prevention of unsupported approval claims**

**Original location:** `.opencode/skills/skill-audit-repair/SKILL.md:32-34`; `.opencode/skills/skill-audit-repair/SKILL.md:97-99`.

The original skill called for complete relevant-closure review but did not require a coverage ledger distinguishing structural inspection from semantic review and external runtime blocks. Existing positive tests also missed specific editor/preview cases. Absence of this ledger is a reporting risk, not proof of fabricated results.

**Correction:** Require coverage categories; add definition-editor and all-preview-source checks; make report delivery, state and scope explicit.

**Preserved:** The existing eight-step lifecycle, evidence classifications, narrow repair policy and corrected-source reuse remain.

## 4. Audit dimensions checked

| Requested dimension | Evidence or boundary |
|---|---|
| Contradictions and scope conflicts | SAR-01 through SAR-03; canonical rule, workflow, audit-only behavior and bootstrap responsibilities cross-read. |
| Incorrect assumptions | SAR-04 through SAR-07; representative line endings, YAML representations and linked content reproduced safely. |
| Outdated instructions | Public OpenCode contract checked against official documentation; actual installed-version compatibility remains unverified. Domain reference versions were not silently upgraded. |
| Duplicated logic | Existing auditor, skill, command and rule reused. The canonical rule is referenced rather than reimplemented as a second gate. |
| Unsafe behavior | Linked content exposure rejected; existing safety/rollback/permission tests retained. No sandbox guarantee claimed. |
| Broken dependencies | Active JSON/frontmatter, command-to-skill existence, instruction paths and local inventory checked. Missing optional `.opencode/tools` is reported by inventory, not fabricated. Global/provider dependencies remain external. |
| Unclear responsibilities | Auditor remains definition-integrity owner, reporting to the technical director. Manual bootstrap is evidence-backed, not independent-agent theater. |
| Hallucination risks | Coverage ledger, evidence classifications, actual pass/fail outputs, no auto-approvals and no invented host execution. |
| Incomplete/destructive changes | Full preflight rejects unsupported edits; recoverable original behavior retained. Existing tests include failure rollback, concurrent edits and no-write dry runs. |

## 5. Re-audit and actual validation

| Check | Observed result | Meaning |
|---|---|---|
| Original Python suite | 55 tests passed; exit 0 | Establishes the original suite was green, not that original code was defect-free. |
| Original Node suite | 60 tests passed; exit 0 | Existing gate regression baseline. |
| Added regression methods on original source | 11 methods ran; 8 failing methods produced 11 failures including 4 root-YAML subtest failures; exit 1 | Intended red reproduction. The other 3 methods protect valid existing behavior. |
| Final Python suite | **66 tests passed; exit 0** | All 55 prior methods plus all 11 additions. |
| Final Node suite | **60 tests passed; exit 0** | Gate suite unchanged; no tests removed to obtain green results. |
| Frontmatter structure | 59 agent, 43 skill and 43 command definitions passed checks | Structure/names/types checked, not specialized semantic approval. |
| Syntax checks | Active JSON, Python AST, 9 Bash scripts and 3 JS/MJS sources passed | Local parsers/runtime only. |
| Local inventory | Exit 0; 229 unique local governance/definition files | Explicitly `INVENTORY_ONLY_NOT_SEMANTIC_APPROVAL`. |
| Fingerprint helper | Exit 0 | Exact final audit skill/rule hashes recorded, not semantic approval. |
| Unconfigured registry | Exit **2**, expected `BLOCKED` | The distribution does not approve itself. |
| Patch reproduction | `git apply --check` and isolated apply succeeded; all 326 original-file outputs matched | Patch applies to the supplied baseline and reconstructs the source changes. |

The final result is **126 passing tests** across the Python and Node suites, with no
skipped final tests. [Raw evidence](evidence/final-python.txt),
[Node evidence](evidence/final-node.txt), [original red reproduction](evidence/red-final.txt),
[static checks](evidence/static-checks.json) and [additional checks](evidence/additional-checks.json)
are included. Intermediate incomplete/timeout or interrupted runs were not counted as
passes; the retained full baseline, final red and final green logs are the completed
runs supporting these conclusions. Expected negative-fixture diagnostics inside a
passing test are not hidden production failures.

Executed environment: **Python 3.13.5, Node.js v22.16.0, GNU Bash 5.2.37, Git 2.47.3**.
The real UTC timestamp and Tokyo review date are separately recorded in
[environment evidence](evidence/environment.json). Other runtime versions and the
stated Python minimum were not executed.

## 6. Mapping the 12 requested capabilities

| Requirement | Existing capability preserved or strengthened |
|---|---|
| 1. Inspect before relying | Skill Contract and steps 1–2; canonical applicability and pre-task workflow. Reading for audit is not execution or acceptance. |
| 2. Detect flawed/conflicting/obsolete/unsafe definitions | Ten-dimension audit table in step 2; relevant full dependency-closure review. |
| 3. Identify exact problematic instruction | Step 3 and report template require path, section/lines, quote and before hash. |
| 4. Verify with evidence | Reproduction or source/schema evidence; verified defects, concrete risks and hypotheses remain distinct. |
| 5. Modify when justified | Explicit in-scope repair authorization; audit-only never silently grants writes. |
| 6. Preserve valid behavior | Names, roles, contracts, constraints and regression behavior retained. |
| 7. Do not rebuild for a local defect | Existing skill/agent/rule reused; targeted repairs only. |
| 8. Smallest safe correction | Steps 4–5; coherent minimal patch, complete preflight and recoverable baseline. |
| 9. Re-audit after repair | Step 6; original red cases rerun, all existing suites retained, final hashes captured. |
| 10. Block invalid foundations | Current VALIDATED allow-list; IN_REVIEW and other nonapproved states blocked; new evidence overrides an old cache entry even in read-only mode. |
| 11. Record what and why | Report template, findings, source manifest, focused patch and actual logs. |
| 12. Reuse corrected source of truth | Step 7; exact revision/context binding, transitive input snapshots and consumer re-audit before reuse. |

## 7. Corrected source and installation boundary

The revised source files in this distribution are the corrected package copy for this
change. The [source manifest](source-manifest.json) identifies every original file and
its final SHA-256; it deliberately excludes new evidence files to avoid self-reference.
The [focused patch](changes.patch) changes only the 10 original files. It does not
include this new evidence directory; use the complete ZIP to retain all audit records.
The original ZIP is the recovery baseline. Do not restore defective portions merely
to obtain an old approval, and do not overwrite unrelated edits during rollback.

**The checked-in registry remains byte-for-byte unchanged:** schema 2,
`context_id: "UNCONFIGURED"`, `worktree: null`, empty records. No source or consumer
has been promoted to installation-wide VALIDATED by this work. Changes to shared
governance must invalidate or stale affected approvals in any existing installation;
re-audit their actual transitive source closure rather than refreshing hashes blindly.

On the user's installation, start from the repository root and use the existing
`/skill-audit-repair` command for the intended target and explicitly authorized mode.
Its bootstrap reads the procedure and governance as data with ordinary primary-agent
tools. Verify installed OpenCode/version/configuration, host permissions, effective
local/global name resolution and relevant dependencies before creating any records.
Only authorize records for the reviewed use, real canonical worktree/context and
final source/evidence revisions. The report is not a substitute for those checks.

The audit command defaults to audit-only. A completed audit can correctly end with
an INVALID/BLOCKED target; it is not permission to use that target. Persist evidence
or a registry revocation only with write authorization. Until then, report the finding
in the response/task state and stop depending on the defective definition.

## 8. Deliberate limits and unresolved external checks

**Actual host integration: NOT RUN / BLOCKED for installation approval.** OpenCode
and Bun are not installed in this execution environment. Public documentation was
consulted, but no real host startup, skill/task interception or provider call was
smoke-tested. Game-engine execution, frontend/backend deployment, migrations and
production validation were outside this package-repair scope; no production-ready
claim is made.

The unchanged plugin checks local `skill` and `task` calls using the registered
`tool.execute.before` event. It does not universally intercept startup instructions,
direct primary-agent selection, global definitions, custom tools, arbitrary shell
execution or malicious operators. The read-only registry checker cannot infer hidden
dependencies or prove the semantic truth of an evidence report. Host permissions and
an honest source/dependency audit remain necessary.

The model updater is intentionally a **bounded editor, not a complete YAML parser or
schema validator**. It supports the shipped conventional representations and rejects
unsupported forms before writes. An unusual but valid YAML representation requires a
separately reviewed parser-aware edit. Model availability was not tested. Existing
per-file atomic replacement and backups do not make a multi-file update transactionally
atomic through every process kill; inspect retained manifests/originals after a crash.

Symlink checks stop the reproduced static linked-content paths; they are not a
TOCTOU-resistant sandbox against concurrent hostile filesystem mutation. No privileged
attacker, filesystem locking, or universal secret-detection guarantee is implied.

## 9. Reproduction commands

Review helpers/tests before running them. From an extracted, disposable package copy:

```bash
node --test tests/skill-system/audit-gate.test.mjs
python3 -m unittest discover -s tests/skill-system -p 'test_*.py' -v
node .opencode/scripts/skill-audit.mjs inventory
node .opencode/scripts/skill-audit.mjs fingerprint .opencode/skills/skill-audit-repair/SKILL.md
node .opencode/scripts/skill-audit.mjs check .opencode/skills/skill-audit-repair/SKILL.md
```

The last command must exit 2 for this unconfigured distribution. Do not change the
registry just to make the command succeed. To reproduce the original defects, copy
only the revised test file into a disposable extraction of the original attachment
and run the Python command with `-k revision_`; the baseline should fail the added
negative/policy cases. All tests are local and do not deploy anything.

For the optional patch, first run `git apply --check` against a clean copy of the
**exact supplied original**. Inspect local edits and the patch before applying it.
Do not use resets, forced overwrites or deletion to make an incompatible patch fit.

## 10. External references consulted

Official OpenCode documentation was read on 2026-09-28 (Asia/Tokyo) to check the public
plugin, skill, agent and configuration contracts. These mutable public references
are supporting documentation, not evidence of the user's installed version:

- https://opencode.ai/docs/plugins/
- https://opencode.ai/docs/skills/
- https://opencode.ai/docs/agents/
- https://opencode.ai/docs/config/

## Final task state

**CURRENT TASK:** strengthen the supplied existing skill system with audit-before-extension and justified minimal repairs.  
**STATUS:** source update complete; bounded local validation passed. Installation trust remains unconfigured.  
**CHANGED:** 10 original files; new audit/evidence files only.  
**VALIDATED:** final 126 tests, structural/syntax checks, expected fail-closed CLI, fingerprints, preservation and patch reproduction.  
**FAILED:** original defects reproduced by the new red suite; corresponding final cases now pass.  
**UNRESOLVED:** actual host/version/provider compatibility and broader domain/runtime approval.  
**OUT-OF-SCOPE:** product-feature work, live deployments, global policies and automatic bulk approvals.  
**NEXT ALLOWED TASK:** only an explicitly authorized installation-context audit or independent task whose dependency gate is satisfied; otherwise STOP.
