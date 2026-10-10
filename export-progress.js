import { readSession, parseSession } from './vm-session.mjs?v=20261010-learning';
const exportButton = document.querySelector('#export-progress');
const importButton = document.createElement('button');
importButton.type = 'button'; importButton.textContent = 'นำเข้างาน'; importButton.id = 'import-progress';
exportButton.after(importButton);
const picker = document.createElement('input'); picker.type = 'file'; picker.accept = '.json,application/json'; picker.hidden = true; document.body.append(picker);
const status = document.createElement('p'); status.setAttribute('role', 'status'); status.className = 'session-status'; status.hidden = true; document.querySelector('.topbar').after(status);
function report(text) { status.textContent = text; status.hidden = false; }
exportButton.addEventListener('click', () => {
  try { const data = readSession(localStorage); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'docker-lab-progress.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); report('ส่งออกไฟล์ โค้ด ประวัติคำสั่ง และความคืบหน้าแล้ว'); }
  catch { report('อ่านข้อมูลในเบราว์เซอร์ไม่ได้'); }
});
importButton.addEventListener('click', () => picker.click());
picker.addEventListener('change', async () => {
  const file = picker.files?.[0]; if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 2 MB');
    const data = parseSession(await file.text());
    if (!confirm('นำเข้างานนี้แทนไฟล์และความคืบหน้าปัจจุบัน? ส่งออกงานเดิมเก็บไว้ก่อนได้')) return;
    const entries = [['docker-lab-vm-v1', data.vm], ['docker-lab-progress-v1', data.completed], ['docker-lab-answers-v1', data.answers], ['docker-lab-troubleshooting-v1', data.troubleshooting], ['docker-lab-learning-v1', data.learning]];
    const previous = entries.map(([key]) => [key, localStorage.getItem(key)]);
    try { for (const [key, value] of entries) localStorage.setItem(key, JSON.stringify(value)); }
    catch (error) { for (const [key, value] of previous) { try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch {} } throw error; }
    location.reload();
  } catch (error) { report(`นำเข้าไม่สำเร็จ: ${error.message}`); }
  finally { picker.value = ''; }
});
