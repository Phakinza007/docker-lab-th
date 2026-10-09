import { createVM, runVMCommand } from './vm-engine.mjs?v=20261009-complete';

const escape = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if (typeof document !== 'undefined') {
  const sheet = document.createElement('link');
  sheet.rel = 'stylesheet'; sheet.href = new URL('./curriculum.css', import.meta.url).href;
  document.head.append(sheet);
}

export const projectSteps = [
  ['01', 'รันเว็บแรก', 'cli', 'เริ่ม Nginx แล้วเปิดพอร์ต 8080 ของเครื่องไปยัง 80 ใน container', 'docker run -d --name first-web -p 8080:80 nginx:alpine', 'เห็นสถานะ running และหน้า Welcome to nginx'],
  ['02', 'เขียนหน้าเว็บของตัวเอง', 'dockerfile', 'เปิด index.html ใน VM Lab แล้วเปลี่ยนหัวข้อเป็นชื่อโปรเจกต์ของคุณ', '<h1>My Docker website</h1>', 'ไฟล์บันทึกแล้ว แต่เว็บใน container เดิมยังไม่เปลี่ยนเอง'],
  ['03', 'สร้าง Image', 'dockerfile', 'เขียน Dockerfile แล้ว build จากโฟลเดอร์โปรเจกต์', 'FROM nginx:alpine\nCOPY index.html /usr/share/nginx/html/index.html\nEXPOSE 80', 'docker build -t my-site:1.0 . สำเร็จ และมี image ในรายการ'],
  ['04', 'เปิดเว็บผ่าน Port', 'cli', 'หยุด first-web ถ้ากำลังใช้ 8080 แล้วรัน image ที่สร้างเอง', 'docker stop first-web\ndocker run -d --name web -p 8080:80 my-site:1.0\ncurl localhost:8080', 'ผลลัพธ์ตรงกับ index.html ที่นำไป build'],
  ['05', 'เก็บข้อมูลด้วย Volume', 'storage', 'สร้าง named volume แล้วเขียนไฟล์ลง /data ลบ container และนำ volume เดิมกลับมา mount', 'docker volume create notes\ndocker run -d --name writer -p 8082:80 -v notes:/data nginx:alpine\ndocker exec -it writer sh\necho "keep me" > /data/note.txt\nexit\ndocker stop writer\ndocker rm writer\ndocker run -d --name writer -p 8082:80 -v notes:/data nginx:alpine\ndocker exec -it writer sh\ncat /data/note.txt\nexit', 'อ่านไฟล์เดิมได้หลังสร้างใหม่ แล้วเทียบกับ writable layer ในบทข้อมูล'],
  ['06', 'ต่อยอดด้วย Compose', 'compose', 'หยุด web เพื่อคืน host port 8080 ก่อนใช้ compose.yaml จัดการเว็บ แล้วอ่าน diagram การเชื่อม web กับ db', 'docker stop web\ndocker compose up -d --build\ndocker compose ps\ndocker compose down', 'เว็บรันจาก Compose; ต่อบทหลาย service เพื่อเพิ่ม db แล้วตรวจ service DNS'],
];

export const troubleshootingCases = [
  { id:'name', title:'ชื่อ Container ซ้ำ', issue:'ต้องการสร้าง container ชื่อ web แต่ชื่อนี้มีอยู่แล้ว แม้ตัวเดิมจะหยุดอยู่', goal:'ทำให้ container ชื่อ web กลับมาทำงาน โดยเลือกเริ่มตัวเดิมหรือสร้างใหม่', error:'Conflict. container name "web" is already in use.', hints:['เริ่มจากดู container ทุกสถานะ ไม่ใช่เฉพาะตัวที่รันอยู่','docker start เริ่ม container เดิม ส่วน docker run สร้างตัวใหม่','ลอง docker ps -a แล้ว docker start web'], explanation:'ชื่อถูกจองตลอดอายุ container การ stop ไม่คืนชื่อ หากต้องสร้างใหม่ให้ลบตัวเดิมหลังตรวจข้อมูลแล้ว หรือเลือกชื่อใหม่ แต่โจทย์นี้ต้องการชื่อ web', source:'https://docs.docker.com/reference/cli/docker/container/start/' },
  { id:'port', title:'Host Port ชนกัน', issue:'เว็บตัวแรกใช้ host port 8080 อยู่แล้ว ต้องการเปิดเว็บตัวที่สองโดยเก็บตัวแรกไว้', goal:'รัน container ชื่อ second ที่ host port 8081 และทดสอบด้วย curl', error:'port 8080 is already allocated.', hints:['ดู docker ps เพื่อหาว่าใครใช้ 8080 อยู่','เปลี่ยนเลขด้านซ้ายของ -p ส่วนเลขด้านขวายังเป็น 80 ของ Nginx','docker run -d --name second -p 8081:80 nginx:alpine แล้ว curl localhost:8081'], explanation:'การ publish port ใช้ HOST:CONTAINER เว็บสองตัวจึงใช้ 8080:80 และ 8081:80 ได้พร้อมกัน ไม่จำเป็นต้องเปลี่ยนพอร์ตภายใน Nginx', source:'https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/' },
  { id:'host', title:'ต่อฐานข้อมูลผิด Host', issue:'web กับ db อยู่ใน Compose network เดียวกัน แต่แอปเรียก localhost:5432 แล้วต่อไม่ได้', goal:'แก้ DB_HOST เพื่อให้ web ติดต่อ service db ได้', error:'connect ECONNREFUSED localhost:5432', hints:['localhost มองจาก process ที่เรียก: ใน web container ก็หมายถึง web เอง','Compose ให้ค้นหา container ด้วยชื่อ service ภายใน network เดียวกัน','ตั้ง DB_HOST เป็น db; ใช้ container port 5432'], explanation:'จาก web ให้เรียก db:5432 ส่วนจาก browser บนเครื่องต้องใช้ host port ที่ publish ไว้ การเปลี่ยน hostname ไม่ได้แก้ปัญหารหัสผ่านหรือ readiness ในระบบจริง', source:'https://docs.docker.com/compose/how-tos/networking/' },
  { id:'storage', title:'ข้อมูลหายหลังสร้างใหม่', issue:'แอปเขียนข้อความไว้ใน writable layer เมื่อ rm container แล้วสร้างใหม่ ข้อความจึงหาย', goal:'เลือก storage และทดลองเขียนข้อมูล → ลบ container → สร้างใหม่ให้ข้อมูลอยู่ต่อ', error:'ไฟล์ที่เขียนใน container เดิมไม่พบใน container ใหม่', hints:['หยุด container กับลบ container ต่างกัน: writable layer ถูกลบตอน rm','Named volume มีอายุแยกจาก container ต้อง mount volume เดิมกลับมา','เลือก Named volume แล้วเขียนข้อมูล ลบ container และสร้างใหม่'], explanation:'Volume เก็บข้อมูลต่อเมื่อ container ถูกลบและนำ volume เดิมมา mount ใหม่ ไม่ได้ทำหน้าที่เป็น backup และการลบ volume ยังคงทำข้อมูลหายได้', source:'https://docs.docker.com/engine/storage/volumes/' },
];

export function makeScenario(id) {
  const vm = createVM();
  if (id === 'name' || id === 'port') {
    runVMCommand(vm, 'docker run -d --name web -p 8080:80 nginx:alpine');
    if (id === 'name') runVMCommand(vm, 'docker stop web');
    vm.history = [];
  }
  return { id, vm, hints:0, log:[], solved:false, host:'localhost', storage:'layer', data:'', volume:'', exists:true, removed:false, requested:false };
}

export function commandScenario(scenario, command) {
  const result = runVMCommand(scenario.vm, command);
  scenario.log.push({ command, output: result.output });
  scenario.log = scenario.log.slice(-25);
  if (scenario.id === 'name') scenario.solved = scenario.vm.containers.web?.status === 'running';
  if (scenario.id === 'port') {
    if (result.ok && /^curl\s+(?:-i\s+)?(?:http:\/\/)?localhost:8081\/?\s*$/.test(command.trim())) scenario.requested = true;
    scenario.solved = scenario.vm.containers.web?.status === 'running' && scenario.vm.containers.second?.status === 'running' && scenario.vm.containers.second?.hostPort === 8081 && scenario.requested;
  }
  return result;
}

export function configureScenarioHost(scenario, value) {
  scenario.host=String(value).trim();
  scenario.solved=scenario.host==='db';
  scenario.log=[{output:scenario.solved?'เชื่อมต่อสำเร็จ · web → db:5432':'เชื่อมต่อไม่ได้: ใช้ชื่อ service ที่อยู่ใน Compose network เดียวกัน'}];
}
export function storageScenarioAction(scenario, action, value='') {
  if(action==='write' && scenario.exists) {
    scenario.data=String(value).slice(0,100);
    if(scenario.storage==='volume')scenario.volume=scenario.data;
  }
  if(action==='remove' && scenario.exists) {
    scenario.exists=false;scenario.removed=Boolean(scenario.data);scenario.data='';
  }
  if(action==='recreate' && !scenario.exists) {
    scenario.exists=true;scenario.data=scenario.storage==='volume'?scenario.volume:'';
    scenario.solved=scenario.removed&&scenario.storage==='volume'&&Boolean(scenario.data);
  }
}

function flow(items) { return `<div class="curriculum-flow" role="img" aria-label="${escape(items.join(' → '))}">${items.map((item,i) => `${i ? '<span aria-hidden="true">→</span>' : ''}<b>${escape(item)}</b>`).join('')}</div>`; }
export function renderProject(root) {
  root.innerHTML = `<div class="lesson-page curriculum-page"><a href="#home" class="back-link">← หน้าหลัก</a><div class="section-kicker">BUILD ONE PROJECT</div><h1>จากเว็บแรก สู่ Docker Compose</h1><p class="curriculum-lead">เรียนด้วยโปรเจกต์เดียว แล้วกลับมาอ่านบทที่เกี่ยวข้องเมื่อเจอคำถาม ทุกคำสั่งใน VM Lab เป็นตัวจำลองในเบราว์เซอร์</p>${flow(['index.html + Dockerfile','Image','Container','Browser'])}<div class="project-steps">${projectSteps.map(([number,title,lesson,detail,code,result]) => `<section class="project-step"><span class="project-number">${number}</span><div><h2>${title}</h2><p>${detail}</p><pre class="code-block"><code>${escape(code)}</code></pre><p><strong>เช็กผล:</strong> ${result}</p><div class="curriculum-links"><a href="#${lesson}">อ่านบทที่เกี่ยวข้อง →</a><a href="#vm">ลงมือใน VM Lab ↗</a></div></div></section>`).join('')}</div><div class="callout"><span>แยกสิ่งที่ทดลองให้ชัด</span><p>VM Lab จำลอง workflow ที่ระบุใน help บท Storage และ Compose มีโมเดลย่อยช่วยอธิบายความคงอยู่ของข้อมูลและ service DNS ฐานข้อมูลในตัวจำลองแสดงเฉพาะ network และสถานะ ไม่รัน PostgreSQL หรือ SQL จริง ส่วน multi-stage, Compose Watch และ secret mount ให้อ่านหลักการแล้วทดลองกับ Docker จริงตาม Docker Docs</p></div><a class="primary-button" href="#troubleshooting">พร้อมแล้ว ลองแก้ปัญหา →</a></div>`;
}

export function renderTroubleshooting(root) {
  let active = 0;
  let scenario = makeScenario(troubleshootingCases[active].id);
  let solved = [];
  try { const saved = JSON.parse(localStorage.getItem('docker-lab-troubleshooting-v1')); if (Array.isArray(saved)) solved = saved.filter(id => troubleshootingCases.some(c=>c.id===id)); } catch {}
  function draw() {
    const item = troubleshootingCases[active];
    if (scenario.solved && !solved.includes(item.id)) { solved.push(item.id); try { localStorage.setItem('docker-lab-troubleshooting-v1', JSON.stringify(solved)); } catch {} }
    root.innerHTML = `<div class="lesson-page curriculum-page"><a href="#home" class="back-link">← หน้าหลัก</a><div class="section-kicker">DEBUG BY DOING</div><h1>ลองผิด แล้วแก้ให้เป็น</h1><p>4 โจทย์แยกจากโปรเจกต์ VM ของคุณ สถานะฝึกถูกแยกไว้ และเก็บเฉพาะผลที่ผ่านบนเบราว์เซอร์นี้</p><div class="trouble-tabs">${troubleshootingCases.map((c,i)=>`<button type="button" data-case="${i}" ${i===active?'aria-current="step"':''}>${solved.includes(c.id)?'✓ ':''}${c.title}</button>`).join('')}</div><section class="trouble-card"><h2>${item.title}</h2><p>${item.issue}</p><pre class="trouble-error">${escape(item.error)}</pre><p><strong>ภารกิจ:</strong> ${item.goal}</p>${active < 2 ? `<p class="lab-note">Terminal ใช้ engine จำลองเดียวกับ VM Lab · พิมพ์ help ดูคำสั่งที่รองรับ</p><div class="trouble-terminal" role="log" aria-label="ผลลัพธ์คำสั่ง">${scenario.log.map(l=>`<div><b>$ ${escape(l.command)}</b><pre>${escape(l.output)}</pre></div>`).join('') || '<p>เริ่มจากตรวจสถานะ แล้วลองแก้ด้วยตัวเอง</p>'}</div><form id="trouble-command"><label for="trouble-input">คำสั่ง Docker</label><div class="trouble-command-row"><input id="trouble-input" name="command" autocomplete="off" spellcheck="false" placeholder="docker ps -a" required maxlength="500"><button type="submit">Run ↵</button></div></form>` : active === 2 ? `${flow(['web container',scenario.host==='db'?'db:5432 ✓':'localhost ↺ web','db container'])}<form id="trouble-host"><label for="trouble-host-input">DB_HOST</label><input id="trouble-host-input" name="host" value="${escape(scenario.host)}" maxlength="80" autocomplete="off"><button type="submit">ทดสอบการเชื่อมต่อ</button></form><p class="lab-note">จำลองการเลือก host เมื่อทั้งสอง service ทำงานพร้อมแล้ว ไม่มี PostgreSQL จริง</p>${scenario.log.map(l=>`<p role="status">${escape(l.output)}</p>`).join('')}` : `${flow([scenario.exists?'Container: '+(scenario.data||'ว่าง'):'Container ถูกลบ','Named volume: '+(scenario.volume||'ว่าง')])}<label for="trouble-storage">ที่เก็บข้อมูล</label><select id="trouble-storage" ${scenario.removed?'disabled':''}><option value="layer" ${scenario.storage==='layer'?'selected':''}>Writable layer</option><option value="volume" ${scenario.storage==='volume'?'selected':''}>Named volume</option></select><label for="trouble-data">ข้อความในแอป</label><input id="trouble-data" value="${escape(scenario.data)}" placeholder="เขียนข้อความของคุณ" maxlength="100" ${!scenario.exists?'disabled':''}><div class="curriculum-links"><button type="button" id="trouble-write" ${!scenario.exists?'disabled':''}>เขียนข้อมูล</button><button type="button" id="trouble-remove" ${!scenario.exists?'disabled':''}>ลบ Container</button><button type="button" id="trouble-recreate" ${scenario.exists?'disabled':''}>สร้าง Container ใหม่</button></div><p class="lab-note">โมเดลวงจรชีวิตข้อมูล: ใช้ volume เดิมและ mount path เดิมเมื่อสร้างใหม่</p>`}<div class="trouble-hints"><button type="button" id="trouble-hint" ${scenario.hints>=item.hints.length?'disabled':''}>${scenario.hints===2?'ดูแนวทางแก้':'คำใบ้ถัดไป'} (${scenario.hints}/${item.hints.length})</button>${item.hints.slice(0,scenario.hints).map((hint,i)=>`<p><strong>${i+1}.</strong> ${hint}</p>`).join('')}</div>${scenario.solved?`<div class="callout" role="status"><span>ผ่านแล้ว ✓</span><p>${item.explanation}</p></div>`:''}<div class="curriculum-links"><button id="trouble-reset" type="button">เริ่มโจทย์นี้ใหม่</button><a href="${item.source}" target="_blank" rel="noopener noreferrer">อ่าน Docker Docs ↗</a><a href="#vm">กลับไปฝึกใน VM →</a></div></section></div>`;
    root.querySelectorAll('[data-case]').forEach(button=>button.onclick=()=>{active=Number(button.dataset.case);scenario=makeScenario(troubleshootingCases[active].id);draw();});
    root.querySelector('#trouble-hint').onclick=()=>{scenario.hints++;draw();};
    root.querySelector('#trouble-reset').onclick=()=>{scenario=makeScenario(item.id);draw();};
    const command = root.querySelector('#trouble-command');
    if(command) command.onsubmit=e=>{e.preventDefault();commandScenario(scenario,new FormData(command).get('command'));draw();root.querySelector('#trouble-input').focus();const log=root.querySelector('.trouble-terminal');log.scrollTop=log.scrollHeight;};
    const host = root.querySelector('#trouble-host');
    if(host) host.onsubmit=e=>{e.preventDefault();configureScenarioHost(scenario,new FormData(host).get('host'));draw();};
    const storage = root.querySelector('#trouble-storage');
    if(storage) {storage.onchange=()=>{scenario.storage=storage.value;draw();};root.querySelector('#trouble-write').onclick=()=>{storageScenarioAction(scenario,'write',root.querySelector('#trouble-data').value);draw();};root.querySelector('#trouble-remove').onclick=()=>{storageScenarioAction(scenario,'remove');draw();};root.querySelector('#trouble-recreate').onclick=()=>{storageScenarioAction(scenario,'recreate');draw();};}
  }
  draw();
}

export function lessonProjectLink(lessonId) {
  const step = projectSteps.find(s=>s[2]===lessonId);
  return `<section class="lesson-project"><h3>เชื่อมกับโปรเจกต์</h3><p>${step?step[1]+': '+step[3]:'นำสิ่งที่เรียนไปตรวจโปรเจกต์ Docker ของคุณ แล้วฝึกแก้ปัญหาก่อนใช้งานจริง'}</p><div class="curriculum-links"><a href="#project">ดูเส้นทางโปรเจกต์ →</a><a href="#vm">เปิด VM Lab ↗</a><a href="#troubleshooting">ฝึกแก้ปัญหา →</a></div></section>`;
}


const lessonHints = {
  'mental-model':['ลองเทียบสูตรอาหารกับอาหารที่ปรุงเสร็จ แต่ละ container มีชั้นเขียนของตัวเอง','กด Dockerfile → Image → Container แล้วสังเกตว่าขั้น build กับ run ทำหน้าที่ต่างกัน'],
  cli:['docker run สร้างตัวใหม่ ส่วน docker start เริ่มตัวเดิม; ตรวจสถานะก่อนสั่ง','เริ่มด้วย docker run -d --name web -p 8080:80 nginx:alpine แล้ว docker ps, docker logs web และ docker stop web'],
  dockerfile:['Cache ถูกใช้ได้จนถึงขั้นที่ input เปลี่ยน จากนั้นขั้นถัดไปต้องพิจารณาสร้างใหม่','ลองสลับแก้ app.js กับ package-lock.json ดูว่าขั้น npm ci ต้องรันใหม่เมื่อใด'],
  storage:['ข้อมูลต้องมีอายุเท่ากับ container หรือยาวกว่านั้น?','เขียนข้อความต่างจาก hello ลองสร้างใหม่ด้วย writable layer แล้วลองซ้ำด้วย named volume'],
  compose:['จาก web, localhost หมายถึงตัว web เอง ชื่อ service ช่วยค้นหาเพื่อนร่วม network','เลือก db:5432 ดูเส้นทางเชื่อมต่อ แล้วลองตัวเลือก localhost เพื่อเทียบเหตุผล'],
  workflow:['แยกสิ่งที่ต้องใช้ระหว่าง build กับสิ่งที่ต้องอยู่ใน runtime','Multi-stage คัดลอกเพียงผลลัพธ์ build; Watch เลือก sync, rebuild หรือ sync+restart ตามไฟล์ที่เปลี่ยน'],
  ship:['ตรวจทั้งสิ่งที่ image มีอยู่ และสิทธิ์ที่ process ได้รับ ไม่ใช่แค่สแกนครั้งเดียว','อ่านรายการทีละข้อ แล้วตรวจ image ของจริงตามแหล่งอ้างอิง การติ๊กในเว็บเป็นเพียงรายการเตือนความจำ']
};
export function renderLessonHints(id) {
  const hints=lessonHints[id]||['ลองกดแต่ละตัวเลือกแล้วเทียบผลลัพธ์กับหลักการในบท','อ่านเหตุผลในคำอธิบายก่อนตอบคำถามตรวจความเข้าใจ'];
  return `<div class="lesson-hints"><details><summary>คำใบ้ 1 · คิดก่อนลงมือ</summary><p>${hints[0]}</p></details><details><summary>คำใบ้ 2 · แนวทางทดลอง</summary><p>${hints[1]}</p></details></div>`;
}
