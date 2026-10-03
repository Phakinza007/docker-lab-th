import { VM_STORAGE_KEY, PROJECT, MISSIONS, createVM, validVM, prompt, listFiles, validateDockerfile, saveFile, runVMCommand } from './vm-engine.mjs';

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const safeStore = () => { try { const stored = JSON.parse(localStorage.getItem(VM_STORAGE_KEY)); return validVM(stored) ? stored : createVM(); } catch { return createVM(); } };
let vm = safeStore();
let selectedFile = `${PROJECT}/Dockerfile`;
let activeTab = 'files';
let notice = '';

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
  return `<div class="vm-files-panel"><div class="vm-file-list" aria-label="ไฟล์ในโปรเจกต์"><div class="vm-file-list-label">~/project</div>${files.map((file) => `<button type="button" data-vm-file="${escapeHTML(`${PROJECT}/${file}`)}" class="${selectedFile === `${PROJECT}/${file}` ? 'selected' : ''}"><span>▤</span>${escapeHTML(file)}</button>`).join('')}</div><div class="vm-editor"><div class="vm-editor-head"><span>${escapeHTML(name)}</span><span>${name === 'Dockerfile' ? (issue ? 'ยังไม่พร้อม build' : 'พร้อม build ✓') : 'แก้ไขได้'}</span></div><label class="sr-only" for="vm-editor-input">เนื้อหาไฟล์ ${escapeHTML(name)}</label><textarea id="vm-editor-input" spellcheck="false">${escapeHTML(vm.files[selectedFile] ?? '')}</textarea><div class="vm-editor-foot"><span>${name === 'Dockerfile' ? (issue || 'Dockerfile ถูกต้องสำหรับ Lab นี้') : 'ไฟล์นี้จะถูกบันทึกในเบราว์เซอร์'}</span><button type="button" id="vm-save-file">บันทึกไฟล์</button></div></div></div>`;
}

function dockerPanel() {
  const images = Object.values(vm.images);
  const containers = Object.values(vm.containers);
  return `<div class="vm-docker-panel"><div class="vm-state-section"><h3>Images <span>${images.length}</span></h3>${images.length ? images.map((image) => `<div class="vm-state-item"><span class="vm-state-icon">▤</span><div><strong>${escapeHTML(image.tag)}</strong><small>${escapeHTML(image.id)}</small></div></div>`).join('') : '<p>ยังไม่มี image · ลอง docker build</p>'}</div><div class="vm-state-section"><h3>Containers <span>${containers.length}</span></h3>${containers.length ? containers.map((container) => `<div class="vm-state-item"><span class="vm-state-icon">▣</span><div><strong>${escapeHTML(container.name)} ${statusBadge(container)}</strong><small>${escapeHTML(container.tag)} · ${container.hostPort}:80</small></div></div>`).join('') : '<p>ยังไม่มี container · ลอง docker run</p>'}</div><div class="vm-state-section"><h3>Volumes <span>${vm.volumes.length}</span></h3>${vm.volumes.length ? vm.volumes.map((volume) => `<div class="vm-state-item"><span class="vm-state-icon">◫</span><div><strong>${escapeHTML(volume)}</strong><small>local · จำลอง</small></div></div>`).join('') : '<p>ยังไม่มี volume · ลอง docker volume create data</p>'}</div></div>`;
}

function previewPanel() {
  const container = Object.values(vm.containers).find((item) => item.status === 'running' && item.hostPort === 8080);
  return `<div class="vm-preview-panel"><div class="vm-preview-address"><span>◉</span><code>http://localhost:8080</code><small>พรีวิวจำลอง</small></div>${container ? '<iframe id="vm-preview-frame" title="พรีวิวเว็บจาก container จำลอง" sandbox="" referrerpolicy="no-referrer"></iframe>' : '<div class="vm-preview-offline"><span>○</span><strong>ยังเชื่อมต่อไม่ได้</strong><p>สร้าง image และเริ่ม container ที่ port 8080 แล้วกลับมาดูหน้าเว็บที่นี่</p><code>docker run -d --name web -p 8080:80 my-site:1.0</code></div>'}</div>`;
}

function missionsPanel() {
  const done = vm.achievements.filter((id) => MISSIONS.some((mission) => mission.id === id)).length;
  return `<div class="vm-mission-top"><span>MISSION TRACKER</span><strong>${done} / ${MISSIONS.length}</strong></div><h2>ภารกิจแรกของคุณ</h2><p>ทำตามลำดับเพื่อพาเว็บหนึ่งหน้าเข้า container และตรวจว่าใช้งานได้</p><div class="vm-mission-progress"><span style="width:${(done / MISSIONS.length) * 100}%"></span></div><ol class="vm-mission-list">${MISSIONS.map((mission, index) => `<li class="${vm.achievements.includes(mission.id) ? 'done' : ''}"><div class="vm-mission-index">${vm.achievements.includes(mission.id) ? '✓' : String(index + 1).padStart(2, '0')}</div><div><strong>${mission.title}</strong><small>${mission.detail}</small><button type="button" data-vm-hint="${escapeHTML(mission.hint)}" aria-label="ใส่คำสั่ง ${escapeHTML(mission.hint)} ใน terminal"><code>${escapeHTML(mission.hint)}</code> <span>↗</span></button></div></li>`).join('')}</ol><div class="vm-mission-tip"><b>ลองต่อเอง</b><p>หลังทำครบ ลอง <code>docker ps -a</code>, <code>docker start web</code>, <code>docker volume create data</code> หรือ <code>docker compose up -d --build</code></p></div>`;
}

function template() {
  const running = Object.values(vm.containers).filter((container) => container.status === 'running').length;
  return `<div class="vm-page"><div class="vm-breadcrumb"><a href="#home">หน้าแรก</a><span>/</span><span>VM Lab</span></div><div class="vm-intro"><div><span class="vm-kicker">PRACTICE ENVIRONMENT · BROWSER SIMULATION</span><h1>VM Lab<span>.</span></h1><p>ฝึก Linux และ Docker ในเครื่องจำลองที่จำสถานะของไฟล์ image และ container ไว้ในเบราว์เซอร์ ลองผิดแล้วเริ่มใหม่ได้</p></div><button type="button" class="vm-reset" id="vm-reset">↻ รีเซ็ต VM</button></div><div class="vm-disclosure"><strong>นี่คือเครื่องจำลอง</strong><span>คำสั่งทำงานกับโมเดลในเบราว์เซอร์ ไม่ได้รัน Linux VM หรือ Docker Engine จริง และไม่เชื่อมต่อเครื่องของคุณ</span></div><div class="vm-layout"><div class="vm-work"><section class="vm-terminal-card" aria-label="Terminal เครื่องจำลอง"><div class="vm-terminal-head"><div class="vm-window-dots"><i></i><i></i><i></i></div><span>student@docker-lab: ~/project</span><div class="vm-vm-status"><i></i> VM READY</div></div><div class="vm-terminal-history" id="vm-terminal-history" role="log" aria-live="polite">${terminalRows()}</div><form id="vm-terminal-form" class="vm-terminal-form" autocomplete="off"><label for="vm-command">${escapeHTML(prompt(vm))}</label><input id="vm-command" name="command" spellcheck="false" aria-label="พิมพ์คำสั่งใน VM" placeholder="พิมพ์คำสั่งแล้วกด Enter"/><button type="submit" aria-label="รันคำสั่ง">↵</button></form></section><div class="vm-quick"><span>ลองพิมพ์</span>${['ls','cat Dockerfile','docker images','docker ps -a'].map((cmd) => `<button type="button" data-vm-hint="${escapeHTML(cmd)}">${escapeHTML(cmd)}</button>`).join('')}</div><section class="vm-workbench"><div class="vm-workbench-top"><div class="vm-tabs" role="tablist" aria-label="เครื่องมือ VM"><button type="button" role="tab" aria-selected="${activeTab === 'files'}" data-vm-tab="files" class="${activeTab === 'files' ? 'active' : ''}">ไฟล์และตัวแก้ไข</button><button type="button" role="tab" aria-selected="${activeTab === 'docker'}" data-vm-tab="docker" class="${activeTab === 'docker' ? 'active' : ''}">Docker state</button><button type="button" role="tab" aria-selected="${activeTab === 'preview'}" data-vm-tab="preview" class="${activeTab === 'preview' ? 'active' : ''}">พรีวิวเว็บ</button></div><span>${Object.keys(vm.images).length} images · ${running} running</span></div>${activeTab === 'files' ? filesPanel() : activeTab === 'docker' ? dockerPanel() : previewPanel()}</section>${notice ? `<div class="vm-notice" role="status">${escapeHTML(notice)}</div>` : ''}</div><aside class="vm-missions" aria-label="ภารกิจใน VM">${missionsPanel()}</aside></div><div class="vm-help"><div><strong>ฝึกเพิ่มจากเอกสารทางการ</strong><p>Lab นี้จำลองเฉพาะคำสั่งที่ระบุไว้ คำสั่ง Docker จริงมีตัวเลือกและพฤติกรรมมากกว่านี้</p></div><a href="https://docs.docker.com/get-started/" target="_blank" rel="noopener noreferrer">Docker Docs ↗</a></div></div>`;
}

export function renderVMLab(main) {
  main.innerHTML = template();
  const root = main.querySelector('.vm-page');
  const preview = root.querySelector('#vm-preview-frame');
  if (preview) {
    const container = Object.values(vm.containers).find((item) => item.status === 'running' && item.hostPort === 8080);
    preview.srcdoc = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><meta charset="utf-8">${container?.html || ''}`;
  }
  const history = root.querySelector('#vm-terminal-history');
  history.scrollTop = history.scrollHeight;

  root.addEventListener('submit', (event) => {
    if (event.target.id !== 'vm-terminal-form') return;
    event.preventDefault();
    const input = root.querySelector('#vm-command');
    const command = input.value;
    const result = runVMCommand(vm, command);
    if (result.openFile) { selectedFile = result.openFile; activeTab = 'files'; }
    persist();
    renderVMLab(main);
    main.querySelector('#vm-command')?.focus();
  });

  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.vmHint) { root.querySelector('#vm-command').value = button.dataset.vmHint; root.querySelector('#vm-command').focus(); return; }
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
      vm = createVM(); selectedFile = `${PROJECT}/Dockerfile`; activeTab = 'files'; notice = 'เครื่องจำลองกลับสู่สถานะเริ่มต้นแล้ว'; persist(); renderVMLab(main);
    }
  });
}
