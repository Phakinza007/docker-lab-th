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

ตรวจตรรกะ VM Lab ด้วย `node --test tests/vm-engine.test.mjs`

## Deploy

Repository นี้ใช้ GitHub Actions ใน `.github/workflows/deploy.yml` เผยแพร่ไฟล์ static เมื่อ push ไป `main` โดยตั้ง Pages source เป็น **GitHub Actions**

## แหล่งอ้างอิง

อ้างอิงจาก [Docker Docs](https://docs.docker.com/) และ [GitHub Pages Docs](https://docs.github.com/en/pages) ลิงก์รายหัวข้ออยู่ในเว็บ
