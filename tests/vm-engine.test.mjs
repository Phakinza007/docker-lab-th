import test from 'node:test';
import assert from 'node:assert/strict';
import { createVM, PROJECT, validVM, saveFile, runVMCommand } from '../vm-engine.mjs';

const dockerfile = 'FROM nginx:alpine\nCOPY index.html /usr/share/nginx/html/index.html\n';

test('a learner can edit, build, run, inspect, and stop a site', () => {
  const vm = createVM();
  assert.match(runVMCommand(vm, 'ls').output, /Dockerfile/);
  assert.ok(vm.achievements.includes('inspect'));
  assert.match(runVMCommand(vm, 'docker build -t my-site:1.0 .').output, /ยังไม่มี FROM/);

  assert.equal(saveFile(vm, `${PROJECT}/Dockerfile`, dockerfile).ok, true);
  assert.ok(vm.achievements.includes('edit'));
  assert.match(runVMCommand(vm, 'docker build -t my-site:1.0 .').output, /Successfully tagged my-site:1.0/);
  assert.ok(vm.achievements.includes('build'));

  assert.equal(runVMCommand(vm, 'docker run -d --name web -p 8080:80 my-site:1.0').ok, true);
  assert.match(runVMCommand(vm, 'docker ps').output, /web/);
  assert.match(runVMCommand(vm, 'curl localhost:8080').output, /Hello from Docker Lab/);
  assert.match(runVMCommand(vm, 'docker logs web').output, /GET \/ HTTP\/1.1/);
  assert.equal(runVMCommand(vm, 'docker stop web').output, 'web');
  assert.match(runVMCommand(vm, 'curl localhost:8080').output, /Connection refused/);
  assert.equal(runVMCommand(vm, 'docker start web').output, 'web');
  assert.equal(runVMCommand(vm, 'docker rm web').ok, false);
  assert.equal(runVMCommand(vm, 'docker stop web').ok, true);
  assert.equal(runVMCommand(vm, 'docker rm web').ok, true);
  assert.equal(vm.achievements.length, 7);
  assert.equal(validVM(JSON.parse(JSON.stringify(vm))), true);
});

test('the built image keeps its content until it is rebuilt', () => {
  const vm = createVM();
  saveFile(vm, `${PROJECT}/Dockerfile`, dockerfile);
  runVMCommand(vm, 'docker build -t my-site:1.0 .');
  saveFile(vm, `${PROJECT}/index.html`, '<h1>Changed source</h1>');
  runVMCommand(vm, 'docker run -d --name web -p 8080:80 my-site:1.0');
  assert.match(runVMCommand(vm, 'curl localhost:8080').output, /Hello from Docker Lab/);
  runVMCommand(vm, 'docker stop web');
  runVMCommand(vm, 'docker rm web');
  runVMCommand(vm, 'docker build -t my-site:1.0 .');
  runVMCommand(vm, 'docker run -d --name web -p 8080:80 my-site:1.0');
  assert.match(runVMCommand(vm, 'curl localhost:8080').output, /Changed source/);
});

test('Compose cannot take an occupied host port and can manage its own service', () => {
  const vm = createVM();
  saveFile(vm, `${PROJECT}/Dockerfile`, dockerfile);
  runVMCommand(vm, 'docker build -t my-site:1.0 .');
  runVMCommand(vm, 'docker run -d --name web -p 8080:80 my-site:1.0');
  assert.match(runVMCommand(vm, 'docker compose up -d --build').output, /port 8080 is already allocated/);
  runVMCommand(vm, 'docker stop web');
  assert.match(runVMCommand(vm, 'docker compose up -d --build').output, /project-web-1  Started/);
  assert.match(runVMCommand(vm, 'docker compose ps').output, /project-web-1/);
  assert.match(runVMCommand(vm, 'curl localhost:8080').output, /Hello from Docker Lab/);
  assert.match(runVMCommand(vm, 'docker compose down').output, /Removed/);
  assert.match(runVMCommand(vm, 'curl localhost:8080').output, /Connection refused/);
});

test('unsupported commands remain inside the simulator', () => {
  const vm = createVM();
  assert.match(runVMCommand(vm, 'sudo rm -rf /').output, /command not found in this simulator/);
  assert.equal(vm.files[`${PROJECT}/index.html`].includes('Hello'), true);
});

test('container inspection and interactive shell use the built image', () => {
  const vm = createVM();
  saveFile(vm, `${PROJECT}/Dockerfile`, dockerfile);
  runVMCommand(vm, 'docker build -t my-site:1.0 .');
  runVMCommand(vm, 'docker run -d --name web -p 8080:80 my-site:1.0');
  assert.match(runVMCommand(vm, 'docker inspect web').output, /"Running": true/);
  assert.match(runVMCommand(vm, 'docker port web').output, /8080/);
  assert.match(runVMCommand(vm, 'docker top web').output, /nginx: master process/);
  assert.equal(runVMCommand(vm, 'docker exec -it web sh').ok, true);
  assert.equal(vm.shell, 'web');
  assert.match(runVMCommand(vm, 'cat /usr/share/nginx/html/index.html').output, /Hello from Docker Lab/);
  assert.match(runVMCommand(vm, 'ps').output, /nginx: worker process/);
  assert.equal(runVMCommand(vm, 'exit').ok, true);
  assert.equal(vm.shell, null);
  runVMCommand(vm, 'docker stop web');
  assert.equal(runVMCommand(vm, 'docker top web').ok, false);
  assert.equal(runVMCommand(vm, 'docker exec -it web sh').ok, false);
});

test('empty files can be edited and empty HTML is a valid copied artifact', () => {
  const vm = createVM();
  assert.equal(runVMCommand(vm,'touch notes.txt').ok,true);
  assert.equal(saveFile(vm,'notes.txt','').ok,true);
  assert.equal(saveFile(vm,'notes.txt','Saved after empty').ok,true);
  saveFile(vm,'Dockerfile',dockerfile);
  saveFile(vm,'index.html','');
  assert.equal(runVMCommand(vm,'docker build -t empty:1 .').ok,true);
  assert.equal(runVMCommand(vm,'docker run -d --name empty -p 8083:80 empty:1').ok,true);
  assert.equal(runVMCommand(vm,'curl localhost:8083').output,'');
});

test('Compose uses configured port and rebuild replaces a running container artifact', () => {
  const vm=createVM();saveFile(vm,'Dockerfile',dockerfile);
  saveFile(vm,'compose.yaml','services:\n  web:\n    build: .\n    ports:\n      - "9090:80"\n');
  assert.equal(runVMCommand(vm,'docker compose up -d --build').ok,true);
  const original=vm.containers['project-web-1'].id;
  assert.equal(vm.containers['project-web-1'].hostPort,9090);
  assert.equal(runVMCommand(vm,'curl localhost:8080').ok,false);
  saveFile(vm,'index.html','<h1>Rebuilt new HTML</h1>');
  assert.equal(runVMCommand(vm,'docker compose up --build -d').ok,true);
  assert.notEqual(vm.containers['project-web-1'].id,original);
  assert.equal(runVMCommand(vm,'curl localhost:9090').output,'<h1>Rebuilt new HTML</h1>');
  assert.equal(validVM(JSON.parse(JSON.stringify(vm))),true);
});

test('unsupported Dockerfile, Compose keys, malformed scalars and runtime flags fail clearly', () => {
  const vm=createVM();
  saveFile(vm,'Dockerfile',dockerfile+'RUN apk add curl\n');
  assert.equal(runVMCommand(vm,'docker build -t unsupported:1 .').ok,false);
  assert.equal(Object.keys(vm.images).length,0);
  saveFile(vm,'Dockerfile',dockerfile);
  for(const compose of [
    'services:\n  web:\n    build: .\n    ports:\n      - "8080:80"\n    restart: always\n',
    'services:\n  web:\n    build: .\n    ports:\n      - "8080:80\'\n',
    'services:\n  web:\n    build: .\n    ports:\n      - "70000:80"\n',
    'services:\n  web:\n    build: ./other\n    ports:\n      - "8080:80"\n',
  ]) {saveFile(vm,'compose.yaml',compose);assert.equal(runVMCommand(vm,'docker compose up -d --build').ok,false);}
  assert.equal(Object.keys(vm.containers).length,0);
  for(const command of ['docker build --no-cache -t test:1 .','docker run -d --privileged --name web -p 8080:80 nginx:alpine','docker run -d --name web -p 70000:80 nginx:alpine','docker run -d --name web -p 8080:80 -v ./data:/data nginx:alpine','docker logs toString','docker inspect toString','docker stop toString']) {
    assert.doesNotThrow(()=>runVMCommand(vm,command));
    assert.equal(runVMCommand(vm,command).ok,false,command);
  }
});

test('writable layer survives restart but is lost on recreation; named volume survives removal', () => {
  const vm=createVM();
  const run=(command)=>{const result=runVMCommand(vm,command);assert.equal(result.ok,true,command+': '+result.output);return result;};
  run('docker run -d --name scratch -p 8081:80 nginx:alpine');
  run('docker exec -it scratch sh');run('echo "temporary text" > /data/note.txt');run('exit');
  run('docker stop scratch');run('docker start scratch');
  assert.equal(run('docker exec scratch cat /data/note.txt').output,'temporary text\n');
  run('docker stop scratch');run('docker rm scratch');
  run('docker run -d --name scratch -p 8081:80 nginx:alpine');
  assert.equal(runVMCommand(vm,'docker exec scratch cat /data/note.txt').ok,false);
  run('docker volume create notes');
  run('docker run -d --name saved -p 8082:80 -v notes:/data nginx:alpine');
  run('docker exec -it saved sh');run('echo "keep me" > /data/note.txt');run('exit');
  assert.equal(runVMCommand(vm,'docker volume rm notes').ok,false);
  run('docker stop saved');assert.equal(runVMCommand(vm,'docker volume rm notes').ok,false);
  run('docker rm saved');run('docker run -d --name saved -p 8082:80 -v notes:/data nginx:alpine');
  assert.equal(run('docker exec saved cat /data/note.txt').output,'keep me\n');
  assert.equal(validVM(JSON.parse(JSON.stringify(vm))),true);
  run('docker stop saved');run('docker rm saved');run('docker volume rm notes');
  run('docker run -d --name saved -p 8082:80 -v notes:/data nginx:alpine');
  assert.equal(runVMCommand(vm,'docker exec saved cat /data/note.txt').ok,false);
});

const twoServices=`services:
  web:
    build: .
    ports:
      - "8080:80"
    depends_on:
      - db
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: demo-only
    volumes:
      - "db-data:/var/lib/postgresql/data"
volumes:
  db-data: {}
`;

test('the UI Compose sample creates web and simulated DB with scoped DNS and persistent data', () => {
  const vm=createVM();saveFile(vm,'Dockerfile',dockerfile);saveFile(vm,'compose.yaml',twoServices);
  const run=(command)=>{const result=runVMCommand(vm,command);assert.equal(result.ok,true,command+': '+result.output);return result;};
  assert.match(run('docker compose up -d --build').output,/ไม่รัน SQL หรือ auth/);
  assert.match(run('docker compose ps').output,/project-db-1.*internal only/);
  assert.match(run('docker exec project-web-1 getent hosts db').output,/172.20.0.3/);
  assert.match(run('docker exec project-web-1 nc -z db 5432').output,/succeeded/);
  assert.equal(runVMCommand(vm,'docker exec project-web-1 nc -z db 80').ok,false);
  assert.equal(runVMCommand(vm,'docker exec project-web-1 nc -z localhost 5432').ok,false);
  assert.equal(runVMCommand(vm,'docker exec project-web-1 nc -z localhost 80').ok,true);
  run('docker run -d --name outsider -p 8081:80 nginx:alpine');
  assert.equal(runVMCommand(vm,'docker exec outsider getent hosts db').ok,false);
  run('docker exec -it project-db-1 sh');run('echo "stored value" > /var/lib/postgresql/data/note.txt');run('exit');
  run('docker compose down');assert.ok(vm.volumes.includes('db-data'));
  run('docker compose up -d --build');
  assert.equal(run('docker exec project-db-1 cat /var/lib/postgresql/data/note.txt').output,'stored value\n');
  run('docker stop project-db-1');assert.equal(runVMCommand(vm,'docker exec project-web-1 nc -z db 5432').ok,false);
  run('docker compose down -v');assert.equal(vm.volumes.includes('db-data'),false);
  assert.equal(validVM(JSON.parse(JSON.stringify(vm))),true);
});

test('v1 import validation accepts legacy states and rejects unsafe or oversized shapes', () => {
  const legacy=createVM();delete legacy.volumeData;
  assert.equal(validVM(JSON.parse(JSON.stringify(legacy))),true);
  const cases=[
    (vm)=>vm.files=[],(vm)=>vm.files[`${PROJECT}/index.html`]=123,
    (vm)=>vm.files[`${PROJECT}/index.html`]='x'.repeat(10001),
    (vm)=>vm.cwd='/missing',(vm)=>vm.dirs.push('/etc'),
    (vm)=>vm.sequence=NaN,(vm)=>vm.images.bad={id:'a',tag:'bad',html:'',created:-1},
    (vm)=>vm.containers.bad={status:'running'},
    (vm)=>vm.volumes.push('__proto__'),(vm)=>vm.shell='missing',
    (vm)=>vm.achievements.push('unknown'),(vm)=>vm.history.push({kind:'html',text:'x'}),
    (vm)=>vm.history=Array(101).fill({kind:'output',text:'x'}),
    (vm)=>vm.files=JSON.parse('{"__proto__":{"polluted":true}}'),
    (vm)=>vm.extra={deep:'ignored data'},
    (vm)=>vm.volumeData.unknown={'/note':'orphan'},
  ];
  for(const mutate of cases){const vm=createVM();mutate(vm);assert.equal(validVM(vm),false,mutate.toString());}
  const huge=createVM();huge.history=Array(50).fill({kind:'output',text:'x'.repeat(50000)});
  assert.equal(validVM(huge),false);
  assert.equal(validVM(null),false);assert.equal(validVM([]),false);
});
