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

// Demo dropzone
const dz = document.getElementById('dropzone');
const input = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const preview = document.getElementById('preview');
const shareCard = document.getElementById('shareCard');
const shareLink = document.getElementById('shareLink');
const copyBtn = document.getElementById('copyBtn');

function filesToPreviews(files){
  preview.innerHTML = '';
  [...files].forEach(file=>{
    const url = URL.createObjectURL(file);
    const wrap = document.createElement('div');
    wrap.className = 'thumb';
    const img = document.createElement('img');
    img.src = url; img.alt = file.name;
    const cap = document.createElement('div');
    cap.textContent = file.name;
    wrap.appendChild(img); wrap.appendChild(cap);
    preview.appendChild(wrap);
  });
  if(files.length){
    const token = Math.random().toString(36).slice(2,10);
    const link = `${location.origin}/share/demo-${token}`;
    shareLink.value = link;
    shareCard.style.display = 'block';
  }else{
    shareCard.style.display = 'none';
  }
}

if(dz && input){
  ['dragover','dragenter'].forEach(evt=> dz.addEventListener(evt, e=>{ e.preventDefault(); dz.style.boxShadow='0 0 0 6px var(--ring)'; }));
  ;['dragleave','drop'].forEach(evt=> dz.addEventListener(evt, e=>{ e.preventDefault(); dz.style.boxShadow='none'; }));
  dz.addEventListener('drop', e=>{ filesToPreviews(e.dataTransfer.files); });
  dz.addEventListener('click', ()=> input.click());
  if(browseBtn) browseBtn.addEventListener('click', ()=> input.click());
  input.addEventListener('change', ()=> filesToPreviews(input.files));
}
if(copyBtn){
  copyBtn.addEventListener('click', async ()=>{
    try{ await navigator.clipboard.writeText(shareLink.value); copyBtn.textContent='Nukopijuota'; setTimeout(()=>copyBtn.textContent='Kopijuoti',1200); }catch{}
  });
}
