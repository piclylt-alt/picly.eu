// === upload.js (Picly – Demo V2) ===
// Sukurtas naujam demo sekcijos dizainui ir UX
// Drag & drop, 5 thumbs, vienas share link, be native input button

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

  if (!input || !drop || !grid) {
    console.warn("Demo uploader elementai nerasti šiame puslapyje – praleidžiama.");
    return;
  }

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
      img.src = URL.createObjectURL(f);
      img.onload = () => URL.revokeObjectURL(img.src);
      const cap = document.createElement('small'); 
      cap.className='muted cap';
      cap.textContent = `${Math.round(f.size/1024)} KB`;
      card.appendChild(img); 
      card.appendChild(cap); 
      grid.appendChild(card);
    });
  }

  function accept(list){
    const arr = Array.from(list);
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

  // 🖱️ Click → atidaro failų dialogą
  drop.addEventListener('click', () => input.click());

  // 📁 Input change
  input.addEventListener('change', e => accept(e.target.files));

  // 🌀 Drag states
  ['dragenter','dragover'].forEach(k =>
    drop.addEventListener(k, e => { e.preventDefault(); drop.classList.add('is-dragover'); })
  );
  ['dragleave','drop'].forEach(k =>
    drop.addEventListener(k, e => { e.preventDefault(); drop.classList.remove('is-dragover'); })
  );
  drop.addEventListener('drop', e => accept(e.dataTransfer.files));

  // 🚀 Upload → POST /api/upload
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

    try {
      const res = await fetch('/api/upload', { method:'POST', body:fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok){
        setMsg(data.error || `Klaida (${res.status})`);
        return;
      }

      // ✅ rodom tik vieną nuorodą
      urlEl.value = data.shareUrl || '';
      if (!urlEl.value){ 
        setMsg('Nepavyko gauti nuorodos.'); 
        return; 
      }
      box.hidden = false;
      setMsg('Viskas! Gali dalintis nuoroda žemiau.');
    } 
    catch (err) {
      console.error(err);
      setMsg('Tinklo klaida.');
    } 
    finally {
      btnUp.disabled = false;
    }
  });

  // 📋 Copy to clipboard
  btnCp.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(urlEl.value);
      setMsg('Nukopijuota!');
    } catch {
      setMsg('Nepavyko nukopijuoti.');
    }
  });
});
