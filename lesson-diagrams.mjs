const box = (title, detail, tone = '') => `<div class="ld-node ${tone}"><strong>${title}</strong><span>${detail}</span></div>`;
const arrow = (label = '') => `<div class="ld-arrow"><small>${label}</small><span aria-hidden="true">→</span></div>`;
const row = (...items) => `<div class="ld-row">${items.join('')}</div>`;
const group = (title, content) => `<div class="ld-group"><div class="ld-group-title">${title}</div>${content}</div>`;
export const lessonDiagrams = {
  'mental-model': {
    title: 'จากสูตร สู่ Process',
    content: row(box('Dockerfile','สูตรและขั้นตอนสร้าง'),arrow('docker build'),box('Image','แม่แบบแบบอ่านอย่างเดียว','ld-accent'),arrow('docker run'),box('Container','Process + writable layer')) + group('บนเครื่อง Host', row(box('Docker Engine','รับคำสั่งและจัดการ containers'),box('Host kernel','Containers ใช้ kernel ร่วมกับ host'))),
    caption: 'Image เดียวสร้างได้หลาย container แต่ละตัวมี writable layer แยกกัน Container ไม่ใช่ VM ทั้งเครื่อง',
  },
  cli: {
    title: 'Port และวงจรชีวิต Container',
    content: row(box('Browser / curl','localhost:8080'),arrow('Host port 8080'),box('Container: web','Nginx ฟัง port 80','ld-accent')) + group('docker run -d --name web -p 8080:80 nginx:alpine', row(box('ยังไม่มี Container','docker run สร้างตัวใหม่'),arrow('run'),box('Running','logs / exec ใช้ดูภายใน'),arrow('stop'),box('Exited','start กลับไป Running ได้'),arrow('rm'),box('ลบแล้ว','ชื่อถูกคืน · writable layer หาย'))),
    caption: 'เลขซ้ายของ -p คือ Host port เลขขวาคือ Container port; stop เก็บ container ไว้ ส่วน rm ลบ container',
  },
  dockerfile: {
    title: 'ไฟล์ที่เปลี่ยน กำหนดจุดเริ่ม Build ใหม่',
    content: group('Dockerfile สำหรับ Node · ตัวอย่างอธิบาย cache', row(box('COPY package*.json ./','Manifest และ lockfile'),arrow(),box('RUN npm ci','ติดตั้ง dependencies'),arrow(),box('COPY . .','คัดลอก source'),arrow(),box('RUN npm run build','สร้างไฟล์ผลลัพธ์'))) + '<div class="ld-compare">' + group('แก้เฉพาะ app.js', row(box('2 ขั้นแรก','ใช้ cache ได้','ld-accent'),arrow(),box('COPY source + Build','ทำใหม่'))) + group('แก้ package-lock.json',row(box('COPY manifests','เปลี่ยนแล้ว'),arrow(),box('ขั้นต่อจากนั้น','ต้องทำใหม่ทั้งหมด'))) + '</div>',
    caption: 'เมื่ออินพุตของขั้นหนึ่งเปลี่ยน cache ของขั้นนั้นและขั้นถัดไปจะใช้ไม่ได้ จัดลำดับติดตั้ง dependencies ก่อนคัดลอก source',
  },
  storage: {
    title: 'Container หาย แล้วข้อมูลอยู่ที่ไหน?',
    content: '<div class="ld-compare">' + group('Writable layer · ผูกกับ Container',row(box('Container A','เขียน note.txt'),arrow('stop'),box('ข้อมูลยังอยู่','เริ่มตัวเดิมได้'),arrow('rm'),box('Layer ถูกลบ','ข้อมูลหาย','ld-warn'))) + group('Named volume · อายุแยกกัน',row(box('Container A','/data ↔ notes'),arrow('rm + run'),box('Container B','mount notes ที่ /data','ld-accent')) + row(box('Volume: notes','ไฟล์เดิมยังอยู่ แม้ Container A ถูกลบ','ld-accent'))) + '</div>',
    caption: 'ต้อง mount volume เดิมกลับมาใน container ใหม่ Volume ไม่ใช่ backup; docker volume rm หรือ compose down -v สามารถลบข้อมูลใน volume ได้',
  },
  compose: {
    title: 'เรียกกันด้วยชื่อ Service ภายใน Network',
    content: row(box('Browser บน Host','localhost:8080'),arrow('8080:80'),group('Compose default network',row(box('web :80','localhost ใน web = web เอง'),arrow('db:5432'),box('db :5432','ชื่อ service ค้นผ่าน DNS','ld-accent')))) + row(box('Named volume','db-data ↔ ไฟล์ข้อมูลฐานข้อมูล','ld-accent')),
    caption: 'web เรียก db:5432 ผ่าน container port ไม่จำเป็นต้อง publish port ของ db ให้ host; depends_on แบบสั้นกำหนดลำดับเริ่ม แต่ไม่ได้รับประกันว่าฐานข้อมูลพร้อมรับงาน',
  },
  workflow: {
    title: 'แยกสิ่งที่ใช้ Build ออกจากสิ่งที่ใช้ Run',
    content: row(group('Stage 1 · build',box('Node + dependencies + source','npm ci → npm run build')),arrow('COPY --from=build'),group('Stage 2 · runtime',box('Nginx + dist/','ไม่คัดลอกเครื่องมือ Build ไปด้วย','ld-accent'))) + group('Compose Watch · ระหว่างพัฒนา',row(box('แก้ไฟล์ในเครื่อง','ตรวจการเปลี่ยนแปลง'),arrow('develop.watch'),box('sync หรือ rebuild','ขึ้นกับ action ที่ตั้งค่า'),arrow(),box('Service อัปเดต','ใช้ compose up --watch'))),
    caption: 'Multi-stage เลือกเฉพาะ artifact ที่ต้องรัน ส่วน Watch ช่วยอัปเดตระหว่างพัฒนา ทั้งสองอย่างแก้ปัญหาคนละส่วนและใช้ร่วมกันได้',
  },
  ship: {
    title: 'ตรวจก่อนส่ง Image ไปใช้งาน',
    content: row(box('Source + Dockerfile','ตัดไฟล์ลับด้วย .dockerignore'),arrow('build'),box('Image','ตรวจ base image + ช่องโหว่'),arrow('deploy'),box('Container','ใช้สิทธิ์เท่าที่จำเป็น','ld-accent')) + '<div class="ld-compare">' + group('Secret ระหว่าง Build',row(box('Secret mount','ใช้ชั่วคราวในขั้น Build'),arrow(),box('ไม่ COPY token','หลีกเลี่ยงเก็บ secret ใน layer'))) + group('สังเกตหลังเริ่มทำงาน',row(box('Logs + Healthcheck','ตรวจสถานะและพฤติกรรม'),arrow(),box('ทดสอบแอปจริง','รวม restart และข้อมูลถาวร'))) + '</div>',
    caption: 'Secret mount ไม่ได้ป้องกันคำสั่ง Build จากการคัดลอก secret ไปใส่ output เอง ต้องตรวจ Dockerfile และ artifact ด้วย Healthcheck ช่วยสังเกตอาการ แต่ไม่แทนการทดสอบแอป',
  },
};
export function renderLessonDiagram(id, expanded = false) {
  const diagram = lessonDiagrams[id]; if (!diagram) return '';
  return `<figure class="lesson-diagram"><div class="ld-heading"><h2>${diagram.title}</h2>${expanded ? '' : `<button type="button" data-expand-diagram="${id}" aria-label="ขยาย Diagram: ${diagram.title}">ขยายภาพ ↗</button>`}</div><div class="ld-canvas" role="group" aria-label="${diagram.title}">${diagram.content}</div><figcaption>${diagram.caption}</figcaption></figure>`;
}
if (typeof document !== 'undefined') {
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-expand-diagram]');
    if (!trigger) return;
    const dialog = document.createElement('dialog'); dialog.className = 'ld-dialog'; dialog.setAttribute('aria-label','Diagram แบบขยาย');
    dialog.innerHTML = `<form method="dialog"><button autofocus aria-label="ปิด Diagram">ปิด · Esc</button></form>${renderLessonDiagram(trigger.dataset.expandDiagram, true)}`;
    document.body.append(dialog);
    dialog.addEventListener('close', () => { dialog.remove(); if (trigger.isConnected) trigger.focus(); }, {once:true});
    dialog.showModal();
  });
}
