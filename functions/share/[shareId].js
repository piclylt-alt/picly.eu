// functions/share/[shareId].js
// Gražus HTML puslapis: /share/{shareId}
// Naudoja tą patį R2 binding: MY_BUCKET

const HTML = (title, body) => `<!doctype html>
<html lang="lt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)} • Picly</title>
  <link rel="icon" href="/assets/favicon.png">
  <link rel="stylesheet" href="/styles.css">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:site_name" content="Picly">
  <meta name="theme-color" content="#0A0A0B">
  <style>
    .share-page .header{border-bottom:1px solid var(--border);padding:14px 0;margin-bottom:16px}
    .share-hero{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}
    .share-hero h1{font-size:22px;margin:0}
    .share-hero .muted{font-size:14px}
    .actions{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 16px}
    .btn--ghost{background:transparent;border:1px solid var(--border)}
    .grid-files{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
    .file-card{background:#0D0E10;border:1px solid var(--border);border-radius:12px;padding:8px}
    .file-card img{width:100%;height:150px;object-fit:cover;border-radius:8px}
    .file-meta{display:flex;align-items:center;justify-content:space-between;margin-top:6px}
    .file-meta small{opacity:.8}
    .empty{padding:24px;border:1px dashed var(--border);border-radius:12px;text-align:center}
    @media (max-width:1000px){ .grid-files{grid-template-columns:repeat(3,1fr)} }
    @media (max-width:680px){ .grid-files{grid-template-columns:repeat(2,1fr)} }
  </style>
</head>
<body>
  <header class="header share-page">
    <div class="container" style="display:flex;align-items:center;justify-content:space-between">
      <a href="/" class="logo" style="display:flex;gap:10px;align-items:center;text-decoration:none;color:inherit">
        <img src="/assets/logo.svg" alt="Picly" style="height:22px">
        <span class="muted" style="font-size:14px">Share</span>
      </a>
      <nav><a class="btn btn--ghost" href="/">Home</a></nav>
    </div>
  </header>

  <main class="container">
    ${body}
  </main>

  <script>
    // Copy link
    const cp = document.getElementById('copyLink');
    if (cp) {
      cp.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(location.href); cp.textContent='Nukopijuota'; setTimeout(()=>cp.textContent='Kopijuoti nuorodą',1200); } catch {}
      });
    }
  </script>
</body>
</html>`;

const escapeHtml = (s="") => s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

const fmtSize = (bytes=0) => {
  const units = ['B','KB','MB','GB']; let i=0; let n=bytes;
  while(n>=1024 && i<units.length-1){ n/=1024; i++; }
  return (i===0? n : n.toFixed(1)) + ' ' + units[i];
};

export async function onRequestGet({ params, env }) {
  try {
    const shareId = params.shareId;
    if (!shareId) return html404("Nuoroda nerasta");

    // Paimam JSON tiesiai iš R2 (tą patį kurį kuria /api/upload)
    const shareObj = await env.MY_BUCKET.get(`shares/${shareId}.json`);
    if (!shareObj) return html404("Ši nuoroda pasibaigė arba neegzistuoja");

    const json = JSON.parse(await shareObj.text());
    const files = Array.isArray(json.files) ? json.files : [];

    if (!files.length) {
      const body = `
        <div class="empty">
          <h2>Nieko nėra</h2>
          <p class="muted">Šioje nuorodoje neaptikome jokių failų.</p>
          <div class="actions">
            <a class="btn" href="/">Sukurti naują nuorodą</a>
          </div>
        </div>`;
      return new Response(HTML("Tuščia nuoroda", body), { headers: { "Content-Type": "text/html;charset=utf-8" } });
    }

    // Renderinam gražų grid'ą su miniatiūromis ir download mygtukais
    const cards = files.map(f => {
      const name = escapeHtml(f.filename || 'file');
      const size = fmtSize(f.size || 0);
      const dl   = f.downloadUrl || (`/api/download/${encodeURIComponent(f.key)}`);
      // Tipiškai tavo /api/download grąžins teisingą turinį (image/*), tad galima naudoti kaip img src
      return `
        <div class="file-card">
          <img src="${dl}" alt="${name}">
          <div class="file-meta">
            <small title="${name}">${name.length>22 ? name.slice(0,19)+'…' : name}</small>
            <small>${size}</small>
          </div>
          <div class="actions" style="margin-top:8px">
            <a class="btn btn--small" href="${dl}" download>Parsisiųsti</a>
          </div>
        </div>`;
    }).join("");

    const created = escapeHtml(json.createdAt?.replace('T',' ').replace('Z','') || '');
    const head = `
      <div class="share-hero">
        <div>
          <h1>Bendrinama nuoroda</h1>
          <div class="muted">Sukurta: ${created}</div>
        </div>
        <div class="actions">
          <button class="btn btn--ghost" id="copyLink" type="button">Kopijuoti nuorodą</button>
          <a class="btn" href="/">Sukurti naują</a>
        </div>
      </div>`;

    const body = `
      ${head}
      <section>
        <div class="grid-files">
          ${cards}
        </div>
      </section>`;

    return new Response(HTML(`Share ${shareId}`, body), {
      headers: { "Content-Type": "text/html;charset=utf-8" },
    });

  } catch (e) {
    const body = `
      <div class="empty">
        <h2>Klaida</h2>
        <p class="muted">${escapeHtml(String(e).slice(0,200))}</p>
        <div class="actions">
          <a class="btn" href="/">Grįžti</a>
        </div>
      </div>`;
    return new Response(HTML("Klaida", body), { headers: { "Content-Type": "text/html;charset=utf-8" }, status: 500 });
  }
}

function html404(msg){
  const body = `
    <div class="empty">
      <h2>Nuoroda nerasta</h2>
      <p class="muted">${escapeHtml(msg)}</p>
      <div class="actions"><a class="btn" href="/">Grįžti į pradžią</a></div>
    </div>`;
  return new Response(HTML("Nerasta", body), { headers: { "Content-Type": "text/html;charset=utf-8" }, status: 404 });
}
