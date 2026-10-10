const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const node = (title, detail, active = false) => `<div class="ld-node ${active ? 'ld-accent' : ''}"><strong>${escape(title)}</strong><span>${escape(detail)}</span></div>`;
const arrow = label => `<div class="ld-arrow"><small>${escape(label)}</small><span aria-hidden="true">→</span></div>`;
const row = (...parts) => `<div class="ld-row">${parts.join('')}</div>`;
const kinds = { 'mental-model':'image', 'cli-port':'port', 'cli-lifecycle':'lifecycle', dockerfile:'cache', storage:'storage', compose:'network', 'workflow-build':'multistage', 'workflow-watch':'watch', 'ship-secret':'secret' };
export function initialPlayground(id) {
 return { kind:kinds[id], source:1, image:0, container:0, status:kinds[id]==='storage'?'running':'absent', useVolume:false, data:'', volume:'', host:'localhost', db:true, watch:'sync', changed:false, copied:false, secret:false, leaked:false, message:'เลือกปุ่มด้านล่าง แล้วสังเกตภาพและคำอธิบายที่เปลี่ยนตาม' };
}
export function playDiagram(state, action, value = '') {
 const s = {...state};
 if (action === 'reset') return initialPlayground(Object.keys(kinds).find(id => kinds[id] === s.kind));
 if (s.kind === 'image') {
  if (action === 'edit') { s.source++; s.message=`แก้ไฟล์เป็นรุ่น ${s.source} แล้ว Image และ Container เดิมยังไม่เปลี่ยน ต้อง Build ใหม่`; }
  if (action === 'build') { s.image=s.source; s.message=`Build ได้ Image รุ่น ${s.image} แล้ว ลอง Run เพื่อสร้าง Container จาก snapshot นี้`; }
  if (action === 'run') { if (!s.image) s.message='ยังไม่มี Image ต้องกด Build ก่อน'; else {s.container=s.image;s.status='running';s.message=`สร้าง Container ใหม่จาก Image รุ่น ${s.container} แต่ไฟล์ source ปัจจุบันเป็นรุ่น ${s.source}`;} }
 }
 if (s.kind === 'port') {
  if (action === 'run') { s.status='running';s.message='Publish 8080:80 แล้ว ลองส่ง request จาก Browser'; }
  if (action === 'request') s.message=s.status==='running'?'HTTP 200 · Browser → Host:8080 → Container:80 → Nginx':'Connection refused · ไม่มี Container ทำงานที่ Host:8080';
  if (action === 'stop') {s.status='exited';s.message='หยุด Container แล้ว Port ไม่มีเว็บรับ request ลองเปิดเว็บอีกครั้ง';}
 }
 if (s.kind === 'lifecycle') {
  if (action === 'run') {if(s.status!=='absent')s.message='ชื่อ web ถูกใช้แล้ว แม้หยุดอยู่ ถ้าจะเริ่มตัวเดิมให้ใช้ Start';else{s.status='running';s.container++;s.message=`Run สร้าง Container web ตัวที่ ${s.container}`;}}
  if (action === 'stop') {if(s.status==='running'){s.status='exited';s.message='Stop หยุด process แต่ยังเก็บ Container ตัวเดิมและชื่อ web';}else s.message='ไม่มี Container ที่กำลังทำงานให้หยุด';}
  if (action === 'start') {if(s.status==='exited'){s.status='running';s.message=`Start เริ่ม Container ตัวที่ ${s.container} อีกครั้ง ไม่ได้สร้างตัวใหม่`;}else s.message=s.status==='absent'?'Container ถูกลบหรือยังไม่สร้าง ต้อง Run ก่อน':'Container กำลังทำงานอยู่แล้ว';}
  if (action === 'remove') {if(s.status==='running')s.message='ลบตัวที่กำลังทำงานไม่ได้ในแบบฝึกนี้ ต้อง Stop ก่อน';else if(s.status==='absent')s.message='ไม่มี Container ให้ลบ';else{s.status='absent';s.message='ลบ Container และ writable layer แล้ว ชื่อ web ว่างให้ Run ใหม่';}}
 }
 if (s.kind === 'cache') {s.changed=action==='packages'?'packages':'source';s.message=s.changed==='packages'?'package-lock.json เปลี่ยน → COPY manifests และขั้นถัดไป Build ใหม่ทั้งหมด':'app.js เปลี่ยน → COPY manifests กับ npm ci ใช้ cache ได้ ส่วน COPY source และ Build ทำใหม่';}
 if (s.kind === 'storage') {
  if (action === 'layer' || action === 'volume') {s.useVolume=action==='volume';s.status='running';s.data=s.useVolume?s.volume:'';s.message=`เริ่มตัวอย่างด้วย ${s.useVolume?'Named volume: notes':'Writable layer'} ลองเขียนข้อความแล้วลบ Container`;}
  if (action === 'write') {if(s.status==='absent')s.message='สร้าง Container ก่อนจึงเขียนไฟล์ได้';else{s.data=String(value).slice(0,80);if(s.useVolume)s.volume=s.data;s.message='เขียน note.txt แล้ว ลองลบ Container และสร้างใหม่';}}
  if (action === 'remove') {s.status='absent';s.data='';s.message=s.useVolume?'Container ถูกลบ แต่ Volume: notes ยังเก็บไฟล์ไว้':'Container และ writable layer ถูกลบ ข้อความหายไปด้วย';}
  if (action === 'recreate') {if(s.status!=='absent')s.message='ลบ Container ตัวเดิมก่อน แล้วจึงสร้างใหม่เพื่อเปรียบเทียบ';else{s.status='running';s.data=s.useVolume?s.volume:'';s.message=s.data?'mount Volume เดิมกลับมา → อ่านข้อความเดิมได้':'Container ใหม่มีไฟล์ว่าง เพราะไม่มีข้อมูลถาวรที่นำกลับมา';}}
 }
 if (s.kind === 'network') {
  if(action==='localhost'||action==='db')s.host=action;
  if(action==='toggle-db')s.db=!s.db;
  s.message=s.host==='localhost'?'Connection refused · localhost ใน web ชี้กลับไป web ซึ่งไม่ได้รันฐานข้อมูล':s.db?'เชื่อมต่อ db:5432 ผ่าน Compose network สำเร็จ (จำลอง)':'Connection refused · ชื่อ db ถูกต้อง แต่ service หยุดอยู่ ต้องเริ่ม db ก่อน';
 }
 if(s.kind==='multistage') {
  if(action==='build'){s.image=1;s.copied=false;s.message='Build stage สร้าง dist/ แล้ว ยังต้อง COPY --from=build ไป stage สุดท้าย';}
  if(action==='copy'){if(!s.image)s.message='ต้อง Build ให้มี dist/ ก่อน';else{s.copied=true;s.message='คัดลอกเฉพาะ dist/ ไป runtime image เครื่องมือ Node และ source ไม่ถูกคัดลอกตามไป';}}
 }
 if(s.kind==='watch') {
  if(['sync','rebuild','off'].includes(action)){s.watch=action;s.message=`เลือก ${action} แล้ว ลองแก้ source เพื่อดูผล`;} 
  if(action==='edit'){s.source++;if(s.watch==='off')s.message='ไม่ได้เปิด Watch · source เปลี่ยน แต่ Container ยังใช้ไฟล์เดิม';else{s.container=s.source;if(s.watch==='rebuild')s.image=s.source;s.message=s.watch==='sync'?'Sync ส่งไฟล์ที่เปลี่ยนไป path ที่ตั้งไว้ใน Container · Image เดิมไม่เปลี่ยน':'Rebuild สร้าง Image ใหม่และสร้าง Container ใหม่เพื่อใช้ผลลัพธ์';}}
 }
 if(s.kind==='secret') {
  if(action==='mount'){s.secret=true;s.leaked=false;s.message='Secret ใช้ชั่วคราวใน RUN · ตัวอย่างนี้ไม่คัดลอก Secret ลง artifact';}
  if(action==='copy-secret'){s.secret=true;s.leaked=true;s.message='แม้ใช้ Secret mount แต่ถ้าคำสั่ง Build เขียน Secret ลง artifact เอง มันจะติดไปใน Image';}
  if(action==='finish'){s.secret=false;s.message=s.leaked?'จบ RUN แล้ว mount หาย แต่ Secret ที่คัดลอกลง artifact ยังอยู่ใน Image ต้องแก้ Build และจัดการ Secret ที่รั่ว':'จบ RUN แล้ว mount ถูกถอดออก Artifact ของตัวอย่างนี้ไม่มี Secret';}
 }
 return s;
}
export function renderPlayground(s) {
 if(!s.kind)return null;
 let content='', actions=[];
 if(s.kind==='image'){content=row(node('Dockerfile + source',`รุ่น ${s.source}`),arrow('Build'),node('Image',s.image?`snapshot รุ่น ${s.image}`:'ยังไม่ Build',!!s.image),arrow('Run ใหม่'),node('Container',s.container?`รันจากรุ่น ${s.container}`:'ยังไม่สร้าง',!!s.container));actions=[['edit','แก้ไฟล์เว็บ'],['build','Build image'],['run','Run ตัวใหม่']];}
 if(s.kind==='port'){content=row(node('Browser',s.status==='running'?'พร้อมส่ง request':'ยังเปิดเว็บไม่ได้'),arrow('Host :8080'),node('Nginx :80',s.status==='running'?'running':'ไม่ทำงาน',s.status==='running'));actions=[['run','Run · 8080:80'],['request','เปิดเว็บ'],['stop','Stop']];}
 if(s.kind==='lifecycle'){content=row(node('web',s.status==='absent'?'ยังไม่มี Container':`ตัวที่ ${s.container}`,s.status!=='absent'),arrow('สถานะ'),node(s.status==='running'?'Running':s.status==='exited'?'Exited':'Removed / ยังไม่สร้าง',s.status==='exited'?'ชื่อ web ยังถูกจอง':s.status==='absent'?'ชื่อ web ว่าง':'Process ทำงาน',s.status==='running'));actions=[['run','Run'],['stop','Stop'],['start','Start'],['remove','ลบ Container']];}
 if(s.kind==='cache'){const p=s.changed==='packages';content=row(...['COPY package*.json ./','RUN npm ci','COPY . .','RUN npm run build'].map((label,i)=>node(label,!s.changed?'ยังไม่เลือกไฟล์':p||i>1?'REBUILD':'CACHED',!!s.changed&&!p&&i<2)));actions=[['source','แก้ app.js'],['packages','แก้ package-lock.json']];}
 if(s.kind==='storage'){content=row(node(s.status==='absent'?'Container ถูกลบ':'Container',s.data?`note.txt: ${s.data}`:'ไม่มีข้อความ'),arrow(s.useVolume?'mount /data':'writable layer'),node(s.useVolume?'Volume: notes':'อยู่เฉพาะ Container',s.useVolume?(s.volume||'ยังไม่มีข้อความ'):'ลบ Container แล้วข้อมูลหาย',s.useVolume));actions=[['layer','ใช้ Writable layer'],['volume','ใช้ Named volume'],['write','เขียนข้อความ'],['remove','ลบ Container'],['recreate','สร้างใหม่']];}
 if(s.kind==='network'){content=row(node('web',`DB_HOST=${s.host}`),arrow(s.host==='db'?'db:5432':'localhost ↺ web'),node('db :5432',s.db?'running':'stopped',s.db&&s.host==='db'));actions=[['localhost','เรียก localhost:5432'],['db','เรียก db:5432'],['toggle-db',s.db?'หยุด db':'เริ่ม db']];}
 if(s.kind==='multistage'){content=row(node('Build stage',s.image?'มี dist/ แล้ว':'รอ npm run build',!!s.image),arrow('COPY --from=build'),node('Runtime stage',s.copied?'Nginx + dist/':'ยังไม่มี dist/',s.copied));actions=[['build','Build stage แรก'],['copy','COPY dist/ ไป runtime']];}
 if(s.kind==='watch'){content=row(node('Source',`รุ่น ${s.source}`),arrow(s.watch==='off'?'Watch ปิด':s.watch),node('Image',`รุ่น ${s.image||1}`),arrow('Container'),node('ไฟล์ใน Container',`รุ่น ${s.container||1}`,s.container===s.source));actions=[['sync','ตั้ง Sync'],['rebuild','ตั้ง Rebuild'],['off','ปิด Watch'],['edit','แก้ source']];}
 if(s.kind==='secret'){content=row(node('Secret mount',s.secret?'กำลังใช้ใน RUN':'ไม่ได้ mount',s.secret),arrow('Build artifact'),node('Image',s.leaked?'มี Secret รั่วใน artifact':'ตัวอย่างนี้ไม่มี Secret ใน artifact',!s.leaked));actions=[['mount','ใช้ Secret mount'],['copy-secret','ลอง COPY Secret ลง artifact'],['finish','จบขั้น RUN']];}
 const input=s.kind==='storage'?`<label class="ld-play-input">ข้อความใน note.txt<input data-diagram-value maxlength="80" value="${escape(s.data||'my note')}" ${s.status==='absent'?'disabled':''}></label>`:'';
 const controls=input+`<div class="ld-play-actions">${actions.map(([action,label])=>`<button type="button" data-diagram-action="${action}">${escape(label)}</button>`).join('')}<button type="button" data-diagram-action="reset">เริ่มใหม่</button></div><p class="ld-play-feedback" role="status">${escape(s.message)}</p><small class="ld-play-note">ภาพทดลองเพื่ออธิบาย · ไม่เปลี่ยนงานใน VM Lab</small>`;
 return {content,controls};
}
