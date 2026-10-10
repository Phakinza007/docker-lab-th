# Docker Lab

เว็บสอน Docker ภาษาไทยแบบโต้ตอบ ตั้งแต่พื้นฐานถึง workflow ที่ใช้ในปัจจุบัน (ตรวจเนื้อหา 3 ตุลาคม 2026)

## สิ่งที่ทดลองได้

- Terminal จำลองสำหรับคำสั่ง Docker พื้นฐาน โดยไม่ต้องติดตั้ง Docker
- สำรวจ Dockerfile และผลของ layer cache
- ทดลองข้อมูลใน writable layer เทียบกับ named volume
- แบบทดสอบท้ายบทและบันทึกความคืบหน้าใน `localStorage`
- เนื้อหา 7 บท พร้อมลิงก์เอกสาร Docker ทางการ
- VM Lab จำลอง shell, ระบบไฟล์, การ build image, container, logs, port, Compose และ shell ภายใน container
- แก้ Dockerfile กับหน้าเว็บ แล้วดูผลในพรีวิวจำลองได้ สถานะบันทึกใน `localStorage` และรีเซ็ตได้

VM Lab เปิดที่ [หน้า VM Lab](https://phakinza007.github.io/docker-lab-th/#vm) ภารกิจแนะนำเริ่มจาก `ls` → แก้ Dockerfile → `docker build -t my-site:1.0 .` → `docker run -d --name web -p 8080:80 my-site:1.0` → `curl localhost:8080`

ตัวจำลองแสดงผลเพื่อการเรียนรู้เท่านั้น ไม่รัน Linux VM, Docker Engine หรือ container จริง คำสั่งจำลองเฉพาะรูปแบบที่ระบุใน Lab และข้อมูลอยู่ในเบราว์เซอร์ของผู้เรียน

## เปิดในเครื่อง

รัน local static server เช่น `python3 -m http.server 8000` แล้วเปิด `http://localhost:8000`

ตรวจตรรกะ VM Lab ด้วย `node --test tests/*.test.mjs`

## Deploy

Repository นี้ใช้ GitHub Actions ใน `.github/workflows/deploy.yml` เผยแพร่ไฟล์ static เมื่อ push ไป `main` โดยตั้ง Pages source เป็น **GitHub Actions**

## แหล่งอ้างอิง

อ้างอิงจาก [Docker Docs](https://docs.docker.com/) และ [GitHub Pages Docs](https://docs.github.com/en/pages) ลิงก์รายหัวข้ออยู่ในเว็บ

## พื้นที่ฝึกรวม

บทเรียนและ VM Lab อยู่ใน [Knowledge Web](https://knowledge-web-one.vercel.app/practice#int134) แล้ว เว็บเดิมยังใช้งานได้ กด **ส่งออกงาน** แล้วนำไฟล์ JSON ไปนำเข้าในหน้าพื้นที่ฝึกของเว็บรวมเพื่อทำงานต่อ

## อัปเดต 9 ตุลาคม 2026

- ธีมสว่าง/มืดและสัดส่วนพื้นที่ฝึกบันทึกในเบราว์เซอร์ ลากเส้นแบ่งหรือใช้ปุ่มลูกศรได้
- ขยาย Terminal/ตัวแก้ไข/ภารกิจ/พื้นที่ทดลองประจำบท และกด Escape เพื่อคืนหน้าเดิม
- VM บันทึกไฟล์อัตโนมัติ ขึ้น/ลงเรียกคำสั่งเก่า มีคำใบ้ทีละระดับและตรวจงานจากสถานะปัจจุบัน
- Diagram แสดง Image → Container, published port, service ภายใน network และ volume ที่ mount
- `#project` เส้นทางสร้างเว็บ 6 ขั้น และ `#troubleshooting` โจทย์แก้ชื่อซ้ำ, port ชน, host ผิด, ข้อมูลหาย
- ส่งออก/นำเข้า JSON รวมไฟล์ ประวัติคำสั่ง VM บทเรียน คำตอบ และโจทย์ที่ผ่าน รองรับไฟล์ส่งออกรุ่นก่อน
- รีเซ็ตเฉพาะ VM หรือบทเรียนได้ มีการยืนยันก่อนแทนข้อมูล

### ขอบเขตตัวจำลองที่เพิ่ม

Named volume รองรับ `-v NAME:/data`, `echo "text" > /data/note.txt`, `cat` และ `volume create/ls/inspect/rm` เพื่อเปรียบเทียบกับ writable layer

Compose รองรับ subset ที่ระบุใน VM: web build จาก `.` และ publish `HOST:80`; optional db `postgres:16-alpine` และ named volume ที่ `/var/lib/postgresql/data` รวม `depends_on: [db]` การสั่ง `up -d --build` สร้าง image/containers ใหม่ตามไฟล์และ port จริงใน config ส่วน `down` เก็บ volume และ `down -v` ลบ volume ที่เลิกใช้ รองรับ `getent hosts db` และ `nc -z db 5432` ภายใน network จำลอง ฐานข้อมูลเป็นเพียงโมเดล TCP/DNS ไม่รัน SQL, authentication หรือ Docker จริง และคำสั่ง/config นอก subset จะแจ้งข้อจำกัด

ข้อมูลอยู่ใน localStorage ของ origin นี้ ไม่ซิงก์ระหว่าง GitHub Pages กับ localhost หรืออุปกรณ์อื่น ให้ส่งออก/นำเข้าไฟล์เมื่อต้องย้ายงาน


## Learning flow (10 Oct 2026)

- Lesson diagrams are the only concept playground inside each lesson; the right pane now holds the task and reflection guide. VM Lab is the separate command practice workspace, with a return link that persists across commands and file edits.
- Each lesson asks for a prediction, diagram exploration, a task check, a written explanation with a clearly labeled self assessment, and the existing quiz. Progress distinguishes read, explored, and task passed; it does not certify mastery.
- Lesson 1 checks a diagram snapshot exercise before command syntax is introduced. Lessons 2–5 use VM state and recent command evidence. Lessons 6–7 explicitly check conceptual simulations and transfer questions, and recommend finishing the foundation first. Real Docker practice is linked separately.
- Dockerfile, named volume and Compose snippets match the simulator. PostgreSQL 16 is used in the teaching Compose sample; the simulated DB supports DNS/TCP only.
- Learning records and reflections are included in JSON export/import. Older exports still load; previous quiz answers are retained, while task completion follows the new criteria.


## Week-based classroom reading

The default landing page follows INT134 G2 Class 6 (16 Sep), Class 7 (23 Sep), and Class 8 (30 Sep 2026). `weekly-course.mjs` contains original paraphrases based on the local lecture transcripts, with a problem → explanation → diagram → observation → recap sequence. These are not verbatim quotations or a replacement for the complete lecture/lab sheet.

- Week 6: container model, process lifecycle, ports, moving the frontend.
- Week 7: reproducible images, MySQL 8.4, bind mounts, named volumes, initialization and restart policy.
- Week 8: backend images, context/configuration, bind address, user-defined network, ARG/ENV and startup processes.

The seven topic exercises remain under “บทฝึกเสริม”; Compose/PostgreSQL simulator activities are identified separately from the MySQL classroom sequence. Every weekly command example is labeled as a VM-supported subset or real-Docker example. Raw transcripts are not published. Reading a Week does not automatically mark a topic exercise complete.
