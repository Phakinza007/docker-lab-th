import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createVM,saveFile,runVMCommand} from '../vm-engine.mjs';
import {checkTask,lessonPassed,validLearning} from '../learning-flow.mjs';
import {sessionSnapshot,parseSession} from '../vm-session.mjs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const dockerfile=app.match(/FROM nginx:alpine\nCOPY index.html[^<]+/)[0];
const compose=app.match(/services:\n  web:[\s\S]+?db-data:<\/code>/)[0].replace('</code>','');
const build=vm=>{saveFile(vm,'Dockerfile',dockerfile); assert.equal(runVMCommand(vm,'docker build -t my-site:1.0 .').ok,true);};
const run=(vm,command)=>{const result=runVMCommand(vm,command);assert.equal(result.ok,true,`${command}: ${result.output}`);return result;};
test('exact Dockerfile and Compose teaching snippets run in VM',()=>{
 const vm=createVM();build(vm);saveFile(vm,'compose.yaml',compose);
 run(vm,'docker compose up -d --build');
 assert.equal(checkTask('compose',vm),false);
 run(vm,'docker exec project-web-1 nc -z db 5432');
 assert.equal(checkTask('compose',vm),true);
});
test('image, Dockerfile and lifecycle tasks require observable VM results',()=>{
 const vm=createVM(); assert.equal(checkTask('dockerfile',vm),false);build(vm);
 run(vm,'docker run -d --name web -p 8080:80 my-site:1.0');
 assert.equal(checkTask('dockerfile',vm),false);
 run(vm,'curl localhost:8080');assert.equal(checkTask('dockerfile',vm),true);
 assert.equal(checkTask('mental-model',vm),false);
 saveFile(vm,'index.html','<h1>Changed</h1>');assert.equal(checkTask('mental-model',vm),true);
 assert.equal(checkTask('dockerfile',vm),false);
 run(vm,'docker logs web');assert.equal(checkTask('cli',vm),false);
 run(vm,'docker stop web');assert.equal(checkTask('cli',vm),true);
});
test('volume lesson commands preserve the written note across removal',()=>{
 const vm=createVM(); assert.equal(checkTask('storage',vm),false);
 run(vm,'docker volume create notes');
 run(vm,'docker run -d --name notes-writer -p 8081:80 -v notes:/data nginx:alpine');
 run(vm,'docker exec notes-writer sh');run(vm,'echo "my note" > /data/note.txt');run(vm,'exit');
 run(vm,'docker stop notes-writer');run(vm,'docker rm notes-writer');
 run(vm,'docker run -d --name notes-reader -p 8081:80 -v notes:/data nginx:alpine');
 assert.equal(checkTask('storage',vm),false);
 assert.match(run(vm,'docker exec notes-reader cat /data/note.txt').output,/my note/);
 assert.equal(checkTask('storage',vm),true);
});
test('a quiz or a click alone cannot complete a lesson or advanced task',()=>{
 assert.equal(lessonPassed({},true),false);
 const p={read:true,practiced:true,task:true,reflected:true,reflection:'My explanation',prediction:0};
 assert.equal(lessonPassed(p,true),true);
 for(const field of ['read','practiced','task','reflected','reflection','prediction']) {const partial={...p};delete partial[field];assert.equal(lessonPassed(partial,true),false,field);}
 assert.equal(lessonPassed(p,false),false);
 assert.equal(checkTask('workflow',null,{practiced:true,transfer:1}),false);
 assert.equal(checkTask('workflow',null,{practiced:true,transfer:1,explored:['dist','watch-sync','watch-rebuild']}),true);
 assert.equal(checkTask('ship',null,{practiced:true,transfer:1,explored:['mounted']}),false);
 assert.equal(checkTask('ship',null,{practiced:true,transfer:1,explored:['mounted','leaked']}),true);
});
test('learning evidence and reflections survive export; malformed imports are rejected',()=>{
 const learning={cli:{read:true,practiced:true,prediction:1,reflection:'I observed stop preserves the name',explored:[]}};
 assert.deepEqual(parseSession(JSON.stringify(sessionSnapshot(createVM(),[],{},[],learning))).learning,learning);
 assert.deepEqual(parseSession(JSON.stringify(sessionSnapshot(createVM()))).learning,{});
 for(const bad of [{cli:{reflection:'a'.repeat(2001)}},{unknown:{}},{constructor:{}},{cli:{task:'yes'}},{cli:{explored:['fake']}}]) {
 assert.equal(validLearning(bad),false);assert.throws(()=>parseSession(JSON.stringify(sessionSnapshot(createVM(),[],{},[],bad))));
 }
});
