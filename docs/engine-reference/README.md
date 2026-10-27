> **Reference status: UNVERIFIED TEMPLATE DATA.** The original dates, version pins,
> timelines, model-cutoff assumptions and API examples below are retained for provenance,
> not accepted as facts for this project. Verify each relevant claim against the actual
> installed/pinned version and official documentation before use. Do not infer model
> knowledge from a hardcoded cutoff or mark these files verified merely by reading them.

# Engine Reference Documentation

This directory preserves engine-reference templates and historical examples. It does
not establish which engine, version or APIs the current project actually uses. Only
an evidenced project-specific review may promote relevant content into a trusted cache.

## Why This Exists

A coding host does not have one universal model training cutoff. Verify version-
sensitive APIs, deprecations and maturity against the actual project and official
version-matched documentation. These templates alone do not prove current behavior.

## Structure

Each engine gets its own directory:

```
<engine>/
├── VERSION.md              # Pinned version, verification date, knowledge gap window
├── breaking-changes.md     # API changes between versions, organized by risk level
├── deprecated-apis.md      # "Don't use X → Use Y" lookup tables
├── current-best-practices.md  # New practices not in model training data
└── modules/                # Per-subsystem quick references (~150 lines max each)
    ├── rendering.md
    ├── physics.md
    └── ...
```

## How Agents Use These Files

Engine-specialist agents are instructed to:

1. Read `VERSION.md` as a claim, then confirm the engine/version against the actual project
2. Check `deprecated-apis.md` before suggesting any engine API
3. Consult `breaking-changes.md` for version-specific concerns
4. Read relevant `modules/*.md` for subsystem-specific work

## Maintenance

### When to Update

- After upgrading the engine version
- When a change in model/tool behavior exposes a concrete documentation or compatibility gap
- After an explicitly requested documentation refresh (no `/refresh-docs` command is supplied)
- When you discover an API the model gets wrong

### How to Update

1. Update `VERSION.md` with the new engine version and date
2. Add new entries to `breaking-changes.md` for the version transition
3. Move newly deprecated APIs into `deprecated-apis.md`
4. Update `current-best-practices.md` with new patterns
5. Update relevant `modules/*.md` with API changes
6. Set verification dates only for claims actually checked; retain unresolved items as UNVERIFIED

### Quality Rules

- Record actual verification scope, source, version and date; use UNVERIFIED when evidence is absent
- Keep module files under 150 lines (context budget)
- Include code examples showing correct/incorrect patterns
- Link to official documentation URLs for verification
- Document relevant verified differences and compatibility evidence; do not infer model training coverage
