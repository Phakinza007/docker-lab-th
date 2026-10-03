# Docker Lab

เว็บสอน Docker ภาษาไทยแบบโต้ตอบ ตั้งแต่พื้นฐานถึง workflow ที่ใช้ในปัจจุบัน (ตรวจเนื้อหา 3 ตุลาคม 2026)

## สิ่งที่ทดลองได้

- Terminal จำลองสำหรับคำสั่ง Docker พื้นฐาน โดยไม่ต้องติดตั้ง Docker
- สำรวจ Dockerfile และผลของ layer cache
- ทดลองข้อมูลใน writable layer เทียบกับ named volume
- แบบทดสอบท้ายบทและบันทึกความคืบหน้าใน `localStorage`
- เนื้อหา 7 บท พร้อมลิงก์เอกสาร Docker ทางการ

ตัวจำลองแสดงผลเพื่อการเรียนรู้เท่านั้น ไม่รัน container จริง คำสั่งบางตัวจำลองเฉพาะรูปแบบที่ระบุในบทเรียน

## เปิดในเครื่อง

รัน local static server เช่น `python3 -m http.server 8000` แล้วเปิด `http://localhost:8000`

## Deploy

Repository นี้ใช้ GitHub Actions ใน `.github/workflows/deploy.yml` เผยแพร่ไฟล์ static เมื่อ push ไป `main` โดยตั้ง Pages source เป็น **GitHub Actions**

## แหล่งอ้างอิง

อ้างอิงจาก [Docker Docs](https://docs.docker.com/) และ [GitHub Pages Docs](https://docs.github.com/en/pages) ลิงก์รายหัวข้ออยู่ในเว็บ
