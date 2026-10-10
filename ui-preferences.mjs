const storageKey = 'dockerlab-workspace';
let preferences = {};
try {
  const stored = JSON.parse(localStorage.getItem(storageKey));
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) preferences = stored;
} catch {}
const root = document.documentElement;
const main = document.querySelector('#main');
const toggle = document.querySelector('#theme-toggle');
function persist() { try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch {} }
function updateTheme() {
  const dark = root.dataset.theme === 'dark';
  toggle.textContent = dark ? '☀ ธีมสว่าง' : '☾ ธีมมืด';
  toggle.setAttribute('aria-pressed', String(dark));
  document.querySelector('meta[name="theme-color"]').content = dark ? '#141c25' : '#f7f8f6';
}
toggle.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('dockerlab-theme', root.dataset.theme); } catch {}
  updateTheme();
});
updateTheme();
let focusedPane = null;
let focusTrigger = null;
let focusedKey = null;
let focusedRoute = null;
let inertSiblings = [];
function exitFocus({ preserve = false, restore = true } = {}) {
  focusedPane?.classList.remove('pane-focused');
  inertSiblings.forEach(element => { element.inert = false; });
  inertSiblings = [];
  const button = focusedPane?.querySelector('[data-pane-focus]');
  if (button) { button.textContent = 'ขยาย'; button.setAttribute('aria-pressed', 'false'); }
  document.body.classList.remove('lab-focus');
  focusedPane = null;
  if (!preserve) { focusedKey = null; focusedRoute = null; }
  if (restore && focusTrigger?.isConnected) focusTrigger.focus();
  focusTrigger = null;
}
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && focusedPane) exitFocus();
});
function enterFocus(pane, { restore = false } = {}) {
  const button = pane.querySelector('[data-pane-focus]');
  focusedPane = pane; focusTrigger = button;
  focusedKey = pane.dataset.focusKey; focusedRoute = location.hash;
  pane.classList.add('pane-focused'); document.body.classList.add('lab-focus');
  for (let current = pane; current && current !== document.body; current = current.parentElement) {
    for (const sibling of current.parentElement.children) {
      if (sibling !== current && !sibling.inert) { sibling.inert = true; inertSiblings.push(sibling); }
    }
  }
  button.textContent = 'ย่อกลับ · Esc'; button.setAttribute('aria-pressed', 'true');
  if (restore) {
    if (!pane.contains(document.activeElement)) (pane.querySelector('#vm-command') || button).focus();
  } else button.focus();
}
function addFocus(pane, label, key) {
  if (!pane || pane.querySelector('[data-pane-focus]')) return;
  pane.dataset.focusKey = key;
  const bar = document.createElement('div');
  bar.className = 'pane-tools';
  const title = document.createElement('span'); title.textContent = label;
  const button = document.createElement('button');
  button.type = 'button'; button.dataset.paneFocus = ''; button.textContent = 'ขยาย';
  button.setAttribute('aria-label', `ขยาย ${label}`); button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => {
    if (focusedPane === pane) { exitFocus(); return; }
    exitFocus(); enterFocus(pane);
  });
  bar.append(title, button); pane.prepend(bar);
}
function splitter(target, key, orientation, initial, min, max, apply) {
  const handle = document.createElement('div');
  handle.className = `pane-resizer pane-resizer-${orientation}`;
  handle.tabIndex = 0; handle.setAttribute('role', 'separator');
  handle.setAttribute('aria-orientation', orientation === 'column' ? 'vertical' : 'horizontal');
  handle.setAttribute('aria-label', orientation === 'column' ? 'ปรับความกว้างส่วนทดลอง' : 'ปรับความสูง Terminal');
  handle.setAttribute('aria-valuemin', String(min)); handle.setAttribute('aria-valuemax', String(max));
  let value = Number.isFinite(preferences[key]) ? preferences[key] : initial;
  const update = next => {
    value = Math.min(max, Math.max(min, next));
    handle.setAttribute('aria-valuenow', String(Math.round(value)));
    apply(value); preferences[key] = value;
  };
  update(value);
  handle.addEventListener('keydown', event => {
    let delta = 0;
    if (orientation === 'column') delta = event.key === 'ArrowLeft' ? -2 : event.key === 'ArrowRight' ? 2 : 0;
    else delta = event.key === 'ArrowUp' ? -20 : event.key === 'ArrowDown' ? 20 : 0;
    if (!delta && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault(); update(event.key === 'Home' ? min : event.key === 'End' ? max : value + delta); persist();
  });
  handle.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault(); handle.focus(); handle.setPointerCapture(event.pointerId);
    const start = orientation === 'column' ? event.clientX : event.clientY;
    const original = value;
    const move = e => {
      const offset = (orientation === 'column' ? e.clientX : e.clientY) - start;
      update(original + (orientation === 'column' ? offset / target.getBoundingClientRect().width * 100 : offset));
    };
    const stop = () => {
      handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', stop); handle.removeEventListener('pointercancel', stop);
      document.body.classList.remove('pane-dragging'); persist();
    };
    handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', stop); handle.addEventListener('pointercancel', stop);
    document.body.classList.add('pane-dragging');
  });
  return handle;
}
function enhance() {
  if (focusedPane && !focusedPane.isConnected) exitFocus({ preserve: focusedRoute === location.hash, restore: false });
  const layout = main.querySelector('.vm-layout');
  if (layout && !layout.dataset.resizable) {
    layout.dataset.resizable = 'true';
    const work = layout.querySelector('.vm-work');
    const missions = layout.querySelector('.vm-missions');
    if (work && missions) layout.insertBefore(splitter(layout, 'vmSplit', 'column', 68, 45, 78, n => layout.style.setProperty('--work-width', `${n}%`)), missions);
    const terminal = layout.querySelector('.vm-terminal-card');
    addFocus(terminal, 'Terminal', 'vm-terminal'); addFocus(layout.querySelector('.vm-workbench'), 'ไฟล์และผลลัพธ์', 'vm-workbench'); addFocus(missions, 'ภารกิจ', 'vm-missions');
    if (terminal) terminal.after(splitter(layout, 'terminalHeight', 'row', 360, 180, 720, n => layout.style.setProperty('--terminal-height', `${n}px`)));
  }
  const lesson = main.querySelector('.lesson-layout');
  if (lesson && !lesson.dataset.resizable) {
    lesson.dataset.resizable = 'true';
    const lab = lesson.querySelector('.lab-column');
    if (lab) {
      lesson.insertBefore(splitter(lesson, 'lessonSplit', 'column', 55, 35, 65, n => lesson.style.setProperty('--lesson-width', `${n}%`)), lab);
      addFocus(lab.querySelector('.lab-card'), lab.querySelector('.week-guide') ? 'แผนการเรียน Week' : lab.querySelector('.learning-guide') ? 'โจทย์ประจำบท' : 'ทดลองประจำบท', 'lesson-lab');
    }
  }
  if (focusedKey && !focusedPane) {
    const replacement = [...main.querySelectorAll('[data-focus-key]')].find(pane => pane.dataset.focusKey === focusedKey);
    if (replacement) enterFocus(replacement, { restore: true });
    else exitFocus({ restore: false });
  }
}
new MutationObserver(enhance).observe(main, { childList: true });
enhance();
