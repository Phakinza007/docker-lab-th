import { validLearning, LEARNING_KEY } from './learning-flow.mjs?v=20261010-learning2';
import { createVM, validVM } from './vm-engine.mjs?v=20261009-complete';
export const LESSON_IDS = ['mental-model','cli','dockerfile','storage','compose','workflow','ship'];
export function sessionSnapshot(vm, completed = [], answers = {}, troubleshooting = [], learning = {}) {
  return { format: 'docker-lab-v1', exportedAt: new Date().toISOString(), vm, completed, answers, troubleshooting, learning };
}
export function parseSession(text) {
  if (typeof text !== 'string' || text.length > 2_000_000) throw new Error('ไฟล์ต้องมีขนาดไม่เกิน 2 MB');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('อ่าน JSON ไม่ได้'); }
  if (data?.format !== 'docker-lab-v1' || !validVM(data.vm)) throw new Error('ไฟล์นี้ไม่ใช่งาน Docker Lab ที่รองรับ');
  if (!Array.isArray(data.completed) || data.completed.some(id => !LESSON_IDS.includes(id))) throw new Error('รายการบทเรียนไม่ถูกต้อง');
  const answers = data.answers ?? {};
  if (!answers || Array.isArray(answers) || typeof answers !== 'object' || Object.entries(answers).some(([id, n]) => !LESSON_IDS.includes(id) || !Number.isInteger(n) || n < 0 || n > 2)) throw new Error('คำตอบท้ายบทไม่ถูกต้อง');
  const troubleshooting = data.troubleshooting ?? [];
  if (!Array.isArray(troubleshooting) || troubleshooting.some(id => !['name','port','host','storage'].includes(id))) throw new Error('รายการโจทย์แก้ปัญหาไม่ถูกต้อง');
  const learning = data.learning ?? {};
  if(!validLearning(learning)) throw new Error('สถานะการเรียนไม่ถูกต้อง');
  return { learning, troubleshooting: [...new Set(troubleshooting)], vm: data.vm, completed: [...new Set(data.completed)], answers };
}
export function readSession(storage) {
  const read = (key, fallback) => { try { return JSON.parse(storage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const vm = read('docker-lab-vm-v1', null);
  return sessionSnapshot(validVM(vm) ? vm : createVM(), read('docker-lab-progress-v1', []), read('docker-lab-answers-v1', {}), read('docker-lab-troubleshooting-v1', []), read(LEARNING_KEY, {}));
}
