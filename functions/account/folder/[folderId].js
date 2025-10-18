// functions/account/folder/[folderId].js
import { parseCookies } from "../../_lib/session.js";

const esc = s => (s||"").replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[m]));

export async function onRequestGet({ params, request, env }){
  const cookies = parseCookies(request);
  const sid = cookies.picly_sess;
  if(!sid) return new Response(null, { status:302, headers:{ "Location": "/login" } });

  const sess = await env.SESSIONS.get(`sess:${sid}`, "json");
  if(!sess) return new Response(null, { status:302, headers:{ "Location": "/login" } });
  const uid = sess.email.toLowerCase().replace(/[^\w.\-]+/g,'_');

  const folderId = params.folderId;
  const fraw = await env.USER_FOLDERS.get(`user:${uid}:folders`);
  const folders = fraw ? JSON.parse(fraw) : [];
  const folder = folders.find(f => f.id === folderId);
  if(!folder) return new Response("Folder not found", { status:404 });

  // R2 objektai
  const prefix = `u/${uid}/folders/${folderId}/`;
  const listed = await env.MY_BUCKET.list({ prefix, limit: 200 });
  const files = (listed.objects||[]).map(o => {
    const filename = o.key.split("/").pop();
    return { key:o.key, filename, size:o.size||0 };
  });

  // Kortelės su paslėptu checkbox + hover meniu
  const cards = files.map(f => {
    const key = esc(f.key);
    const filename = esc(f.filename);
    const imgSrc = `/api/download/${encodeURIComponent(f.key)}`;
    const size = fmtSize(f.size);

    return `
      <div class="file-card" data-key="${key}" data-filename="${filename}">
        <input type="checkbox" name="keys" value="${key}">
        <img src="${imgSrc}" alt="${filename}">
        <div class="file-actions">
          <div class="file-actions__inner">
            <button type="button" class="btn btn--ghost btn-view">Peržiūrėti</button>
            <button type="button" class="btn btn--ghost btn-del">Ištrinti</button>
          </div>
        </div>
        <div class="file-meta">
          <small title="${filename}">${filename.length>22? filename.slice(0,19)+'…': filename}</small>
          <small>${size}</small>
        </div>
      </div>
    `;
  }).join("") || `<div class="empty">Šiame aplanke dar nėra failų.</div>`;

  const html = `<!doctype html><html lang="lt"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="/styles.css"><title>${esc(folder.name)} • Picly</title>

    <!-- CRITICAL CSS: tik galerijai (kad veiktų net jei kešas senas) -->
    <style>
      /* įkėlimo input'as – paliekam kaip buvo */
      input[type=file]{background:#0D0E10;border:1px solid var(--border);border-radius:12px;padding:8px;color:var(--text)}
      /* grid – 5 stulpeliai (3 ≤1000px, 2 ≤680px) */
      .grid-files{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
      @media (max-width:1000px){.grid-files{grid-template-columns:repeat(3,1fr)}}
      @media (max-width:680px){.grid-files{grid-template-columns:repeat(2,1fr)}}
      /* kortelė + thumbnail */
      .file-card{position:relative;background:#0D0E10;border:1px solid var(--border);border-radius:12px;padding:6px;cursor:pointer;user-select:none}
      .file-card img{display:block;width:100%;height:150px;object-fit:cover;border-radius:8px}
      .file-meta{display:flex;align-items:center;justify-content:space-between;margin-top:6px;gap:8px}
      /* pažymėjimas */
      .file-card input[type="checkbox"]{display:none}
      .file-card.is-selected{outline:2px solid var(--primary-2);outline-offset:2px}
      .file-card.is-selected img{box-shadow:0 0 0 4px var(--ring)}
      /* overlay – rodyt tik hover metu */
      .file-actions{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .18s ease;z-index:2}
      .file-card:hover .file-actions{opacity:1;pointer-events:auto}
      .file-actions__inner{display:flex;gap:8px;padding:6px;background:rgba(0,0,0,.45);border:1px solid var(--border);border-radius:12px;backdrop-filter:saturate(1.2) blur(6px)}
      .file-actions .btn{padding:8px 10px;border-radius:10px}
    </style>
  </head><body>
    <header class="header"><div class="container" style="display:flex;align-items:center;justify-content:space-between">
      <a href="/account" class="btn btn--ghost">← Atgal</a>
      <div style="font-weight:800">${esc(folder.name)}</div>
      <div></div>
    </div></header>

    <main class="container" style="padding:16px 0">
      <section class="card" style="margin-bottom:16px">
        <form id="upForm" enctype="multipart/form-data">
          <input type="hidden" name="folderId" value="${esc(folderId)}">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <input name="files" type="file" multiple accept="image/*">
            <button class="btn" type="submit">Įkelti</button>
            <small id="upMsg" class="muted"></small>
          </div>
        </form>
      </section>

      <section class="card">
        <form id="shareForm">
          <div class="actions" style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
            <button class="btn btn--ghost" type="button" onclick="toggleAll(true)">Pažymėti visus</button>
            <button class="btn btn--ghost" type="button" onclick="toggleAll(false)">Nuimti žymas</button>
            <button class="btn" type="submit">Bendrinti pažymėtus</button>
            <small id="shareMsg" class="muted"></small>
          </div>
          <div class="grid-files">${cards}</div>
        </form>
      </section>
    </main>

    <!-- Viewer dialog -->
    <dialog id="viewer" style="background:#121214;color:#EDEFF2;border:1px solid #1E1F23;border-radius:12px;padding:0;max-width:90vw">
      <div style="position:relative">
        <button type="button" id="vClose" class="btn btn--ghost" style="position:absolute;top:8px;right:8px;z-index:2">Uždaryti</button>
        <img id="vImg" src="" alt="" style="display:block;max-width:90vw;max-height:80vh;border-radius:12px">
      </div>
    </dialog>

    <script>
      // helperai
      function fmt(b){const u=['B','KB','MB','GB'];let i=0,n=b;while(n>=1024&&i<u.length-1){n/=1024;i++;}return (i===0?n:n.toFixed(1))+' '+u[i];}
      function toggleAll(v){
        document.querySelectorAll('input[name=keys]').forEach(el=>{
          el.checked = v;
          const card = el.closest('.file-card');
          if(card) card.classList.toggle('is-selected', v);
        });
      }
      window.toggleAll = toggleAll;

      // Įkėlimas
      const up = document.getElementById('upForm');
      up?.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const msg = document.getElementById('upMsg');
        msg.textContent='Įkeliama.';
        try{
          const fd = new FormData(up);
          const r  = await fetch('/api/upload', { method:'POST', body: fd, credentials:'include' });
          const j  = await r.json();
          if(!r.ok||!j.ok){ msg.textContent=j.error||'Klaida'; return; }
          location.reload();
        }catch{ msg.textContent='Tinklo klaida'; }
      });

      // Pažymėjimas spustelint ant kortelės (bet ne ant mygtukų)
      document.querySelectorAll('.file-card').forEach(card => {
        card.addEventListener('click', (e) => {
          if (e.target.closest('.btn-view, .btn-del')) return;
          const cb = card.querySelector('input[type="checkbox"]');
          if(!cb) return;
          const next = !cb.checked;
          cb.checked = next;
          card.classList.toggle('is-selected', next);
        });
      });

      // Viewer
      const viewer = document.getElementById('viewer');
      const vImg = document.getElementById('vImg');
      const vClose = document.getElementById('vClose');
      document.querySelectorAll('.file-card .btn-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const card = e.currentTarget.closest('.file-card');
          const img = card.querySelector('img');
          if(!img) return;
          vImg.src = img.src;
          vImg.alt = card.dataset.filename || '';
          if (typeof viewer.showModal === 'function') viewer.showModal();
        });
      });
      vClose?.addEventListener('click', () => viewer.close());
      viewer?.addEventListener('click', (e) => { if (e.target === viewer) viewer.close(); });

      // Ištrynimas
      const DELETE_ENDPOINT = '/api/files/delete';
      document.querySelectorAll('.file-card .btn-del').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const card = e.currentTarget.closest('.file-card');
          const key = card?.dataset?.key;
          if (!key) return alert('Nerastas failo raktas.');
          if (!confirm('Ištrinti šį failą?')) return;
          try{
            const r = await fetch(DELETE_ENDPOINT, {
              method:'POST',
              headers:{ 'Content-Type':'application/json' },
              credentials:'include',
              body: JSON.stringify({ key })
            });
            const j = await r.json().catch(()=>({}));
            if(!r.ok || j?.ok === false){
              alert(j?.error || 'Nepavyko ištrinti');
              return;
            }
            card.remove();
          }catch(err){
            alert('Tinklo klaida');
          }
        });
      });

      // Bendrinimas
      const sf = document.getElementById('shareForm');
      sf?.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const msg = document.getElementById('shareMsg');
        const keys = Array.from(document.querySelectorAll('input[name=keys]:checked')).map(el=>el.value);
        if(!keys.length){ msg.textContent='Nepasirinkta nė vieno failo'; return; }
        msg.textContent='Kuriama nuoroda.';
        try{
          const r = await fetch('/api/share/from-folder', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ files: keys }) });
          const j = await r.json();
          if(!r.ok||!j.ok){ msg.textContent=j.error||'Klaida'; return; }
          location.href = j.shareUrl;
        }catch{ msg.textContent='Tinklo klaida'; }
      });
    </script>
  </body></html>`;
  return new Response(html, { headers:{ "Content-Type":"text/html;charset=utf-8" }});
}

function fmtSize(bytes=0){ const u=['B','KB','MB','GB']; let i=0,n=bytes; while(n>=1024&&i<u.length-1){ n/=1024; i++; } return (i===0?n:n.toFixed(1))+' '+u[i]; }
