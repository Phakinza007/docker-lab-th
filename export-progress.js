import { createVM } from './vm-engine.mjs';
document.querySelector('#export-progress').addEventListener('click', () => {
 try { const data = { format: 'docker-lab-v1', vm: JSON.parse(localStorage.getItem('docker-lab-vm-v1') || 'null') || createVM(), completed: JSON.parse(localStorage.getItem('docker-lab-progress-v1') || '[]') }; const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'docker-lab-progress.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch { alert('อ่านข้อมูลในเบราว์เซอร์ไม่ได้'); }
});
