// functions/account/index.js
export async function onRequestGet({ request, env }){
  // check session
  const cookies = Object.fromEntries((request.headers.get("cookie")||"").split(/; */).filter(Boolean).map(c=>{
    const i=c.indexOf("="); return [decodeURIComponent(c.slice(0,i)), decodeURIComponent(c.slice(i+1))];
  }));
  const sid = cookies.picly_sess;
  if(!sid) return new Response(null, { status:302, headers:{ "Location": "/login" } });

  const sess = await env.SESSIONS.get(`sess:${sid}`, "json");
  if(!sess) return new Response(null, { status:302, headers:{ "Location": "/login" } });

  const userId = sess.email.toLowerCase().replace(/[^\w.\-]+/g,'_');
  const raw = await env.USER_SHARES.get(`user:${userId}:shares`) || '[]';
  const ids = JSON.parse(raw);
  const items = [];
  for(const id of ids){
    const obj = await env.MY_BUCKET.get(`shares/${id}.json`);
    if(!obj) continue;
    const json = JSON.parse(await obj.text());
    items.push({ id, createdAt: json.createdAt, files: json.files });
  }

  // render small HTML (use your site CSS)
  const cards = items.map(it => {
    const link = `/share/${it.id}`;
    const thumb = it.files && it.files[0] ? `/api/download/${encodeURIComponent(it.files[0].key)}` : '/assets/placeholder.png';
    return `<div class="card"><a href="${link}"><img src="${thumb}" alt=""></a>
      <div><a href="${link}">Share ${it.id}</a><div class="muted">${it.createdAt}</div></div>
    </div>`;
  }).join("");

  const html = `<!doctype html><html><head><link rel="stylesheet" href="/styles.css"></head><body>
    <main class="container"><h1>Mano Duomo</h1><div class="grid">${cards}</div></main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html;charset=utf-8" } });
}
