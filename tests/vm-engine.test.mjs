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
