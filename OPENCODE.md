# Opencode Game Studios -- Game Studio Agent Architecture

Indie game development managed through coordinated OpenCode subagents (see `.opencode/agents/` for the installed roster).
Each agent owns a specific domain, enforcing separation of concerns and quality.

## Shared engineering governance

Read `AGENTS.md`, `.opencode/rules/skill-integrity.md` and
`.opencode/docs/engineering-workflow.md` before relying on this template. Existing
`@path` entries below are navigation references, not automatic OpenCode imports.
Only use an engine reference after confirming the actual project version.

## Technology Stack

- **Engine**: [CHOOSE: Godot 4 / Unity / Unreal Engine 5 / GameMaker Studio 2]
- **Language**: [CHOOSE: GDScript / C# / C++ / Blueprint / GML]
- **Version Control**: [VERIFY the repository workflow; do not impose trunk-based development]
- **Build System**: [SPECIFY after choosing engine]
- **Asset Pipeline**: [SPECIFY after choosing engine]

> **Note**: Engine-specialist agents exist for Godot, Unity, Unreal, and GameMaker
> with dedicated sub-specialists. Use the set matching your engine.

## Project Structure

@.opencode/docs/directory-structure.md

## Engine Version Reference

@docs/engine-reference/godot/VERSION.md
@docs/engine-reference/unity/VERSION.md
@docs/engine-reference/gamemaker/VERSION.md
@docs/engine-reference/unreal/VERSION.md

## Technical Preferences

@.opencode/docs/technical-preferences.md

## Coordination Rules

@.opencode/docs/coordination-rules.md

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST obtain approval for the scoped changeset before writes. An explicit
  implementation/repair request or already-approved changeset supplies that approval;
  do not repeatedly ask for the same authorized operation. Host permissions still apply.
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

> **First session?** If the project has no engine configured and no game concept,
> run `/start` to begin the guided onboarding flow.

## Coding Standards

@.opencode/docs/coding-standards.md

## Context Management

@.opencode/docs/context-management.md
