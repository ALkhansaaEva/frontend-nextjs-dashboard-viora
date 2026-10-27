import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GOVERNANCE, assertUsable, fingerprint, safeFile, targetPath } from '../../.opencode/lib/audit-gate.mjs';
import { SkillIntegrityPlugin } from '../../.opencode/plugins/skill-integrity.js';
const TARGET = '.opencode/skills/example/SKILL.md';
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-audit-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  const put = (name, data) => {fs.mkdirSync(path.dirname(path.join(root,name)), {recursive:true}); fs.writeFileSync(path.join(root,name),data);};
  for (const file of [...GOVERNANCE, TARGET]) put(file, `fixture: ${file}\n`);
  put('reports/proof.md', 'Reviewed fixture behavior for this isolated test.\n');
  const registry = {schema_version:2, context_id:'test-context', worktree:fs.realpathSync(root), records:{}};
  const add = file => {registry.records[file] = {
    status:'VALIDATED', context_id:'test-context', source_sha256:fingerprint(root,file),
    reviewer:'test fixture', reviewed_at:'2020-01-01T00:00:00Z', scope:'fixture-only',
    authorization:'isolated unit test', summary:'unit test fixture, not production approval',
    dependencies:[], evidence:[{path:'reports/proof.md',sha256:fingerprint(root,'reports/proof.md')}],
    checks:[{name:'fixture setup',status:'PASS',result:'created and inspected'}],
  }; bind([file]); };
  [...GOVERNANCE,TARGET].forEach(add);
  const save = () => put('.opencode/audit/registry.json', JSON.stringify(registry));
  function bind(names = Object.keys(registry.records)) {
    for (const name of names) {
      const rec=registry.records[name];
      const seen = new Set([name]); const queue = [...GOVERNANCE, ...rec.dependencies];
      while (queue.length) {
        const dep=queue.pop(); if(seen.has(dep)) continue;
        seen.add(dep); queue.push(...(registry.records[dep]?.dependencies ?? []));
      }
      seen.delete(name);
      rec.input_sha256=Object.fromEntries([...seen].sort().map(dep=>[dep,fingerprint(root,dep)]));
    }
  };
  bind(); save(); return {root, put, registry, save, add, bind};
}
test('accepts a fully evidenced fixture and all governance records', t => {
  const f=fixture(t); assert.equal(assertUsable(f.root,TARGET).checked.length, GOVERNANCE.length+1);
});
for (const status of ['UNREVIEWED','IN_REVIEW','INVALID','REPAIR_PENDING','BLOCKED']) {
  test(`blocks ${status}`, t=>{const f=fixture(t); f.registry.records[TARGET].status=status; f.save(); assert.throws(()=>assertUsable(f.root,TARGET),new RegExp(status));});
}
test('missing target record blocks',t=>{const f=fixture(t);delete f.registry.records[TARGET];f.save();assert.throws(()=>assertUsable(f.root,TARGET),/UNREVIEWED/);});
test('unconfigured installation blocks',t=>{const f=fixture(t);f.registry.context_id='UNCONFIGURED';f.save();assert.throws(()=>assertUsable(f.root,TARGET),/UNCONFIGURED/);});
test('malformed registry blocks',t=>{const f=fixture(t);f.put('.opencode/audit/registry.json','{');assert.throws(()=>assertUsable(f.root,TARGET));});
test('source edits invalidate prior validation',t=>{const f=fixture(t);f.put(TARGET,'changed');assert.throws(()=>assertUsable(f.root,TARGET),/STALE source/);});
test('context mismatch invalidates records',t=>{const f=fixture(t);f.registry.context_id='changed';f.save();assert.throws(()=>assertUsable(f.root,TARGET),/STALE context/);});
test('evidence edits invalidate records',t=>{const f=fixture(t);f.put('reports/proof.md','changed');assert.throws(()=>assertUsable(f.root,TARGET),/evidence/);});
test('governance changes cannot be omitted by target',t=>{const f=fixture(t);f.put(GOVERNANCE[0],'changed');assert.throws(()=>assertUsable(f.root,TARGET),/STALE source/);});
test('missing governance record blocks',t=>{const f=fixture(t);delete f.registry.records[GOVERNANCE[0]];f.save();assert.throws(()=>assertUsable(f.root,TARGET),/UNREVIEWED/);});
test('known-invalid status survives source edits and a new hash',t=>{const f=fixture(t);f.put(TARGET,'a proposed repair');const r=f.registry.records[TARGET];r.status='INVALID';r.source_sha256=fingerprint(f.root,TARGET);f.save();assert.throws(()=>assertUsable(f.root,TARGET),/INVALID/);});
test('a changed transitive dependency blocks',t=>{const f=fixture(t);f.put('dependency.md','original');f.add('dependency.md');f.registry.records[TARGET].dependencies=['dependency.md'];f.save();f.put('dependency.md','changed');assert.throws(()=>assertUsable(f.root,TARGET),/STALE source/);});
test('undeclared record for a declared dependency blocks',t=>{const f=fixture(t);f.registry.records[TARGET].dependencies=['missing.md'];f.save();assert.throws(()=>assertUsable(f.root,TARGET),/UNREVIEWED/);});
test('a validated dependency cycle terminates',t=>{const f=fixture(t);f.put('dependency.md','dep');f.add('dependency.md');f.registry.records[TARGET].dependencies=['dependency.md'];f.registry.records['dependency.md'].dependencies=[TARGET];f.bind();f.save();assert.ok(assertUsable(f.root,TARGET).checked.includes('dependency.md'));});
test('a cycle cannot hide an invalid member',t=>{const f=fixture(t);f.put('dependency.md','dep');f.add('dependency.md');f.registry.records[TARGET].dependencies=['dependency.md'];f.registry.records['dependency.md'].dependencies=[TARGET];f.registry.records['dependency.md'].status='INVALID';f.save();assert.throws(()=>assertUsable(f.root,TARGET),/INVALID/);});
for(const status of ['FAIL','BLOCKED','NOT RUN']) test(`cannot label ${status} validation as accepted`,t=>{const f=fixture(t);f.registry.records[TARGET].checks.push({name:'required',status,result:'not passed'});f.save();assert.throws(()=>assertUsable(f.root,TARGET),/incomplete check/);});
test('N/A needs a reason',t=>{const f=fixture(t);f.registry.records[TARGET].checks.push({name:'runtime',status:'N/A',result:'not run'});f.save();assert.throws(()=>assertUsable(f.root,TARGET),/N\/A without reason/);});
test('all-N/A cannot count as validation',t=>{const f=fixture(t);f.registry.records[TARGET].checks=[{name:'none',status:'N/A',reason:'irrelevant',result:'none'}];f.save();assert.throws(()=>assertUsable(f.root,TARGET),/No passed/);});
test('future review dates block',t=>{const f=fixture(t);f.registry.records[TARGET].reviewed_at='2999-01-01T00:00:00Z';f.save();assert.throws(()=>assertUsable(f.root,TARGET),/future/);});
test('empty evidence blocks',t=>{const f=fixture(t);f.registry.records[TARGET].evidence=[];f.save();assert.throws(()=>assertUsable(f.root,TARGET),/Missing evidence/);});
test('fingerprints are deterministic and files are not mutated',t=>{const f=fixture(t);const before=fs.readFileSync(path.join(f.root,TARGET));assert.equal(fingerprint(f.root,TARGET),fingerprint(f.root,TARGET));assertUsable(f.root,TARGET);assert.deepEqual(fs.readFileSync(path.join(f.root,TARGET)),before);});
for(const file of ['../outside','/tmp/outside','C:/outside','a/../outside','a\\b','a//b','a/./b','a\nfile']) test(`rejects unsafe path ${JSON.stringify(file)}`,t=>{const f=fixture(t);assert.throws(()=>safeFile(f.root,file),/Unsafe/);});
test('rejects symlinks',t=>{const f=fixture(t);f.put('real.md','real');fs.symlinkSync('real.md',path.join(f.root,'link.md'));assert.throws(()=>fingerprint(f.root,'link.md'),/Symlink/);});
test('target names cannot escape local directories',()=>{assert.throws(()=>targetPath('skill',{name:'../evil'}));assert.throws(()=>targetPath('task',{subagent_type:'bad--name'}));assert.throws(()=>targetPath('task',{}));});
test('plugin passes through read-only bootstrap without granting a skill approval',async t=>{const f=fixture(t);f.registry.context_id='UNCONFIGURED';f.save();const p=await SkillIntegrityPlugin({directory:f.root});await p['tool.execute.before']({tool:'read'},{args:{filePath:TARGET}});await assert.rejects(()=>p['tool.execute.before']({tool:'skill'},{args:{name:'example'}}),/AUDIT BEFORE EXTENSION/);});
test('plugin accepts the audited local skill and blocks an unknown target',async t=>{const f=fixture(t);const p=await SkillIntegrityPlugin({directory:f.root});await p['tool.execute.before']({tool:'skill'},{args:{name:'example'}});await assert.rejects(()=>p['tool.execute.before']({tool:'skill'},{args:{name:'missing'}}),/UNREVIEWED/);});
test('plugin gates task delegation using the agent record',async t=>{const f=fixture(t);const a='.opencode/agents/reviewer.md';f.put(a,'reviewer');f.add(a);f.save();const p=await SkillIntegrityPlugin({directory:f.root});await p['tool.execute.before']({tool:'task'},{args:{subagent_type:'reviewer'}});f.registry.records[a].status='INVALID';f.save();await assert.rejects(()=>p['tool.execute.before']({tool:'task'},{args:{subagent_type:'reviewer'}}),/INVALID/);});
test('malformed tool arguments fail closed',async t=>{const f=fixture(t);const p=await SkillIntegrityPlugin({directory:f.root});await assert.rejects(()=>p['tool.execute.before']({tool:'skill'},{}),/invalid skill/);});

test('duplicate status cannot silently override INVALID',t=>{const f=fixture(t);let text=JSON.stringify(f.registry);text=text.replace('"status":"VALIDATED"','"status":"INVALID","status":"VALIDATED"');f.put('.opencode/audit/registry.json',text);assert.throws(()=>assertUsable(f.root,TARGET),/Duplicate JSON key/);});
test('escaped duplicate JSON keys are rejected',t=>{const f=fixture(t);let text=JSON.stringify(f.registry);text=text.replace('"status":"VALIDATED"','"status":"INVALID","sta\\u0074us":"VALIDATED"');f.put('.opencode/audit/registry.json',text);assert.throws(()=>assertUsable(f.root,TARGET),/Duplicate JSON key/);});
test('repeated nested keys in separate objects and quoted punctuation are legitimate',t=>{const f=fixture(t);f.registry.notes={a:{key:'comma, brace} quote" slash\\'},b:{key:'same key in a different object'}};f.save();assertUsable(f.root,TARGET);});
test('invalid calendar dates must not normalize into valid reviews',t=>{const f=fixture(t);f.registry.records[TARGET].reviewed_at='2020-02-30T00:00:00Z';f.save();assert.throws(()=>assertUsable(f.root,TARGET),/Invalid or future/);});
test('leap-day and fractional UTC timestamps are valid',t=>{const f=fixture(t);f.registry.records[TARGET].reviewed_at='2020-02-29T00:00:00.123Z';f.save();assertUsable(f.root,TARGET);});
test('loaded OPENCODE overview is mandatory governance',()=>{assert.ok(GOVERNANCE.includes('OPENCODE.md'));});

// Consumer re-validation must not be replaced by re-approving a dependency alone.
test('repair: refreshed dependency must not revive its stale consumer',t=>{
  const f=fixture(t); f.put('dependency.md','v1'); f.add('dependency.md');
  f.registry.records[TARGET].dependencies=['dependency.md']; f.bind(); f.save();
  assertUsable(f.root,TARGET);
  f.put('dependency.md','v2 incompatible contract'); f.add('dependency.md'); f.save();
  assert.throws(()=>assertUsable(f.root,TARGET),/STALE|binding/);
});
test('repair: refreshed governance must invalidate consumer snapshots',t=>{
  const f=fixture(t); f.put(GOVERNANCE[0],'changed operating policy'); f.add(GOVERNANCE[0]); f.save();
  assert.throws(()=>assertUsable(f.root,TARGET),/STALE|binding/);
});
test('repair: copied approval must not authenticate another worktree',t=>{
  const f=fixture(t); f.registry.worktree=path.join(f.root,'different-project'); f.save();
  assert.throws(()=>assertUsable(f.root,TARGET),/worktree/);
});

test('repair: schema 1 approval requires explicit re-audit, not promotion',t=>{
  const f=fixture(t); f.registry.schema_version=1; f.save();
  assert.throws(()=>assertUsable(f.root,TARGET),/obsolete schema/);
});
test('repair: missing worktree identity fails closed',t=>{
  const f=fixture(t); delete f.registry.worktree; f.save();
  assert.throws(()=>assertUsable(f.root,TARGET),/worktree/);
});
test('repair: absent review-time bindings fail closed',t=>{
  const f=fixture(t); delete f.registry.records[TARGET].input_sha256; f.save();
  assert.throws(()=>assertUsable(f.root,TARGET),/Missing.*bindings/);
});
test('repair: stale binding cannot be repaired by a target source hash alone',t=>{
  const f=fixture(t); f.registry.records[TARGET].input_sha256[GOVERNANCE[0]]='0'.repeat(64); f.save();
  assert.throws(()=>assertUsable(f.root,TARGET),/STALE input binding/);
});
test('repair: added transitive dependency requires consumer review',t=>{
  const f=fixture(t);f.put('dep.md','dep');f.add('dep.md'); f.put('extra.md','extra');f.add('extra.md');
  f.registry.records[TARGET].dependencies=['dep.md']; f.bind(); f.save(); assertUsable(f.root,TARGET);
  f.registry.records['dep.md'].dependencies=['extra.md']; f.bind(['dep.md']); f.save();
  assert.throws(()=>assertUsable(f.root,TARGET),/binding set/);
});
test('repair: transitive refresh does not revive a grandparent consumer',t=>{
  const f=fixture(t); f.put('dep.md','dep');f.add('dep.md'); f.put('leaf.md','v1');f.add('leaf.md');
  f.registry.records[TARGET].dependencies=['dep.md']; f.registry.records['dep.md'].dependencies=['leaf.md'];
  f.bind(); f.save(); assertUsable(f.root,TARGET);
  f.put('leaf.md','v2'); f.add('leaf.md'); f.bind(['dep.md']); f.save();
  assert.throws(()=>assertUsable(f.root,TARGET),/STALE input binding/);
});
test('repair: consumer and dependency re-audit restores usable fixture',t=>{
  const f=fixture(t); f.put('dep.md','v1'); f.add('dep.md');
  f.registry.records[TARGET].dependencies=['dep.md']; f.bind(); f.save();
  f.put('dep.md','v2'); f.add('dep.md'); f.bind([TARGET]); f.save();
  assertUsable(f.root,TARGET); // Fixture assertions, never real approval creation.
});
test('repair: hash cache is scoped to one check',t=>{
  const f=fixture(t);assertUsable(f.root,TARGET); f.put(TARGET,'after first check');
  assert.throws(()=>assertUsable(f.root,TARGET),/STALE source/);
});
test('repair: extra undeclared snapshot key does not broaden scope silently',t=>{
  const f=fixture(t);f.registry.records[TARGET].input_sha256['extra.md']='0'.repeat(64);f.save();
  assert.throws(()=>assertUsable(f.root,TARGET),/binding set/);
});
test('repair: registry cannot serve as its own evidence',t=>{
  const f=fixture(t);f.registry.records[TARGET].evidence=[{path:'.opencode/audit/registry.json',sha256:'0'.repeat(64)}];f.save();
  assert.throws(()=>assertUsable(f.root,TARGET),/evidence/);
});
