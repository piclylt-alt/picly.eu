// GET: grąžina vartotojo folderių sąrašą
// POST: { name } – sukuria naują folderį ir įdeda į USER_FOLDERS
import { json, parseCookies, validEmail } from "../../_lib/session.js";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

function userIdFromEmail(email=""){
  return email.toLowerCase().replace(/[^\w.\-]+/g,'_');
}

export async function onRequestGet({ request, env }){
  const cookies = parseCookies(request);
  const sid = cookies.picly_sess;
  if(!sid) return json({ ok:false, error:"Unauthorized" }, { status:401, headers:CORS });

  const sess = await env.SESSIONS.get(`sess:${sid}`, "json");
  if(!sess?.email) return json({ ok:false, error:"Unauthorized" }, { status:401, headers:CORS });

  const uid = userIdFromEmail(sess.email);
  const raw = await env.USER_FOLDERS.get(`user:${uid}:folders`);
  const list = raw ? JSON.parse(raw) : [];
  return json({ ok:true, folders:list }, { headers:CORS });
}

export async function onRequestPost({ request, env }){
  try{
    const cookies = parseCookies(request);
    const sid = cookies.picly_sess;
    if(!sid) return json({ ok:false, error:"Unauthorized" }, { status:401, headers:CORS });

    const sess = await env.SESSIONS.get(`sess:${sid}`, "json");
    if(!sess?.email || !validEmail(sess.email)) return json({ ok:false, error:"Unauthorized" }, { status:401, headers:CORS });

    const { name } = await request.json();
    const clean = String(name||"").trim().slice(0, 80);
    if(!clean) return json({ ok:false, error:"Pavadinimas privalomas" }, { status:400, headers:CORS });

    const uid = userIdFromEmail(sess.email);
    const key = `user:${uid}:folders`;
    const raw = await env.USER_FOLDERS.get(key);
    const list = raw ? JSON.parse(raw) : [];

    const id = crypto.randomUUID().split("-")[0];  // trumpas ID
    const folder = { id, name: clean, createdAt: new Date().toISOString() };
    list.unshift(folder);
    await env.USER_FOLDERS.put(key, JSON.stringify(list));

    return json({ ok:true, folder }, { headers:CORS });
  }catch(e){
    return json({ ok:false, error:"Serverio klaida" }, { status:500, headers:CORS });
  }
}
