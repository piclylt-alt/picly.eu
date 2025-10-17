// functions/api/auth/login.js
import { json, parseCookies, cookie, randomId, verifyPassword } from "../_lib/session.js";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestPost({ request, env }){
  try{
    const { email, password } = await request.json();
    if(!email || !password) return json({ ok:false, error:"Bad" }, { status:400, headers:CORS });

    const key = `user:${email.toLowerCase()}`;
    const raw = await env.USERS.get(key);
    if(!raw) return json({ ok:false, error:"Invalid credentials" }, { status:401, headers:CORS });
    const user = JSON.parse(raw);
    const ok = await verifyPassword(password, user.salt, user.hash);
    if(!ok) return json({ ok:false, error:"Invalid credentials" }, { status:401, headers:CORS });

    // create session
    const sid = `s_${randomId(18)}`;
    await env.SESSIONS.put(`sess:${sid}`, JSON.stringify({ email: user.email }), { expirationTtl: 60*60*24*30 });

    const headers = {
      ...CORS,
      "Set-Cookie": cookie("picly_sess", sid, { maxAge: 60*60*24*30 }),
      "Content-Type": "application/json"
    };
    return new Response(JSON.stringify({ ok:true }), { status:200, headers });
  }catch(e){
    return json({ ok:false, error:"Server error" }, { status:500, headers:CORS });
  }
}
