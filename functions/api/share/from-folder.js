// POST JSON: { files: [ "u/{uid}/folders/{folderId}/...." ] }
// Sukuria shares/{shareId}.json R2’je ir grąžina { ok:true, shareUrl: "/share/{id}" }
import { json, parseCookies, validEmail } from "../../_lib/session.js";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestPost({ request, env }){
  try{
    const cookies = parseCookies(request);
    const sid = cookies.picly_sess;
    if(!sid) return json({ ok:false, error:"Unauthorized" }, { status:401, headers:CORS });

    const sess = await env.SESSIONS.get(`sess:${sid}`, "json");
    if(!sess?.email || !validEmail(sess.email)) return json({ ok:false, error:"Unauthorized" }, { status:401, headers:CORS });

    const { files } = await request.json();
    const list = Array.isArray(files) ? files.filter(Boolean) : [];
    if(!list.length) return json({ ok:false, error:"Nepasirinkti failai" }, { status:400, headers:CORS });

    // surenkam metaduomenis
    const meta = [];
    for (const key of list){
      const head = await env.MY_BUCKET.head(key);
      if(!head) continue;
      const filename = key.split("/").pop() || "file";
      meta.push({
        key,
        filename,
        size: head.size || 0
      });
    }
    if(!meta.length) return json({ ok:false, error:"Failų nerasta" }, { status:400, headers:CORS });

    const shareId = crypto.randomUUID().slice(0,8);
    const payload = {
      id: shareId,
      createdAt: new Date().toISOString(),
      files: meta
    };
    await env.MY_BUCKET.put(`shares/${shareId}.json`, JSON.stringify(payload), {
      httpMetadata: { contentType: "application/json" }
    });

    // įdėti į vartotojo „shares“ indeksą (kad /account matytų)
    const userId = sess.email.toLowerCase().replace(/[^\w.\-]+/g,'_');
    const idxKey = `user:${userId}:shares`;
    const raw = await env.USER_SHARES.get(idxKey) || "[]";
    const arr = JSON.parse(raw);
    arr.unshift(shareId);
    await env.USER_SHARES.put(idxKey, JSON.stringify(arr));

    return json({ ok:true, shareUrl: `/share/${shareId}` }, { headers:CORS });
  }catch(e){
    return json({ ok:false, error:"Serverio klaida" }, { status:500, headers:CORS });
  }
}
