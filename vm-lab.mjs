import { tasks } from './learning-flow.mjs?v=20261010-learning2';
import { VM_STORAGE_KEY, PROJECT, MISSIONS, createVM, validVM, prompt, listFiles, validateDockerfile, saveFile, runVMCommand } from './vm-engine.mjs?v=20261009-complete';

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const safeStore = () => { try { const stored = JSON.parse(localStorage.getItem(VM_STORAGE_KEY)); return validVM(stored) ? stored : createVM(); } catch { return createVM(); } };
let vm = safeStore();
export function getVMState() { return vm; }
let selectedFile = `${PROJECT}/Dockerfile`;
let activeTab = 'files';
let previewPort = 8080;
let notice = '';
let commandDraft = '';
let historyIndex = -1;
const hintLevels = {};
const missionHints = {
 inspect: ['เริ่มจากดูว่าโฟลเดอร์นี้มีไฟล์อะไร', 'ใช้คำสั่ง Linux สำหรับแสดงรายการไฟล์'],
 edit: ['Image ต้องมีทั้ง base image และไฟล์เว็บ', 'เขียน FROM nginx:alpine แล้ว COPY index.html /usr/share/nginx/html/index.html'],
 build: ['ตรวจ Dockerfile ให้พร้อมก่อน แล้วสร้าง image ที่มี tag', 'จุดท้ายคำสั่งหมายถึง build context ปัจจุบัน'],
 run: ['ต้องมี image ก่อน และชื่อ container ต้องไม่ซ้ำ', 'เชื่อม host port 8080 กับ port 80 ใน container'],
 request: ['ตรวจว่า container ยัง running และ publish port แล้ว', 'เรียกเว็บจาก host ด้วย localhost:8080'],
 logs: ['ดู output ของ container ที่เพิ่งรับ request', 'ใช้ชื่อ container web กับคำสั่งอ่าน logs'],
 stop: ['หยุด process โดยยังเก็บ container ไว้', 'ใช้คำสั่ง stop ตามด้วยชื่อ container'],
};

function persist() { try { localStorage.setItem(VM_STORAGE_KEY, JSON.stringify(vm)); } catch { notice = 'พื้นที่เก็บข้อมูลเบราว์เซอร์ไม่พร้อม สถานะจะอยู่เฉพาะจนกว่าจะปิดหน้านี้'; } }
function basename(path) { return path.slice(path.lastIndexOf('/') + 1); }
function statusBadge(container) { return `<span class="vm-state-pill ${container.status === 'running' ? 'is-running' : 'is-stopped'}">${container.status === 'running' ? '● running' : '● exited'}</span>`; }

function terminalRows() {
  return vm.history.map((item) => {
    if (item.kind === 'command') return `<div class="vm-command"><span>${escapeHTML(item.prompt)}</span> ${escapeHTML(item.text)}</div>`;
    return `<pre class="vm-output ${item.kind === 'error' ? 'vm-error' : item.kind === 'system' ? 'vm-system' : ''}">${escapeHTML(item.text)}</pre>`;
  }).join('');
}

function filesPanel() {
  const files = listFiles(vm);
  if (!(selectedFile in vm.files)) selectedFile = `${PROJECT}/Dockerfile`;
  const name = basename(selectedFile);
  const issue = name === 'Dockerfile' ? validateDockerfile(vm) : null;
  return `<div class="vm-files-panel"><div class="vm-file-list" aria-label="ไฟล์ในโปรเจกต์"><div class="vm-file-list-label">~/project</div>${files.map((file) => `<button type="button" data-vm-file="${escapeHTML(`${PROJECT}/${file}`)}" class="${selectedFile === `${PROJECT}/${file}` ? 'selected' : ''}"><span>▤</span>${escapeHTML(file)}</button>`).join('')}</div><div class="vm-editor"><div class="vm-editor-head"><span>${escapeHTML(name)}</span><span>${name === 'Dockerfile' ? (issue ? 'ยังไม่พร้อม build' : 'พร้อม build ✓') : 'แก้ไขได้'}</span></div><label class="sr-only" for="vm-editor-input">เนื้อหาไฟล์ ${escapeHTML(name)}</label><textarea id="vm-editor-input" maxlength="10000" spellcheck="false">${escapeHTML(vm.files[selectedFile] ?? '')}</textarea><div class="vm-editor-foot"><span>${name === 'Dockerfile' ? (issue || 'Dockerfile ถูกต้องสำหรับ Lab นี้') : 'บันทึกอัตโนมัติเมื่อพิมพ์ · สูงสุด 10 KB'}</span><button type="button" id="vm-save-file">บันทึกไฟล์</button></div></div></div>`;
}

function dockerPanel() {
  const images = Object.values(vm.images);
  const containers = Object.values(vm.containers);
  return `<div class="vm-docker-panel"><div class="vm-state-section"><h3>Images <span>${images.length}</span></h3>${images.length ? images.map((image) => `<div class="vm-state-item"><span class="vm-state-icon">▤</span><div><strong>${escapeHTML(image.tag)}</strong><small>${escapeHTML(image.id)}</small></div></div>`).join('') : '<p>ยังไม่มี image · ลอง docker build</p>'}</div><div class="vm-state-section"><h3>Containers <span>${containers.length}</span></h3>${containers.length ? containers.map((container) => `<div class="vm-state-item"><span class="vm-state-icon">▣</span><div><strong>${escapeHTML(container.name)} ${statusBadge(container)}</strong><small>${escapeHTML(container.tag)} · ${container.hostPort === null ? 'internal only' : container.hostPort} → ${container.containerPort ?? 80}</small></div></div>`).join('') : '<p>ยังไม่มี container · ลอง docker run</p>'}</div><div class="vm-state-section"><h3>Volumes <span>${vm.volumes.length}</span></h3>${vm.volumes.length ? vm.volumes.map((volume) => `<div class="vm-state-item"><span class="vm-state-icon">◫</span><div><strong>${escapeHTML(volume)}</strong><small>local · จำลอง</small></div></div>`).join('') : '<p>ยังไม่มี volume · ลอง docker volume create data</p>'}</div></div>`;
}

function previewPanel() {
  const container = Object.values(vm.containers).find((item) => item.status === 'running' && item.hostPort === previewPort);
  return `<div class="vm-preview-panel"><div class="vm-preview-address"><span>◉</span><label for="vm-preview-port">Host port</label><select id="vm-preview-port">${[...new Set([previewPort, ...Object.values(vm.containers).filter(c => c.status === 'running' && Number.isInteger(c.hostPort)).map(c => c.hostPort)])].map(port => `<option value="${port}" ${port === previewPort ? 'selected' : ''}>localhost:${port}</option>`).join('')}</select><small>พรีวิวจำลอง</small></div>${container ? '<iframe id="vm-preview-frame" title="พรีวิวเว็บจาก container จำลอง" sandbox="" referrerpolicy="no-referrer"></iframe>' : '<div class="vm-preview-offline"><span>○</span><strong>ยังเชื่อมต่อไม่ได้</strong><p>เลือก port ของ container ที่กำลังทำงาน หรือเริ่ม container ใหม่แล้วเลือก port ที่นี่</p><code>docker run -d --name web -p 8080:80 my-site:1.0</code></div>'}</div>`;
}

function missionsPanel() {
  const done = vm.achievements.filter((id) => MISSIONS.some((mission) => mission.id === id)).length;
  return `<div class="vm-mission-top"><span>MISSION TRACKER</span><strong>${done} / ${MISSIONS.length}</strong></div><h2>ภารกิจแรกของคุณ</h2><p>ทำตามลำดับเพื่อพาเว็บหนึ่งหน้าเข้า container และตรวจว่าใช้งานได้</p><div class="vm-mission-progress"><span style="width:${(done / MISSIONS.length) * 100}%"></span></div><ol class="vm-mission-list">${MISSIONS.map((mission, index) => `<li class="${vm.achievements.includes(mission.id) ? 'done' : ''}"><div class="vm-mission-index">${vm.achievements.includes(mission.id) ? '✓' : String(index + 1).padStart(2, '0')}</div><div><strong>${mission.title}</strong><small>${mission.detail}</small><button type="button" data-mission-hint="${mission.id}">คำใบ้ ${hintLevels[mission.id] || 0}/3</button>${hintLevels[mission.id] ? `<p class="vm-hint-text">${escapeHTML(hintLevels[mission.id] < 3 ? missionHints[mission.id][hintLevels[mission.id]-1] : mission.hint)}</p>` : ''}${hintLevels[mission.id] === 3 ? `<button type="button" data-vm-hint="${escapeHTML(mission.hint)}">ใส่คำสั่ง ↗</button>` : ''}</div></li>`).join('')}</ol><button type="button" class="vm-check" id="vm-check">ตรวจงานปัจจุบัน ✓</button><div class="vm-mission-tip"><b>ลองต่อเอง</b><p>หลังทำครบ ลอง <code>docker ps -a</code>, <code>docker start web</code>, <code>docker volume create data</code> หรือ <code>docker compose up -d --build</code></p></div>`;
}

function flowPanel() {
  const containers = Object.values(vm.containers);
  const running = containers.filter(c => c.status === 'running');
  const built = Object.keys(vm.images).length;
  return `<section class="vm-flow" aria-label="Diagram สถานะ Docker ปัจจุบัน"><div class="vm-flow-heading"><h2>สิ่งที่เกิดขึ้นในเครื่องจำลอง</h2><span>เปลี่ยนตามคำสั่งที่คุณรัน</span></div><div class="vm-flow-track"><div class="vm-flow-node"><small>RECIPE</small><strong>Dockerfile</strong><span>${validateDockerfile(vm) ? 'รอเขียน FROM + COPY' : 'พร้อม Build'}</span></div><span class="vm-flow-arrow" aria-hidden="true">→ build →</span><div class="vm-flow-node ${built ? 'is-ready' : ''}"><small>PACKAGE</small><strong>Image</strong><span>${built} image · snapshot ตอน Build</span></div><span class="vm-flow-arrow" aria-hidden="true">→ run →</span><div class="vm-flow-node ${running.length ? 'is-ready' : ''}"><small>PROCESS</small><strong>Container</strong><span>${running.length} running / ${containers.length} ทั้งหมด</span></div></div><div class="vm-flow-ports">${running.length ? running.map(c => c.hostPort === null ? `<p>Compose network → <strong>${escapeHTML(c.service || c.name)}</strong> <code>:${c.containerPort}</code> · ภายใน network เท่านั้น</p>` : `<p>Browser / curl <span aria-hidden="true">→</span> Host <code>:${c.hostPort}</code> <span aria-hidden="true">→</span> <strong>${escapeHTML(c.name)}</strong> <code>:${c.containerPort ?? 80}</code></p>`).join('') : '<p>ยังไม่มี container ทำงาน · เริ่ม container แล้วเส้นทาง Port จะแสดงที่นี่</p>'}</div>${containers.some(c => c.mounts?.length) ? `<div class="vm-flow-ports">${containers.flatMap(c => (c.mounts || []).map(m => `<p><strong>${escapeHTML(c.name)}</strong> <code>${escapeHTML(m.target)}</code> ↔ Volume <strong>${escapeHTML(m.volume)}</strong> · อายุแยกจาก container</p>`)).join('')}</div>` : ''}<p class="vm-flow-caption">ไฟล์ที่แก้หลัง Build จะยังไม่เปลี่ยน image หรือ container เดิม ต้อง Build และสร้าง container ใหม่</p></section>`;
}
function checkWork() {
  const web = vm.containers.web;
  const checks = [
    [!validateDockerfile(vm), 'Dockerfile มี FROM และ COPY ที่ Lab รองรับ'],
    [!!vm.images['my-site:1.0'], 'สร้าง image my-site:1.0'],
    [!!web && web.tag === 'my-site:1.0', 'สร้าง container web จาก image ของคุณ'],
    [web?.status === 'running' && web?.hostPort === 8080, 'web กำลังทำงานที่ host port 8080'],
    [!!web?.logs.some(line => line.includes('GET /')), 'ส่ง request ถึง web แล้ว'],
  ];
  return 'ตรวจสถานะปัจจุบัน (เครื่องหมายในภารกิจคือสิ่งที่เคยทำสำเร็จ)\n' + checks.map(([ok, text]) => `${ok ? '✓' : '○'} ${text}`).join('\n');
}
function extraPractice() {
  return `<section class="vm-extra"><h2>ฝึกต่อ: ข้อมูลและหลาย Service</h2><p>เปิดคำสั่งด้านล่างทีละขั้น คำสั่งจะถูกใส่ใน Terminal ให้ตรวจแล้วกด Enter เอง</p><details><summary>เปรียบเทียบ Writable layer กับ Named volume</summary><p>เริ่มแบบไม่ mount ก่อน เขียนข้อความใน /data ลบ container แล้วสร้างใหม่ ข้อความจะหาย จากนั้นลองชุดคำสั่งที่มี -v เพื่อให้ข้อมูลอยู่ต่อ</p>${['docker run -d --name scratch -p 8081:80 nginx:alpine','docker exec -it scratch sh','echo "my note" > /data/note.txt','cat /data/note.txt','exit','docker stop scratch','docker rm scratch','docker run -d --name scratch -p 8081:80 nginx:alpine','docker exec -it scratch sh','cat /data/note.txt','exit','docker volume create notes','docker run -d --name saved -p 8082:80 -v notes:/data nginx:alpine','docker exec -it saved sh','echo "keep me" > /data/note.txt','exit','docker stop saved','docker rm saved','docker run -d --name saved -p 8082:80 -v notes:/data nginx:alpine','docker exec -it saved sh','cat /data/note.txt','exit'].map(cmd => `<button type="button" data-vm-hint="${escapeHTML(cmd)}"><code>${escapeHTML(cmd)}</code></button>`).join('')}</details><details><summary>สร้าง Web + Database ด้วย Compose</summary><p>แก้ compose.yaml ตามตัวอย่างนี้ก่อน และหยุด web เดิมถ้าใช้ port 8080 อยู่ ฐานข้อมูลเป็นสถานะจำลองเพื่อฝึก network ไม่รองรับ SQL จริง</p><pre>services:
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
  db-data: {}</pre>${['docker stop web','docker compose up -d --build','docker compose ps','docker exec -it project-web-1 sh','getent hosts db','nc -z db 5432','exit','docker compose down'].map(cmd => `<button type="button" data-vm-hint="${escapeHTML(cmd)}"><code>${escapeHTML(cmd)}</code></button>`).join('')}<p>localhost ใน container ชี้กลับมาที่ container เดิม ส่วน db คือชื่อ service บน network เดียวกัน รหัส demo-only ใช้ฝึกเท่านั้น</p></details></section>`;
}

function template() {
  const running = Object.values(vm.containers).filter((container) => container.status === 'running').length;
  return `<div class="vm-page"><div class="vm-breadcrumb"><a href="#home">หน้าแรก</a><span>/</span><span>VM Lab</span></div><div class="vm-intro"><div><span class="vm-kicker">PRACTICE ENVIRONMENT · BROWSER SIMULATION</span><h1>VM Lab<span>.</span></h1><p>ฝึก Linux และ Docker ในเครื่องจำลองที่จำสถานะของไฟล์ image และ container ไว้ในเบราว์เซอร์ ลองผิดแล้วเริ่มใหม่ได้</p></div><button type="button" class="vm-reset" id="vm-reset">↻ รีเซ็ต VM</button></div><div class="vm-disclosure"><strong>นี่คือเครื่องจำลอง</strong><span>คำสั่งทำงานกับโมเดลในเบราว์เซอร์ ไม่ได้รัน Linux VM หรือ Docker Engine จริง และไม่เชื่อมต่อเครื่องของคุณ</span></div>${flowPanel()}<div class="vm-layout"><div class="vm-work"><section class="vm-terminal-card" aria-label="Terminal เครื่องจำลอง"><div class="vm-terminal-head"><div class="vm-window-dots"><i></i><i></i><i></i></div><span>student@docker-lab: ~/project</span><div class="vm-vm-status"><i></i> VM READY</div></div><div class="vm-terminal-history" id="vm-terminal-history" role="log" aria-live="polite">${terminalRows()}</div><form id="vm-terminal-form" class="vm-terminal-form" autocomplete="off"><label for="vm-command">${escapeHTML(prompt(vm))}</label><input id="vm-command" name="command" spellcheck="false" aria-label="พิมพ์คำสั่งใน VM" placeholder="พิมพ์คำสั่งแล้วกด Enter" value="${escapeHTML(commandDraft)}"/><button type="submit" aria-label="รันคำสั่ง">↵</button></form></section><div class="vm-quick"><span>ลองพิมพ์</span>${['ls','cat Dockerfile','docker images','docker ps -a'].map((cmd) => `<button type="button" data-vm-hint="${escapeHTML(cmd)}">${escapeHTML(cmd)}</button>`).join('')}</div><section class="vm-workbench"><div class="vm-workbench-top"><div class="vm-tabs" role="tablist" aria-label="เครื่องมือ VM"><button type="button" role="tab" aria-selected="${activeTab === 'files'}" data-vm-tab="files" class="${activeTab === 'files' ? 'active' : ''}">ไฟล์และตัวแก้ไข</button><button type="button" role="tab" aria-selected="${activeTab === 'docker'}" data-vm-tab="docker" class="${activeTab === 'docker' ? 'active' : ''}">Docker state</button><button type="button" role="tab" aria-selected="${activeTab === 'preview'}" data-vm-tab="preview" class="${activeTab === 'preview' ? 'active' : ''}">พรีวิวเว็บ</button></div><span>${Object.keys(vm.images).length} images · ${running} running</span></div>${activeTab === 'files' ? filesPanel() : activeTab === 'docker' ? dockerPanel() : previewPanel()}</section>${extraPractice()}${notice ? `<div class="vm-notice" role="status">${escapeHTML(notice)}</div>` : ''}</div><aside class="vm-missions" aria-label="ภารกิจใน VM">${missionsPanel()}</aside></div><div class="vm-help"><div><strong>ฝึกเพิ่มจากเอกสารทางการ</strong><p>Lab นี้จำลองเฉพาะคำสั่งที่ระบุไว้ คำสั่ง Docker จริงมีตัวเลือกและพฤติกรรมมากกว่านี้</p></div><a href="https://docs.docker.com/get-started/" target="_blank" rel="noopener noreferrer">Docker Docs ↗</a></div></div>`;
}

export function renderVMLab(main) {
  main.innerHTML = template();
  const from = new URLSearchParams(location.hash.split('?')[1] || '').get('lesson');
  if(Object.hasOwn(tasks,from)) main.insertAdjacentHTML('afterbegin', `<section class="learning-bridge"><a href="#${from}">← กลับไปตรวจโจทย์บทนี้</a><p>${tasks[from].goal}</p></section>`);
  const root = main.querySelector('.vm-page');
  const preview = root.querySelector('#vm-preview-frame');
  if (preview) {
    const container = Object.values(vm.containers).find((item) => item.status === 'running' && item.hostPort === previewPort);
    preview.srcdoc = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><meta charset="utf-8">${container?.html || ''}`;
  }
  const tabs = [...root.querySelectorAll('[role=tab]')];
  const panel = root.querySelector('.vm-files-panel, .vm-docker-panel, .vm-preview-panel');
  if (panel) { panel.id = 'vm-active-panel'; panel.setAttribute('role','tabpanel'); panel.setAttribute('aria-labelledby',`vm-tab-${activeTab}`); }
  tabs.forEach((tab, index) => {
    tab.id = `vm-tab-${tab.dataset.vmTab}`; tab.setAttribute('aria-controls','vm-active-panel'); tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length-1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      const key = tabs[next].dataset.vmTab; tabs[next].click(); main.querySelector(`#vm-tab-${key}`)?.focus();
    });
  });
  const history = root.querySelector('#vm-terminal-history');
  history.scrollTop = history.scrollHeight;

  root.addEventListener('submit', (event) => {
    if (event.target.id !== 'vm-terminal-form') return;
    event.preventDefault();
    const input = root.querySelector('#vm-command');
    const command = input.value;
    commandDraft = ''; historyIndex = -1;
    const result = runVMCommand(vm, command);
    if (result.openFile) { selectedFile = result.openFile; activeTab = 'files'; }
    persist();
    renderVMLab(main);
    main.querySelector('#vm-command')?.focus();
  });

  root.addEventListener('change', (event) => { if (event.target.id === 'vm-preview-port') { previewPort = Number(event.target.value); renderVMLab(main); main.querySelector('#vm-preview-port')?.focus(); } });
  root.addEventListener('input', (event) => {
    if (event.target.id === 'vm-command') commandDraft = event.target.value;
    if (event.target.id === 'vm-editor-input') {
      const result = saveFile(vm, selectedFile, event.target.value);
      const status = root.querySelector('.vm-editor-foot span');
      if (result.ok) { persist(); status.textContent = notice.includes('พื้นที่เก็บ') ? notice : 'บันทึกอัตโนมัติแล้ว'; }
      else status.textContent = result.output;
    }
  });
  root.querySelector('#vm-command').addEventListener('keydown', (event) => {
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const commands = vm.history.filter(item => item.kind === 'command').map(item => item.text).reverse();
    if (!commands.length) return;
    event.preventDefault();
    historyIndex = Math.max(-1, Math.min(commands.length - 1, historyIndex + (event.key === 'ArrowUp' ? 1 : -1)));
    event.target.value = commandDraft = commands[historyIndex] || '';
  });
  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.missionHint) { const id = button.dataset.missionHint; hintLevels[id] = Math.min(3, (hintLevels[id] || 0) + 1); renderVMLab(main); main.querySelector(`[data-mission-hint="${id}"]`)?.focus(); return; }
    if (button.id === 'vm-check') { notice = checkWork(); renderVMLab(main); main.querySelector('.vm-notice')?.scrollIntoView({block:'nearest'}); return; }
    if (button.dataset.vmHint) { commandDraft = button.dataset.vmHint; root.querySelector('#vm-command').value = button.dataset.vmHint; root.querySelector('#vm-command').focus(); return; }
    if (button.dataset.vmTab) { activeTab = button.dataset.vmTab; renderVMLab(main); return; }
    if (button.dataset.vmFile) { selectedFile = button.dataset.vmFile; renderVMLab(main); return; }
    if (button.id === 'vm-save-file') {
      const result = saveFile(vm, selectedFile, root.querySelector('#vm-editor-input').value);
      notice = result.output;
      if (result.ok) persist();
      renderVMLab(main);
      return;
    }
    if (button.id === 'vm-reset') {
      if (!confirm('รีเซ็ตเฉพาะ VM? ไฟล์ ประวัติคำสั่ง และภารกิจใน VM จะหาย แต่ความคืบหน้า 7 บทเรียนยังอยู่')) return;
      commandDraft = '';
      vm = createVM(); selectedFile = `${PROJECT}/Dockerfile`; activeTab = 'files'; notice = 'เครื่องจำลองกลับสู่สถานะเริ่มต้นแล้ว'; persist(); renderVMLab(main);
    }
  });
}
