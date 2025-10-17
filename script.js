// Mobile nav
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
if(navToggle){ navToggle.addEventListener('click', ()=> navLinks.classList.toggle('show')); }
const yearEl = document.getElementById('year');
if(yearEl){ yearEl.textContent = new Date().getFullYear(); }

// Subscribe handler (Cloudflare Pages Function: /api/subscribe)
async function wireForm(formId, msgId){
  const form = document.getElementById(formId);
  const msg = document.getElementById(msgId);
  if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = form.querySelector('input[name="email"]').value.trim();
    msg.textContent = "Siunčiame...";
    try{
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, source: formId })
      });
      const data = await res.json().catch(()=>({}));
      if(res.ok){
        msg.textContent = "Ačiū! Patvirtinimas išsiųstas.";
        form.reset();
      }else{
        msg.textContent = data.error || "Įvyko klaida. Pabandyk dar kartą.";
      }
    }catch(err){
      msg.textContent = "Tinklo klaida.";
    }
  });
}
wireForm('earlyAccessForm','earlyAccessMsg');
wireForm('betaForm','betaMsg');
// === DEMO V2 uploader (front-end) – perkelta iš /upload.js į script.js ===
document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById('fileInputDemo');
  const drop  = document.getElementById('dropzone');
  const grid  = document.getElementById('previewGrid');
  const empty = document.getElementById('previewEmpty');
  const msg   = document.getElementById('uploadMsg');
  const btnUp = document.getElementById('btnUpload');
  const box   = document.getElementById('shareBox');
  const urlEl = document.getElementById('shareUrl');
  const btnCp = document.getElementById('btnCopy');

  if (!input || !drop || !grid || !empty || !msg || !btnUp || !box || !urlEl || !btnCp) return;

  const MAX = 5;
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
  let picked = [];

  const setMsg = (t) => { msg.textContent = t || ''; };
  const clearShare = () => { box.hidden = true; urlEl.value = ''; };

  function render(){
    grid.innerHTML = '';
    if (!picked.length){
      empty.style.display='block';
      return;
    }
    empty.style.display='none';
    picked.forEach(f => {
      const card = document.createElement('div');
      card.className='thumb';
      const img = document.createElement('img');
      const url = URL.createObjectURL(f);
      img.src = url;
      img.onload = () => URL.revokeObjectURL(url);
      const cap = document.createElement('small');
      cap.className='muted cap';
      cap.textContent = `${Math.round(f.size/1024)} KB`;
      card.appendChild(img);
      card.appendChild(cap);
      grid.appendChild(card);
    });
  }

  function accept(list){
    const arr = Array.from(list || []);
    const next = [];
    for (const f of arr){
      if (!ALLOWED.includes(f.type)) {
        setMsg(`Neleidžiamas tipas: ${f.type || 'unknown'}`);
        return;
      }
      next.push(f);
      if (next.length >= MAX) break;
    }
    picked = next;
    setMsg('');
    clearShare();
    render();
  }

  input.addEventListener('change', e => accept(e.target.files));
  ['dragenter','dragover'].forEach(k =>
    drop.addEventListener(k, e => { e.preventDefault(); drop.classList.add('is-dragover'); })
  );
  ['dragleave','drop'].forEach(k =>
    drop.addEventListener(k, e => { e.preventDefault(); drop.classList.remove('is-dragover'); })
  );
  drop.addEventListener('drop', e => accept(e.dataTransfer.files));

  btnUp.addEventListener('click', async () => {
    if (!picked.length){
      setMsg('Pirma pasirink failus.');
      return;
    }
    setMsg('Įkeliama…');
    btnUp.disabled = true;
    clearShare();

    const fd = new FormData();
    picked.forEach(f => fd.append('files', f, f.name));

    try{
      const res = await fetch('/api/upload', { method:'POST', body: fd });
      const data = await res.json().catch(()=> ({}));
      if(!res.ok || !data.ok){
        setMsg(data.error || `Klaida (${res.status})`);
        return;
      }
      urlEl.value = (data.shareUrl || '').replace('/api/share/', '/share/');
      if(!urlEl.value){
        setMsg('Nepavyko gauti nuorodos.');
        return;
      }
      box.hidden = false;
      setMsg('Viskas! Gali dalintis nuoroda žemiau.');
    } catch(err){
      console.error(err);
      setMsg('Tinklo klaida.');
    } finally {
      btnUp.disabled = false;
    }
  });

  btnCp.addEventListener('click', async () => {
    try{
      await navigator.clipboard.writeText(urlEl.value);
      setMsg('Nukopijuota!');
    }catch{
      setMsg('Nepavyko nukopijuoti.');
    }
  });
});
// === Header Auth Mount ===
document.addEventListener('DOMContentLoaded', async () => {
  const mount = document.getElementById('authMount');
  if (!mount) return;

  try{
    const r = await fetch('/api/auth/me', { credentials:'include' });
    const m = await r.json().catch(()=>({}));
    mount.innerHTML = ''; // clear

    if (m && m.loggedIn) {
      // Prisijungęs
      const acc = document.createElement('a');
      acc.href = '/account';
      acc.textContent = 'Mano paskyra';
      acc.className = 'btn btn--small';

      const out = document.createElement('button');
      out.type = 'button';
      out.textContent = 'Atsijungti';
      out.className = 'btn btn--small btn--ghost';
      out.addEventListener('click', async ()=>{
        await fetch('/api/auth/logout', { method:'POST', credentials:'include' });
        location.reload();
      });

      mount.append(acc, out);
    } else {
      // Neprisijungęs
      const login = document.createElement('a');
      login.href = '/login.html';
      login.textContent = 'Prisijungti';
      login.className = 'btn btn--small btn--ghost';

      const reg = document.createElement('a');
      reg.href = '/register.html';
      reg.textContent = 'Registruotis';
      reg.className = 'btn btn--small';

      mount.append(login, reg);
    }
  }catch(e){
    // tyliai ignoruojam
  }
});
