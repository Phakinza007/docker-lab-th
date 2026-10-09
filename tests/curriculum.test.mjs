import test from 'node:test';
import assert from 'node:assert/strict';
import { makeScenario, commandScenario, configureScenarioHost, storageScenarioAction } from '../curriculum.mjs';

test('name collision cannot be solved by another run but existing container can be started', () => {
  const scenario=makeScenario('name');
  assert.equal(commandScenario(scenario,'docker run -d --name web -p 8080:80 nginx:alpine').ok,false);
  assert.equal(scenario.solved,false);
  assert.match(commandScenario(scenario,'docker ps -a').output,/web/);
  assert.equal(commandScenario(scenario,'docker start web').ok,true);
  assert.equal(scenario.solved,true);
});
test('port exercise requires second container, unchanged first service and successful request', () => {
  const scenario=makeScenario('port');
  assert.equal(commandScenario(scenario,'docker run -d --name second -p 8080:80 nginx:alpine').ok,false);
  assert.equal(commandScenario(scenario,'docker run -d --name second -p 8081:80 nginx:alpine').ok,true);
  assert.equal(scenario.solved,false);
  assert.equal(commandScenario(scenario,'curl localhost:8081').ok,true);
  assert.equal(scenario.solved,true);
  commandScenario(scenario,'docker stop web');
  assert.equal(scenario.solved,false);
});
test('troubleshooting engines are isolated from other exercises', () => {
  const name=makeScenario('name'),port=makeScenario('port');
  commandScenario(name,'docker rm web');
  assert.equal(name.vm.containers.web,undefined);
  assert.equal(port.vm.containers.web.status,'running');
});

test('Compose hostname exercise rejects localhost and uses service DNS', () => {
  const scenario=makeScenario('host');
  configureScenarioHost(scenario,'localhost');assert.equal(scenario.solved,false);
  configureScenarioHost(scenario,'db');assert.equal(scenario.solved,true);
});
test('storage exercise loses writable data but restores the same named volume', () => {
  const layer=makeScenario('storage');
  storageScenarioAction(layer,'write','important');storageScenarioAction(layer,'remove');storageScenarioAction(layer,'recreate');
  assert.equal(layer.data,'');assert.equal(layer.solved,false);
  const volume=makeScenario('storage');volume.storage='volume';
  storageScenarioAction(volume,'write','important');storageScenarioAction(volume,'remove');
  assert.equal(volume.data,'');assert.equal(volume.volume,'important');
  storageScenarioAction(volume,'recreate');assert.equal(volume.data,'important');assert.equal(volume.solved,true);
});
test('empty volume or recreate without removing never passes storage exercise', () => {
  const scenario=makeScenario('storage');scenario.storage='volume';
  storageScenarioAction(scenario,'recreate');assert.equal(scenario.solved,false);
  storageScenarioAction(scenario,'remove');storageScenarioAction(scenario,'recreate');assert.equal(scenario.solved,false);
});
