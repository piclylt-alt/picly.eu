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

  // išlistinam R2 objektus
  const prefix = `u/${uid}/folders/${folderId}/`;
  const listed = await env.MY_BUCKET.list({ prefix, limit: 200 });
  const files = (listed.objects||[]).map(o => {
    const filename = o.key.split("/").pop();
    return { key:o.key, filename, size:o.size||0 };
  });

  const cards = files.map(f => `
    <label class="file-card" style="display:block;cursor:pointer">
      <input type="checkbox" name="keys" value="${esc(f.key)}" style="accent-color:#3B82F6; margin-bottom:6px">
      <img src="/api/download/${encodeURIComponent(f.key)}" alt="${esc(f.filename)}" style="width:100%;height:150px;object-fit:cover;border-radius:8px">
      <div class="file-meta" style="display:flex;align-items:center;justify-content:space-between;margin-top:6px">
        <small title="${esc(f.filename)}">${esc(f.filename.length>22? f.filename.slice(0,19)+'…': f.filename)}</small>
        <small>${fmtSize(f.size)}</small>
      </div>
    </label>
  `).join("") || `<div class="empty">Šiame aplanke dar nėra failų.</div>`;

  const html = `<!doctype html><html lang="lt"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="/styles.css"><title>${esc(folder.name)} • Picly</title>
    <style>
      .grid-files{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
      @media (max-width:1000px){ .grid-files{grid-template-columns:repeat(3,1fr)} }
      @media (max-width:680px){ .grid-files{grid-template-columns:repeat(2,1fr)} }
      input[type=file]{background:#0D0E10;border:1px solid var(--border);border-radius:12px;padding:8px;color:var(--text)}
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

    <script>
      function fmt(b){const u=['B','KB','MB','GB'];let i=0,n=b;while(n>=1024&&i<u.length-1){n/=1024;i++;}return (i===0?n:n.toFixed(1))+' '+u[i];}
      function toggleAll(v){ document.querySelectorAll('input[name=keys]').forEach(el=>el.checked=v); }

      const up = document.getElementById('upForm');
      up?.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const msg = document.getElementById('upMsg');
        msg.textContent='Įkeliama...';
        try{
          const fd = new FormData(up);
          const r  = await fetch('/api/upload', { method:'POST', body: fd, credentials:'include' });
          const j  = await r.json();
          if(!r.ok||!j.ok){ msg.textContent=j.error||'Klaida'; return; }
          location.reload();
        }catch{ msg.textContent='Tinklo klaida'; }
      });

      const sf = document.getElementById('shareForm');
      sf?.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const msg = document.getElementById('shareMsg');
        const keys = Array.from(document.querySelectorAll('input[name=keys]:checked')).map(el=>el.value);
        if(!keys.length){ msg.textContent='Nepasirinkta nė vieno failo'; return; }
        msg.textContent='Kuriama nuoroda...';
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
