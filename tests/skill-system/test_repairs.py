"""Regression checks use disposable copies/repositories, never the user's worktree."""
from pathlib import Path
import importlib.util
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]

class HookTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        subprocess.run(['git', 'init', '-q', str(self.repo)], check=True)
    def asset(self, name='demo.json', content='{}'):
        p = self.repo/'assets/data'/name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content)
        return p
    def stage(self):
        subprocess.run(['git','add','--all'],cwd=self.repo,check=True)
    def hook(self, name, payload=None, args=()):
        return subprocess.run(['bash',str(ROOT/'.opencode/hooks'/name),*args],
                              input=json.dumps(payload) if isinstance(payload,dict) else payload,
                              text=True,capture_output=True,cwd=self.repo)
    def test_invalid_index_valid_worktree_blocked(self):
        p=self.asset(content='{bad');self.stage();p.write_text('{}')
        r=self.hook('validate-commit.sh',{'tool_input':{'command':'git commit -m test'}})
        self.assertEqual(r.returncode,2,r.stderr)
    def test_valid_index_invalid_worktree_allowed(self):
        p=self.asset();self.stage();p.write_text('{bad')
        r=self.hook('validate-commit.sh',args=['--staged']);self.assertEqual(r.returncode,0,r.stderr)
    def test_spaces_and_newline_filename(self):
        self.asset(name='space and\nnewline.json',content='{bad');self.stage()
        self.assertEqual(self.hook('validate-commit.sh',args=['--staged']).returncode,2)
    def test_deleted_staged_file_not_read(self):
        p=self.asset();self.stage()
        subprocess.run(['git','-c','user.email=test@example.invalid','-c','user.name=Test','commit','-qm','baseline'],cwd=self.repo,check=True)
        p.unlink();self.stage()
        self.assertEqual(self.hook('validate-commit.sh',args=['--staged']).returncode,0)
    def test_no_staged_files(self):
        self.assertEqual(self.hook('validate-commit.sh',args=['--staged']).returncode,0)
    def test_malformed_envelope_blocks(self):
        self.assertEqual(self.hook('validate-commit.sh','{').returncode,2)
    def test_missing_command_blocks(self):
        self.assertEqual(self.hook('validate-commit.sh',{'tool_input':{}}).returncode,2)
    def test_noncommit_command_does_not_execute(self):
        r=self.hook('validate-commit.sh',{'tool_input':{'command':'touch SHOULD_NOT_EXIST'}})
        self.assertEqual(r.returncode,0);self.assertFalse((self.repo/'SHOULD_NOT_EXIST').exists())
    def test_wrapped_git_command_refused(self):
        r=self.hook('validate-commit.sh',{'tool_input':{'command':'git -C other commit -m test'}})
        self.assertEqual(r.returncode,2)
    def test_duplicate_json_keys_block(self):
        self.asset(content='{"a":1,"a":2}');self.stage()
        self.assertEqual(self.hook('validate-commit.sh',args=['--staged']).returncode,2)
    def test_nonstandard_json_constant_blocks(self):
        self.asset(content='{"a":NaN}');self.stage()
        self.assertEqual(self.hook('validate-commit.sh',args=['--staged']).returncode,2)
    def test_invalid_asset_json_reports_failure(self):
        p=self.asset(content='{bad')
        r=self.hook('validate-assets.sh',{'tool_input':{'file_path':str(p)}})
        self.assertEqual(r.returncode,2);self.assertEqual(p.read_text(),'{bad')
    def test_asset_outside_repo_rejected(self):
        r=self.hook('validate-assets.sh',{'tool_input':{'file_path':'../elsewhere.json'}})
        self.assertEqual(r.returncode,2)
    def test_symlink_asset_rejected(self):
        real=self.asset('real.json');(real.parent/'link.json').symlink_to(real)
        r=self.hook('validate-assets.sh',{'tool_input':{'file_path':'assets/data/link.json'}})
        self.assertEqual(r.returncode,2)
    def test_session_stop_retains_incomplete_state(self):
        p=self.repo/'production/session-state/active.md';p.parent.mkdir(parents=True)
        data='STATUS: INCOMPLETE\nFAILED: required test\n';p.write_text(data)
        r=self.hook('session-stop.sh');self.assertEqual(r.returncode,0)
        self.assertEqual(p.read_text(),data)
    def test_session_stop_retains_state_when_log_unwritable(self):
        p=self.repo/'production/session-state/active.md';p.parent.mkdir(parents=True);p.write_text('BLOCKED')
        (self.repo/'production/session-logs').write_text('not a directory')
        self.hook('session-stop.sh');self.assertEqual(p.read_text(),'BLOCKED')

    def test_compound_commit_without_spaces_is_refused(self):
        r=self.hook('validate-commit.sh',{'tool_input':{'command':'git commit;touch SHOULD_NOT_EXIST'}})
        self.assertEqual(r.returncode,2);self.assertFalse((self.repo/'SHOULD_NOT_EXIST').exists())
    def test_valid_agent_log_omits_other_payload_fields(self):
        r=self.hook('log-agent.sh',{'agent_name':'game-designer','prompt':'SENSITIVE-DO-NOT-LOG'})
        self.assertEqual(r.returncode,0,r.stderr)
        text=(self.repo/'production/session-logs/agent-audit.log').read_text()
        self.assertIn('Agent invoked: game-designer',text);self.assertNotIn('SENSITIVE',text)
        self.assertEqual(len(text.splitlines()),1)
    def test_agent_log_injection_rejected(self):
        r=self.hook('log-agent.sh',{'agent_name':'valid\nforged-entry'})
        self.assertEqual(r.returncode,2);self.assertFalse((self.repo/'production').exists())
    def test_agent_log_malformed_input_rejected(self):
        self.assertEqual(self.hook('log-agent.sh','{"agent_name":').returncode,2)
    def test_agent_log_duplicate_key_rejected(self):
        self.assertEqual(self.hook('log-agent.sh','{"agent_name":"first","agent_name":"second"}').returncode,2)
    def test_agent_log_symlink_refused(self):
        target=self.repo/'outside';target.mkdir()
        (self.repo/'production').symlink_to(target,target_is_directory=True)
        self.assertEqual(self.hook('log-agent.sh',{'agent_name':'game-designer'}).returncode,2)
        self.assertEqual(list(target.iterdir()),[])
    def test_agent_log_write_failure_reported(self):
        (self.repo/'production').write_text('not a directory')
        self.assertEqual(self.hook('log-agent.sh',{'agent_name':'game-designer'}).returncode,2)
    def test_session_stop_reports_log_failure_and_keeps_state(self):
        p=self.repo/'production/session-state/active.md';p.parent.mkdir(parents=True);p.write_text('BLOCKED')
        (self.repo/'production/session-logs').write_text('not a directory')
        self.assertEqual(self.hook('session-stop.sh').returncode,2);self.assertEqual(p.read_text(),'BLOCKED')
    def test_unconventional_project_is_not_declared_new(self):
        p=self.repo/'app/main.dart';p.parent.mkdir();p.write_text('void main() {}')
        r=self.hook('detect-gaps.sh');self.assertNotIn('NEW PROJECT:',r.stdout);self.assertIn('UNVERIFIED',r.stdout)
    def test_large_unrelated_asset_is_not_content_validated(self):
        p=self.repo/'assets/art/big.bin';p.parent.mkdir(parents=True)
        with p.open('wb') as out:out.truncate(9*1024*1024)
        self.stage();self.assertEqual(self.hook('validate-commit.sh',args=['--staged']).returncode,0)
    def test_large_applicable_blob_blocks_before_validation(self):
        p=self.asset();p.write_bytes(b' '*(8*1024*1024+1));self.stage()
        r=self.hook('validate-commit.sh',args=['--staged']);self.assertEqual(r.returncode,2);self.assertIn('too large',r.stderr)

    def test_repair_session_helpers_reject_symlink_checkpoint(self):
        source=self.repo/'private.txt';source.write_text('PRIVATE-CANARY-MUST-NOT-PRINT')
        p=self.repo/'production/session-state/active.md';p.parent.mkdir(parents=True);p.symlink_to(source)
        for hook in ['session-start.sh','pre-compact.sh','session-stop.sh']:
            with self.subTest(hook=hook):
                result=self.hook(hook)
                self.assertEqual(result.returncode,2,result.stdout)
                self.assertNotIn('PRIVATE-CANARY',result.stdout+result.stderr)
        log=self.repo/'production/session-logs/session-log.md'
        if log.exists():self.assertNotIn('PRIVATE-CANARY',log.read_text())

    def test_repair_precompact_does_not_report_clean_on_git_failure(self):
        shutil.rmtree(self.repo/'.git')
        result=self.hook('pre-compact.sh')
        self.assertNotIn('(no uncommitted changes)',result.stdout)
        self.assertIn('UNVERIFIED',result.stdout)

    def test_repair_checkpoint_parent_symlink_rejected(self):
        folder=self.repo/'elsewhere';folder.mkdir();(folder/'active.md').write_text('PRIVATE-CANARY')
        (self.repo/'production').mkdir();(self.repo/'production/session-state').symlink_to(folder,target_is_directory=True)
        result=self.hook('session-start.sh');self.assertEqual(result.returncode,2)
        self.assertNotIn('PRIVATE-CANARY',result.stdout+result.stderr)

    def test_repair_checkpoint_size_bound(self):
        p=self.repo/'production/session-state/active.md';p.parent.mkdir(parents=True)
        p.write_bytes(b'x'*(1024*1024+1));result=self.hook('pre-compact.sh')
        self.assertEqual(result.returncode,2);self.assertLess(len(result.stdout),1024)

    def test_repair_checkpoint_control_characters_rejected(self):
        p=self.repo/'production/session-state/active.md';p.parent.mkdir(parents=True)
        p.write_bytes(b'STATUS: BLOCKED\x1b[2J');self.assertEqual(self.hook('session-start.sh').returncode,2)

    def test_repair_checkpoint_utf8_preserved(self):
        p=self.repo/'production/session-state/active.md';p.parent.mkdir(parents=True)
        p.write_text('STATUS: BLOCKED\nملاحظة: فشل اختبار مطلوب\n',encoding='utf-8')
        result=self.hook('session-stop.sh');self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('ملاحظة', (self.repo/'production/session-logs/session-log.md').read_text())
        self.assertTrue(p.exists())

    @unittest.skipUnless(hasattr(os,'mkfifo'), 'FIFO fixtures require POSIX')
    def test_repair_checkpoint_fifo_rejected_without_hanging(self):
        p=self.repo/'production/session-state/active.md';p.parent.mkdir(parents=True);os.mkfifo(p)
        result=subprocess.run(['bash',str(ROOT/'.opencode/hooks/session-start.sh')],cwd=self.repo,capture_output=True,text=True,timeout=5)
        self.assertEqual(result.returncode,2)

    @unittest.skipUnless(hasattr(os,'mkfifo'), 'FIFO fixtures require POSIX')
    def test_repair_log_fifo_rejected_without_hanging(self):
        p=self.repo/'production/session-state/active.md';p.parent.mkdir(parents=True);p.write_text('BLOCKED')
        folder=self.repo/'production/session-logs';folder.mkdir()
        for hook,name in [('pre-compact.sh','compaction-log.txt'),('session-stop.sh','session-log.md')]:
            os.mkfifo(folder/name)
            result=subprocess.run(['bash',str(ROOT/'.opencode/hooks'/hook)],cwd=self.repo,capture_output=True,text=True,timeout=5)
            self.assertEqual(result.returncode,2)


    def test_revision_compaction_rejects_design_file_symlink(self):
        secret=self.repo/'outside-note.md';secret.write_text('TODO PRIVATE-DESIGN-CANARY')
        folder=self.repo/'design/gdd';folder.mkdir(parents=True)
        (folder/'linked.md').symlink_to(secret)
        result=self.hook('pre-compact.sh')
        self.assertEqual(result.returncode,2,result.stdout)
        self.assertNotIn('PRIVATE-DESIGN-CANARY',result.stdout+result.stderr)

    def test_revision_compaction_rejects_design_parent_symlink(self):
        outside=self.repo/'outside';outside.mkdir()
        (outside/'leak.md').write_text('TODO PRIVATE-DESIGN-CANARY')
        (self.repo/'design').mkdir()
        (self.repo/'design/gdd').symlink_to(outside,target_is_directory=True)
        result=self.hook('pre-compact.sh')
        self.assertEqual(result.returncode,2,result.stdout)
        self.assertNotIn('PRIVATE-DESIGN-CANARY',result.stdout+result.stderr)

    def test_revision_compaction_preserves_normal_wip_advisory(self):
        p=self.repo/'design/gdd/normal.md';p.parent.mkdir(parents=True)
        p.write_text('# Feature\nTODO(owner): confirm the design\n')
        result=self.hook('pre-compact.sh')
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('TODO(owner): confirm the design',result.stdout)

    # Maintenance regressions: executable hook behavior, not LLM compliance claims.
    def design_file(self, data, name='review.md'):
        p=self.repo/'design/gdd'/name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data if isinstance(data, bytes) else data.encode('utf-8'))
        return p

    def assert_design_blocked(self):
        r=self.hook('pre-compact.sh')
        self.assertEqual(r.returncode,2,r.stderr)
        self.assertNotIn('PRIVATE-CANARY',r.stdout+r.stderr)
        self.assertEqual(r.stdout,'')
        self.assertFalse((self.repo/'production/session-logs/compaction-log.txt').exists())
        return r

    def test_maintenance_design_terminal_controls_block_before_output(self):
        self.design_file('TODO \x1b[31mPRIVATE-CANARY\x1b[0m\n')
        self.assert_design_blocked()

    def test_maintenance_design_c1_controls_block_before_output(self):
        self.design_file('TODO \u009bPRIVATE-CANARY')
        self.assert_design_blocked()

    def test_maintenance_design_invalid_utf8_blocks_before_output(self):
        self.design_file(b'TODO \xffPRIVATE-CANARY')
        self.assert_design_blocked()

    def test_maintenance_design_oversize_blocks_before_output(self):
        self.design_file(b'TODO '+b'x'*(1024*1024))
        self.assert_design_blocked()

    def test_maintenance_design_at_input_limit_has_bounded_excerpt(self):
        p=self.design_file(b'TODO '+b'x'*(1024*1024-5))
        r=self.hook('pre-compact.sh')
        self.assertEqual(r.returncode,0,r.stderr)
        self.assertLess(len(r.stdout.encode()),35000)
        self.assertIn('[line truncated]',r.stdout)
        self.assertEqual(p.stat().st_size,1024*1024)

    def test_maintenance_design_preview_caps_matching_lines(self):
        self.design_file(('TODO '+ 'x'*240+'\n')*1000)
        r=self.hook('pre-compact.sh')
        self.assertEqual(r.returncode,0,r.stderr)
        self.assertIn('1000 matching lines',r.stdout)
        self.assertIn('preview truncated',r.stdout)
        self.assertLess(len(r.stdout.encode()),35000)

    def test_maintenance_design_aggregate_limit_blocks(self):
        for i in range(9):self.design_file(b'x'*(1024*1024),f'{i}.md')
        self.assert_design_blocked()

    def test_maintenance_design_document_count_limit_blocks(self):
        for i in range(257):self.design_file('',f'{i}.md')
        self.assert_design_blocked()

    def test_maintenance_design_namespace_entry_limit_blocks(self):
        folder=self.repo/'design/gdd';folder.mkdir(parents=True)
        for i in range(4097):(folder/f'{i}.txt').touch()
        self.assert_design_blocked()

    def test_maintenance_design_control_filename_blocks(self):
        self.design_file('TODO private','unsafe\nname.md')
        self.assert_design_blocked()

    def test_maintenance_design_directory_with_md_suffix_blocks(self):
        p=self.repo/'design/gdd/folder.md';p.mkdir(parents=True)
        self.assert_design_blocked()

    @unittest.skipUnless(hasattr(os,'mkfifo'), 'FIFO fixtures require POSIX')
    def test_maintenance_design_fifo_blocks_without_hanging(self):
        p=self.repo/'design/gdd/input.md';p.parent.mkdir(parents=True);os.mkfifo(p)
        r=subprocess.run(['bash',str(ROOT/'.opencode/hooks/pre-compact.sh')],
                         cwd=self.repo,capture_output=True,text=True,timeout=5)
        self.assertEqual(r.returncode,2);self.assertEqual(r.stdout,'')

    def test_maintenance_design_utf8_and_no_marker_advisories_preserved(self):
        p=self.design_file('TODO: مراجعة التصميم\n')
        r=self.hook('pre-compact.sh');self.assertEqual(r.returncode,0,r.stderr)
        self.assertIn('مراجعة التصميم',r.stdout)
        p.write_text('# Existing design\n',encoding='utf-8')
        r=self.hook('pre-compact.sh');self.assertEqual(r.returncode,0,r.stderr)
        self.assertIn('not proof of completeness',r.stdout)

    def test_maintenance_design_read_error_propagates(self):
        self.design_file('TODO inspect')
        spec=importlib.util.spec_from_file_location('maintenance_hooks',ROOT/'.opencode/scripts/hook-checks.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        prior=Path.cwd()
        try:
            os.chdir(self.repo)
            with patch.object(module,'bounded_text',side_effect=PermissionError('fixture unreadable')):
                with self.assertRaises(PermissionError):module.design_wip()
        finally:os.chdir(prior)

class ModelTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.repo=Path(self.temp.name)/'copy'
        # Copy only inputs to the updater; no global config or real project touched.
        (self.repo/'.opencode/scripts').mkdir(parents=True)
        shutil.copytree(ROOT/'.opencode/agents',self.repo/'.opencode/agents')
        for source,target in [(ROOT/'change_model.sh',self.repo/'change_model.sh'),
                              (ROOT/'.opencode/scripts/change-model.py',self.repo/'.opencode/scripts/change-model.py'),
                              (ROOT/'.opencode/opencode.json',self.repo/'.opencode/opencode.json')]:shutil.copy2(source,target)
    def run_update(self,model='test/model',*args):
        return subprocess.run(['bash',str(self.repo/'change_model.sh'),model,*args],cwd=self.repo,capture_output=True,text=True)
    def snapshot(self):
        return {str(p.relative_to(self.repo)):p.read_bytes() for p in (self.repo/'.opencode/agents').glob('*.md')}
    def module(self):
        spec=importlib.util.spec_from_file_location('updater',self.repo/'.opencode/scripts/change-model.py')
        mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod);return mod
    def test_updates_all_existing_model_fields_not_just_first(self):
        before=self.snapshot();expected=sum(b'\nmodel:' in data.split(b'---',2)[1] for data in before.values())
        r=self.run_update();self.assertEqual(r.returncode,0,r.stderr)
        count=sum('model: "test/model"' in p.read_text().split('---',2)[1] for p in (self.repo/'.opencode/agents').glob('*.md'))
        self.assertEqual(count,expected);self.assertGreater(count,1)
    def test_dry_run_has_no_writes(self):
        before=self.snapshot();r=self.run_update('test/model','--dry-run')
        self.assertEqual(r.returncode,0);self.assertEqual(self.snapshot(),before)
        self.assertFalse((self.repo/'.opencode/model-change-backups').exists())
    def test_rejects_shell_and_sed_metacharacters_without_changes(self):
        before=self.snapshot()
        for value in ['bad|model','provider/model&evil','provider/"evil','no-provider','provider/model\nnew']:
            self.assertEqual(self.run_update(value).returncode,2)
            self.assertEqual(self.snapshot(),before)
    def test_invalid_config_preflight_changes_nothing(self):
        before=self.snapshot();(self.repo/'.opencode/opencode.json').write_text('{bad')
        self.assertEqual(self.run_update().returncode,2);self.assertEqual(self.snapshot(),before)
    def test_duplicate_model_field_preflight_changes_nothing(self):
        # Explicit duplicate fixture: glob order and inherited-model agents are irrelevant.
        p=self.repo/'.opencode/agents/duplicate-fixture.md'
        p.write_text('---\ndescription: duplicate model fixture\nmode: subagent\n'
                     'model: original/value\nmodel: duplicate/value\n---\nFixture only.\n')
        self.assertEqual(p.read_text().split('---')[1].count('model:'), 2)
        before=self.snapshot();self.assertEqual(self.run_update().returncode,2);self.assertEqual(self.snapshot(),before)
    def test_body_examples_preserved(self):
        p=self.repo/'.opencode/agents/lead-programmer.md';p.write_text(p.read_text()+'\nmodel: preserve/body-example\n')
        self.assertEqual(self.run_update().returncode,0);self.assertTrue(p.read_text().endswith('model: preserve/body-example\n'))
    def test_inherited_models_remain_inherited(self):
        p=self.repo/'.opencode/agents/skill-auditor.md';old=p.read_bytes()
        self.assertEqual(self.run_update().returncode,0);self.assertEqual(p.read_bytes(),old)
    def test_backup_manifest_and_originals_retained(self):
        before=self.snapshot();self.assertEqual(self.run_update().returncode,0)
        manifests=list((self.repo/'.opencode/model-change-backups').glob('*/manifest.json'));self.assertEqual(len(manifests),1)
        manifest=json.loads(manifests[0].read_text());self.assertEqual(manifest['status'],'APPLIED')
        for item in manifest['files']:
            if item['path'] in before:self.assertEqual((manifests[0].parent/item['path']).read_bytes(),before[item['path']])
    def test_symlink_agent_rejected_without_partial_change(self):
        folder=self.repo/'.opencode/agents';p=folder/'zzz-link.md';p.symlink_to(folder/'lead-programmer.md')
        before=self.snapshot();self.assertEqual(self.run_update().returncode,2);self.assertEqual(self.snapshot(),before)
    def test_injected_mid_apply_failure_rolls_back(self):
        before=self.snapshot();mod=self.module();real=mod.atomic_write;count=0
        def fail(path,data,mode):
            nonlocal count
            if path.suffix=='.md' and b'model: "test/model"' in data:
                count+=1
                if count==2:raise OSError('injected write failure')
            return real(path,data,mode)
        with patch.object(mod,'atomic_write',side_effect=fail):
            with self.assertRaises(OSError):mod.update('test/model')
        self.assertEqual(self.snapshot(),before)
    def test_concurrent_user_edit_not_overwritten_by_rollback(self):
        mod=self.module();real=mod.atomic_write;first=None;count=0
        def fail(path,data,mode):
            nonlocal first,count
            if path.suffix=='.md' and b'model: "test/model"' in data:
                count+=1
                if count==1:first=path
                if count==2:
                    first.write_text('concurrent user edit')
                    raise OSError('injected failure after a user edit')
            return real(path,data,mode)
        with patch.object(mod,'atomic_write',side_effect=fail):
            with self.assertRaises(OSError):mod.update('test/model')
        self.assertEqual(first.read_text(),'concurrent user edit')
        manifest=json.loads(next((self.repo/'.opencode/model-change-backups').glob('*/manifest.json')).read_text())
        self.assertEqual(manifest['status'],'ROLLBACK_CONFLICT')

    def test_nonstandard_config_constants_refused_preflight(self):
        before=self.snapshot();p=self.repo/'.opencode/opencode.json'
        p.write_text('{"agent":{},"bad":NaN}')
        self.assertEqual(self.run_update().returncode,2);self.assertEqual(self.snapshot(),before)

    def test_repair_model_update_preserves_crlf(self):
        p=self.repo/'.opencode/agents/lead-programmer.md'
        p.write_bytes(p.read_bytes().replace(b'\r\n',b'\n').replace(b'\n',b'\r\n'))
        result=self.run_update();self.assertEqual(result.returncode,0,result.stderr)
        self.assertNotIn(b'\n',p.read_bytes().replace(b'\r\n',b''))


    def test_revision_crlf_model_before_other_fields(self):
        p=self.repo/'.opencode/agents/lead-programmer.md'
        p.write_bytes(b'---\r\nmodel: old/model\r\nmode: subagent\r\ndescription: Example\r\n---\r\nBody\r\n')
        result=self.run_update();self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(p.read_bytes(),b'---\r\nmodel: "test/model"\r\nmode: subagent\r\ndescription: Example\r\n---\r\nBody\r\n')

    def test_revision_multiline_model_rejected_without_changes(self):
        p=self.repo/'.opencode/agents/lead-programmer.md'
        p.write_text('---\nmodel: >-\n  old/model\nmode: subagent\ndescription: Example\n---\nBody\n')
        before=self.snapshot();result=self.run_update()
        self.assertEqual(result.returncode,2,result.stdout)
        self.assertEqual(self.snapshot(),before)
        self.assertFalse((self.repo/'.opencode/model-change-backups').exists())

    def test_revision_quoted_multiline_model_rejected_without_changes(self):
        p=self.repo/'.opencode/agents/lead-programmer.md'
        p.write_text('---\nmodel: "old/\n  model"\nmode: subagent\ndescription: Example\n---\nBody\n')
        before=self.snapshot();result=self.run_update()
        self.assertEqual(result.returncode,2,result.stdout)
        self.assertEqual(self.snapshot(),before)
        self.assertFalse((self.repo/'.opencode/model-change-backups').exists())

    def test_revision_following_nested_field_preserved(self):
        p=self.repo/'.opencode/agents/lead-programmer.md'
        p.write_text('---\nmodel: old/model\npermission:\n  edit: ask\nmode: subagent\ndescription: Example\n---\nBody\n')
        result=self.run_update();self.assertEqual(result.returncode,0,result.stderr)
        self.assertIn('permission:\n  edit: ask\n',p.read_text())
        self.assertIn('model: "test/model"',p.read_text())

    def test_revision_quoted_model_key_rejected_without_changes(self):
        p=self.repo/'.opencode/agents/lead-programmer.md'
        p.write_text('---\n"model": old/model\nmode: subagent\ndescription: Example\n---\nBody\n')
        before=self.snapshot();result=self.run_update()
        self.assertEqual(result.returncode,2,result.stdout)
        self.assertEqual(self.snapshot(),before)
        self.assertFalse((self.repo/'.opencode/model-change-backups').exists())

    def test_revision_unsupported_root_yaml_rejected_without_changes(self):
        headers = [
            '"\\u006dodel": old/model\nmode: subagent\ndescription: Example',
            '{model: old/model, mode: subagent, description: Example}',
            '  model: old/model\n  mode: subagent\n  description: Example',
            'defaults: &base\n  model: old/model\n<<: *base\nmode: subagent\ndescription: Example',
        ]
        p=self.repo/'.opencode/agents/lead-programmer.md'
        for header in headers:
            with self.subTest(header=header):
                p.write_text('---\n'+header+'\n---\nBody\n')
                before=self.snapshot();result=self.run_update()
                self.assertEqual(result.returncode,2,result.stdout)
                self.assertEqual(self.snapshot(),before)
                self.assertFalse((self.repo/'.opencode/model-change-backups').exists())

    def test_revision_repeated_update_is_a_noop(self):
        self.assertEqual(self.run_update().returncode,0)
        before=self.snapshot()
        backups=list((self.repo/'.opencode/model-change-backups').glob('*/manifest.json'))
        result=self.run_update()
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual(self.snapshot(),before)
        self.assertEqual(list((self.repo/'.opencode/model-change-backups').glob('*/manifest.json')),backups)

class StructureTests(unittest.TestCase):
    def test_every_skill_has_a_real_command(self):
        for skill in (ROOT/'.opencode/skills').glob('*/SKILL.md'):
            with self.subTest(skill=skill.parent.name):
                self.assertTrue((ROOT/'.opencode/commands'/f'{skill.parent.name}.md').is_file())
                self.assertIn(f'name: {skill.parent.name}\n',skill.read_text())
    def test_runtime_instruction_paths_exist(self):
        value=json.loads((ROOT/'opencode.json').read_text())
        for name in value['instructions']:self.assertTrue((ROOT/name).is_file(),name)
    def test_no_conflicting_agent_identity_copies_in_json(self):
        value=json.loads((ROOT/'.opencode/opencode.json').read_text())
        for v in value['agent'].values():
            self.assertNotIn('mode',v);self.assertNotIn('model',v);self.assertNotIn('description',v)
    def test_permission_default_is_not_unrestricted(self):
        value=json.loads((ROOT/'.opencode/opencode.json').read_text())['permission']
        self.assertEqual(value['*'],'ask');self.assertEqual(value['edit'],'ask');self.assertEqual(value['bash'],'ask')
        self.assertNotIn('tool',value)
    def test_distribution_does_not_self_approve(self):
        value=json.loads((ROOT/'.opencode/audit/registry.json').read_text())
        self.assertEqual(value['records'],{});self.assertEqual(value['context_id'],'UNCONFIGURED')
        self.assertEqual(value['schema_version'],2);self.assertIsNone(value['worktree'])
    def test_exact_requested_rule_present(self):
        exact='AUDIT BEFORE EXTENSION — Never extend, compose, or depend on a skill until its correctness, compatibility, scope, and responsibilities have been verified. When a skill is defective, repair the existing skill first, validate the repair, then continue.'
        self.assertIn(exact,(ROOT/'.opencode/rules/skill-integrity.md').read_text())

    def test_repair_inventory_covers_executable_and_process_surfaces(self):
        result=subprocess.run(['node',str(ROOT/'.opencode/scripts/skill-audit.mjs'),'inventory'],cwd=ROOT,capture_output=True,text=True,timeout=15)
        self.assertEqual(result.returncode,0,result.stderr);value=json.loads(result.stdout)
        paths=[row['path'] for row in value['files']]
        for expected in ['AGENTS.md','OPENCODE.md','opencode.json','.opencode/opencode.json',
                         '.opencode/commands/skill-audit-repair.md','.opencode/plugins/skill-integrity.js',
                         '.opencode/lib/audit-gate.mjs','.opencode/scripts/hook-checks.py',
                         '.opencode/docs/engineering-workflow.md']:
            self.assertIn(expected,paths)
        self.assertEqual(len(paths),len(set(paths)));self.assertEqual(paths,sorted(paths))
        self.assertEqual(value['status'],'INVENTORY_ONLY_NOT_SEMANTIC_APPROVAL')


    def test_revision_policy_blocks_every_unapproved_state(self):
        for relative in ['.opencode/rules/skill-integrity.md',
                         '.opencode/skills/skill-audit-repair/SKILL.md']:
            text=(ROOT/relative).read_text()
            self.assertRegex(text, r'(?:Dependent\s+work|Do not extend)[\s\S]{0,240}IN_REVIEW',relative)

    # These are source-contract regressions, not end-to-end agent evaluations.
    def test_maintenance_exact_source_first_loop_present(self):
        text=(ROOT/'.opencode/rules/skill-integrity.md').read_text()
        self.assertIn('INSPECT → VALIDATE → DETECT → CORRECT → REVIEW → VERIFY → USE',text)
        self.assertIn('plain-text question',text)

    def test_maintenance_locale_and_prototype_contracts(self):
        locale=(ROOT/'.opencode/skills/localize/SKILL.md').read_text()
        prototype=(ROOT/'.opencode/skills/prototype/SKILL.md').read_text()
        self.assertNotIn('English (en) is always',locale)
        self.assertIn('verified project source locale',locale)
        self.assertIn('preserve shebangs',prototype)
        self.assertNotIn('Skip error handling',prototype)

    def test_maintenance_resume_and_update_contracts(self):
        design=(ROOT/'.opencode/skills/design-system/SKILL.md').read_text()
        sprint=(ROOT/'.opencode/skills/sprint-plan/SKILL.md').read_text()
        self.assertIn('never recreate its',design)
        self.assertIn('For `update`:',sprint)
        self.assertIn('Preserve task IDs',sprint)

    def test_maintenance_release_claims_not_fabricated(self):
        patchnotes=(ROOT/'.opencode/skills/patch-notes/SKILL.md').read_text()
        changelog=(ROOT/'.opencode/skills/changelog/SKILL.md').read_text()
        self.assertNotIn('→ "Improved hit detection accuracy"',patchnotes)
        self.assertIn('only when measured',patchnotes)
        self.assertIn('[base]..[target]',changelog)

    def test_maintenance_metrics_require_evidence(self):
        debt=(ROOT/'.opencode/skills/tech-debt/SKILL.md').read_text()
        template=(ROOT/'.opencode/docs/templates/project-stage-report.md').read_text()
        self.assertNotIn('T-shirt sizes summed',debt)
        self.assertIn('effort is positive',debt)
        self.assertIn('Source/test-file counts do not establish',template)

    def test_maintenance_teams_do_not_mandate_parallel_writes(self):
        for skill in (ROOT/'.opencode/skills').glob('team-*/SKILL.md'):
            text=skill.read_text()
            self.assertIn('Sequence all shared-file writes',text,skill.name)
            self.assertNotIn('Delegate in parallel:',text,skill.name)

    def test_maintenance_gate_keeps_required_unknowns_blocked(self):
        text=(ROOT/'.opencode/skills/gate-check/SKILL.md').read_text()
        self.assertIn('any required unavailable or unverified check yields BLOCKED',text)
        self.assertNotIn('verdict not MAJOR REVISION NEEDED',text)

if __name__=='__main__':unittest.main()
