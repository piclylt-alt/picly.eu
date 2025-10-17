// functions/account/index.js
export async function onRequestGet({ request, env }){
  // --- Sesija ---
  const cookies = Object.fromEntries((request.headers.get("cookie")||"").split(/; */).filter(Boolean).map(c=>{
    const i=c.indexOf("="); return [decodeURIComponent(c.slice(0,i)), decodeURIComponent(c.slice(i+1))];
  }));
  const sid = cookies.picly_sess;
  if(!sid) return new Response(null, { status:302, headers:{ "Location": "/login.html" } });

  const sess = await env.SESSIONS.get(`sess:${sid}`, "json");
  if(!sess) return new Response(null, { status:302, headers:{ "Location": "/login.html" } });

  const userId = sess.email.toLowerCase().replace(/[^\w.\-]+/g,'_');
  const raw = await env.USER_SHARES.get(`user:${userId}:shares`) || '[]';
  const ids = JSON.parse(raw);
  const items = [];
  for(const id of ids){
    const obj = await env.MY_BUCKET.get(`shares/${id}.json`);
    if(!obj) continue;
    const json = JSON.parse(await obj.text());
    items.push({ id, createdAt: json.createdAt, files: json.files || [] });
  }

  // --- HTML ---
  const cards = items.map(it => {
    const link = `/share/${it.id}`;
    const first = it.files && it.files[0];
    const thumb = first
      ? `/api/download/${encodeURIComponent(first.key)}`
      : '/assets/placeholder.png';
    const count = (it.files || []).length;

    return `
      <div class="card" style="padding:10px">
        <a href="${link}" style="text-decoration:none;color:inherit">
          <img src="${thumb}" alt="" style="width:100%;height:160px;object-fit:cover;border-radius:12px"/>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
            <div>
              <div style="font-weight:700">Share ${it.id}</div>
              <div class="muted" style="font-size:12px">${it.createdAt || ''}</div>
            </div>
            <div class="muted" style="font-size:12px">${count} fail.</div>
          </div>
        </a>
        <div style="display:flex;gap:8px;margin-top:10px">
          <a class="btn btn--small" href="${link}">Peržiūrėti</a>
          <a class="btn btn--small btn--ghost" href="${link}?download=1">Atsisiųsti ZIP (soon)</a>
        </div>
      </div>`;
  }).join("");

  const grid = cards || `
    <div class="card" style="text-align:center;padding:24px">
      <h3>Kol kas nėra bendrinimų</h3>
      <p class="muted">Grįžk į pradžią ir sukurk pirmą nuorodą.</p>
      <div style="margin-top:10px">
        <a class="btn" href="/">Sukurti naują</a>
      </div>
    </div>`;

  const html = `<!doctype html>
<html lang="lt">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Mano paskyra • Picly</title>
  <link rel="icon" href="/assets/favicon.png" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <header class="header">
    <div class="container nav">
      <a class="logo" href="/"><img src="/assets/logo.svg" alt="Picly" /><span>Picly.eu</span></a>
      <nav class="nav-links" style="gap:10px">
        <a href="/">Pradžia</a>
        <button id="btnLogout" class="btn btn--small btn--ghost" type="button">Atsijungti</button>
      </nav>
    </div>
  </header>

  <main class="container" style="padding:24px 0">
    <div class="card" style="padding:16px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
      <div>
        <h2 style="margin:0">Sveikas, ${escapeHtml(sess.email)}</h2>
        <p class="muted" style="margin:6px 0 0">Čia rasi savo bendrinamas nuorodas</p>
      </div>
      <div style="display:flex;gap:8px">
        <a class="btn" href="/">+ Nauja nuoroda</a>
      </div>
    </div>

    <div class="grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
      ${grid}
    </div>
  </main>

  <script>
    const out = document.getElementById('btnLogout');
    if(out){
      out.addEventListener('click', async ()=>{
        await fetch('/api/auth/logout', { method:'POST', credentials:'include' });
        location.href = '/';
      });
    }
    function escapeHtml(s=''){return s.replace(/[&<>\"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',\"'\":'&#39;'}[m]));}
  </script>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html;charset=utf-8" } });
}

function escapeHtml(s=""){
  return s.replace(/[&<>\"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
