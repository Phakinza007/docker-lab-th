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
    volumeData: {},
    achievements: [],
    history: [
      { kind: 'system', text: 'Ubuntu-style practice VM  •  Docker Lab simulator' },
      { kind: 'system', text: 'พิมพ์ help เพื่อดูคำสั่งที่จำลองได้ หรือเริ่มจาก ls' },
    ],
    sequence: 0,
  };
}

const BAD_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const nameOK = (value) => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$/.test(value) && !BAD_KEYS.has(value);
const tagOK = (value) => typeof value === 'string' && value.length <= 120 && /^[a-z0-9][a-z0-9._/-]*(?::[a-zA-Z0-9][a-zA-Z0-9_.-]*)?$/.test(value) && !BAD_KEYS.has(value);
const textOK = (value, max = 10000) => typeof value === 'string' && value.length <= max;
const integer = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const record = (value, max = 200) => value && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value)) && Object.keys(value).length <= max
  && !Object.keys(value).some((key) => BAD_KEYS.has(key));
const fields = (value, allowed) => Object.keys(value).every((key)=>allowed.includes(key));
const absolutePath = (value) => textOK(value, 256) && value.startsWith('/') && normalize('/', value) === value;
const fileMap = (value, projectOnly = false) => record(value) && Object.entries(value).every(([path, content]) =>
  absolutePath(path) && (!projectOnly || path.startsWith(`${PROJECT}/`)) && textOK(content));
const mountOK = (mount, volumes) => record(mount, 2) && fields(mount,['volume','target']) && nameOK(mount.volume) && volumes.includes(mount.volume)
  && ['/data', '/var/lib/postgresql/data'].includes(mount.target);

/** Validate untrusted imports before any rendering or command evaluation. Optional fields extend v1. */
export function validVM(value) {
  if (!record(value, 15) || !fields(value,['version','cwd','shell','dirs','files','images','containers','volumes','volumeData','achievements','history','sequence']) || value.version !== 1 || !absolutePath(value.cwd) || !Array.isArray(value.dirs)
      || value.dirs.length > 200 || !value.dirs.every((path) => absolutePath(path) &&
        (['/', '/home', '/home/student', PROJECT].includes(path) || path.startsWith(`${PROJECT}/`)))
      || !value.dirs.includes(value.cwd) || !fileMap(value.files, true) || !record(value.images, 40)
      || !record(value.containers, 40) || !Array.isArray(value.volumes) || value.volumes.length > 40
      || !value.volumes.every(nameOK) || new Set(value.volumes).size !== value.volumes.length
      || !Array.isArray(value.achievements) || value.achievements.length > MISSIONS.length
      || !value.achievements.every((id) => MISSIONS.some((mission) => mission.id === id))
      || new Set(value.achievements).size !== value.achievements.length
      || !Array.isArray(value.history) || value.history.length > 100
      || !value.history.every((entry) => record(entry, 3) && fields(entry,['kind','text','prompt']) && ['system', 'command', 'output', 'error'].includes(entry.kind)
        && textOK(entry.text, 50000) && (entry.prompt === undefined || textOK(entry.prompt, 320)))
      || !integer(value.sequence, 0, 1e9)) return false;
  if (!Object.entries(value.images).every(([tag, image]) => tagOK(tag) && record(image, 4) && fields(image,['id','tag','html','created']) && image.tag === tag
      && textOK(image.id, 100) && textOK(image.html) && integer(image.created, 0, 1e9))) return false;
  if (!Object.entries(value.containers).every(([name, container]) => nameOK(name) && record(container, 15)
      && fields(container,['id','name','tag','hostPort','containerPort','status','html','logs','compose','files','mounts','service','network']) && container.name === name && tagOK(container.tag) && textOK(container.id, 100)
      && ['running', 'exited'].includes(container.status) && textOK(container.html)
      && (container.hostPort === null || integer(container.hostPort, 1, 65535))
      && [80, 5432].includes(container.containerPort) && typeof container.compose === 'boolean'
      && Array.isArray(container.logs) && container.logs.length <= 100 && container.logs.every((line) => textOK(line, 1000))
      && (container.files === undefined || fileMap(container.files))
      && (container.mounts === undefined || (Array.isArray(container.mounts) && container.mounts.length <= 1 && container.mounts.every((mount) => mountOK(mount, value.volumes))))
      && (container.service === undefined || ['web', 'db'].includes(container.service))
      && (container.network === undefined || container.network === 'project_default'))) return false;
  if (value.volumeData !== undefined && (!record(value.volumeData, 40) || !Object.entries(value.volumeData)
      .every(([name, files]) => value.volumes.includes(name) && fileMap(files)))) return false;
  if (!(value.shell === null || (nameOK(value.shell) && Object.hasOwn(value.containers, value.shell)))) return false;
  // Cap the aggregate, not just each field, to keep import and localStorage predictable.
  return JSON.stringify(value).length <= 2_000_000;
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
  if (lines.length !== 2 || !/^FROM\s+/i.test(lines[0]) || !/^COPY\s+/i.test(lines[1])) return lines.length === 0 ? 'ยังไม่มี FROM ใน Dockerfile' : 'ตัวจำลองรองรับเฉพาะ FROM และ COPY อย่างละหนึ่งบรรทัด ตามลำดับ (ไม่รัน RUN/ENV/คำสั่งอื่น)';
  const from = lines.find((line) => /^FROM\s+/i.test(line));
  if (!from) return 'ยังไม่มี FROM ใน Dockerfile';
  if (!/^FROM\s+nginx:alpine\s*$/i.test(from)) return 'Lab นี้รองรับ base image: FROM nginx:alpine';
  const copy = lines.find((line) => /^COPY\s+/i.test(line));
  if (!copy) return 'เพิ่ม COPY index.html /usr/share/nginx/html/index.html';
  if (!/^COPY\s+(?:\.\/)?index\.html\s+\/usr\/share\/nginx\/html\/(?:index\.html)?\s*$/i.test(copy))
    return 'Lab นี้รองรับ COPY index.html /usr/share/nginx/html/index.html';
  if (!Object.hasOwn(vm.files, `${PROJECT}/index.html`)) return 'ไม่พบ index.html ใน build context';
  return null;
}

export function saveFile(vm, filename, content) {
  const path = normalize(vm.cwd, filename);
  if (!absolutePath(path) || !path.startsWith(`${PROJECT}/`) || !Object.hasOwn(vm.files, path)) return { ok: false, output: 'แก้ไขได้เฉพาะไฟล์ที่มีอยู่ใน ~/project' };
  if (typeof content !== 'string') return { ok: false, output: 'เนื้อหาไฟล์ต้องเป็นข้อความ' };
  if (content.length > 10_000) return { ok: false, output: 'ไฟล์ใหญ่เกินขนาดที่ Lab รองรับ (10 KB)' };
  vm.files[path] = content;
  if (path === `${PROJECT}/Dockerfile` && !validateDockerfile(vm)) mark(vm, 'edit');
  return { ok: true, output: `บันทึก ${path.slice(PROJECT.length + 1)} แล้ว` };
}

function makeImage(vm, tag) {
  if (!tagOK(tag)) return { ok:false, output:"ชื่อ image/tag ไม่ถูกต้องหรือยังไม่รองรับ" };
  if (!Object.hasOwn(vm.images, tag) && Object.keys(vm.images).length >= 40) return { ok:false, output:"Lab รองรับ image สูงสุด 40 รายการ" };
  if (vm.sequence >= 1e9) return {ok:false,output:'Simulator sequence limit reached; export/reset VM เพื่อเริ่มใหม่'};
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

function makeContainer(vm, name, tag, port, compose = false, options = {}) {
  if (vm.sequence >= 1e9) return {ok:false,output:'Simulator sequence limit reached; export/reset VM เพื่อเริ่มใหม่'};
  if (!nameOK(name) || !tagOK(tag) || (port !== null && !integer(port, 1, 65535))) return { ok:false, output:'ชื่อหรือพอร์ตไม่ถูกต้อง (พอร์ต 1–65535)' };
  if (Object.hasOwn(vm.containers, name)) return { ok: false, output: `docker: Error response from daemon: Conflict. container name "${name}" is already in use.` };
  if (Object.keys(vm.containers).length >= 40) return { ok:false, output:'Lab รองรับ container สูงสุด 40 รายการ' };
  if (!Object.hasOwn(vm.images, tag) && !['nginx:alpine', 'postgres:16-alpine'].includes(tag)) return { ok: false, output: `Unable to find image '${tag}' locally. ลอง docker build ก่อน` };
  if (port !== null && publicPortTaken(vm, port)) return { ok: false, output: `docker: Error response from daemon: port ${port} is already allocated.` };
  const mounts = options.mounts || [];
  for (const mount of mounts) {
    if (!vm.volumes.includes(mount.volume) && vm.volumes.length >= 40) return { ok:false, output:'Lab รองรับ volume สูงสุด 40 รายการ' };
  }
  for (const mount of mounts) {
    if (!vm.volumes.includes(mount.volume)) vm.volumes.push(mount.volume);
    vm.volumeData ??= {};
    vm.volumeData[mount.volume] ??= {};
  }
  vm.sequence += 1;
  const id = `lab${String(vm.sequence).padStart(9, '0')}`;
  const db = tag === 'postgres:16-alpine';
  vm.containers[name] = { id, name, tag, hostPort: port, containerPort: db ? 5432 : 80, status: 'running',
    html: db ? '' : vm.images[tag]?.html ?? '<h1>Welcome to nginx!</h1>',
    logs: [db ? 'PostgreSQL service endpoint ready (จำลอง TCP เท่านั้น ไม่มี SQL engine)' : 'nginx: configuration complete; ready for start up'],
    compose, files: {}, mounts, ...(options.service ? {service:options.service, network:'project_default'} : {}) };
  if (name === 'web' && tag === 'my-site:1.0') mark(vm, 'run');
  return { ok: true, output: id };
}

const fail = (output) => ({ok:false, output});
function parseMount(value, db = false) {
  const match = value?.match(/^([a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}):(\/data|\/var\/lib\/postgresql\/data)$/);
  return match && nameOK(match[1]) && (!db || match[2] === '/var/lib/postgresql/data')
    ? {volume:match[1], target:match[2]} : null;
}

function scalar(value) {
  if (/^[\"']/.test(value)) {
    if (value.at(-1)!==value[0] || value.length<2 || value.slice(1,-1).includes(value[0])) return null;
    return value.slice(1,-1);
  }
  return /[\"'{}\[\]]/.test(value) ? null : value;
}

/** Strict YAML teaching subset; unknown keys/indentation never silently succeed. */
function composeConfig(text) {
  const services = {}; const volumes = [];
  let section = ''; let service = ''; let list = '';
  const issue = () => fail('compose.yaml: รองรับเฉพาะ web (build: ., ports HOST:80, depends_on: db), db (image: postgres:16-alpine, volumes NAME:/var/lib/postgresql/data) และ top-level volumes; environment รองรับเฉพาะ db POSTGRES_PASSWORD (ไม่จำลอง auth); ไม่รองรับเงื่อนไข/ตัวเลือกอื่น');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '').trimEnd();
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (line.includes('\t')) return issue();
    if (/^(services|volumes):$/.test(line)) { section = line.slice(0,-1); service = ''; list = ''; continue; }
    if (section === 'volumes') {
      const match = line.match(/^  ([a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}):(?:\s*\{\})?$/);
      if (!match || !nameOK(match[1]) || volumes.includes(match[1])) return issue();
      volumes.push(match[1]); continue;
    }
    if (section !== 'services') return issue();
    const heading = line.match(/^  (web|db):$/);
    if (heading) { service = heading[1]; if (services[service]) return issue(); services[service] = {}; list = ''; continue; }
    if (!service) return issue();
    const property = line.match(/^    (build|ports|depends_on|image|volumes|environment):(?:\s+(.*))?$/);
    if (property) {
      const [,key,value] = property;
      if (Object.hasOwn(services[service],key)) return issue();
      if (key === 'environment') {
        if (service!=='db' || value) return issue(); services[service][key]={}; list=key;
      } else if (['ports','depends_on','volumes'].includes(key)) {
        if (value && !(key === 'depends_on' && /^\[\s*db\s*\]$/.test(value))) return issue();
        services[service][key] = value ? ['db'] : []; list = key;
      } else { if (!value) return issue(); const parsed = scalar(value); if(parsed===null)return issue(); services[service][key] = parsed; list = ''; }
      continue;
    }
    if (list==='environment') {
      const environment = line.match(/^      POSTGRES_PASSWORD: (.+)$/);
      if (!environment || Object.hasOwn(services[service].environment,'POSTGRES_PASSWORD')) return issue();
      const password=scalar(environment[1]);
      if(!password || password.length>256)return issue();
      services[service].environment.POSTGRES_PASSWORD=password; continue;
    }
    const item = line.match(/^      - (.+)$/);
    if (!item || !list) return issue();
    const parsed = scalar(item[1]); if(parsed===null)return issue();
    services[service][list].push(parsed);
  }
  const web = services.web;
  if (!web || web.build !== '.' || web.image || web.volumes || web.environment || web.ports?.length !== 1) return issue();
  const port = web.ports[0].match(/^(\d+):80$/);
  if (!port || !integer(Number(port[1]),1,65535)) return fail('compose.yaml: web ports ต้องเป็น HOST:80 โดย HOST อยู่ระหว่าง 1–65535');
  if (web.depends_on && (web.depends_on.length !== 1 || web.depends_on[0] !== 'db' || !services.db)) return issue();
  const db = services.db;
  let mount = null;
  if (db) {
    if (db.image !== 'postgres:16-alpine' || db.build || db.ports || db.depends_on || (db.volumes && db.volumes.length !== 1)) return issue();
    if (db.environment && !db.environment.POSTGRES_PASSWORD) return issue();
    if (db.volumes) { mount = parseMount(db.volumes[0],true); if (!mount || !volumes.includes(mount.volume)) return issue(); }
  }
  if (volumes.some((name) => name !== mount?.volume)) return issue();
  return {ok:true, port:Number(port[1]), db:Boolean(db), mount};
}

function containerFile(vm, container, path) {
  const mount = (container.mounts || []).find((item) => path.startsWith(`${item.target}/`));
  if (mount) { vm.volumeData ??= {}; vm.volumeData[mount.volume] ??= {}; return {files:vm.volumeData[mount.volume], key:path.slice(mount.target.length)}; }
  container.files ??= {};
  return {files:container.files, key:path};
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
    if ((first === 'images' && rest.length) || (first === 'image' && rest.length !== 1)) return fail('Usage ใน Lab: docker images');
    const rows = Object.values(vm.images).map((image) => `${image.tag.padEnd(20)} ${image.id.padEnd(18)} just now`);
    return { ok: true, output: `REPOSITORY:TAG       IMAGE ID           CREATED\n${rows.join('\n') || '(ไม่มี image ที่ build แล้ว)'}` };
  }
  if (first === 'ps' || (first === 'container' && rest[0] === 'ls')) {
    const flags = first === 'container' ? rest.slice(1) : rest;
    if (flags.length > 1 || flags.some((flag)=>!['-a','--all'].includes(flag))) return fail('Usage ใน Lab: docker ps [-a]');
    const all = rest.includes('-a') || rest.includes('--all');
    const rows = Object.values(vm.containers).filter((container) => all || container.status === 'running')
      .map((container) => `${container.id.padEnd(14)} ${container.tag.padEnd(19)} ${container.status.padEnd(8)} ${container.status === 'running' && container.hostPort !== null ? `0.0.0.0:${container.hostPort}->${container.containerPort}/tcp` : '-'.padEnd(22)} ${container.name}`);
    return { ok: true, output: `CONTAINER ID   IMAGE               STATUS   PORTS                  NAMES\n${rows.join('\n') || '(ไม่มี container ที่แสดง)'}` };
  }
  if (first === 'build') {
    const tagIndex = rest.findIndex((word) => word === '-t' || word === '--tag');
    const tag = tagIndex >= 0 ? rest[tagIndex + 1] : null;
    if (!tag || rest.length !== 3 || tagIndex !== 0 || rest.at(-1) !== '.') return { ok: false, output: 'Usage ใน Lab: docker build -t my-site:1.0 .' };
    if (vm.cwd !== PROJECT) return { ok: false, output: 'ERROR: ไม่พบ Dockerfile ในโฟลเดอร์ปัจจุบัน ใช้ cd ~/project' };
    return makeImage(vm, tag);
  }
  if (first === 'run') {
    let name = null, port = null, tag = null, detached = false, mount = null;
    for (let index = 0; index < rest.length; index++) {
      const arg = rest[index];
      if (arg === '-d' && !detached) detached = true;
      else if (arg === '--name' && !name) name = rest[++index];
      else if (arg === '-p' && port === null) {
        const match = rest[++index]?.match(/^(\d+):80$/);
        if (!match || !integer(Number(match[1]),1,65535)) return fail('พอร์ตต้องเป็น HOST:80 โดย HOST อยู่ระหว่าง 1–65535');
        port = Number(match[1]);
      } else if (arg === '-v' && !mount) {
        mount = parseMount(rest[++index]); if (!mount || mount.target !== '/data') return fail('Lab รองรับ named volume เท่านั้น: -v NAME:/data (ไม่รองรับ bind mount/flags อื่น)');
      } else if (index === rest.length - 1 && !arg.startsWith('-')) tag = arg;
      else return fail('ตัวเลือก docker run นี้ยังไม่รองรับในตัวจำลอง');
    }
    if (!name || port === null || !tag || !detached) return fail('Usage ใน Lab: docker run -d --name web -p 8080:80 [-v data:/data] my-site:1.0');
    if (tag === 'postgres:16-alpine') return fail('DB จำลองรองรับผ่าน Compose เท่านั้น ไม่มี SQL engine');
    return makeContainer(vm, name, tag, port, false, {mounts:mount ? [mount] : []});
  }
  if (first === 'logs') {
    if(rest.length !== 1) return fail('Usage ใน Lab: docker logs NAME (ไม่รองรับ streaming flags)');
    const name = rest.at(-1); const container = Object.hasOwn(vm.containers,name || '') ? vm.containers[name] : null;
    if (!container) return { ok: false, output: `Error: No such container: ${name || '(ว่าง)'}` };
    if (name === 'web') mark(vm, 'logs');
    return { ok: true, output: container.logs.join('\n') };
  }
  if (first === 'exec') {
    const args = rest[0] === '-it' ? rest.slice(1) : rest;
    const [name, action, ...parameters] = args;
    const container = Object.hasOwn(vm.containers,name || '') ? vm.containers[name] : null;
    if (!container || container.status !== 'running') return fail(`Error: container ${name || '(ว่าง)'} is not running`);
    if (action === 'sh' && parameters.length === 0) { vm.shell = name; return { ok: true, output: `Opened shell in ${name}. พิมพ์ exit เพื่อกลับ VM` }; }
    if (['cat','getent','nc'].includes(action)) return executeContainerAction(vm,container,[action,...parameters]);
    return fail('Usage ใน Lab: docker exec -it NAME sh | docker exec NAME cat PATH | docker exec NAME getent hosts db | docker exec NAME nc -z db 5432');
  }
  if (first === 'inspect' || first === 'top' || first === 'port') {
    if(rest.length !== 1 || !nameOK(rest[0])) return fail('Usage ใน Lab: docker '+first+' NAME');
    const name = rest[0]; const container = Object.hasOwn(vm.containers,name || '') ? vm.containers[name] : null;
    if (!container) return { ok: false, output: `Error: No such container: ${name || '(ว่าง)'}` };
    if (first === 'port') return { ok: true, output: container.hostPort === null ? '(ไม่มี published host port)' : `${container.containerPort}/tcp -> 0.0.0.0:${container.hostPort}` };
    if (first === 'top') return container.status === 'running' ? { ok: true, output: container.containerPort===5432?'UID   PID   CMD\npostgres  1  postgres (TCP model only)':'UID   PID   CMD\nroot  1     nginx: master process\nnginx 7    nginx: worker process' } : { ok: false, output: `Error: container ${name} is not running` };
    return { ok: true, output: JSON.stringify({ Id: container.id, Name: `/${name}`, Image: container.tag, State: { Status: container.status, Running: container.status === 'running' }, Mounts: (container.mounts || []).map((mount)=>({Type:'volume',Name:mount.volume,Destination:mount.target})), NetworkSettings: { Networks: container.network ? {[container.network]:{Aliases:[container.service]}} : {}, Ports: { [`${container.containerPort}/tcp`]: container.hostPort === null ? null : [{ HostPort: String(container.hostPort) }] } } }, null, 2) };
  }
  if (first === 'stop' || first === 'start' || first === 'rm') {
    if(rest.length !== 1 || !nameOK(rest[0])) return fail('Usage ใน Lab: docker '+first+' NAME');
    const name = rest[0]; const container = Object.hasOwn(vm.containers,name || '') ? vm.containers[name] : null;
    if (!container) return { ok: false, output: `Error: No such container: ${name || '(ว่าง)'}` };
    if (first === 'stop') { if (container.status === 'exited') return { ok: false, output: `${name} is already stopped` }; container.status = 'exited'; container.logs.push(container.containerPort===5432?'database TCP model stopped':'nginx: graceful shutdown complete'); if (name === 'web') mark(vm, 'stop'); }
    if (first === 'start') { if (container.status === 'running') return { ok: false, output: `${name} is already running` }; if (container.hostPort !== null && publicPortTaken(vm, container.hostPort)) return { ok: false, output: `port ${container.hostPort} is already allocated` }; container.status = 'running'; container.logs.push(container.containerPort===5432?'database TCP model ready':'nginx: configuration complete; ready for start up'); }
    if (first === 'rm') { if (container.status === 'running') return { ok: false, output: `Error: You cannot remove a running container ${name}. Stop it first.` }; delete vm.containers[name]; }
    return { ok: true, output: name };
  }
  if (first === 'volume') {
    if (rest[0] === 'ls' && rest.length === 1) return { ok: true, output: `DRIVER    VOLUME NAME\n${vm.volumes.map((volume) => `local     ${volume}`).join('\n') || '(ไม่มี volume)'}` };
    const name = rest[1];
    if (!nameOK(name) || rest.length !== 2) return fail('Usage ใน Lab: docker volume create NAME | ls | inspect NAME | rm NAME');
    if (rest[0] === 'create') {
      if (!vm.volumes.includes(name) && vm.volumes.length >= 40) return fail('Lab รองรับ volume สูงสุด 40 รายการ');
      if (!vm.volumes.includes(name)) vm.volumes.push(name);
      vm.volumeData ??= {}; vm.volumeData[name] ??= {};
      return {ok:true,output:name};
    }
    if (!vm.volumes.includes(name)) return fail(`Error: no such volume: ${name}`);
    if (rest[0] === 'inspect') return {ok:true,output:JSON.stringify({Name:name,Driver:'local',Files:Object.keys(vm.volumeData?.[name] || {}).length},null,2)};
    if (rest[0] === 'rm') {
      if (Object.values(vm.containers).some((container)=>(container.mounts || []).some((mount)=>mount.volume===name))) return fail(`Error: volume ${name} is in use (รวม container ที่หยุดแล้ว)`);
      vm.volumes = vm.volumes.filter((volume)=>volume!==name); if(vm.volumeData) delete vm.volumeData[name];
      return {ok:true,output:name};
    }
    return fail('คำสั่ง volume นี้ยังไม่รองรับ');
  }
  if (first === 'compose') {
    const command = rest[0];
    if (!Object.hasOwn(vm.files,`${PROJECT}/compose.yaml`) || vm.cwd !== PROJECT) return fail('no configuration file provided: not found (เข้า ~/project ก่อน)');
    if (command === 'up') {
      if (rest.length !== 3 || !rest.includes('-d') || !rest.includes('--build')) return fail('Usage ใน Lab: docker compose up -d --build');
      const config = composeConfig(vm.files[`${PROJECT}/compose.yaml`]); if (!config.ok) return config;
      const owned = ['project-web-1','project-db-1'].filter((name)=>vm.containers[name]?.compose);
      for (const name of ['project-web-1',...(config.db ? ['project-db-1'] : [])]) if (vm.containers[name] && !owned.includes(name)) return fail(`container name ${name} is already in use`);
      if (Object.values(vm.containers).some((item)=>item.status==='running' && item.hostPort===config.port && !owned.includes(item.name))) return fail(`port ${config.port} is already allocated. หยุด container ที่ใช้พอร์ตนี้ก่อน`);
      if (Object.keys(vm.containers).length - owned.length + (config.db ? 2 : 1) > 40) return fail('Lab รองรับ container สูงสุด 40 รายการ');
      if (config.mount && !vm.volumes.includes(config.mount.volume) && vm.volumes.length >= 40) return fail('Lab รองรับ volume สูงสุด 40 รายการ');
      const built = makeImage(vm,'project-web:latest'); if (!built.ok) return built;
      for (const name of owned) delete vm.containers[name];
      makeContainer(vm,'project-web-1','project-web:latest',config.port,true,{service:'web'});
      if (config.db) makeContainer(vm,'project-db-1','postgres:16-alpine',null,true,{service:'db',mounts:config.mount?[config.mount]:[]});
      if (vm.shell && !vm.containers[vm.shell]) vm.shell=null;
      return {ok:true,output:`[+] Running (จำลอง)\n ✔ Network project_default  Created\n ✔ Container project-web-1  Started${config.db ? '\n ✔ Container project-db-1  Started (TCP/DNS model; ไม่รัน SQL หรือ auth)' : ''}\nRebuilt image + recreated service containers จาก compose.yaml`};
    }
    const containers = Object.values(vm.containers).filter((container)=>container.compose);
    if (command === 'ps' && rest.length === 1) return {ok:true,output:'NAME              IMAGE                  STATUS    PORTS\n'+(containers.map((c)=>`${c.name}  ${c.tag}  ${c.status}  ${c.hostPort === null ? '(internal only)' : `0.0.0.0:${c.hostPort}->${c.containerPort}/tcp`}`).join('\n') || '(ไม่มี service)')};
    if (command === 'logs' && rest.length <= 2) {
      const selected = rest[1] ? containers.filter((c)=>c.service===rest[1] || (!c.service && rest[1]==='web')) : containers;
      return selected.length ? {ok:true,output:selected.map((c)=>`${c.name} | ${c.logs.join('\n')}`).join('\n')} : fail('no container for service');
    }
    if (command === 'down' && (rest.length === 1 || (rest.length === 2 && ['-v','--volumes'].includes(rest[1])))) {
      const mounted = containers.flatMap((c)=>(c.mounts || []).map((mount)=>mount.volume));
      for (const container of containers) delete vm.containers[container.name];
      if (rest.length === 2) for(const name of mounted) {
        if (!Object.values(vm.containers).some((c)=>(c.mounts || []).some((mount)=>mount.volume===name))) {
          vm.volumes = vm.volumes.filter((volume)=>volume!==name); if(vm.volumeData)delete vm.volumeData[name];
        }
      }
      if(vm.shell && !vm.containers[vm.shell])vm.shell=null;
      return {ok:true,output:'[+] Running (จำลอง)\n ✔ Containers project-web-1 / project-db-1  Removed\n ✔ Network project_default  Removed'+(rest.length===2?'\n ✔ Unused Compose volumes Removed':'\nNamed volumes retained')};
    }
    return fail('Usage ใน Lab: docker compose up -d --build | ps | logs [web|db] | down [-v]');
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
  if (first === 'touch') { const path = normalize(vm.cwd, rest[0] || ''); if (!absolutePath(path) || !path.startsWith(`${PROJECT}/`) || !rest[0] || rest.length !== 1 || (!(path in vm.files) && Object.keys(vm.files).length >= 200)) return { ok: false, output: 'touch: สร้างไฟล์ได้เฉพาะใน ~/project' }; if (!(path in vm.files)) vm.files[path] = ''; return { ok: true, output: '' }; }
  if (first === 'mkdir') { const path = normalize(vm.cwd, rest[0] || ''); if (!absolutePath(path) || !path.startsWith(`${PROJECT}/`) || !rest[0] || rest.length !== 1 || vm.dirs.length >= 200) return { ok: false, output: 'mkdir: สร้างโฟลเดอร์ได้เฉพาะใน ~/project' }; if (vm.dirs.includes(path)) return { ok: false, output: `mkdir: cannot create directory '${rest[0]}': File exists` }; vm.dirs.push(path); return { ok: true, output: '' }; }
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

function executeContainerAction(vm, container, words) {
  const [first,...rest] = words;
  if (first === 'help') return {ok:true,output:'ใน container จำลอง: pwd | ls [/data] | cat PATH | echo "text" > /data/note.txt | getent hosts db | nc -z db 5432 | whoami | ps | exit\nDB เป็น TCP/DNS model เท่านั้น ไม่มี PostgreSQL/SQL จริง; รองรับไฟล์ใน /data และ /var/lib/postgresql/data'};
  if (first === 'pwd' && !rest.length) return {ok:true,output:'/'};
  if (first === 'whoami' && !rest.length) return {ok:true,output:'root (เฉพาะใน container จำลอง)'};
  if (first === 'ps' && !rest.length) return {ok:true,output:container.containerPort===5432?'PID   CMD\n1     postgres (TCP model only)':'PID   CMD\n1     nginx: master process\n7     nginx: worker process'};
  if (first === 'ls') {
    if (!rest.length) return {ok:true,output:'data/    usr/'};
    if (rest.length !== 1) return fail('Usage: ls /data');
    if (rest[0] === '/usr/share/nginx/html' && container.containerPort===80) return {ok:true,output:'index.html'};
    if (['/data','/var/lib/postgresql/data'].includes(rest[0])) {
      const store=containerFile(vm,container,`${rest[0]}/placeholder`);
      const prefix=store.key.slice(0,store.key.lastIndexOf('/')+1);
      return {ok:true,output:Object.keys(store.files).filter((path)=>path.startsWith(prefix)).map((path)=>path.slice(prefix.length)).join('    ') || '(ว่าง)'};
    }
  }
  if (first === 'cat' && rest.length===1) {
    if(rest[0]==='/usr/share/nginx/html/index.html' && container.containerPort===80)return {ok:true,output:container.html};
    if (/^\/(?:data|var\/lib\/postgresql\/data)\/[a-zA-Z0-9_.-]+$/.test(rest[0])) {
      const {files,key}=containerFile(vm,container,rest[0]);
      return Object.hasOwn(files,key)?{ok:true,output:files[key]}:fail(`cat: ${rest[0]}: No such file`);
    }
  }
  if (first === 'echo') {
    const redirect=rest.indexOf('>');
    const path=rest.at(-1);
    if (redirect < 0 || redirect !== rest.length-2 || !/^\/(?:data|var\/lib\/postgresql\/data)\/[a-zA-Z0-9_.-]+$/.test(path)) return fail('Usage ใน Lab: echo "text" > /data/note.txt (รองรับ > เท่านั้น ไม่รองรับ >>/pipes)');
    const {files,key}=containerFile(vm,container,path);
    if (!Object.hasOwn(files,key) && Object.keys(files).length>=200) return fail('Lab รองรับไฟล์สูงสุด 200 รายการต่อพื้นที่จัดเก็บ');
    files[key]=rest.slice(0,redirect).join(' ')+'\n';
    return {ok:true,output:''};
  }
  if (first === 'getent' || first === 'nc') {
    const dns = first==='getent' && rest.length===2 && rest[0]==='hosts';
    const tcp = first==='nc' && rest.length===3 && rest[0]==='-z';
    if(!dns && !tcp)return fail('Usage: getent hosts db | nc -z db 5432 (DNS/TCP จำลองเฉพาะ Compose network)');
    const hostname=rest[1];
    const local = ['localhost','127.0.0.1'].includes(hostname);
    const target=local ? container : Object.values(vm.containers).find((item)=>item.service===hostname && item.network===container.network && item.status==='running');
    if((!local && !container.network) || !target)return fail(`DNS: ${hostname}: Name or service not known (ต้องอยู่ Compose network เดียวกัน)`);
    if(tcp && Number(rest[2])!==target.containerPort)return fail(`nc: ${hostname}:${rest[2]} Connection refused`);
    return {ok:true,output:dns?`${local ? '127.0.0.1' : `172.20.0.${target.service==='web'?2:3}`}  ${hostname} (DNS จำลอง)`:`Connection to ${hostname} ${target.containerPort} port [tcp] succeeded (จำลอง; ไม่มี SQL engine)`};
  }
  return fail(`${first}: คำสั่งนี้ยังไม่อยู่ใน container shell จำลอง พิมพ์ help`);
}
function executeContainerShell(vm, words) {
  const container = vm.containers[vm.shell];
  if (!container || container.status !== 'running') { vm.shell = null; return fail('container หยุดทำงานแล้ว กลับสู่ VM'); }
  if (words[0] === 'exit' && words.length===1) { vm.shell=null;return {ok:true,output:'exit'}; }
  return executeContainerAction(vm,container,words);
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
  for (const container of Object.values(vm.containers)) container.logs = container.logs.slice(-100);
  vm.history = vm.history.slice(-100);
  for (const entry of vm.history) if (entry.text.length > 50000) entry.text = entry.text.slice(0,50000);
  return result;
}
