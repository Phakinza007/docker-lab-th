// A deliberately bounded, browser-only model of a Linux shell and Docker workflow.
// It never executes the entered command on the visitor's machine.

export const VM_STORAGE_KEY = 'docker-lab-vm-v1';
export const PROJECT = '/home/student/project';
export const MISSIONS = [
  { id: 'inspect', title: 'สำรวจไฟล์โปรเจกต์', hint: 'ls', detail: 'ดูไฟล์ที่เตรียมไว้ในเครื่อง' },
  { id: 'edit', title: 'เขียน Dockerfile', hint: 'nano Dockerfile', detail: 'ใช้ FROM และ COPY เพื่อใส่หน้าเว็บใน image' },
  { id: 'build', title: 'สร้าง image', hint: 'docker build -t my-site:1.0 .', detail: 'Build จาก Dockerfile ในโฟลเดอร์ปัจจุบัน' },
  { id: 'run', title: 'เริ่ม container', hint: 'docker run -d --name web -p 8080:80 my-site:1.0', detail: 'เปิดพอร์ตจาก VM ไปยัง Nginx' },
  { id: 'request', title: 'ทดสอบเว็บ', hint: 'curl localhost:8080', detail: 'ดูผลลัพธ์ที่ได้จาก container' },
  { id: 'logs', title: 'ตรวจ logs', hint: 'docker logs web', detail: 'ดูเหตุการณ์ของ container' },
  { id: 'stop', title: 'หยุด container', hint: 'docker stop web', detail: 'จัดการวงจรชีวิตของ container' },
];

export function createVM() {
  return {
    version: 1,
    cwd: PROJECT,
    shell: null,
    dirs: ['/', '/home', '/home/student', PROJECT],
    files: {
      [`${PROJECT}/README.md`]: '# Docker practice\nแก้ Dockerfile แล้วสร้าง image สำหรับหน้าเว็บนี้\n',
      [`${PROJECT}/index.html`]: '<!doctype html>\n<html lang="th">\n  <h1>Hello from Docker Lab!</h1>\n</html>\n',
      [`${PROJECT}/Dockerfile`]: '# เริ่มเขียน Dockerfile ที่นี่\n',
      [`${PROJECT}/compose.yaml`]: 'services:\n  web:\n    build: .\n    ports:\n      - "8080:80"\n',
    },
    images: {},
    containers: {},
    volumes: [],
    achievements: [],
    history: [
      { kind: 'system', text: 'Ubuntu-style practice VM  •  Docker Lab simulator' },
      { kind: 'system', text: 'พิมพ์ help เพื่อดูคำสั่งที่จำลองได้ หรือเริ่มจาก ls' },
    ],
    sequence: 0,
  };
}

export function validVM(value) {
  return value && value.version === 1 && typeof value.cwd === 'string' && Array.isArray(value.dirs)
    && value.files && typeof value.files === 'object' && value.images && typeof value.images === 'object'
    && value.containers && typeof value.containers === 'object' && Array.isArray(value.volumes)
    && Array.isArray(value.achievements) && Array.isArray(value.history);
}

function mark(vm, id) { if (!vm.achievements.includes(id)) vm.achievements.push(id); }
function normalize(base, path) {
  const raw = path.startsWith('~') ? `/home/student${path.slice(1)}` : path.startsWith('/') ? path : `${base}/${path}`;
  const parts = [];
  for (const part of raw.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return `/${parts.join('/')}`;
}
function shortPath(path) { return path.replace('/home/student', '~') || '/'; }
export function prompt(vm) { return vm.shell ? `root@${vm.shell}:/#` : `student@docker-lab:${shortPath(vm.cwd)}$`; }
export function listFiles(vm) {
  return Object.keys(vm.files).filter((path) => path.startsWith(`${PROJECT}/`)).map((path) => path.slice(PROJECT.length + 1)).sort();
}
export function validateDockerfile(vm) {
  const content = vm.files[`${PROJECT}/Dockerfile`] || '';
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('#'));
  const from = lines.find((line) => /^FROM\s+/i.test(line));
  if (!from) return 'ยังไม่มี FROM ใน Dockerfile';
  if (!/^FROM\s+nginx:alpine\s*$/i.test(from)) return 'Lab นี้รองรับ base image: FROM nginx:alpine';
  const copy = lines.find((line) => /^COPY\s+/i.test(line));
  if (!copy) return 'เพิ่ม COPY index.html /usr/share/nginx/html/index.html';
  if (!/^COPY\s+(?:\.\/)?index\.html\s+\/usr\/share\/nginx\/html\/(?:index\.html)?\s*$/i.test(copy))
    return 'Lab นี้รองรับ COPY index.html /usr/share/nginx/html/index.html';
  if (!vm.files[`${PROJECT}/index.html`]) return 'ไม่พบ index.html ใน build context';
  return null;
}

export function saveFile(vm, filename, content) {
  const path = normalize(vm.cwd, filename);
  if (!path.startsWith(`${PROJECT}/`) || !vm.files[path]) return { ok: false, output: 'แก้ไขได้เฉพาะไฟล์ที่มีอยู่ใน ~/project' };
  if (content.length > 10_000) return { ok: false, output: 'ไฟล์ใหญ่เกินขนาดที่ Lab รองรับ (10 KB)' };
  vm.files[path] = content;
  if (path === `${PROJECT}/Dockerfile` && !validateDockerfile(vm)) mark(vm, 'edit');
  return { ok: true, output: `บันทึก ${path.slice(PROJECT.length + 1)} แล้ว` };
}

function makeImage(vm, tag) {
  const issue = validateDockerfile(vm);
  if (issue) return { ok: false, output: `ERROR: build failed — ${issue}` };
  vm.sequence += 1;
  const id = `sha256:lab${String(vm.sequence).padStart(6, '0')}`;
  vm.images[tag] = { id, tag, html: vm.files[`${PROJECT}/index.html`], created: vm.sequence };
  mark(vm, 'build');
  return { ok: true, output: `[+] Building with BuildKit (จำลอง)\n => [1/2] FROM nginx:alpine\n => [2/2] COPY index.html /usr/share/nginx/html/index.html\n => exporting to image ${id}\nSuccessfully tagged ${tag}` };
}

function publicPortTaken(vm, port) {
  return Object.values(vm.containers).some((container) => container.status === 'running' && container.hostPort === port);
}

function makeContainer(vm, name, tag, port, compose = false) {
  if (vm.containers[name]) return { ok: false, output: `docker: Error response from daemon: Conflict. container name "${name}" is already in use.` };
  if (!vm.images[tag] && tag !== 'nginx:alpine') return { ok: false, output: `Unable to find image '${tag}' locally. ลอง docker build ก่อน` };
  if (publicPortTaken(vm, port)) return { ok: false, output: `docker: Error response from daemon: port ${port} is already allocated.` };
  vm.sequence += 1;
  const id = `lab${String(vm.sequence).padStart(9, '0')}`;
  vm.containers[name] = { id, name, tag, hostPort: port, containerPort: 80, status: 'running', html: vm.images[tag]?.html ?? '<h1>Welcome to nginx!</h1>', logs: ['nginx: configuration complete; ready for start up'], compose };
  if (name === 'web' && tag === 'my-site:1.0') mark(vm, 'run');
  return { ok: true, output: id };
}

function parseWords(input) {
  const words = [];
  const pattern = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
  for (const match of input.matchAll(pattern)) words.push(match[1] ?? match[2] ?? match[3]);
  return words;
}

function executeDocker(vm, words) {
  const [, first, ...rest] = words;
  if (!first || first === '--help') return { ok: true, output: 'docker build | run | ps | images | logs | exec | inspect | top | port | stop | start | rm | volume | compose | version' };
  if (first === 'version' || first === '--version') return { ok: true, output: 'Docker Lab simulator (browser model)\nDocker Engine: ไม่ได้เชื่อมต่อ' };
  if (first === 'info') return { ok: true, output: `Docker Lab simulator\nImages: ${Object.keys(vm.images).length}\nContainers: ${Object.keys(vm.containers).length}\nStorage: browser localStorage` };
  if (first === 'images' || (first === 'image' && rest[0] === 'ls')) {
    const rows = Object.values(vm.images).map((image) => `${image.tag.padEnd(20)} ${image.id.padEnd(18)} just now`);
    return { ok: true, output: `REPOSITORY:TAG       IMAGE ID           CREATED\n${rows.join('\n') || '(ไม่มี image ที่ build แล้ว)'}` };
  }
  if (first === 'ps' || (first === 'container' && rest[0] === 'ls')) {
    const all = rest.includes('-a') || rest.includes('--all');
    const rows = Object.values(vm.containers).filter((container) => all || container.status === 'running')
      .map((container) => `${container.id.padEnd(14)} ${container.tag.padEnd(19)} ${container.status.padEnd(8)} ${container.status === 'running' ? `0.0.0.0:${container.hostPort}->80/tcp` : '-'.padEnd(22)} ${container.name}`);
    return { ok: true, output: `CONTAINER ID   IMAGE               STATUS   PORTS                  NAMES\n${rows.join('\n') || '(ไม่มี container ที่แสดง)'}` };
  }
  if (first === 'build') {
    const tagIndex = rest.findIndex((word) => word === '-t' || word === '--tag');
    const tag = tagIndex >= 0 ? rest[tagIndex + 1] : null;
    if (!tag || rest.at(-1) !== '.') return { ok: false, output: 'Usage ใน Lab: docker build -t my-site:1.0 .' };
    if (vm.cwd !== PROJECT) return { ok: false, output: 'ERROR: ไม่พบ Dockerfile ในโฟลเดอร์ปัจจุบัน ใช้ cd ~/project' };
    return makeImage(vm, tag);
  }
  if (first === 'run') {
    const nameIndex = rest.indexOf('--name');
    const portIndex = rest.indexOf('-p');
    const tag = rest.at(-1);
    const name = nameIndex >= 0 ? rest[nameIndex + 1] : null;
    const ports = portIndex >= 0 ? rest[portIndex + 1]?.match(/^(\d+):80$/) : null;
    if (!name || !ports || !tag || !rest.includes('-d')) return { ok: false, output: 'Usage ใน Lab: docker run -d --name web -p 8080:80 my-site:1.0' };
    return makeContainer(vm, name, tag, Number(ports[1]));
  }
  if (first === 'logs') {
    const name = rest.at(-1); const container = vm.containers[name];
    if (!container) return { ok: false, output: `Error: No such container: ${name || '(ว่าง)'}` };
    if (name === 'web') mark(vm, 'logs');
    return { ok: true, output: container.logs.join('\n') };
  }
  if (first === 'exec') {
    const name = rest[0] === '-it' ? rest[1] : rest[0];
    const action = rest[0] === '-it' ? rest[2] : rest[1];
    const container = vm.containers[name];
    if (!container || container.status !== 'running') return { ok: false, output: `Error: container ${name || '(ว่าง)'} is not running` };
    if (action === 'sh') { vm.shell = name; return { ok: true, output: `Opened shell in ${name}. พิมพ์ exit เพื่อกลับ VM` }; }
    if (action === 'cat' && rest.at(-1) === '/usr/share/nginx/html/index.html') return { ok: true, output: container.html };
    return { ok: false, output: 'Usage ใน Lab: docker exec -it NAME sh | docker exec NAME cat /usr/share/nginx/html/index.html' };
  }
  if (first === 'inspect' || first === 'top' || first === 'port') {
    const name = rest[0]; const container = vm.containers[name];
    if (!container) return { ok: false, output: `Error: No such container: ${name || '(ว่าง)'}` };
    if (first === 'port') return { ok: true, output: `80/tcp -> 0.0.0.0:${container.hostPort}` };
    if (first === 'top') return container.status === 'running' ? { ok: true, output: 'UID   PID   CMD\nroot  1     nginx: master process\nnginx 7    nginx: worker process' } : { ok: false, output: `Error: container ${name} is not running` };
    return { ok: true, output: JSON.stringify({ Id: container.id, Name: `/${name}`, Image: container.tag, State: { Status: container.status, Running: container.status === 'running' }, NetworkSettings: { Ports: { '80/tcp': [{ HostPort: String(container.hostPort) }] } } }, null, 2) };
  }
  if (first === 'stop' || first === 'start' || first === 'rm') {
    const name = rest[0]; const container = vm.containers[name];
    if (!container) return { ok: false, output: `Error: No such container: ${name || '(ว่าง)'}` };
    if (first === 'stop') { if (container.status === 'exited') return { ok: false, output: `${name} is already stopped` }; container.status = 'exited'; container.logs.push('nginx: graceful shutdown complete'); if (name === 'web') mark(vm, 'stop'); }
    if (first === 'start') { if (container.status === 'running') return { ok: false, output: `${name} is already running` }; if (publicPortTaken(vm, container.hostPort)) return { ok: false, output: `port ${container.hostPort} is already allocated` }; container.status = 'running'; container.logs.push('nginx: configuration complete; ready for start up'); }
    if (first === 'rm') { if (container.status === 'running') return { ok: false, output: `Error: You cannot remove a running container ${name}. Stop it first.` }; delete vm.containers[name]; }
    return { ok: true, output: name };
  }
  if (first === 'volume') {
    if (rest[0] === 'ls') return { ok: true, output: `DRIVER    VOLUME NAME\n${vm.volumes.map((volume) => `local     ${volume}`).join('\n') || '(ไม่มี volume)'}` };
    if (rest[0] === 'create' && rest[1]) { if (!vm.volumes.includes(rest[1])) vm.volumes.push(rest[1]); return { ok: true, output: rest[1] }; }
    return { ok: false, output: 'Usage ใน Lab: docker volume create NAME | docker volume ls' };
  }
  if (first === 'compose') {
    const command = rest[0];
    if (!vm.files[`${PROJECT}/compose.yaml`] || vm.cwd !== PROJECT) return { ok: false, output: 'no configuration file provided: not found (เข้า ~/project ก่อน)' };
    if (command === 'up') {
      if (!rest.includes('-d') || !rest.includes('--build')) return { ok: false, output: 'Usage ใน Lab: docker compose up -d --build' };
      if (!/build:\s*\./.test(vm.files[`${PROJECT}/compose.yaml`])) return { ok: false, output: 'Lab นี้รองรับ compose.yaml ตัวอย่างที่มี build: .' };
      if (vm.containers['project-web-1']) {
        const container = vm.containers['project-web-1'];
        if (container.status === 'running') return { ok: true, output: 'Container project-web-1  Running' };
        if (publicPortTaken(vm, container.hostPort)) return { ok: false, output: `port ${container.hostPort} is already allocated` };
        container.status = 'running'; return { ok: true, output: 'Container project-web-1  Started' };
      }
      if (publicPortTaken(vm, 8080)) return { ok: false, output: 'port 8080 is already allocated. หยุด web ก่อน' };
      const built = makeImage(vm, 'project-web:latest'); if (!built.ok) return built;
      const created = makeContainer(vm, 'project-web-1', 'project-web:latest', 8080, true);
      return created.ok ? { ok: true, output: '[+] Running 2/2\n ✔ Network project_default  Created\n ✔ Container project-web-1  Started' } : created;
    }
    if (command === 'ps') { const container = vm.containers['project-web-1']; return { ok: true, output: container ? `NAME             IMAGE               STATUS     PORTS\nproject-web-1    project-web:latest  ${container.status}    ${container.status === 'running' ? '0.0.0.0:8080->80/tcp' : '-'}` : 'NAME   IMAGE   STATUS   PORTS\n(ไม่มี service)' }; }
    if (command === 'logs') { const container = vm.containers['project-web-1']; return container ? { ok: true, output: container.logs.join('\n') } : { ok: false, output: 'no container for service web' }; }
    if (command === 'down') { delete vm.containers['project-web-1']; return { ok: true, output: '[+] Running 2/2\n ✔ Container project-web-1  Removed\n ✔ Network project_default  Removed' }; }
    return { ok: false, output: 'Usage ใน Lab: docker compose up -d --build | ps | logs | down' };
  }
  return { ok: false, output: `docker: '${first}' ยังไม่อยู่ในตัวจำลอง ใช้ docker --help` };
}

function executeShell(vm, words) {
  const [first, ...rest] = words;
  if (first === 'help') return { ok: true, output: 'Shell: pwd, ls, cd, cat, nano, touch, mkdir, whoami, uname, clear\nDocker: docker build/run/ps/images/logs/exec/inspect/top/port/stop/start/rm/volume/compose\nWeb: curl localhost:8080\nทุกคำสั่งทำงานในตัวจำลองเท่านั้น' };
  if (first === 'clear') return { ok: true, output: '', clear: true };
  if (first === 'pwd') return { ok: true, output: vm.cwd };
  if (first === 'whoami') return { ok: true, output: 'student' };
  if (first === 'uname' && rest[0] === '-a') return { ok: true, output: 'Linux docker-lab 6.x browser-simulator x86_64 GNU/Linux (จำลอง)' };
  if (first === 'ls') {
    const target = rest.find((word) => !word.startsWith('-')) || '.';
    const path = normalize(vm.cwd, target);
    if (!vm.dirs.includes(path)) return { ok: false, output: `ls: cannot access '${target}': No such directory` };
    const items = new Set();
    for (const dir of vm.dirs) if (dir !== path && dir.startsWith(`${path === '/' ? '' : path}/`)) { const child = dir.slice((path === '/' ? '' : path).length + 1).split('/')[0]; if (child) items.add(`${child}/`); }
    for (const file of Object.keys(vm.files)) if (file.startsWith(`${path === '/' ? '' : path}/`)) { const child = file.slice((path === '/' ? '' : path).length + 1).split('/')[0]; if (child) items.add(child); }
    if (path === PROJECT) mark(vm, 'inspect');
    return { ok: true, output: [...items].sort().join(rest.includes('-la') || rest.includes('-al') ? '\n' : '    ') || '(ว่าง)' };
  }
  if (first === 'cd') { const path = normalize(vm.cwd, rest[0] || '~'); if (!vm.dirs.includes(path)) return { ok: false, output: `cd: ${rest[0]}: No such directory` }; vm.cwd = path; return { ok: true, output: '' }; }
  if (first === 'cat') { const path = normalize(vm.cwd, rest[0] || ''); if (!(path in vm.files)) return { ok: false, output: `cat: ${rest[0] || ''}: No such file` }; if (path === `${PROJECT}/index.html`) mark(vm, 'inspect'); return { ok: true, output: vm.files[path] }; }
  if (first === 'nano') { const path = normalize(vm.cwd, rest[0] || ''); if (!(path in vm.files)) return { ok: false, output: `nano: ${rest[0] || ''}: เปิดได้เฉพาะไฟล์ที่มีอยู่` }; return { ok: true, output: `เปิด ${rest[0]} ในตัวแก้ไขด้านล่าง`, openFile: path }; }
  if (first === 'touch') { const path = normalize(vm.cwd, rest[0] || ''); if (!path.startsWith(`${PROJECT}/`) || !rest[0]) return { ok: false, output: 'touch: สร้างไฟล์ได้เฉพาะใน ~/project' }; if (!(path in vm.files)) vm.files[path] = ''; return { ok: true, output: '' }; }
  if (first === 'mkdir') { const path = normalize(vm.cwd, rest[0] || ''); if (!path.startsWith(`${PROJECT}/`) || !rest[0]) return { ok: false, output: 'mkdir: สร้างโฟลเดอร์ได้เฉพาะใน ~/project' }; if (vm.dirs.includes(path)) return { ok: false, output: `mkdir: cannot create directory '${rest[0]}': File exists` }; vm.dirs.push(path); return { ok: true, output: '' }; }
  if (first === 'curl') {
    const url = rest.find((item) => !item.startsWith('-')) || '';
    const match = url.match(/^(?:https?:\/\/)?(?:localhost|127\.0\.0\.1):(\d+)(?:\/.*)?$/);
    if (!match) return { ok: false, output: 'curl: Lab นี้รองรับ localhost:PORT เช่น curl localhost:8080' };
    const port = Number(match[1]);
    const container = Object.values(vm.containers).find((item) => item.status === 'running' && item.hostPort === port);
    if (!container) return { ok: false, output: `curl: (7) Failed to connect to localhost port ${port}: Connection refused` };
    container.logs.push(`127.0.0.1 - - "GET / HTTP/1.1" 200`);
    if (container.name === 'web') mark(vm, 'request');
    return { ok: true, output: `${rest.includes('-i') ? 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n' : ''}${container.html}` };
  }
  if (first === 'docker') return executeDocker(vm, words);
  return { ok: false, output: `${first}: command not found in this simulator\nพิมพ์ help เพื่อดูคำสั่งที่รองรับ` };
}

function executeContainerShell(vm, words) {
  const [first, ...rest] = words;
  const container = vm.containers[vm.shell];
  if (!container || container.status !== 'running') { vm.shell = null; return { ok: false, output: 'container หยุดทำงานแล้ว กลับสู่ VM' }; }
  if (first === 'exit') { vm.shell = null; return { ok: true, output: 'exit' }; }
  if (first === 'help') return { ok: true, output: 'ใน container: pwd | ls | cat /usr/share/nginx/html/index.html | whoami | ps | exit' };
  if (first === 'pwd') return { ok: true, output: '/' };
  if (first === 'whoami') return { ok: true, output: 'root (เฉพาะใน container จำลอง)' };
  if (first === 'ps') return { ok: true, output: 'PID   CMD\n1     nginx: master process\n7     nginx: worker process' };
  if (first === 'ls' && (!rest[0] || rest[0] === '/usr/share/nginx/html')) return { ok: true, output: 'index.html' };
  if (first === 'cat' && rest[0] === '/usr/share/nginx/html/index.html') return { ok: true, output: container.html };
  return { ok: false, output: `${first}: คำสั่งนี้ยังไม่อยู่ใน container shell จำลอง พิมพ์ help` };
}

export function runVMCommand(vm, raw) {
  const input = String(raw).trim();
  if (!input) return { ok: false, output: '' };
  if (input.length > 500) return { ok: false, output: 'คำสั่งยาวเกินขนาดที่ Lab รองรับ' };
  const commandPrompt = prompt(vm);
  const words = parseWords(input);
  const result = vm.shell ? executeContainerShell(vm, words) : executeShell(vm, words);
  if (result.clear) vm.history = [];
  else {
    vm.history.push({ kind: 'command', prompt: commandPrompt, text: input });
    if (result.output) vm.history.push({ kind: result.ok ? 'output' : 'error', text: result.output });
  }
  vm.history = vm.history.slice(-100);
  return result;
}
