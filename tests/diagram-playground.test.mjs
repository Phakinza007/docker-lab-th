import test from 'node:test';
import assert from 'node:assert/strict';
import {initialPlayground,playDiagram,renderPlayground} from '../diagram-playground.mjs';
const play=(id,...actions)=>actions.reduce((s,a)=>playDiagram(s,...(Array.isArray(a)?a:[a])),initialPlayground(id));
test('image snapshot and existing container do not change after editing source',()=>{
 const s=play('mental-model','build','run','edit','build');assert.equal(s.source,2);assert.equal(s.image,2);assert.equal(s.container,1);
 assert.equal(playDiagram(s,'run').container,2);assert.equal(play('mental-model','run').container,0);
});
test('container name remains reserved after stop and start reuses same instance',()=>{
 const s=play('cli-lifecycle','run','stop','run','start');assert.equal(s.container,1);assert.equal(s.status,'running');
 assert.equal(playDiagram(s,'remove').status,'running');
 assert.equal(playDiagram(playDiagram(playDiagram(s,'stop'),'remove'),'run').container,2);
});
test('request only succeeds while published container is running',()=>{
 assert.match(play('cli-port','request').message,/refused/);assert.match(play('cli-port','run','request').message,/200/);assert.match(play('cli-port','run','stop','request').message,/refused/);
});
test('data survives named volume recreation but not writable layer recreation',()=>{
 for(const [mode,expected] of [['layer',''],['volume','note']]){const s=play('storage',mode,['write','note'],'remove','recreate');assert.equal(s.data,expected);}
 const s=play('storage','volume',['write','note'],'remove');assert.equal(s.volume,'note');assert.equal(s.data,'');
});
test('service hostname alone cannot connect to a stopped database',()=>{
 assert.match(play('compose','localhost').message,/refused/);assert.match(play('compose','db').message,/สำเร็จ/);assert.match(play('compose','db','toggle-db').message,/refused/);
});
test('sync updates container files while rebuild updates both image and container',()=>{
 const sync=play('workflow-watch','sync','edit');assert.equal(sync.container,2);assert.equal(sync.image,0);
 const rebuild=play('workflow-watch','rebuild','edit');assert.equal(rebuild.container,2);assert.equal(rebuild.image,2);
 const off=play('workflow-watch','off','edit');assert.equal(off.container,0);
});
test('runtime copy requires build artifact and leaked secrets outlive mount',()=>{
 assert.equal(play('workflow-build','copy').copied,false);assert.equal(play('workflow-build','build','copy').copied,true);
 const clean=play('ship-secret','mount','finish');assert.equal(clean.secret,false);assert.equal(clean.leaked,false);
 const leak=play('ship-secret','copy-secret','finish');assert.equal(leak.secret,false);assert.equal(leak.leaked,true);
});
test('learner input is escaped in diagram nodes and input attributes',()=>{
 const s=play('storage','volume',['write','<img src=x onerror="alert(1)">']);const html=renderPlayground(s);
 assert.doesNotMatch(html.content,/<img/);assert.match(html.content,/&lt;img/);assert.match(html.controls,/&quot;/);
});
