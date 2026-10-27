"""Targeted detection behavior and instruction contracts; not LLM compliance proofs."""
from pathlib import Path
import json
import subprocess
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[2]

class UpgradeContracts(unittest.TestCase):
    def test_conventional_detector_recognizes_requested_language_extensions(self):
        for ext in ('go','rs','lua','luau','js','mjs','cjs','jsx','ts','tsx'):
            with self.subTest(extension=ext), tempfile.TemporaryDirectory() as temp:
                root=Path(temp);(root/'src').mkdir();(root/'src'/f'fixture.{ext}').write_text('// fixture candidate; never executed')
                result=subprocess.run(['bash',str(ROOT/'.opencode/hooks/detect-gaps.sh')],cwd=root,capture_output=True,text=True,timeout=5)
                self.assertEqual(result.returncode,0,result.stderr)
                self.assertNotIn('No configured engine/concept or recognized source files found',result.stdout)
                self.assertNotIn('APPROVED',result.stdout)
    def test_policy_loaded_once_without_replacing_existing_instructions(self):
        value=json.loads((ROOT/'opencode.json').read_text())
        self.assertEqual(value['instructions'].count('.opencode/rules/task-evidence.md'),1)
        for path in ('OPENCODE.md','.opencode/rules/skill-integrity.md','.opencode/docs/engineering-workflow.md'):
            self.assertIn(path,value['instructions'])
    def test_shared_policy_distinguishes_execution_from_checkbox(self):
        text=(ROOT/'.opencode/rules/task-evidence.md').read_text()
        for phrase in ('UNVERIFIED_DONE','STALE','CHECKPOINT','A task checkbox','One authoritative tracker'):
            self.assertIn(phrase.lower(),text.lower())
        self.assertIn('No scheduler',text)
    def test_existing_skills_reference_authoritative_contract(self):
        for name in ('sprint-plan','milestone-review','retrospective','production-validation','debugging-analysis','tech-debt'):
            self.assertIn('.opencode/rules/task-evidence.md',(ROOT/'.opencode/skills'/name/'SKILL.md').read_text(),name)
    def test_language_profiles_do_not_claim_tool_installation(self):
        text=(ROOT/'.opencode/docs/language-tooling.md').read_text()
        for phrase in ('## Go','## Rust','## Lua','## JavaScript','does not mean this package includes'):
            self.assertIn(phrase,text)
    def test_attach_contract_distinguishes_server_and_queue_observer(self):
        text=(ROOT/'.opencode/docs/execution-and-queues.md').read_text()
        for phrase in ('Three different meanings of attach','read-only `attach`','not a fixed sleep','This helper is not an adapter for arbitrary external queues'):
            self.assertIn(phrase,text)
    def test_governance_includes_new_mandatory_sources(self):
        text=(ROOT/'.opencode/lib/audit-gate.mjs').read_text()
        for path in ('.opencode/rules/task-evidence.md','.opencode/docs/engineering-tools.md','.opencode/docs/execution-and-queues.md'):
            self.assertIn(path,text)
    def test_start_does_not_force_a_game_engine_on_other_projects(self):
        text=(ROOT/'.opencode/skills/start/SKILL.md').read_text()
        self.assertIn('do not require a game engine or GDD',text)
        for ext in ('*.go','*.rs','*.lua','*.mjs'):self.assertIn(ext,text)

if __name__=='__main__':unittest.main()
