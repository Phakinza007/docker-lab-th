import { renderLessonDiagram, resetLessonDiagram } from './lesson-diagrams.mjs?v=20261010-learning2';
import { LEARNING_KEY, tasks, validLearning, lessonPassed, checkTask, renderPrediction, renderLearningTask } from './learning-flow.mjs?v=20261010-learning2';
import { renderVMLab, getVMState } from './vm-lab.mjs?v=20261010-learning2';
import { renderProject, renderTroubleshooting, lessonProjectLink } from './curriculum.mjs';

const lessons = [
  {
    id: 'mental-model', number: '01', icon: '◫', title: 'ภาพใหญ่ของ Docker', subtitle: 'Image, container และ Docker Engine ต่างกันอย่างไร', time: '8 นาที', level: 'เริ่มต้น',
    lead: 'เริ่มจากโมเดลที่ถูกต้อง: image คือแม่แบบที่สร้างไว้ ส่วน container คือ process ที่เริ่มทำงานจาก image นั้น',
    body: `
      <section class="text-section"><h2>คิดเป็น 3 ชั้น</h2><p><strong>Dockerfile</strong> เป็นสูตรสร้าง image · <strong>image</strong> เป็นแพ็กเกจแบบอ่านอย่างเดียวที่รวมไฟล์และการตั้งค่า · <strong>container</strong> เป็น process ที่แยกสภาพแวดล้อมและมี writable layer ของตัวเอง</p><p><strong>Docker Engine</strong> คือระบบที่รับคำสั่งและจัดการ image, container, network และ volume บนเครื่อง เริ่ม container ใหม่จาก image เดิมได้หลายตัว แต่การแก้ไฟล์ใน container ตัวหนึ่งไม่เปลี่ยน image และไม่ส่งผลไปยัง container อีกตัว</p>${renderLessonDiagram('mental-model')}<p>อ่านภาพจากซ้ายไปขวา: เราเขียนสูตรก่อน แล้ว Build เป็นแม่แบบ จากนั้น Run เพื่อเริ่ม process ลอง Build → Run → แก้ไฟล์เว็บใน Diagram แล้วสังเกตแต่ละชั้น</p></section>
      <div class="callout"><span>จำให้แม่น</span><p>Container ไม่ใช่ virtual machine ทั้งเครื่อง มันใช้ kernel ของ host และแยก process, filesystem และ network ตามการตั้งค่า</p></div>
      <section class="text-section"><h2>วงจรการทำงาน</h2><ol class="step-list"><li><b>เขียน Dockerfile</b><span>อธิบายวิธีสร้าง runtime ที่แอปต้องใช้</span></li><li><b>docker build</b><span>สร้าง image จาก build context</span></li><li><b>docker run</b><span>สร้างและเริ่ม container จาก image</span></li></ol></section>`,
    lab: 'model',
    quiz: { question: 'ถ้าลบ container แล้วสร้างใหม่จาก image เดิม ไฟล์ที่แก้เฉพาะใน container เดิมจะเป็นอย่างไร?', options: ['ยังอยู่ใน image โดยอัตโนมัติ', 'หายไป หากไม่ได้เก็บไว้ภายนอก container', 'ถูกส่งไปยัง container ใหม่ทันที'], answer: 1, explain: 'writable layer เป็นของแต่ละ container และถูกลบพร้อม container; ใช้ volume เมื่อข้อมูลต้องอยู่ต่อ' },
    source: 'https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/'
  },
  {
    id: 'cli', number: '02', icon: '>_', title: 'สั่งงาน Container', subtitle: 'run, ps, logs, exec, stop และ rm', time: '12 นาที', level: 'ลงมือทำ',
    lead: 'ลองพิมพ์คำสั่งใน terminal จำลอง เพื่อเห็นว่า Docker จัดการ container อย่างไรโดยไม่ต้องติดตั้งอะไร',
    body: `
      <section class="text-section"><h2>คำสั่งหลักที่ใช้ทุกวัน</h2><div class="command-list"><div><code>docker run -d --name web -p 8080:80 nginx:alpine</code><span>สร้างและเริ่ม Nginx เบื้องหลัง; port 8080 ของ host ไปยัง 80 ใน container</span></div></div>${renderLessonDiagram('cli-port')}<div class="command-list"><div><code>docker ps</code><span>ดู container ที่กำลังทำงาน; เติม <code>-a</code> เพื่อดูทั้งหมด</span></div><div><code>docker logs web</code><span>อ่าน output ของ process หลัก</span></div><div><code>docker exec -it web sh</code><span>เปิด shell ใน container ที่กำลังทำงาน</span></div><div><code>docker stop web</code><span>หยุด process อย่างสุภาพ</span></div><div><code>docker rm web</code><span>ลบ container หลังหยุดแล้ว</span></div></div></section>
      <div class="callout warning"><span>ระวัง</span><p><code>docker run</code> สร้าง container ใหม่เสมอ ถ้าจะเริ่มตัวเดิมอีกครั้งใช้ <code>docker start web</code></p></div>${renderLessonDiagram('cli-lifecycle')}<p class="diagram-teaching-prompt">ลองใน VM Lab: run → ps → stop → ps -a → start แล้วดูว่า web ยังเป็นตัวเดิม จากนั้น stop → rm เพื่อคืนชื่อ</p>`,
    lab: 'terminal',
    quiz: { question: 'ต้องการดู container ที่หยุดไปแล้วด้วย ควรใช้คำสั่งใด?', options: ['docker ps', 'docker ps -a', 'docker logs -a'], answer: 1, explain: 'docker ps แสดงเฉพาะที่กำลังทำงาน ส่วน -a แสดงทุกสถานะ' },
    source: 'https://docs.docker.com/reference/cli/docker/container/'
  },
  {
    id: 'dockerfile', number: '03', icon: '▤', title: 'สร้าง Image', subtitle: 'Dockerfile, layers, cache และ .dockerignore', time: '14 นาที', level: 'ลงมือทำ',
    lead: 'Dockerfile เปลี่ยนวิธีติดตั้งแอปที่ทำซ้ำด้วยมือ ให้กลายเป็น image ที่สร้างใหม่ได้',
    body: `
      <section class="text-section"><h2>สูตรสร้างเว็บ static · ใช้ได้ใน VM Lab</h2><pre class="code-block"><code>FROM nginx:alpine
COPY index.html /usr/share/nginx/html/index.html</code></pre><p>บันทึกเป็นไฟล์ชื่อ <code>Dockerfile</code> แล้วรัน <code>docker build -t my-site:1.0 .</code> จุดท้ายคือ build context ที่ส่งให้ builder</p></section>
      <section class="text-section"><h2>จัดลำดับเพื่อใช้ cache</h2><p>สำหรับแอป Node ให้ <code>COPY package*.json ./</code> และติดตั้ง dependencies ก่อน <code>COPY . .</code> การแก้ source code จะไม่ทำให้ขั้นติดตั้งแพ็กเกจต้องรันใหม่ทุกครั้ง หากไฟล์แพ็กเกจไม่เปลี่ยน</p>${renderLessonDiagram('dockerfile')}<p>ลองเลือก “แก้ app.js” กับ “แก้ package-lock.json” ใน Diagram แล้วเทียบจุดเริ่ม REBUILD</p><p>ใช้ <code>.dockerignore</code> ตัด <code>node_modules</code>, <code>.git</code>, ไฟล์ลับ และสิ่งที่ไม่เกี่ยวข้องออกจาก build context</p></section>
      <div class="callout"><span>ในชั้นเรียน INT134</span><p>การใช้ <code>docker cp</code> ใส่ไฟล์เว็บใน container เหมาะกับการทดลอง แต่ถ้าต้องการทำซ้ำ ให้ <code>COPY</code> ไฟล์ลง image ผ่าน Dockerfile</p></div>`,
    lab: 'cache',
    quiz: { question: 'ถ้าต้องการให้ขั้น npm ci ใช้ cache เมื่อแก้เพียง app.js ควรคัดลอกอะไรเข้ามาก่อน?', options: ['COPY . .', 'COPY package*.json ./', 'COPY app.js ./'], answer: 1, explain: 'คัดลอกไฟล์ dependency manifest ก่อน แล้วค่อยติดตั้งแพ็กเกจและคัดลอก source' },
    source: 'https://docs.docker.com/build/building/best-practices/'
  },
  {
    id: 'storage', number: '04', icon: '▣', title: 'ข้อมูลที่ต้องอยู่ต่อ', subtitle: 'Writable layer, named volume และ bind mount', time: '10 นาที', level: 'แนวคิดสำคัญ',
    lead: 'Container ถูกสร้างใหม่ได้เสมอ ข้อมูลฐานข้อมูลจึงไม่ควรอยู่เฉพาะใน writable layer ของ container',
    body: `
      <section class="text-section"><h2>เลือกที่เก็บให้ถูก</h2><div class="compare-grid"><div><h3>Writable layer</h3><p>อยู่กับ container ตัวนั้น เหมาะกับไฟล์ชั่วคราว ลบ container แล้วข้อมูลส่วนนี้หาย</p></div><div><h3>Named volume</h3><p>Docker จัดการให้ อายุแยกจาก container เหมาะกับข้อมูลที่แอปสร้าง เช่นฐานข้อมูล</p></div><div><h3>Bind mount</h3><p>ผูก path จาก host เข้ากับ container เหมาะกับ source code ระหว่างพัฒนา</p></div></div>${renderLessonDiagram('storage')}<p>ก่อนดูคำสั่ง ลองเลือก Writable layer แล้วเขียนข้อความและสร้าง container ใหม่ จากนั้นทำซ้ำด้วย Named volume สังเกตว่าข้อมูลหายที่ขั้นไหนในภาพ</p></section>
      <section class="text-section"><h2>ทดลอง Named volume ใน VM Lab</h2><pre class="code-block"><code>docker volume create notes
docker run -d --name notes-writer -p 8081:80 -v notes:/data nginx:alpine
docker exec notes-writer sh</code></pre><p>ภายใน shell เขียน <code>echo "my note" &gt; /data/note.txt</code> แล้ว <code>exit</code> กลับมาที่ host</p><pre class="code-block"><code>docker stop notes-writer
docker rm notes-writer
docker run -d --name notes-reader -p 8081:80 -v notes:/data nginx:alpine
docker exec notes-reader cat /data/note.txt</code></pre><p>ควรเห็น <code>my note</code> จาก volume เดิม Bind mount เป็นแนวคิดอ่านเพิ่มเติม ตัวจำลองนี้ยังไม่รองรับ host path</p></section>`,
    lab: 'volume',
    quiz: { question: 'ต้องการเก็บข้อมูลฐานข้อมูลไว้หลังลบ container ควรใช้สิ่งใด?', options: ['EXPOSE', 'Named volume', 'docker logs'], answer: 1, explain: 'Named volume มีวงจรชีวิตแยกจาก container และคงข้อมูลไว้เมื่อสร้าง container ใหม่' },
    source: 'https://docs.docker.com/engine/storage/volumes/'
  },
  {
    id: 'compose', number: '05', icon: '⌘', title: 'หลาย Service ด้วย Compose', subtitle: 'compose.yaml, network และ service name', time: '13 นาที', level: 'ทำงานร่วมกัน',
    lead: 'Compose เก็บการตั้งค่า app และ database ในไฟล์เดียว แล้วสร้าง network ให้ service ติดต่อกันด้วยชื่อ',
    body: `
      <section class="text-section"><h2>Compose file · ใช้ได้ใน VM Lab</h2><pre class="code-block"><code>services:
  web:
    build: .
    ports:
      - "8080:80"
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: demo-only
    volumes:
      - db-data:/var/lib/postgresql/data

volumes:
  db-data:</code></pre><p>บันทึกใน <code>compose.yaml</code> และเตรียม Dockerfile กับ index.html ตามบท 3 ก่อนรัน <code>docker compose up -d --build</code> หากมี container อื่นใช้พอร์ต 8080 อยู่ให้หยุดตัวนั้นก่อน ตัวอย่างใช้ PostgreSQL 16 และ path สำหรับรุ่นนี้ รหัส <code>demo-only</code> ใช้ทดลองเท่านั้น; งานจริงควรจัดการ secret และไม่ commit รหัสผ่าน ตัวจำลองทดสอบ DNS/TCP ได้ แต่ไม่รัน SQL หรือ authentication</p></section>
      <div class="callout warning"><span>ชื่อที่ใช้เชื่อมต่อ</span><p>จาก container <code>web</code> ให้เรียกฐานข้อมูลที่ <code>db:5432</code> ไม่ใช่ <code>localhost:5432</code> เพราะ localhost ภายใน container คือ container ตัวเอง</p></div>${renderLessonDiagram('compose')}<p class="diagram-teaching-prompt">ตามลูกศรจาก Browser ไป web ก่อน แล้วเริ่มลูกศรถัดไปจากใน web: จุดนี้ต้องใช้ db:5432 ลองเลือก host ใน Diagram และเทียบผลกับภาพ</p>
      <section class="text-section"><h2>ข้อมูลยังอยู่หรือไม่</h2><p><code>docker compose down</code> ไม่ลบ named volume ตามปกติ ส่วน <code>docker compose down -v</code> ลบ volume ที่กำหนดใน Compose ด้วย ตรวจข้อมูลก่อนใช้คำสั่งหลัง</p></section>`,
    lab: 'network',
    quiz: { question: 'service web ใน Compose ควรต่อไปยังฐานข้อมูล service db ด้วย host ใด?', options: ['localhost', 'db', '0.0.0.0'], answer: 1, explain: 'Compose มี DNS ภายใน network และให้เรียกกันด้วยชื่อ service' },
    source: 'https://docs.docker.com/compose/how-tos/networking/'
  },
  {
    id: 'workflow', number: '06', icon: '↻', title: 'Workflow ปัจจุบัน', subtitle: 'BuildKit, multi-stage และ Compose Watch', time: '12 นาที', level: 'ต่อยอด',
    lead: 'เมื่อพื้นฐานแน่นแล้ว ใช้เครื่องมือใหม่เพื่อลดเวลาพัฒนาและทำให้ image สำหรับรันจริงสะอาดขึ้น',
    body: `
      <section class="text-section"><h2>Multi-stage build</h2><pre class="code-block"><code>FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist/ /usr/share/nginx/html/</code></pre><p>ขั้นแรกใช้เครื่องมือ build แต่ image สุดท้ายคัดลอกเพียงไฟล์ที่ต้องเสิร์ฟ จึงไม่ต้องแบก Node และ dependencies สำหรับ build ไปด้วย</p>${renderLessonDiagram('workflow-build')}</section>
      <section class="text-section"><h2>Compose Watch</h2><p>เพิ่ม <code>develop.watch</code> ใน service แล้วใช้ <code>docker compose up --watch</code> เพื่อ sync หรือ rebuild เมื่อไฟล์เปลี่ยน เหมาะกับการพัฒนา; ต้องใช้ Compose รุ่นที่รองรับ และ service ที่ sync ต้องเขียนไฟล์เป้าหมายได้</p>${renderLessonDiagram('workflow-watch')}</section>
      <div class="callout"><span>BuildKit</span><p>Docker ใช้ BuildKit เป็น builder backend ใน workflow ปัจจุบัน มันช่วยเรื่อง cache, build graph และ multi-stage builds</p></div>`,
    lab: 'workflow',
    quiz: { question: 'Multi-stage build ช่วยอะไรกับ image สุดท้าย?', options: ['รวม build tools ไว้ให้ครบที่สุด', 'เลือกคัดลอกเฉพาะ artifact ที่ใช้รัน', 'ทำให้ไม่ต้องเขียน Dockerfile'], answer: 1, explain: 'ขั้น runtime สามารถคัดลอกเฉพาะผลลัพธ์จากขั้น build เพื่อลดสิ่งที่ไม่จำเป็น' },
    source: 'https://docs.docker.com/build/building/multi-stage/'
  },
  {
    id: 'ship', number: '07', icon: '↗', title: 'พร้อมใช้งานจริง', subtitle: 'Security, secrets และการตรวจสอบ', time: '11 นาที', level: 'แนวปฏิบัติ',
    lead: 'ก่อนส่งงานหรือ deploy ให้ดูสิ่งที่ image มีอยู่ วิธีจัดการข้อมูลลับ และวิธีตรวจสุขภาพของ service',
    body: `
      <section class="text-section"><h2>รายการตรวจสั้น ๆ</h2><ol class="step-list"><li><b>ใช้ base image ที่ดูแลอยู่</b><span>อัปเดตและเลือก tag ที่ตั้งใจใช้ ตรวจช่องโหว่เป็นระยะ</span></li><li><b>ไม่ใส่ secret ใน image</b><span>อย่า COPY .env หรือส่ง token ผ่าน build ARG/ENV; ใช้ BuildKit secret mounts เมื่อจำเป็นระหว่าง build</span></li><li><b>ให้สิทธิ์เท่าที่ต้องใช้</b><span>กำหนด user ที่ไม่ใช่ root เมื่อแอปรองรับ และพิจารณา rootless mode ตามสภาพแวดล้อม</span></li><li><b>รู้วิธีสังเกตปัญหา</b><span>ดู logs, ตรวจสถานะ, ตั้ง healthcheck และทดสอบการ restart</span></li></ol>${renderLessonDiagram('ship-secret')}<p>ใช้ภาพตรวจข้อ Secret แล้วไล่ตรวจรายการที่เหลือ: base image, สิทธิ์ process และการสังเกตสุขภาพแอป</p></section>
      <section class="text-section"><h2>คำสั่งต่อยอด</h2><div class="command-list"><div><code>docker image ls</code><span>ดู image ในเครื่อง</span></div><div><code>docker inspect web</code><span>ดูรายละเอียด container แบบ JSON</span></div><div><code>docker compose logs -f</code><span>ติดตาม log ของทั้ง stack</span></div><div><code>docker scout quickview</code><span>ดูภาพรวมช่องโหว่เมื่อมี Docker Scout และสิทธิ์ที่ต้องใช้</span></div></div></section>
      <div class="callout warning"><span>อย่าสับสน</span><p>เว็บเรียนนี้อยู่บน GitHub Pages ซึ่งเสิร์ฟไฟล์ static และไม่สามารถรัน Docker container ให้ผู้ชมเว็บได้ ตัวอย่างในเว็บจึงเป็น simulation</p></div>`,
    lab: 'checklist',
    quiz: { question: 'ถ้าระหว่าง build ต้องอ่าน token สำหรับดึง dependency ส่วนตัว ควรใช้วิธีใด?', options: ['COPY token ลง image', 'ส่งผ่าน ARG', 'BuildKit secret mount'], answer: 2, explain: 'Secret mount ให้ใช้ข้อมูลลับชั่วคราวระหว่าง build โดยไม่เก็บลง image layer' },
    source: 'https://docs.docker.com/build/building/secrets/'
  }
];

const safeGet = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const safeSet = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
const state = { completed: [], answers: safeGet('docker-lab-answers-v1', {}) };
const $ = (selector, root = document) => root.querySelector(selector);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const lessonHref = (lesson) => `#${lesson.id}`;
const storedLearning = safeGet(LEARNING_KEY, {});
const learning = validLearning(storedLearning) ? storedLearning : {};
function syncProgress() {
  state.completed = lessons.filter(l => lessonPassed(learning[l.id], state.answers[l.id] === l.quiz.answer)).map(l => l.id);
  safeSet(LEARNING_KEY, learning); safeSet('docker-lab-progress-v1', state.completed);
}
syncProgress();

function renderNav() {
  const current = location.hash.slice(1).split('?')[0] || 'home';
  $('#lesson-nav').innerHTML = lessons.map((lesson) => `<a href="${lessonHref(lesson)}" class="nav-link ${current === lesson.id ? 'active' : ''}" ${current === lesson.id ? 'aria-current="page"' : ''}><span class="nav-number">${lesson.number}</span><span class="nav-title">${lesson.title}</span><span class="nav-complete">${state.completed.includes(lesson.id) ? '✓' : learning[lesson.id]?.practiced ? '◐' : learning[lesson.id]?.read ? '·' : ''}</span></a>`).join('') + `<a href="#vm" class="nav-link vm-nav-link ${current === 'vm' ? 'active' : ''}" ${current === 'vm' ? 'aria-current="page"' : ''}><span class="nav-number">⌘</span><span class="nav-title">VM Lab</span><span class="nav-complete">↗</span></a>`;
  $('#lesson-nav').insertAdjacentHTML('beforeend', `<a href="#project" class="nav-link ${current === 'project' ? 'active' : ''}" ${current === 'project' ? 'aria-current="page"' : ''}><span class="nav-number">↗</span><span class="nav-title">เส้นทางโปรเจกต์</span></a><a href="#troubleshooting" class="nav-link ${current === 'troubleshooting' ? 'active' : ''}" ${current === 'troubleshooting' ? 'aria-current="page"' : ''}><span class="nav-number">?</span><span class="nav-title">ฝึกแก้ปัญหา</span></a>`);
  $('#progress-count').textContent = `${state.completed.length} / ${lessons.length}`;
  $('#progress-fill').style.width = `${(state.completed.length / lessons.length) * 100}%`;
  $('.progress-track').setAttribute('aria-valuenow', String(state.completed.length));
}

function renderHome() {
  const next = lessons.find((lesson) => !state.completed.includes(lesson.id)) || lessons[0];
  $('#main').innerHTML = `
    <div class="home-page">
      <section class="hero">
        <div class="hero-copy"><div class="eyebrow"><span class="eyebrow-line"></span> DOCKER, EXPLAINED BY DOING</div><h1>เรียน Docker<br><em>แบบลงมือทำ</em></h1><p>เรียนตั้งแต่ container แรก ไปจนถึง Compose, multi-stage build และแนวปฏิบัติที่ใช้จริง ผ่านบทเรียนสั้น ๆ และ lab ที่กดลองได้ทันที</p><div class="hero-actions"><a class="primary-button" href="${lessonHref(next)}">${state.completed.length ? 'เรียนต่อ' : 'เริ่มบทแรก'} <span>↗</span></a><a class="text-button" href="#roadmap">ดูเส้นทางเรียน <span>↓</span></a></div><div class="hero-facts"><span><b>07</b> บทเรียน</span><span><b>07</b> บทพร้อม Diagram</span><span><b>00</b> การติดตั้ง</span></div></div>
        <div class="hero-visual" aria-label="ภาพอธิบาย Dockerfile สร้าง image และเริ่ม container"><div class="visual-top"><span class="visual-signal"></span> HOW DOCKER WORKS <span>● ● ●</span></div><div class="visual-flow"><div class="flow-node file-node"><span class="node-icon">{ }</span><small>01 / RECIPE</small><strong>Dockerfile</strong><span>FROM nginx:alpine</span></div><div class="flow-arrow">→</div><div class="flow-node image-node"><span class="node-icon">▤</span><small>02 / PACKAGE</small><strong>Image</strong><span>immutable layers</span></div><div class="flow-arrow">→</div><div class="flow-node container-node"><span class="node-icon">▣</span><small>03 / PROCESS</small><strong>Container</strong><span><i class="live-dot"></i> running</span></div></div><div class="visual-console"><span>$ docker run -d nginx:alpine</span><span class="console-result">✓ Container is running</span></div></div>
      </section>
      <section class="roadmap" id="roadmap"><div class="section-heading"><div><span class="section-kicker">THE LEARNING PATH</span><h2>จากภาพใหญ่ <em>ไปถึงใช้งานจริง</em></h2></div><p>เริ่มที่พื้นฐาน แล้วค่อยต่อเป็น workflow ที่ใช้ในโปรเจกต์จริง เริ่มบท 1–5 แล้วทำโจทย์ใน VM ให้คล่อง ก่อนต่อบท 6–7 แต่ละบทแยกสถานะอ่าน ทดลอง และทำโจทย์ผ่าน</p></div><div class="roadmap-grid">${lessons.map((lesson) => `<a class="roadmap-item" href="${lessonHref(lesson)}"><div class="roadmap-item-top"><span>${lesson.number} <span class="roadmap-icon">${lesson.icon}</span></span><span class="roadmap-status">${state.completed.includes(lesson.id) ? 'ทำโจทย์ผ่าน ✓' : learning[lesson.id]?.practiced ? 'ทดลองแล้ว' : learning[lesson.id]?.read ? 'อ่านแล้ว' : lesson.time}</span></div><h3>${lesson.title}</h3><p>${lesson.subtitle}</p><span class="roadmap-arrow">↗</span></a>`).join('')}</div></section>
      <div class="curriculum-links curriculum-home-links"><a href="#project">เรียนผ่านโปรเจกต์เดียว ตั้งแต่ Nginx ถึง Compose →</a><a href="#troubleshooting">ฝึกแก้ปัญหา 4 สถานการณ์ →</a></div><section class="bottom-banner"><div><span>READY TO BUILD?</span><h2>ลองฝึกใน VM Lab</h2><p>แก้ไฟล์ สร้าง image เริ่ม container และทดสอบเว็บในเครื่องจำลองที่จำสถานะไว้</p></div><a class="primary-button light" href="#vm">เปิด VM Lab ↗</a></section>
    </div>`;
}

function renderQuiz(lesson) {
  const selected = state.answers[lesson.id];
  return `<section class="quiz" id="quiz"><div class="quiz-top"><span class="quiz-icon">?</span><span>CHECK YOUR UNDERSTANDING</span></div><h2>${lesson.quiz.question}</h2><div class="quiz-options">${lesson.quiz.options.map((option, index) => `<button class="quiz-option ${selected === index ? (index === lesson.quiz.answer ? 'correct' : 'incorrect') : ''}" type="button" data-answer="${index}" ${selected !== undefined ? 'disabled' : ''}><span>${String.fromCharCode(65 + index)}</span>${option}</button>`).join('')}</div>${selected !== undefined ? `<div class="quiz-feedback ${selected === lesson.quiz.answer ? 'success' : 'error'}" role="status"><strong>${selected === lesson.quiz.answer ? 'ตอบถูกแล้ว · ตรวจโจทย์และอธิบายเหตุผลต่อ'  : 'ยังไม่ถูก ลองอ่านคำอธิบายแล้วตอบใหม่'}</strong><p>${lesson.quiz.explain}</p>${selected !== lesson.quiz.answer ? '<button type="button" class="retry-button" id="retry-quiz">ลองอีกครั้ง ↻</button>' : ''}</div>` : ''}</section>`;
}

function renderLessonBody(lesson) {
  return lesson.body.replace(/<figure class="lesson-diagram" data-diagram-id="([^"]+)"[\s\S]*?<\/figure>/g, (_,id) => renderLessonDiagram(id));
}
function renderLesson(lesson) {
  const index = lessons.findIndex((item) => item.id === lesson.id);
  const next = lessons[index + 1];
  $('#main').innerHTML = `<div class="lesson-page"><div class="lesson-breadcrumb"><a href="#home">หน้าแรก</a><span>/</span><span>บทที่ ${lesson.number}</span></div><section class="lesson-header"><div class="lesson-number">${lesson.number}</div><div><div class="lesson-meta"><span>${lesson.level}</span><span>●</span><span>${lesson.time}</span></div><h1>${lesson.title}</h1><p>${lesson.lead}</p></div></section><div class="lesson-layout"><article class="lesson-article">${['workflow','ship'].includes(lesson.id)?'<div class="callout"><span>บทต่อยอด · หลังพื้นฐาน 1–5</span><p>ควร build, run, อ่าน logs และทดสอบ volume/Compose ใน VM ได้ก่อน บทนี้ใช้ Diagram ฝึกหลักการ ตัว VM ยังไม่รัน multi-stage, Watch หรือ secret mount</p></div>':''}${renderPrediction(lesson.id, learning[lesson.id])}${renderLessonBody(lesson)}<button type="button" id="read-at-end">อ่านจบแล้ว → ทำโจทย์ต่อ</button>${lessonProjectLink(lesson.id)}<div class="lesson-source">อ่านเพิ่มเติม: <a href="${lesson.source}" target="_blank" rel="noopener noreferrer">Docker Docs ↗</a></div></article><aside class="lab-column" aria-label="โจทย์และความคืบหน้า">${renderLearningTask(lesson.id, learning[lesson.id])}</aside></div>${renderQuiz(lesson)}<section class="learning-bridge"><h2>ต่อจากตัวจำลองสู่ Docker จริง</h2><p>เมื่อทำบท 1–5 ได้แล้ว ให้ทำโปรเจกต์เดิมบนเครื่องที่มี Docker: สร้าง index.html และ Dockerfile → build → run → เปิด localhost:8080 → ทดสอบ volume → Compose ตัวจำลองไม่ทดสอบการติดตั้ง สิทธิ์เครื่อง SQL หรือ auth จริง</p><a href="https://docs.docker.com/get-started/" target="_blank" rel="noopener noreferrer">เริ่มทดลองบน Docker จริงตามเอกสารทางการ ↗</a></section><div class="lesson-end"><button type="button" id="reset-lesson">เริ่มบทนี้ใหม่ ↻</button><a href="#home">← กลับหน้าหลัก</a>${next ? `<a href="${lessonHref(next)}">บทถัดไป: ${next.title} →</a>` : '<a href="#sources">ดูแหล่งอ้างอิงทั้งหมด →</a>'}</div></div>`;
}

function renderSources() {
  const sources = [
    ['Get started / concepts', 'https://docs.docker.com/get-started/'],
    ['What is a container?', 'https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-a-container/'],
    ['Building best practices', 'https://docs.docker.com/build/building/best-practices/'],
    ['Volumes', 'https://docs.docker.com/engine/storage/volumes/'],
    ['Compose networking', 'https://docs.docker.com/compose/how-tos/networking/'],
    ['Compose Watch', 'https://docs.docker.com/compose/how-tos/file-watch/'],
    ['Multi-stage builds', 'https://docs.docker.com/build/building/multi-stage/'],
    ['Build secrets', 'https://docs.docker.com/build/building/secrets/'],
    ['GitHub Pages deployment', 'https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site']
  ];
  $('#main').innerHTML = `<div class="sources-page"><a class="back-link" href="#home">← กลับหน้าหลัก</a><span class="section-kicker">REFERENCES</span><h1>แหล่งอ้างอิง</h1><p>เนื้อหาตรวจเทียบเอกสารทางการ ณ 3 ตุลาคม 2026 คำสั่งและเวอร์ชันอาจเปลี่ยนในอนาคต จึงควรดูเอกสารล่าสุดก่อนใช้ใน production</p><div class="source-list">${sources.map(([title,url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer"><span>${title}</span><span>↗</span></a>`).join('')}</div></div>`;
}

function render() {
  const route = location.hash.slice(1).split('?')[0] || 'home';
  const lesson = lessons.find((item) => item.id === route);
  renderNav();
  if (lesson) { renderLesson(lesson); }
  else if (route === 'vm') {
    renderVMLab($('#main'));

  }
  else if (route === 'project') renderProject($('#main'));
  else if (route === 'troubleshooting') renderTroubleshooting($('#main'));
  else if (route === 'sources') renderSources();
  else renderHome();
  window.scrollTo({ top: 0, behavior: 'instant' });
  closeMenu();
}

function closeMenu() { document.body.classList.remove('menu-open'); $('#menu-button').setAttribute('aria-expanded','false'); $('#sidebar-scrim').hidden = true; }

document.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;
  const lesson = lessons.find((item) => item.id === location.hash.slice(1));
  if (target.id === 'menu-button') { const open = !document.body.classList.contains('menu-open'); document.body.classList.toggle('menu-open', open); target.setAttribute('aria-expanded', String(open)); $('#sidebar-scrim').hidden = !open; return; }
  if (!lesson) return;
  const progress = learning[lesson.id] ||= {};
  if (target.id === 'mark-read' || target.id === 'read-at-end') { progress.read=true; syncProgress(); renderNav(); renderLesson(lesson); document.querySelector('.learning-guide').scrollIntoView({block:'start'}); return; }
  if (target.dataset.prediction !== undefined || target.dataset.transfer !== undefined) {
    const field=target.dataset.prediction !== undefined?'prediction':'transfer';
    progress[field]=Number(target.dataset[field]); if(field==='transfer')progress.task=false;
    syncProgress(); renderNav(); renderLesson(lesson); document.querySelector(field==='prediction'?'.learning-prediction':'.learning-guide').scrollIntoView({block:'start'}); return;
  }
  if (target.id === 'check-learning-task') {
    progress.task=Boolean(checkTask(lesson.id,getVMState(),progress)); syncProgress(); renderNav();
    document.querySelector('.learning-status').innerHTML=`<span>${progress.read?'✓':'○'} อ่านแล้ว</span><span>${progress.practiced?'✓':'○'} ทดลอง Diagram แล้ว</span><span>${progress.task?'✓':'○'} ตรวจโจทย์ผ่าน</span>`;
    document.querySelector('#learning-task-feedback').textContent=progress.task?'ตรวจโจทย์ผ่าน ✓ · เขียนคำอธิบายและตอบคำถามท้ายบทต่อ':'ยังไม่ผ่าน: ตรวจเงื่อนไขโจทย์ให้ครบ แล้วกลับมาตรวจใหม่'; return;
  }
  if (target.id === 'reset-lesson') {
    if (!confirm('เริ่มบทนี้ใหม่? คำตอบและเครื่องหมายผ่านของบทนี้จะถูกล้าง งานใน VM ยังอยู่')) return;
    for(const match of lesson.body.matchAll(/data-diagram-id="([^"]+)"/g)) resetLessonDiagram(match[1]);
    delete learning[lesson.id]; safeSet(LEARNING_KEY, learning); delete state.answers[lesson.id]; state.completed = state.completed.filter(id => id !== lesson.id);
    safeSet('docker-lab-answers-v1', state.answers); safeSet('docker-lab-progress-v1', state.completed);
    renderNav(); renderLesson(lesson); return;
  }
  if (target.dataset.answer !== undefined) {
    state.answers[lesson.id] = Number(target.dataset.answer); safeSet('docker-lab-answers-v1', state.answers);
    syncProgress();
    renderNav(); renderLesson(lesson); $('#quiz').scrollIntoView({ block: 'center' });
  }
  if (target.id === 'retry-quiz') { delete state.answers[lesson.id]; syncProgress();renderNav(); safeSet('docker-lab-answers-v1', state.answers); renderLesson(lesson); $('#quiz').scrollIntoView({ block: 'center' }); }

});

document.addEventListener('diagram-practiced', (event) => {
  const id=location.hash.slice(1); if(!tasks[id])return;
  const p=learning[id] ||= {}; p.practiced=true;
  const {id:diagram,state:played}=event.detail;
  const evidence=new Set(p.explored || []);
  if(diagram==='mental-model' && played.source>played.image && played.image>0 && played.container===played.image && played.status==='running')evidence.add('snapshot');
  if(diagram==='workflow-build' && played.copied)evidence.add('dist');
  if(diagram==='workflow-watch' && event.detail.action==='edit')evidence.add(`watch-${played.watch}`);
  if(diagram==='ship-secret' && played.leaked)evidence.add('leaked');
  if(diagram==='ship-secret' && played.secret&&!played.leaked)evidence.add('mounted');
  p.explored=[...evidence]; syncProgress(); renderNav();
  const status=document.querySelector('.learning-status');
  if(status)status.innerHTML=`<span>${learning[id].read?'✓':'○'} อ่านแล้ว</span><span>✓ ทดลอง Diagram แล้ว</span><span>${learning[id].task?'✓':'○'} ตรวจโจทย์ผ่าน</span>`;
});
document.addEventListener('input', (event) => {
  if(event.target.id==='learning-reflection') { const id=location.hash.slice(1); (learning[id] ||= {}).reflection=event.target.value; learning[id].reflected=false; const checkbox=document.querySelector('#learning-reflected'); if(checkbox)checkbox.checked=false; syncProgress();renderNav(); }


});
document.addEventListener('change', (event) => { if(event.target.id==='learning-reflected') { const id=location.hash.slice(1); (learning[id] ||= {}).reflected=event.target.checked; syncProgress();renderNav(); } });
$('#sidebar-scrim').addEventListener('click', closeMenu);
window.addEventListener('hashchange', render);
render();
