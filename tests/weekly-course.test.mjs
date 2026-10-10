import test from 'node:test';
import assert from 'node:assert/strict';
import {weeks,renderWeek} from '../weekly-course.mjs';
import {createVM,saveFile,runVMCommand} from '../vm-engine.mjs';
const decode=s=>s.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
test('every weekly example advertised for VM runs against a fresh simulator',()=>{
 let snippets=0;
 for(const week of weeks){
  const vm=createVM();
  for(const scene of week.scenes) for(const match of scene.body.matchAll(/<div class="week-code-label">ใช้ได้ใน VM Lab[^<]*<\/div><pre class="code-block"><code>([\s\S]*?)<\/code><\/pre>/g)) {
   snippets++;
   const text=decode(match[1]);
   if(text.startsWith('FROM '))assert.equal(saveFile(vm,'Dockerfile',text).ok,true);
   else for(const command of text.split('\n')){const result=runVMCommand(vm,command);assert.equal(result.ok,true,`${week.id}: ${command}: ${result.output}`);}
  }
 }
 assert.ok(snippets>0,'No VM examples were exercised');
});
test('weekly narrative contains unique section targets and diagrams that render',()=>{
 const seen=new Set();
 for(const week of weeks){
  const root={innerHTML:''};assert.equal(renderWeek(root,week.id),true);
  for(const scene of week.scenes){assert.equal(seen.has(scene.id),false);seen.add(scene.id);assert.ok(root.innerHTML.includes(`id="${scene.id}"`));assert.ok(root.innerHTML.includes(`data-week-scene="${scene.id}"`));}
  assert.ok(root.innerHTML.includes('data-diagram-id='),`${week.id} has no teaching diagram`);
 }
 const root={innerHTML:'keep'};assert.equal(renderWeek(root,'unknown'),false);assert.equal(root.innerHTML,'keep');
});
