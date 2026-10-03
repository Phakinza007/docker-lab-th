const lessons = [
  {
    id: 'mental-model', number: '01', icon: '◫', title: 'ภาพใหญ่ของ Docker', subtitle: 'Image, container และ Docker Engine ต่างกันอย่างไร', time: '8 นาที', level: 'เริ่มต้น',
    lead: 'เริ่มจากโมเดลที่ถูกต้อง: image คือแม่แบบที่สร้างไว้ ส่วน container คือ process ที่เริ่มทำงานจาก image นั้น',
    body: `
      <section class="text-section"><h2>คิดเป็น 3 ชั้น</h2><p><strong>Dockerfile</strong> เป็นสูตรสร้าง image · <strong>image</strong> เป็นแพ็กเกจแบบอ่านอย่างเดียวที่รวมไฟล์และการตั้งค่า · <strong>container</strong> เป็น process ที่แยกสภาพแวดล้อมและมี writable layer ของตัวเอง</p><p><strong>Docker Engine</strong> คือระบบที่รับคำสั่งและจัดการ image, container, network และ volume บนเครื่อง เริ่ม container ใหม่จาก image เดิมได้หลายตัว แต่การแก้ไฟล์ใน container ตัวหนึ่งไม่เปลี่ยน image และไม่ส่งผลไปยัง container อีกตัว</p></section>
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
      <section class="text-section"><h2>คำสั่งหลักที่ใช้ทุกวัน</h2><div class="command-list"><div><code>docker run -d --name web -p 8080:80 nginx:alpine</code><span>สร้างและเริ่ม Nginx เบื้องหลัง; port 8080 ของ host ไปยัง 80 ใน container</span></div><div><code>docker ps</code><span>ดู container ที่กำลังทำงาน; เติม <code>-a</code> เพื่อดูทั้งหมด</span></div><div><code>docker logs web</code><span>อ่าน output ของ process หลัก</span></div><div><code>docker exec -it web sh</code><span>เปิด shell ใน container ที่กำลังทำงาน</span></div><div><code>docker stop web</code><span>หยุด process อย่างสุภาพ</span></div><div><code>docker rm web</code><span>ลบ container หลังหยุดแล้ว</span></div></div></section>
      <div class="callout warning"><span>ระวัง</span><p><code>docker run</code> สร้าง container ใหม่เสมอ ถ้าจะเริ่มตัวเดิมอีกครั้งใช้ <code>docker start web</code></p></div>`,
    lab: 'terminal',
    quiz: { question: 'ต้องการดู container ที่หยุดไปแล้วด้วย ควรใช้คำสั่งใด?', options: ['docker ps', 'docker ps -a', 'docker logs -a'], answer: 1, explain: 'docker ps แสดงเฉพาะที่กำลังทำงาน ส่วน -a แสดงทุกสถานะ' },
    source: 'https://docs.docker.com/reference/cli/docker/container/'
  },
  {
    id: 'dockerfile', number: '03', icon: '▤', title: 'สร้าง Image', subtitle: 'Dockerfile, layers, cache และ .dockerignore', time: '14 นาที', level: 'ลงมือทำ',
    lead: 'Dockerfile เปลี่ยนวิธีติดตั้งแอปที่ทำซ้ำด้วยมือ ให้กลายเป็น image ที่สร้างใหม่ได้',
    body: `
      <section class="text-section"><h2>สูตรสร้างเว็บ static</h2><pre class="code-block"><code>FROM nginx:alpine
COPY ./site/ /usr/share/nginx/html/
EXPOSE 80</code></pre><p>บันทึกเป็นไฟล์ชื่อ <code>Dockerfile</code> แล้วรัน <code>docker build -t my-site:1.0 .</code> จุดท้ายคือ build context ที่ส่งให้ builder</p></section>
      <section class="text-section"><h2>จัดลำดับเพื่อใช้ cache</h2><p>สำหรับแอป Node ให้ <code>COPY package*.json ./</code> และติดตั้ง dependencies ก่อน <code>COPY . .</code> การแก้ source code จะไม่ทำให้ขั้นติดตั้งแพ็กเกจต้องรันใหม่ทุกครั้ง หากไฟล์แพ็กเกจไม่เปลี่ยน</p><p>ใช้ <code>.dockerignore</code> ตัด <code>node_modules</code>, <code>.git</code>, ไฟล์ลับ และสิ่งที่ไม่เกี่ยวข้องออกจาก build context</p></section>
      <div class="callout"><span>ในชั้นเรียน INT134</span><p>การใช้ <code>docker cp</code> ใส่ไฟล์เว็บใน container เหมาะกับการทดลอง แต่ถ้าต้องการทำซ้ำ ให้ <code>COPY</code> ไฟล์ลง image ผ่าน Dockerfile</p></div>`,
    lab: 'cache',
    quiz: { question: 'ถ้าต้องการให้ขั้น npm ci ใช้ cache เมื่อแก้เพียง app.js ควรคัดลอกอะไรเข้ามาก่อน?', options: ['COPY . .', 'COPY package*.json ./', 'COPY app.js ./'], answer: 1, explain: 'คัดลอกไฟล์ dependency manifest ก่อน แล้วค่อยติดตั้งแพ็กเกจและคัดลอก source' },
    source: 'https://docs.docker.com/build/building/best-practices/'
  },
  {
    id: 'storage', number: '04', icon: '▣', title: 'ข้อมูลที่ต้องอยู่ต่อ', subtitle: 'Writable layer, named volume และ bind mount', time: '10 นาที', level: 'แนวคิดสำคัญ',
    lead: 'Container ถูกสร้างใหม่ได้เสมอ ข้อมูลฐานข้อมูลจึงไม่ควรอยู่เฉพาะใน writable layer ของ container',
    body: `
      <section class="text-section"><h2>เลือกที่เก็บให้ถูก</h2><div class="compare-grid"><div><h3>Writable layer</h3><p>อยู่กับ container ตัวนั้น เหมาะกับไฟล์ชั่วคราว ลบ container แล้วข้อมูลส่วนนี้หาย</p></div><div><h3>Named volume</h3><p>Docker จัดการให้ อายุแยกจาก container เหมาะกับข้อมูลที่แอปสร้าง เช่นฐานข้อมูล</p></div><div><h3>Bind mount</h3><p>ผูก path จาก host เข้ากับ container เหมาะกับ source code ระหว่างพัฒนา</p></div></div></section>
      <section class="text-section"><h2>ตัวอย่าง</h2><pre class="code-block"><code>docker volume create db-data
docker run -d --name db \\
  -e POSTGRES_PASSWORD=demo-only \\
  -v db-data:/var/lib/postgresql \\
  postgres:18</code></pre><p>รหัสผ่าน <code>demo-only</code> ใช้เพื่อทดลองบนเครื่องเท่านั้น ในระบบจริงให้จัดการ secret อย่างเหมาะสม และอย่า commit ลง repository</p></section>`,
    lab: 'volume',
    quiz: { question: 'ต้องการเก็บข้อมูลฐานข้อมูลไว้หลังลบ container ควรใช้สิ่งใด?', options: ['EXPOSE', 'Named volume', 'docker logs'], answer: 1, explain: 'Named volume มีวงจรชีวิตแยกจาก container และคงข้อมูลไว้เมื่อสร้าง container ใหม่' },
    source: 'https://docs.docker.com/engine/storage/volumes/'
  },
  {
    id: 'compose', number: '05', icon: '⌘', title: 'หลาย Service ด้วย Compose', subtitle: 'compose.yaml, network และ service name', time: '13 นาที', level: 'ทำงานร่วมกัน',
    lead: 'Compose เก็บการตั้งค่า app และ database ในไฟล์เดียว แล้วสร้าง network ให้ service ติดต่อกันด้วยชื่อ',
    body: `
      <section class="text-section"><h2>Compose file ตัวอย่าง</h2><pre class="code-block"><code>services:
  web:
    build: .
    ports:
      - "8080:80"
  db:
    image: postgres:18
    environment:
      POSTGRES_PASSWORD: \${DB_PASSWORD}
    volumes:
      - db-data:/var/lib/postgresql

volumes:
  db-data:</code></pre><p>ตั้งค่า <code>DB_PASSWORD</code> ใน environment หรือไฟล์ <code>.env</code> ที่ไม่ commit ก่อนรัน จากนั้นใช้ <code>docker compose up -d --build</code> เพื่อเริ่ม service และ <code>docker compose down</code> เพื่อหยุดและลบ container กับ network ที่ Compose สร้าง สำหรับ PostgreSQL 18 ให้ mount volume ที่ <code>/var/lib/postgresql</code></p></section>
      <div class="callout warning"><span>ชื่อที่ใช้เชื่อมต่อ</span><p>จาก container <code>web</code> ให้เรียกฐานข้อมูลที่ <code>db:5432</code> ไม่ใช่ <code>localhost:5432</code> เพราะ localhost ภายใน container คือ container ตัวเอง</p></div>
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
COPY --from=build /app/dist/ /usr/share/nginx/html/</code></pre><p>ขั้นแรกใช้เครื่องมือ build แต่ image สุดท้ายคัดลอกเพียงไฟล์ที่ต้องเสิร์ฟ จึงไม่ต้องแบก Node และ dependencies สำหรับ build ไปด้วย</p></section>
      <section class="text-section"><h2>Compose Watch</h2><p>เพิ่ม <code>develop.watch</code> ใน service แล้วใช้ <code>docker compose up --watch</code> เพื่อ sync หรือ rebuild เมื่อไฟล์เปลี่ยน เหมาะกับการพัฒนา; ต้องใช้ Compose รุ่นที่รองรับ และ service ที่ sync ต้องเขียนไฟล์เป้าหมายได้</p></section>
      <div class="callout"><span>BuildKit</span><p>Docker ใช้ BuildKit เป็น builder backend ใน workflow ปัจจุบัน มันช่วยเรื่อง cache, build graph และ multi-stage builds</p></div>`,
    lab: 'workflow',
    quiz: { question: 'Multi-stage build ช่วยอะไรกับ image สุดท้าย?', options: ['รวม build tools ไว้ให้ครบที่สุด', 'เลือกคัดลอกเฉพาะ artifact ที่ใช้รัน', 'ทำให้ไม่ต้องเขียน Dockerfile'], answer: 1, explain: 'ขั้น runtime สามารถคัดลอกเฉพาะผลลัพธ์จากขั้น build เพื่อลดสิ่งที่ไม่จำเป็น' },
    source: 'https://docs.docker.com/build/building/multi-stage/'
  },
  {
    id: 'ship', number: '07', icon: '↗', title: 'พร้อมใช้งานจริง', subtitle: 'Security, secrets และการตรวจสอบ', time: '11 นาที', level: 'แนวปฏิบัติ',
    lead: 'ก่อนส่งงานหรือ deploy ให้ดูสิ่งที่ image มีอยู่ วิธีจัดการข้อมูลลับ และวิธีตรวจสุขภาพของ service',
    body: `
      <section class="text-section"><h2>รายการตรวจสั้น ๆ</h2><ol class="step-list"><li><b>ใช้ base image ที่ดูแลอยู่</b><span>อัปเดตและเลือก tag ที่ตั้งใจใช้ ตรวจช่องโหว่เป็นระยะ</span></li><li><b>ไม่ใส่ secret ใน image</b><span>อย่า COPY .env หรือส่ง token ผ่าน build ARG/ENV; ใช้ BuildKit secret mounts เมื่อจำเป็นระหว่าง build</span></li><li><b>ให้สิทธิ์เท่าที่ต้องใช้</b><span>กำหนด user ที่ไม่ใช่ root เมื่อแอปรองรับ และพิจารณา rootless mode ตามสภาพแวดล้อม</span></li><li><b>รู้วิธีสังเกตปัญหา</b><span>ดู logs, ตรวจสถานะ, ตั้ง healthcheck และทดสอบการ restart</span></li></ol></section>
      <section class="text-section"><h2>คำสั่งต่อยอด</h2><div class="command-list"><div><code>docker image ls</code><span>ดู image ในเครื่อง</span></div><div><code>docker inspect web</code><span>ดูรายละเอียด container แบบ JSON</span></div><div><code>docker compose logs -f</code><span>ติดตาม log ของทั้ง stack</span></div><div><code>docker scout quickview</code><span>ดูภาพรวมช่องโหว่เมื่อมี Docker Scout และสิทธิ์ที่ต้องใช้</span></div></div></section>
      <div class="callout warning"><span>อย่าสับสน</span><p>เว็บเรียนนี้อยู่บน GitHub Pages ซึ่งเสิร์ฟไฟล์ static และไม่สามารถรัน Docker container ให้ผู้ชมเว็บได้ ตัวอย่างในเว็บจึงเป็น simulation</p></div>`,
    lab: 'checklist',
    quiz: { question: 'ถ้าระหว่าง build ต้องอ่าน token สำหรับดึง dependency ส่วนตัว ควรใช้วิธีใด?', options: ['COPY token ลง image', 'ส่งผ่าน ARG', 'BuildKit secret mount'], answer: 2, explain: 'Secret mount ให้ใช้ข้อมูลลับชั่วคราวระหว่าง build โดยไม่เก็บลง image layer' },
    source: 'https://docs.docker.com/build/building/secrets/'
  }
];

const safeGet = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const safeSet = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
const state = { completed: safeGet('docker-lab-progress-v1', []), answers: safeGet('docker-lab-answers-v1', {}), terminal: { running: false, exists: false, history: [] }, storage: { layer: 'hello', volume: 'hello', useVolume: false, recreated: false }, cache: 'source', network: null, model: 'dockerfile', workflow: 'multi', checks: new Set() };
const $ = (selector, root = document) => root.querySelector(selector);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const lessonHref = (lesson) => `#${lesson.id}`;

function renderNav() {
  const current = location.hash.slice(1) || 'home';
  $('#lesson-nav').innerHTML = lessons.map((lesson) => `<a href="${lessonHref(lesson)}" class="nav-link ${current === lesson.id ? 'active' : ''}" ${current === lesson.id ? 'aria-current="page"' : ''}><span class="nav-number">${lesson.number}</span><span class="nav-title">${lesson.title}</span><span class="nav-complete">${state.completed.includes(lesson.id) ? '✓' : ''}</span></a>`).join('');
  $('#progress-count').textContent = `${state.completed.length} / ${lessons.length}`;
  $('#progress-fill').style.width = `${(state.completed.length / lessons.length) * 100}%`;
  $('.progress-track').setAttribute('aria-valuenow', String(state.completed.length));
}

function renderHome() {
  const next = lessons.find((lesson) => !state.completed.includes(lesson.id)) || lessons[0];
  $('#main').innerHTML = `
    <div class="home-page">
      <section class="hero">
        <div class="hero-copy"><div class="eyebrow"><span class="eyebrow-line"></span> DOCKER, EXPLAINED BY DOING</div><h1>เรียน Docker<br><em>แบบลงมือทำ</em></h1><p>เรียนตั้งแต่ container แรก ไปจนถึง Compose, multi-stage build และแนวปฏิบัติที่ใช้จริง ผ่านบทเรียนสั้น ๆ และ lab ที่กดลองได้ทันที</p><div class="hero-actions"><a class="primary-button" href="${lessonHref(next)}">${state.completed.length ? 'เรียนต่อ' : 'เริ่มบทแรก'} <span>↗</span></a><a class="text-button" href="#roadmap">ดูเส้นทางเรียน <span>↓</span></a></div><div class="hero-facts"><span><b>07</b> บทเรียน</span><span><b>07</b> lab โต้ตอบ</span><span><b>00</b> การติดตั้ง</span></div></div>
        <div class="hero-visual" aria-label="ภาพอธิบาย Dockerfile สร้าง image และเริ่ม container"><div class="visual-top"><span class="visual-signal"></span> HOW DOCKER WORKS <span>● ● ●</span></div><div class="visual-flow"><div class="flow-node file-node"><span class="node-icon">{ }</span><small>01 / RECIPE</small><strong>Dockerfile</strong><span>FROM nginx:alpine</span></div><div class="flow-arrow">→</div><div class="flow-node image-node"><span class="node-icon">▤</span><small>02 / PACKAGE</small><strong>Image</strong><span>immutable layers</span></div><div class="flow-arrow">→</div><div class="flow-node container-node"><span class="node-icon">▣</span><small>03 / PROCESS</small><strong>Container</strong><span><i class="live-dot"></i> running</span></div></div><div class="visual-console"><span>$ docker run -d nginx:alpine</span><span class="console-result">✓ Container is running</span></div></div>
      </section>
      <section class="roadmap" id="roadmap"><div class="section-heading"><div><span class="section-kicker">THE LEARNING PATH</span><h2>จากภาพใหญ่ <em>ไปถึงใช้งานจริง</em></h2></div><p>เริ่มที่พื้นฐาน แล้วค่อยต่อเป็น workflow ที่ใช้ในโปรเจกต์จริง แต่ละบทมีคำถามตรวจความเข้าใจ</p></div><div class="roadmap-grid">${lessons.map((lesson) => `<a class="roadmap-item" href="${lessonHref(lesson)}"><div class="roadmap-item-top"><span>${lesson.number} <span class="roadmap-icon">${lesson.icon}</span></span><span class="roadmap-status">${state.completed.includes(lesson.id) ? 'เรียนแล้ว ✓' : lesson.time}</span></div><h3>${lesson.title}</h3><p>${lesson.subtitle}</p><span class="roadmap-arrow">↗</span></a>`).join('')}</div></section>
      <section class="bottom-banner"><div><span>READY TO BUILD?</span><h2>รันคำสั่งแรกโดยไม่ต้องติดตั้ง Docker</h2><p>Terminal ในบทที่ 2 เป็นตัวจำลองที่ปลอดภัยและเริ่มใหม่ได้ทุกเมื่อ</p></div><a class="primary-button light" href="#cli">เปิด Terminal Lab ↗</a></section>
    </div>`;
}

function renderQuiz(lesson) {
  const selected = state.answers[lesson.id];
  return `<section class="quiz" id="quiz"><div class="quiz-top"><span class="quiz-icon">?</span><span>CHECK YOUR UNDERSTANDING</span></div><h2>${lesson.quiz.question}</h2><div class="quiz-options">${lesson.quiz.options.map((option, index) => `<button class="quiz-option ${selected === index ? (index === lesson.quiz.answer ? 'correct' : 'incorrect') : ''}" type="button" data-answer="${index}" ${selected !== undefined ? 'disabled' : ''}><span>${String.fromCharCode(65 + index)}</span>${option}</button>`).join('')}</div>${selected !== undefined ? `<div class="quiz-feedback ${selected === lesson.quiz.answer ? 'success' : 'error'}" role="status"><strong>${selected === lesson.quiz.answer ? 'ถูกต้อง! เก็บบทนี้แล้ว' : 'ยังไม่ถูก ลองอ่านคำอธิบายแล้วตอบใหม่'}</strong><p>${lesson.quiz.explain}</p>${selected !== lesson.quiz.answer ? '<button type="button" class="retry-button" id="retry-quiz">ลองอีกครั้ง ↻</button>' : ''}</div>` : ''}</section>`;
}

function renderLesson(lesson) {
  const index = lessons.findIndex((item) => item.id === lesson.id);
  const next = lessons[index + 1];
  $('#main').innerHTML = `<div class="lesson-page"><div class="lesson-breadcrumb"><a href="#home">หน้าแรก</a><span>/</span><span>บทที่ ${lesson.number}</span></div><section class="lesson-header"><div class="lesson-number">${lesson.number}</div><div><div class="lesson-meta"><span>${lesson.level}</span><span>●</span><span>${lesson.time}</span></div><h1>${lesson.title}</h1><p>${lesson.lead}</p></div></section><div class="lesson-layout"><article class="lesson-article">${lesson.body}<div class="lesson-source">อ่านเพิ่มเติม: <a href="${lesson.source}" target="_blank" rel="noopener noreferrer">Docker Docs ↗</a></div></article><aside class="lab-column" aria-label="พื้นที่ทดลอง"><div class="lab-card"><div class="lab-heading"><div><span class="lab-spark">✳</span><span>INTERACTIVE LAB</span></div><span>ลองกดได้</span></div>${renderLab(lesson.lab)}</div></aside></div>${renderQuiz(lesson)}<div class="lesson-end"><a href="#home">← กลับหน้าหลัก</a>${next ? `<a href="${lessonHref(next)}">บทถัดไป: ${next.title} →</a>` : '<a href="#sources">ดูแหล่งอ้างอิงทั้งหมด →</a>'}</div></div>`;
}

function renderLab(kind) {
  switch (kind) {
    case 'model': return `<h3>กดเพื่อสำรวจแต่ละชั้น</h3><div class="model-switch" role="group" aria-label="เลือกส่วนประกอบ">${[['dockerfile','Dockerfile'],['image','Image'],['container','Container']].map(([id,label]) => `<button type="button" data-model="${id}" class="${state.model === id ? 'selected' : ''}">${label}</button>`).join('')}</div><div id="model-display"></div>`;
    case 'terminal': return `<h3>Terminal จำลอง</h3><p class="lab-intro">ภารกิจ: เริ่ม Nginx → ดูสถานะ → หยุด container</p><div class="terminal"><div class="terminal-bar"><span><i></i><i></i><i></i></span> docker-lab ~ <button id="reset-terminal" type="button" aria-label="ล้าง terminal">↻</button></div><div class="terminal-output" id="terminal-output" aria-live="polite"></div><form id="terminal-form" autocomplete="off"><label for="terminal-input">$</label><input id="terminal-input" name="command" aria-label="คำสั่ง Docker" placeholder="พิมพ์ docker ..." spellcheck="false"/><button type="submit">Run ↵</button></form></div><div class="command-chips">${['docker run -d --name web -p 8080:80 nginx:alpine','docker ps','docker logs web','docker stop web'].map((cmd) => `<button type="button" data-command="${cmd}">${cmd}</button>`).join('')}</div><p class="lab-note">จำลองเฉพาะคำสั่งในบทนี้ ไม่มีการรัน Docker จริง</p>`;
    case 'cache': return `<h3>อะไรทำให้ cache หาย?</h3><p class="lab-intro">เลือกไฟล์ที่เปลี่ยน แล้วดูว่าขั้นใดต้องสร้างใหม่</p><div class="choice-row"><button type="button" data-cache="source" class="${state.cache === 'source' ? 'selected' : ''}">แก้ app.js</button><button type="button" data-cache="package" class="${state.cache === 'package' ? 'selected' : ''}">แก้ package-lock.json</button></div><div class="layer-stack" id="cache-display"></div>`;
    case 'volume': return `<h3>ลบ container แล้วข้อมูลอยู่ไหม?</h3><p class="lab-intro">เลือกที่เก็บ แก้ข้อความ แล้วกดสร้าง container ใหม่</p><div class="choice-row"><button type="button" data-storage="layer" class="${!state.storage.useVolume ? 'selected' : ''}">Writable layer</button><button type="button" data-storage="volume" class="${state.storage.useVolume ? 'selected' : ''}">Named volume</button></div><label class="lab-field">ข้อมูลในแอป<input id="storage-input" value="${escapeHTML(state.storage.useVolume ? state.storage.volume : state.storage.layer)}" maxlength="40" /></label><button class="lab-action" type="button" id="recreate-container">↻ ลบและสร้าง container ใหม่</button><div id="storage-result" class="lab-result" aria-live="polite"></div>`;
    case 'network': return `<h3>web ต้องเรียก db ที่ไหน?</h3><p class="lab-intro">เลือก host ที่แอป web ควรใช้เมื่อติดต่อ PostgreSQL</p><div class="network-map"><div class="network-service">🌐<strong>web</strong><small>container</small></div><span>→ ? →</span><div class="network-service database">▣<strong>db</strong><small>container</small></div></div><div class="choice-row"><button type="button" data-network="localhost" class="${state.network === 'localhost' ? 'selected' : ''}">localhost:5432</button><button type="button" data-network="db" class="${state.network === 'db' ? 'selected' : ''}">db:5432</button></div><div id="network-result" class="lab-result" aria-live="polite"></div>`;
    case 'workflow': return `<h3>เลือก workflow</h3><div class="choice-row"><button type="button" data-workflow="multi" class="${state.workflow === 'multi' ? 'selected' : ''}">Multi-stage</button><button type="button" data-workflow="watch" class="${state.workflow === 'watch' ? 'selected' : ''}">Compose Watch</button></div><div id="workflow-display"></div>`;
    case 'checklist': return `<h3>ตรวจ image ก่อนปล่อย</h3><p class="lab-intro">กดรายการที่ตรวจแล้ว</p><div class="check-list">${[['base','Base image ได้รับการดูแล'],['secret','ไม่มี secret ใน image'],['user','สิทธิ์ process เหมาะสม'],['health','ตรวจ logs และ healthcheck']].map(([id,label]) => `<label><input type="checkbox" data-check="${id}" ${state.checks.has(id) ? 'checked' : ''}/><span>${label}</span></label>`).join('')}</div><div id="check-result" class="lab-result"></div>`;
  }
}

function updateLab(kind) {
  if (kind === 'model') {
    const models = { dockerfile: ['สูตรที่อ่านได้', 'Dockerfile ระบุ base image และขั้นตอน COPY, RUN, CMD เพื่อสร้าง image แบบทำซ้ำได้', 'Dockerfile → docker build'], image: ['แม่แบบที่เปลี่ยนไม่ได้', 'Image รวมไฟล์และการตั้งค่าเป็น layers หากต้องแก้ ให้ build image ใหม่', 'Image → docker run'], container: ['process ที่กำลังทำงาน', 'Container เป็น instance จาก image มี writable layer และวงจรชีวิตของตัวเอง', 'Container → logs / stop / rm'] };
    const [title, body, footer] = models[state.model];
    $('#model-display').innerHTML = `<div class="model-display"><div class="model-glyph">${{dockerfile:'{ }',image:'▤',container:'▣'}[state.model]}</div><h4>${title}</h4><p>${body}</p><small>${footer}</small></div>`;
  }
  if (kind === 'terminal') {
    const output = $('#terminal-output');
    output.innerHTML = state.terminal.history.length ? state.terminal.history.map((entry) => `<div class="terminal-entry"><span class="prompt">$ ${escapeHTML(entry.cmd)}</span><pre>${escapeHTML(entry.output)}</pre></div>`).join('') : '<div class="terminal-welcome">Docker Lab simulator ready. ลองพิมพ์คำสั่งแรก ↓</div>';
    output.scrollTop = output.scrollHeight;
  }
  if (kind === 'cache') {
    const changedPackage = state.cache === 'package';
    $('#cache-display').innerHTML = [['COPY package*.json ./', changedPackage],['RUN npm ci', changedPackage],['COPY . .', true],['RUN npm run build', true]].map(([label, rebuild], index) => `<div class="layer-row"><span>${String(index + 1).padStart(2, '0')}</span><code>${label}</code><b class="${rebuild ? 'rebuild' : 'cached'}">${rebuild ? 'REBUILD' : 'CACHED'}</b></div>`).join('') + `<p>${changedPackage ? 'ไฟล์ dependencies เปลี่ยน → ขั้น npm ci และขั้นหลังจากนั้นต้องทำใหม่' : 'source เปลี่ยน → สองขั้นแรกยังใช้ cache ได้'}</p>`;
  }
  if (kind === 'volume') {
    $('#storage-result').innerHTML = state.storage.recreated ? (state.storage.useVolume ? '<strong class="good">ข้อมูลยังอยู่ ✓</strong><p>Named volume แยกอายุจาก container ใหม่จึงอ่านข้อมูลเดิมได้</p>' : '<strong class="bad">ข้อมูลหายไป</strong><p>Writable layer เดิมถูกลบพร้อม container; ตัวใหม่เริ่มจาก image</p>') : '<p>ลองแก้ข้อมูล แล้วกดสร้าง container ใหม่เพื่อดูผล</p>';
  }
  if (kind === 'network') {
    $('#network-result').innerHTML = state.network === null ? '<p>เลือกคำตอบด้านบน</p>' : state.network === 'db' ? '<strong class="good">ถูกต้อง ✓</strong><p>Compose ให้ service ค้นกันด้วยชื่อบน network ภายใน</p>' : '<strong class="bad">ยังไม่ใช่</strong><p>localhost ใน web container ชี้กลับมาที่ web เอง</p>';
  }
  if (kind === 'workflow') {
    $('#workflow-display').innerHTML = state.workflow === 'multi' ? '<div class="workflow-panel"><span>BUILD STAGE</span><b>Node + tools + source</b><i>↓ COPY --from=build</i><span>RUNTIME STAGE</span><b>Nginx + dist/ เท่านั้น</b><p>เหมาะเมื่ออยากแยกเครื่องมือ build ออกจากสิ่งที่รันจริง</p></div>' : '<div class="workflow-panel"><span>FILE CHANGED</span><b>แก้ source ในเครื่อง</b><i>↓ sync / rebuild</i><span>RUNNING SERVICE</span><b>อัปเดตอัตโนมัติ</b><p>ใช้ระหว่างพัฒนา: <code>docker compose up --watch</code></p></div>';
  }
  if (kind === 'checklist') {
    $('#check-result').innerHTML = state.checks.size === 4 ? '<strong class="good">พร้อมส่งต่อ ✓</strong><p>เยี่ยม! รายการนี้เป็นจุดเริ่มต้น ก่อน deploy ยังควรทดสอบแอปและสภาพแวดล้อมจริง</p>' : `<p>ตรวจแล้ว ${state.checks.size} / 4 ข้อ</p>`;
  }
}

function runTerminal(raw) {
  const cmd = raw.trim().replace(/\s+/g, ' ');
  if (!cmd) return;
  let output = '';
  const t = state.terminal;
  if (/^docker run -d --name web -p 8080:80 nginx:alpine$/.test(cmd)) {
    if (t.exists) output = 'Conflict: ชื่อ web ถูกใช้แล้ว ลบ container เดิมก่อนด้วย docker rm web';
    else { t.exists = true; t.running = true; output = 'a1b2c3d4e5f6  ✓ started web (host :8080 → container :80)'; }
  } else if (cmd === 'docker ps' || cmd === 'docker ps -a') {
    output = `CONTAINER ID   IMAGE           STATUS       PORTS          NAMES\n${t.exists && (t.running || cmd.endsWith('-a')) ? `a1b2c3d4e5f6   nginx:alpine    ${t.running ? 'Up' : 'Exited'}          ${t.running ? '0.0.0.0:8080->80/tcp' : '-'}   web` : '(ไม่มี container ที่แสดง)'}`;
  } else if (cmd === 'docker logs web') output = t.exists ? (t.running ? 'nginx: configuration complete; ready for start up' : 'nginx: graceful shutdown complete') : 'Error: No such container: web';
  else if (cmd === 'docker stop web') { if (t.running) { t.running = false; output = 'web'; } else output = t.exists ? 'web หยุดอยู่แล้ว' : 'Error: No such container: web'; }
  else if (cmd === 'docker start web') { if (t.exists) { t.running = true; output = 'web'; } else output = 'Error: No such container: web'; }
  else if (cmd === 'docker rm web') { if (t.running) output = 'Error: ต้องหยุด web ก่อน'; else if (t.exists) { t.exists = false; output = 'web'; } else output = 'Error: No such container: web'; }
  else if (cmd === 'docker exec -it web sh') output = t.running ? '/ #  (จำลอง: เปิด shell ใน web แล้ว)' : 'Error: container web ไม่ได้ทำงาน';
  else if (cmd === 'help') output = 'ลอง: docker run -d --name web -p 8080:80 nginx:alpine | docker ps | docker ps -a | docker logs web | docker stop web | docker start web | docker rm web';
  else output = 'ตัวจำลองยังไม่รองรับคำสั่งนี้ พิมพ์ help เพื่อดูคำสั่งที่ใช้ได้';
  t.history.push({ cmd, output });
  updateLab('terminal');
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
  const route = location.hash.slice(1) || 'home';
  const lesson = lessons.find((item) => item.id === route);
  renderNav();
  if (lesson) { renderLesson(lesson); updateLab(lesson.lab); }
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
  if (target.dataset.answer !== undefined) {
    state.answers[lesson.id] = Number(target.dataset.answer); safeSet('docker-lab-answers-v1', state.answers);
    if (state.answers[lesson.id] === lesson.quiz.answer && !state.completed.includes(lesson.id)) { state.completed.push(lesson.id); safeSet('docker-lab-progress-v1', state.completed); }
    renderNav(); renderLesson(lesson); updateLab(lesson.lab); $('#quiz').scrollIntoView({ block: 'center' });
  }
  if (target.id === 'retry-quiz') { delete state.answers[lesson.id]; safeSet('docker-lab-answers-v1', state.answers); renderLesson(lesson); updateLab(lesson.lab); $('#quiz').scrollIntoView({ block: 'center' }); }
  if (target.dataset.model) { state.model = target.dataset.model; renderLesson(lesson); updateLab(lesson.lab); }
  if (target.dataset.cache) { state.cache = target.dataset.cache; renderLesson(lesson); updateLab(lesson.lab); }
  if (target.dataset.storage) { state.storage.useVolume = target.dataset.storage === 'volume'; state.storage.recreated = false; renderLesson(lesson); updateLab(lesson.lab); }
  if (target.id === 'recreate-container') { if (state.storage.useVolume) { /* volume keeps its data */ } else state.storage.layer = 'hello'; state.storage.recreated = true; $('#storage-input').value = state.storage.useVolume ? state.storage.volume : state.storage.layer; updateLab('volume'); }
  if (target.dataset.network) { state.network = target.dataset.network; renderLesson(lesson); updateLab(lesson.lab); }
  if (target.dataset.workflow) { state.workflow = target.dataset.workflow; renderLesson(lesson); updateLab(lesson.lab); }
  if (target.dataset.command) { $('#terminal-input').value = target.dataset.command; $('#terminal-input').focus(); }
  if (target.id === 'reset-terminal') { state.terminal = { running: false, exists: false, history: [] }; updateLab('terminal'); }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'storage-input') { state.storage[state.storage.useVolume ? 'volume' : 'layer'] = event.target.value; state.storage.recreated = false; updateLab('volume'); }
});
document.addEventListener('change', (event) => { if (event.target.dataset.check) { event.target.checked ? state.checks.add(event.target.dataset.check) : state.checks.delete(event.target.dataset.check); updateLab('checklist'); } });
document.addEventListener('submit', (event) => { if (event.target.id === 'terminal-form') { event.preventDefault(); const input = $('#terminal-input'); runTerminal(input.value); input.value = ''; input.focus(); } });
$('#sidebar-scrim').addEventListener('click', closeMenu);
window.addEventListener('hashchange', render);
render();
