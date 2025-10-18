// functions/api/files/delete.js
import { parseCookies } from "../../_lib/session.js";

export async function onRequestPost({ request, env }){
  try{
    const cookies = parseCookies(request);
    const sid = cookies.picly_sess;
    if(!sid) return json({ ok:false, error:"Neautorizuota" }, 401);

    const sess = await env.SESSIONS.get(`sess:${sid}`, "json");
    if(!sess) return json({ ok:false, error:"Neautorizuota" }, 401);
    const uid = sess.email.toLowerCase().replace(/[^\w.\-]+/g,'_');

    const { key } = await request.json();
    if(!key) return json({ ok:false, error:"Trūksta 'key'" }, 400);

    const allowedPrefix = `u/${uid}/folders/`;
    if(!key.startsWith(allowedPrefix)){
      return json({ ok:false, error:"Neleistina prieiga" }, 403);
    }

    // Ištrinam iš R2
    await env.MY_BUCKET.delete(key);

    return json({ ok:true });
  }catch(e){
    return json({ ok:false, error:String(e).slice(0,200) }, 500);
  }
}

function json(obj, status=200){
  return new Response(JSON.stringify(obj), {
    status,
    headers:{ "Content-Type":"application/json;charset=utf-8" }
  });
}
