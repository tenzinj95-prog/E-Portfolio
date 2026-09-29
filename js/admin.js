/* ==========================================================
   JIGME TENZIN ePORTFOLIO - ADMIN SCRIPT
   Supabase-authenticated content manager.
   ========================================================== */
const CFG = window.SUPABASE_CONFIG || {};
const db = (typeof supabase !== 'undefined' && CFG.url && CFG.url.startsWith('http') && CFG.anonKey && CFG.anonKey !== 'YOUR_SUPABASE_ANON_KEY')
  ? supabase.createClient(CFG.url, CFG.anonKey) : null;

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
let current = 'dashboard';

const titles = { profile: 'Profile', about: 'About Me', skills: 'Skills', education: 'Education', projects: 'Projects', socials: 'Social Links', messages: 'Messages' };

// fields: [column, label, input type]  ('image' = upload-an-image field)
const schemas = {
  skills: { table: 'portfolio_skills', title: 'Skill', plural: 'Skills', fields: [
    ['name', 'Skill name', 'text'], ['description', 'Short description', 'textarea'],
    ['level', 'Skill level (0–100)', 'number'], ['icon', 'Icon / fallback', 'text'],
    ['image_url', 'Skill image', 'image'], ['video_url', 'Skill video (URL or upload)', 'video'],
    ['gallery', 'Additional images', 'gallery'], ['color', 'Accent color', 'color'], ['display_order', 'Display order', 'number']] },
  education: { table: 'portfolio_education', title: 'Education', plural: 'Education', fields: [
    ['period', 'Period', 'text'], ['title', 'Qualification / title', 'text'], ['institution', 'Institution', 'text'],
    ['description', 'Short description', 'textarea'], ['image_url', 'Main photo', 'image'],
    ['video_url', 'Video (URL or upload)', 'video'],
    ['certificate_url', 'Certificate / document URL (optional)', 'url'],
    ['gallery', 'Additional photos', 'gallery'], ['display_order', 'Display order', 'number']] },
  projects: { table: 'portfolio_projects', title: 'Project', plural: 'Projects', fields: [
    ['title', 'Project title', 'text'], ['description', 'Short description', 'textarea'],
    ['technologies', 'Technologies (separate with · or commas)', 'text'],
    ['image_url', 'Cover image', 'image'], ['video_url', 'Demo video (URL or upload)', 'video'],
    ['gallery', 'Project screenshots / photos', 'gallery'],
    ['project_url', 'Live project URL (optional)', 'url'], ['github_url', 'GitHub URL (optional)', 'url'],
    ['display_order', 'Display order', 'number']] },
  socials: { table: 'portfolio_socials', title: 'Social Link', plural: 'Social Links', fields: [
    ['name', 'Platform name', 'text'], ['url', 'Profile URL', 'text'],
    ['icon', 'Icon image', 'image'], ['display_order', 'Display order', 'number']] }
};

/* ---------- Image uploads (Supabase Storage) ---------- */
const MEDIA_BUCKET = 'portfolio-media';
const looksLikeImage = v => /^(https?:\/\/|data:image\/|assets\/)/i.test(String(v ?? '').trim());
const MAX_IMAGE_MB = 5;

async function uploadToStorage(file) {
  if (!db) throw new Error('Not connected to Supabase yet — check js/config.js.');
  if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) throw new Error('Please choose an image or video file.');
  const maxMb = file.type.startsWith('video/') ? 50 : MAX_IMAGE_MB;
  if (file.size > maxMb * 1024 * 1024) throw new Error(`File is too large (max ${maxMb}MB).`);
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await db.storage.from(MEDIA_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(error.message + ' (make sure supabase.sql was run — it creates the "portfolio-media" storage bucket)');
  const { data } = db.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}


async function uploadPdfToStorage(file) {
  if (!db) throw new Error('Not connected to Supabase yet — check js/config.js.');
  if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) throw new Error('Please choose a PDF file.');
  const maxMb = 15;
  if (file.size > maxMb * 1024 * 1024) throw new Error(`PDF is too large (max ${maxMb}MB).`);
  const path = `cv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;
  const { error } = await db.storage.from(MEDIA_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: 'application/pdf' });
  if (error) throw new Error(error.message + ' (make sure the portfolio-media bucket/policies are available)');
  const { data } = db.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function wirePdfInputs(container) {
  container.querySelectorAll('[data-pdf-field]').forEach(inp => {
    inp.onchange = async () => {
      const file = inp.files && inp.files[0];
      if (!file) return;
      const key = inp.dataset.pdfField;
      const hidden = document.getElementById('field_' + key);
      const link = document.getElementById('pdfLink_' + key);
      const hint = document.getElementById('pdfHint_' + key);
      if (hint) hint.textContent = 'Uploading PDF...';
      inp.disabled = true;
      try {
        const url = await uploadPdfToStorage(file);
        hidden.value = url;
        if (link) { link.href = url; link.textContent = 'Open uploaded PDF ↗'; link.style.display = ''; }
        if (hint) hint.textContent = 'PDF uploaded ✓';
      } catch (err) {
        if (hint) hint.textContent = 'Upload failed';
        toast('PDF upload failed: ' + err.message, false);
      } finally { inp.disabled = false; inp.value = ''; }
    };
  });
}

function pdfFieldHtml(key, label, val = '') {
  const v = esc(val);
  const has = /^https?:\/\//i.test(String(val || '').trim()) || /^assets\//i.test(String(val || '').trim());
  return `<div class="form-group">
    <label>${esc(label)}</label>
    <div class="image-field">
      <div class="image-actions" style="width:100%">
        <input type="file" accept="application/pdf,.pdf" data-pdf-field="${key}" class="form-control">
        <div class="image-actions-row">
          <span class="image-hint" id="pdfHint_${key}">${has ? 'PDF already uploaded ✓' : 'Choose a PDF to upload (max 15MB)'}</span>
          <a id="pdfLink_${key}" class="media-action" href="${has ? v : '#'}" target="_blank" rel="noopener" style="${has ? '' : 'display:none'}">${has ? 'Open uploaded PDF ↗' : ''}</a>
          <button type="button" class="image-remove-btn" data-pdf-remove="${key}">Remove</button>
        </div>
      </div>
    </div>
    <input type="hidden" id="field_${key}" value="${v}">
  </div>`;
}

function wirePdfRemove(container) {
  container.querySelectorAll('[data-pdf-remove]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.pdfRemove;
      const hidden = document.getElementById('field_' + key);
      const link = document.getElementById('pdfLink_' + key);
      const hint = document.getElementById('pdfHint_' + key);
      if (hidden) hidden.value = '';
      if (link) { link.href = '#'; link.textContent = ''; link.style.display = 'none'; }
      if (hint) hint.textContent = 'Choose a PDF to upload (max 15MB)';
    };
  });
}

function updateAdminProfileImage(url) {
  if (!url) return;
  const bust = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`;
  document.querySelectorAll('.brand-img, .login-mark').forEach(img => { img.src = bust; });
}

// Wires up every image-upload field inside a container (modal or inline form).
function wireImageInputs(container) {
  container.querySelectorAll('[data-image-field]').forEach(inp => {
    inp.onchange = async () => {
      const file = inp.files && inp.files[0];
      if (!file) return;
      const key = inp.dataset.imageField;
      const hidden = document.getElementById('field_' + key);
      const preview = document.getElementById('preview_' + key);
      const empty = document.getElementById('previewEmpty_' + key);
      const hint = document.getElementById('hint_' + key);
      if (hint) hint.textContent = 'Uploading...';
      inp.disabled = true;
      try {
        const url = await uploadToStorage(file);
        hidden.value = url;
        if (preview) { preview.src = url; preview.style.display = ''; }
        if (empty) empty.style.display = 'none';
        if (hint) hint.textContent = 'Image uploaded ✓';
      } catch (err) {
        if (hint) hint.textContent = 'Upload failed';
        toast('Image upload failed: ' + err.message, false);
      } finally {
        inp.disabled = false;
      }
    };
  });
  container.querySelectorAll('[data-image-remove]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.dataset.imageRemove;
      const hidden = document.getElementById('field_' + key);
      const preview = document.getElementById('preview_' + key);
      const empty = document.getElementById('previewEmpty_' + key);
      const hint = document.getElementById('hint_' + key);
      hidden.value = '';
      if (preview) { preview.src = ''; preview.style.display = 'none'; }
      if (empty) { empty.style.display = ''; empty.textContent = 'No image'; }
      if (hint) hint.textContent = 'Choose an image to upload';
    };
  });
}


function parseGallery(val) {
  if (!val) return [];
  try {
    const a = JSON.parse(val);
    return Array.isArray(a) ? a.filter(Boolean) : [];
  } catch {
    return String(val).split(/\r?\n|,/).map(s => s.trim()).filter(Boolean);
  }
}

function videoFieldHtml(key, label, val = '') {
  return `<div class="form-group video-field-wrap">
    <label for="field_${key}">${esc(label)}</label>
    <input id="field_${key}" class="form-control" type="url" value="${esc(val)}" placeholder="https://youtube.com/... or https://example.com/video.mp4">
    <div class="video-upload-row">
      <input type="file" accept="video/*" data-video-field="${key}" class="form-control">
      <span class="image-hint" id="videoHint_${key}">Optional: upload a video instead</span>
    </div>
  </div>`;
}
function galleryFieldHtml(key, label, val = '') {
  const items = parseGallery(val);
  return `<div class="form-group gallery-field-wrap">
    <label>${esc(label)}</label>
    <div class="gallery-upload-box">
      <input type="file" accept="image/*" multiple data-gallery-field="${key}" class="form-control">
      <div class="image-hint" id="galleryHint_${key}">Choose multiple images. They will upload to your portfolio storage.</div>
      <div id="galleryPreview_${key}" class="admin-gallery-preview">${items.map((u,i)=>`<div class="admin-gallery-thumb" data-gallery-item="${i}"><img src="${esc(u)}" alt=""><button type="button" data-gallery-remove="${i}" aria-label="Remove image">&times;</button></div>`).join('')}</div>
    </div>
    <input type="hidden" id="field_${key}" value="${esc(JSON.stringify(items))}">
  </div>`;
}

function imageFieldHtml(key, label, val = '') {
  const safe = esc(label);
  const v = esc(val);
  const hasImg = looksLikeImage(val);
  return `<div class="form-group">
    <label>${safe}</label>
    <div class="image-field">
      <img class="image-preview" id="preview_${key}" src="${hasImg ? v : ''}" style="${hasImg ? '' : 'display:none'}" alt="">
      <div class="image-preview-empty" id="previewEmpty_${key}">${hasImg ? '' : (val ? esc(val) : 'No image')}</div>
      <div class="image-actions">
        <input type="file" accept="image/*" data-image-field="${key}" class="form-control">
        <div class="image-actions-row">
          <span class="image-hint" id="hint_${key}">${hasImg ? 'Image uploaded ✓' : 'Choose an image to upload'}</span>
          <button type="button" class="image-remove-btn" data-image-remove="${key}">Remove</button>
        </div>
      </div>
    </div>
    <input type="hidden" id="field_${key}" value="${v}">
  </div>`;
}



function wireVideoInputs(container) {
  container.querySelectorAll('[data-video-field]').forEach(inp => {
    inp.onchange = async () => {
      const file = inp.files && inp.files[0];
      if (!file) return;
      const key = inp.dataset.videoField, out = document.getElementById('field_' + key), hint = document.getElementById('videoHint_' + key);
      hint.textContent = 'Uploading video...'; inp.disabled = true;
      try {
        out.value = await uploadToStorage(file);
        hint.textContent = 'Video uploaded ✓';
      } catch (err) {
        hint.textContent = 'Upload failed';
        toast('Video upload failed: ' + err.message, false);
      } finally { inp.disabled = false; inp.value = ''; }
    };
  });
}
async function wireGalleryInputs(container) {
  container.querySelectorAll('[data-gallery-field]').forEach(inp => {
    inp.onchange = async () => {
      const files = Array.from(inp.files || []);
      if (!files.length) return;
      const key = inp.dataset.galleryField;
      const hidden = document.getElementById('field_' + key);
      const hint = document.getElementById('galleryHint_' + key);
      let items = parseGallery(hidden.value);
      hint.textContent = `Uploading ${files.length} image(s)...`;
      inp.disabled = true;
      try {
        for (const file of files) items.push(await uploadToStorage(file));
        hidden.value = JSON.stringify(items);
        refreshGalleryPreview(key);
        hint.textContent = `${items.length} image(s) ready ✓`;
      } catch (err) {
        hint.textContent = 'Upload failed';
        toast('Gallery upload failed: ' + err.message, false);
      } finally { inp.disabled = false; inp.value = ''; }
    };
  });
  container.querySelectorAll('[data-gallery-remove]').forEach(btn => {
    btn.onclick = () => {
      const key = btn.closest('.gallery-field-wrap').querySelector('input[type="hidden"]').id.replace('field_','');
      const hidden = document.getElementById('field_' + key);
      const items = parseGallery(hidden.value);
      items.splice(Number(btn.dataset.galleryRemove), 1);
      hidden.value = JSON.stringify(items);
      refreshGalleryPreview(key);
    };
  });
}
function refreshGalleryPreview(key) {
  const box = document.getElementById('galleryPreview_' + key);
  const hidden = document.getElementById('field_' + key);
  if (!box || !hidden) return;
  const items = parseGallery(hidden.value);
  box.innerHTML = items.map((u,i)=>`<div class="admin-gallery-thumb"><img src="${esc(u)}" alt=""><button type="button" data-gallery-remove="${i}" aria-label="Remove image">&times;</button></div>`).join('');
  wireGalleryInputs(box.closest('.gallery-field-wrap'));
}

function toast(msg, ok = true) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast show ' + (ok ? '' : 'error');
  setTimeout(() => { t.className = 'toast'; }, 2800);
}
function loginError(msg) { const m = $('#loginMsg'); m.textContent = msg; m.classList.add('show'); }

function requireDb() {
  if (!db) { loginError('Add your Supabase URL and anon key in js/config.js (and check your internet connection).'); return false; }
  return true;
}

/* ---------- Auth ---------- */
async function isAdmin(user) {
  const { data, error } = await db.from('portfolio_admins').select('user_id').eq('user_id', user.id).maybeSingle();
  return !error && !!data;
}
async function enter(session) {
  if (!(await isAdmin(session.user))) {
    await db.auth.signOut();
    loginError('This account is not registered as an admin. Add its user ID to the portfolio_admins table (see README).');
    return;
  }
  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#adminEmail').textContent = session.user.email || '';
  try {
    const { data: profile } = await db.from('portfolio_profile').select('profile_image').order('id').limit(1).maybeSingle();
    if (profile?.profile_image) updateAdminProfileImage(profile.profile_image);
  } catch {}
  loadDashboard();
}
async function check() {
  if (!requireDb()) return;
  const { data: { session } } = await db.auth.getSession();
  if (session) enter(session);
}
$('#loginForm').onsubmit = async e => {
  e.preventDefault();
  $('#loginMsg').classList.remove('show');
  if (!requireDb()) return;
  const btn = $('#loginBtn'); btn.disabled = true; btn.textContent = 'Signing in...';
  const { data, error } = await db.auth.signInWithPassword({ email: $('#email').value.trim(), password: $('#password').value });
  btn.disabled = false; btn.textContent = 'Log In';
  if (error) return loginError(error.message);
  enter(data.session);
};
$('#logout').onclick = async () => { await db.auth.signOut(); location.reload(); };

/* ---------- Navigation ---------- */
$('#mobileMenu').onclick = () => $('#sidebar').classList.toggle('open');
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => {
  openView(b.dataset.view);
  $('#sidebar').classList.remove('open');
  document.querySelectorAll('.admin-nav button[data-view]').forEach(x => x.classList.toggle('active', x.dataset.view === b.dataset.view));
});

async function count(t) {
  try {
    const { count, error } = await db.from(t).select('*', { count: 'exact', head: true });
    return error ? 0 : count || 0;
  } catch { return 0; }
}
async function loadDashboard() {
  $('#viewTitle').textContent = 'Dashboard';
  $('#dashboard').classList.remove('hidden');
  $('#editor').classList.add('hidden');
  const [s, e, p, m] = await Promise.all([count('portfolio_skills'), count('portfolio_education'), count('portfolio_projects'), count('portfolio_messages')]);
  $('#dSkills').textContent = s; $('#dEdu').textContent = e; $('#dProjects').textContent = p; $('#dMessages').textContent = m;
}
async function openView(v) {
  current = v;
  $('#viewTitle').textContent = titles[v] || 'Dashboard';
  $('#dashboard').classList.toggle('hidden', v !== 'dashboard');
  $('#editor').classList.toggle('hidden', v === 'dashboard');
  if (v === 'dashboard') await loadDashboard(); else await renderEditor(v);
}

/* ---------- Forms ---------- */
function fieldHtml([key, label, type], val = '') {
  const safe = esc(label);
  if (type === 'image') return imageFieldHtml(key, label, val);
  if (type === 'gallery') return galleryFieldHtml(key, label, val);
  if (type === 'video') return videoFieldHtml(key, label, val);
  return type === 'textarea'
    ? `<div class="form-group"><label for="field_${key}">${safe}</label><textarea id="field_${key}" class="form-control" rows="4">${esc(val)}</textarea></div>`
    : `<div class="form-group"><label for="field_${key}">${safe}</label><input id="field_${key}" class="form-control" type="${type}" value="${esc(val)}" placeholder="${safe}"${type === 'number' && key === 'level' ? ' min="0" max="100"' : ''}></div>`;
}
function collect(s) {
  const obj = {};
  s.fields.forEach(f => {
    let v = $('#field_' + f[0]).value;
    if (f[2] === 'number') v = Number(v) || 0;
    if (f[2] === 'gallery') {
      try { v = JSON.stringify(JSON.parse(v || '[]')); } catch { v = '[]'; }
    }
    obj[f[0]] = v;
  });
  if (s.table === 'portfolio_skills') obj.level = Math.max(0, Math.min(100, obj.level));
  if (s.table === 'portfolio_projects') obj.tech = obj.technologies; // keep legacy column in sync
  return obj;
}

async function renderEditor(v) {
  const box = $('#editorContent');
  box.innerHTML = '<div class="empty">Loading...</div>';

  if (v === 'profile') {
    const { data } = await db.from('portfolio_profile').select('*').order('id').limit(1).maybeSingle();
    box.innerHTML = `<div class="page-head"><div><h3>Profile</h3><p>Update the short information visitors see first.</p></div></div>
      <div class="single-card"><form id="profileForm">
        <div class="form-group"><label for="pname">Name</label><input id="pname" class="form-control" value="${esc(data?.name || 'Jigme Tenzin')}"></div>
        <div class="form-group"><label for="pintro">Introduction</label><textarea id="pintro" class="form-control" rows="5">${esc(data?.intro || '')}</textarea></div>
        <div class="form-group"><label for="pemail">Contact email</label><input id="pemail" class="form-control" type="email" value="${esc(data?.contact_email || '')}" placeholder="your@email.com"></div>
        <div class="form-group"><label for="pphone">Contact phone (optional)</label><input id="pphone" class="form-control" type="tel" value="${esc(data?.contact_phone || '')}" placeholder="+975 ..."></div>
        ${imageFieldHtml('pimage', 'Profile image', data?.profile_image || '')}
        ${pdfFieldHtml('pcv', 'CV / Resume PDF', data?.cv_url || '')}
        <button class="btn btn-solid" type="submit">Save Profile</button></form></div>`;
    wireImageInputs(box); wireGalleryInputs(box); wireVideoInputs(box); wirePdfInputs(box); wirePdfRemove(box);
    $('#profileForm').onsubmit = async e => {
      e.preventDefault();
      const obj = { name: $('#pname').value, intro: $('#pintro').value, contact_email: $('#pemail').value.trim(), contact_phone: $('#pphone').value.trim(), profile_image: $('#field_pimage').value, cv_url: $('#pcv').value, updated_at: new Date().toISOString() };
      try {
        const { error } = await (data?.id ? db.from('portfolio_profile').update(obj).eq('id', data.id) : db.from('portfolio_profile').insert(obj));
        if (error) toast(error.message, false); else { updateAdminProfileImage(obj.profile_image); toast('Profile saved successfully'); }
      } catch (err) { toast('Could not save profile: ' + err.message, false); }
    };
    return;
  }

  if (v === 'about') {
    const { data } = await db.from('portfolio_about').select('*').order('id').limit(1).maybeSingle();
    box.innerHTML = `<div class="page-head"><div><h3>About Me</h3><p>Build a richer story with text, a photo, a video and a gallery placed between your paragraphs.</p></div></div>
      <div class="single-card"><form id="aboutForm">
        <div class="about-editor-grid">
          <div class="form-group"><label for="aboutBefore">Opening text</label><textarea id="aboutBefore" class="form-control" rows="7" placeholder="Write the beginning of your story...">${esc(data?.content_before || data?.content || '')}</textarea></div>
          ${imageFieldHtml('aboutImage', 'Photo inside your story', data?.image_url || '')}
          <div class="form-group"><label for="aboutMiddle">Text after the photo</label><textarea id="aboutMiddle" class="form-control" rows="6" placeholder="Continue your story...">${esc(data?.content_middle || '')}</textarea></div>
          ${videoFieldHtml('aboutVideo', 'Video inside your story', data?.video_url || '')}
          ${galleryFieldHtml('aboutGallery', 'About photo gallery', data?.gallery || '')}
          <div class="form-group"><label for="aboutAfter">Closing text</label><textarea id="aboutAfter" class="form-control" rows="6" placeholder="Write a closing paragraph...">${esc(data?.content_after || '')}</textarea></div>
        </div>
        <div class="about-layout-preview"><span>Preview order</span><b>Text</b><i>→</i><b>Photo</b><i>→</i><b>Text</b><i>→</i><b>Video</b><i>→</i><b>Gallery</b><i>→</i><b>Closing</b></div>
        <button class="btn btn-solid" type="submit">Save About Page</button></form></div>`;
    wireImageInputs(box); wireVideoInputs(box); wireGalleryInputs(box);
    $('#aboutForm').onsubmit = async e => {
      e.preventDefault();
      const obj = { content: $('#aboutBefore').value, content_before: $('#aboutBefore').value, content_middle: $('#aboutMiddle').value, content_after: $('#aboutAfter').value, image_url: $('#field_aboutImage').value, video_url: $('#field_aboutVideo').value, gallery: $('#field_aboutGallery').value, updated_at: new Date().toISOString() };
      try {
        const { error } = await (data?.id ? db.from('portfolio_about').update(obj).eq('id', data.id) : db.from('portfolio_about').insert(obj));
        error ? toast(error.message, false) : toast('About page saved successfully');
      } catch (err) { toast('Could not save: ' + err.message, false); }
    };
    return;
  }

  if (v === 'messages') {
    const { data, error } = await db.from('portfolio_messages').select('*').order('created_at', { ascending: false });
    if (error) { box.innerHTML = `<div class="empty">${esc(error.message)}</div>`; return; }
    box.innerHTML = `<div class="page-head"><div><h3>Messages</h3><p>${data?.length || 0} message(s) received.</p></div></div>` +
      (data?.length ? `<div class="message-list">${data.map(m => `<article class="message">
        <div class="message-top"><div><strong>${esc(m.name)}</strong><span><a href="mailto:${esc(m.email)}">${esc(m.email)}</a></span></div><time>${new Date(m.created_at).toLocaleString()}</time></div>
        <p>${esc(m.message)}</p><button class="btn-danger" onclick="deleteMessage('${m.id}')">Delete</button></article>`).join('')}</div>`
        : '<div class="empty">No messages yet.</div>');
    return;
  }

  const s = schemas[v];
  let data, error;
  try {
    ({ data, error } = await db.from(s.table).select('*').order('display_order', { ascending: true }));
  } catch (err) { error = err; }
  if (error) {
    box.innerHTML = `<div class="empty">Could not load ${esc(s.plural)}: ${esc(error.message)}<br><small>Check that supabase.sql has been run for this project, and that your signed-in account is listed in portfolio_admins.</small></div>`;
    return;
  }
  box.innerHTML = `<div class="page-head"><div><h3>${s.plural}</h3><p>Keep each item short. Use the Add button when you need another item.</p></div>
    <button class="btn btn-solid" onclick="openAdd()">+ Add ${s.title}</button></div>
    <div class="item-grid">${(data || []).map(x => {
      const thumb = x.image_url || x.icon;
      const iconHtml = looksLikeImage(thumb) ? `<img src="${esc(thumb)}" alt="">` : esc(thumb || '✦');
      return `<article class="content-item">
      <div class="item-main"><div class="item-icon">${iconHtml}</div>
      <div><h4>${esc(x.name || x.title || 'Untitled')}</h4><p>${esc(x.description || x.institution || x.technologies || x.url || '')}</p>
      <div class="media-badges">${x.image_url ? '<span>📷 Photo</span>' : ''}${parseGallery(x.gallery).length ? `<span>🖼 ${parseGallery(x.gallery).length} gallery</span>` : ''}${x.video_url ? '<span>▶ Video</span>' : ''}${x.certificate_url ? '<span>📄 Certificate</span>' : ''}</div></div></div>
      <div class="item-actions"><button class="btn-view" onclick="editItem('${x.id}')">Edit</button><button class="btn-danger" onclick="deleteItem('${x.id}')">Delete</button></div></article>`;
    }).join('')
      || '<div class="empty">No items yet. Add your first one.</div>'}</div>`;
}

/* ---------- Add / edit / delete ---------- */
window.openAdd = () => {
  const s = schemas[current];
  $('#modalTitle').textContent = 'Add ' + s.title;
  $('#modalContent').innerHTML = `<form id="itemForm">${s.fields.map(f => fieldHtml(f)).join('')}<button class="btn btn-solid" type="submit">Save</button></form>`;
  wireImageInputs($('#modalContent')); wireGalleryInputs($('#modalContent')); wireVideoInputs($('#modalContent')); wirePdfInputs($('#modalContent')); wirePdfRemove($('#modalContent'));
  $('#modal').classList.remove('hidden');
  $('#itemForm').onsubmit = saveNew;
};
window.editItem = async id => {
  const s = schemas[current];
  let data, error;
  try { ({ data, error } = await db.from(s.table).select('*').eq('id', id).single()); }
  catch (err) { error = err; }
  if (error) return toast('Could not open item for editing: ' + error.message, false);
  $('#modalTitle').textContent = 'Edit ' + s.title;
  $('#modalContent').innerHTML = `<form id="itemForm">${s.fields.map(f => fieldHtml(f, data[f[0]] ?? (f[2] === 'color' ? '#7a1f2b' : ''))).join('')}<button class="btn btn-solid" type="submit">Save Changes</button></form>`;
  wireImageInputs($('#modalContent')); wireGalleryInputs($('#modalContent')); wireVideoInputs($('#modalContent')); wirePdfInputs($('#modalContent')); wirePdfRemove($('#modalContent'));
  $('#modal').classList.remove('hidden');
  $('#itemForm').onsubmit = async e => {
    e.preventDefault();
    try {
      const { error } = await db.from(s.table).update(collect(s)).eq('id', id);
      if (error) toast(error.message, false); else { closeModal(); toast('Changes saved'); renderEditor(current); }
    } catch (err) { toast('Could not save changes: ' + err.message, false); }
  };
};
async function saveNew(e) {
  e.preventDefault();
  const s = schemas[current];
  try {
    const { error } = await db.from(s.table).insert(collect(s));
    if (error) toast(error.message, false); else { closeModal(); toast('Added successfully'); renderEditor(current); }
  } catch (err) { toast('Could not add: ' + err.message, false); }
}
window.deleteItem = async id => {
  if (!confirm('Delete this item? This cannot be undone.')) return;
  try {
    const { error } = await db.from(schemas[current].table).delete().eq('id', id);
    if (error) toast(error.message, false); else { toast('Deleted'); renderEditor(current); }
  } catch (err) { toast('Could not delete: ' + err.message, false); }
};
window.deleteMessage = async id => {
  if (!confirm('Delete this message?')) return;
  try {
    const { error } = await db.from('portfolio_messages').delete().eq('id', id);
    if (error) toast(error.message, false); else { toast('Message deleted'); renderEditor('messages'); }
  } catch (err) { toast('Could not delete: ' + err.message, false); }
};
function closeModal() { $('#modal').classList.add('hidden'); }
$('#closeModal').onclick = closeModal;
$('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

check();
