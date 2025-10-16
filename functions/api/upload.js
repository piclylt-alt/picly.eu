// === Picly DEMO + AUTH Upload ===
// - Neprisijungęs: demo režimas (feikinė share nuoroda, be serverio)
// - Prisijungęs: POST /api/upload -> realus /share/{id}

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

  // Jei šiame puslapyje nėra demo sekcijos — išeinam tyliai
  if (!input || !drop || !grid || !empty || !msg || !btnUp || !box || !urlEl || !btnCp) return;

  // --- Config ---
  const MAX = 5;
  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
  let picked = [];
  let isLoggedIn = false;

  // --- Helpers ---
  const setMsg = (t) => { msg.textContent = t || ''; };
  const clearShare = () => { box.hidden = true; urlEl.value = ''; };

  function render(){
    grid.innerHTML = '';
    if (!picked.length){
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    picked.forEach(f => {
      const card = document.createElement('div');
      card.className = 'thumb';
      const img = document.createElement('img');
      const url = URL.createObjectURL(f);
      img.src = url;
      img.onload = () => URL.revokeObjectURL(url);
      const cap = document.createElement('small');
      cap.className = 'muted cap';
      cap.textContent = `${Math.round((f.size||0)/1024)} KB`;
      card.appendChild(img);
      card.appendChild(cap);
      grid.appendChild(card);
    });
  }

  function accept(list){
    const arr = Array.from(list || []);
    if (!arr.length){
      setMsg('Nepasirinkta jokių failų.');
      return;
    }
    const next = [];
    for (const f of arr){
      const type = f.type || '';
      if (!ALLOWED.includes(type)){
        setMsg(`Neleidžiamas tipas: ${type || 'nežinomas'}`);
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

  // --- Auth check (nusprendžiam DEMO ar REAL) ---
  (async () => {
    try {
      const r = await fetch('/api/auth/me', { credentials:'include' });
      const m = await r.json().catch(()=> ({}));
      isLoggedIn = !!m.loggedIn;
      if (!isLoggedIn) {
        // gali (pasirinktinai) išjungti mygtuką, bet paliekam įjungtą — jis veiks demo režimu
        // btnUp.disabled = false;
      }
    } catch {
      isLoggedIn = false;
    }
  })();

  // --- UI events ---
  // Svarbu: jei dropzona yra <label for="fileInputDemo">, ant jos NEDĖTI input.click(),
  // nes naršyklė pati atidaro dialogą -> dvigubas atidarymas.
  if (drop.tagName !== 'LABEL') {
    drop.addEventListener('click', () => input.click());
  }
  input.addEventListener('change', e => accept(e.target.files));

  ['dragenter','dragover'].forEach(k =>
    drop.addEventListener(k, e => { e.preventDefault(); drop.classList.add('is-dragover'); })
  );
  ['dragleave','drop'].forEach(k =>
    drop.addEventListener(k, e => { e.preventDefault(); drop.classList.remove('is-dragover'); })
  );
  drop.addEventListener('drop', e => accept(e.dataTransfer.files));

  // --- Upload action ---
  btnUp.addEventListener('click', async () => {
    if (!picked.length){
      setMsg('Pirma pasirink failus.');
      return;
    }
    setMsg('Ruošiama…');
    btnUp.disabled = true;
    clearShare();

    // 1) DEMO režimas (neprisijungęs)
    if (!isLoggedIn) {
      const demoId = `demo-${Math.random().toString(36).slice(2, 10)}`;
      urlEl.value = `${location.origin}/share/${demoId}`;
      box.hidden = false;
      setMsg('Demo režimas: nuoroda sugeneruota (be įkėlimo į serverį).');
      btnUp.disabled = false;
      return;
    }

    // 2) REAL režimas (prisijungęs)
    setMsg('Įkeliama…');

    const fd = new FormData();
    picked.forEach(f => fd.append('files', f, f.name));

    try {
      // nepildom Content-Type — naršyklė pati nustatys boundary
      const res = await fetch('/api/upload', { method:'POST', body: fd, credentials:'include' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok){
        setMsg(data.error || `Klaida (${res.status})`);
        return;
      }
      // serveris jau turėtų grąžinti /share/{id}; jei dar grįžta /api/share — konvertuojam:
      const pretty = (data.shareUrl || '').replace('/api/share/','/share/');
      if (!pretty){
        setMsg('Nepavyko gauti nuorodos.');
        return;
      }
      urlEl.value = pretty;
      box.hidden = false;
      setMsg('Viskas! Gali dalintis nuoroda žemiau.');
    } catch (err) {
      console.error(err);
      setMsg('Tinklo klaida.');
    } finally {
      btnUp.disabled = false;
    }
  });

  // Copy to clipboard
  btnCp.addEventListener('click', async () => {
    try {
      if (!urlEl.value) return;
      await navigator.clipboard.writeText(urlEl.value);
      setMsg('Nukopijuota!');
    } catch {
      setMsg('Nepavyko nukopijuoti.');
    }
  });
});
