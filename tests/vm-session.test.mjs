import test from 'node:test';
import assert from 'node:assert/strict';
import { createVM, saveFile, PROJECT, runVMCommand } from '../vm-engine.mjs';
import { sessionSnapshot, parseSession } from '../vm-session.mjs';
test('session transfer preserves source files, commands, missions and course progress', () => {
 const vm = createVM(); saveFile(vm, `${PROJECT}/index.html`, '<h1>My work</h1>'); runVMCommand(vm,'ls');
 const restored = parseSession(JSON.stringify(sessionSnapshot(vm,['cli'],{cli:1},['port'])));
 assert.equal(restored.vm.files[`${PROJECT}/index.html`],'<h1>My work</h1>');
 assert.deepEqual(restored.vm.history,vm.history); assert.deepEqual(restored.vm.achievements,['inspect']);
 assert.deepEqual(restored.completed,['cli']); assert.deepEqual(restored.troubleshooting,['port']);
});
test('older exported files remain importable',()=>{
 const data=parseSession(JSON.stringify({format:'docker-lab-v1',vm:createVM(),completed:['cli']}));
 assert.deepEqual(data.answers,{}); assert.deepEqual(data.troubleshooting,[]);
});
test('invalid imported state or progress is rejected before storing anything',()=>{
 for (const data of [{format:'other'}, {format:'docker-lab-v1',vm:{version:1},completed:[]}, sessionSnapshot(createVM(),['unknown']), sessionSnapshot(createVM(),[],{cli:99}), sessionSnapshot(createVM(),[],{},['unknown'])]) assert.throws(()=>parseSession(JSON.stringify(data)));
 assert.throws(()=>parseSession('bad json')); assert.throws(()=>parseSession(' '.repeat(2_000_001)));
});
