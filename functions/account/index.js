// functions/account/index.js
import { parseCookies } from "../_lib/session.js";

export async function onRequestGet({ request, env }){
  const cookies = parseCookies(request);
  const sid = cookies.picly_sess;
  if(!sid) return new Response(null, { status:302, headers:{ "Location": "/login" } });

  const sess = await env.SESSIONS.get(`sess:${sid}`, "json");
  if(!sess) return new Response(null, { status:302, headers:{ "Location": "/login" } });

  const userId = sess.email.toLowerCase().replace(/[^\w.\-]+/g,'_');

  // folders
  const fraw = await env.USER_FOLDERS.get(`user:${userId}:folders`);
  const folders = fraw ? JSON.parse(fraw) : [];

  const folderCards = folders.map(f => {
    return `<div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div>
          <div style="font-weight:700">${escapeHtml(f.name)}</div>
          <div class="muted">${escapeHtml(f.createdAt)}</div>
        </div>
        <a class="btn btn--small" href="/account/folder/${f.id}">Atidaryti</a>
      </div>
    </div>`;
  }).join("") || `<div class="card"><p class="muted">Kol kas nėra aplankų.</p></div>`;

  const html = `<!doctype html><html lang="lt"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <link rel="stylesheet" href="/styles.css"><title>Picly Account</title>
  </head><body>
    <header class="header"><div class="container" style="display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;gap:10px;align-items:center"><img src="/assets/logo.svg" style="height:22px"><b>Picly.eu</b></div>
      <nav><a href="/" class="btn btn--ghost">Pradžia</a> <form style="display:inline" method="post" action="/api/auth/logout"><button class="btn btn--ghost">Atsijungti</button></form></nav>
    </div></header>

    <main class="container" style="padding:16px 0">
      <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px">
        <div><b>Sveikas, ${escapeHtml(sess.email)}</b><div class="muted">Čia rasi savo aplankus ir bendrinimus</div></div>
        <button class="btn" onclick="openModal()">+ Naujas aplankas</button>
      </div>

      <div class="grid-3">${folderCards}</div>
    </main>

    <dialog id="newFolder" style="background:#121214;color:#EDEFF2;border:1px solid #1E1F23;border-radius:12px;padding:16px">
      <form method="dialog" id="nfForm" onsubmit="return false">
        <h3 style="margin-top:0">Sukurti aplanką</h3>
        <input id="nfName" placeholder="Pavadinimas" style="width:100%;padding:10px;border-radius:10px;border:1px solid #1E1F23;background:#0D0E10;color:#EDEFF2">
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn" onclick="createFolder()">Sukurti</button>
          <button class="btn btn--ghost" onclick="closeModal()">Atšaukti</button>
        </div>
        <small id="nfMsg" class="muted"></small>
      </form>
    </dialog>

    <script>
      const m = document.getElementById('newFolder');
      function openModal(){ m.showModal(); }
      function closeModal(){ m.close(); }
      async function createFolder(){
        const name = document.getElementById('nfName').value.trim();
        const msg  = document.getElementById('nfMsg');
        if(!name){ msg.textContent='Įvesk pavadinimą'; return; }
        msg.textContent='Kuriama...';
        try{
          const r = await fetch('/api/folders', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name }) });
          const j = await r.json();
          if(!r.ok || !j.ok){ msg.textContent = j.error || 'Klaida'; return; }
          location.href = '/account/folder/' + j.folder.id;
        }catch(e){ msg.textContent='Tinklo klaida'; }
      }
      function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[c])); }
    </script>
  </body></html>`;
  return new Response(html, { headers:{ "Content-Type":"text/html;charset=utf-8" }});
}

function escapeHtml(s=""){ return s.replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;' }[c])); }
