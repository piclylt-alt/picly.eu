// functions/api/auth/register.js
import { json, validEmail, randomId, hashPassword } from "../../_lib/session.js";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestPost({ request, env }){
  try{
    const { email, password } = await request.json();
    if(!validEmail(email) || !password || password.length < 6) return json({ ok:false, error:"Neteisingi duomenys" }, { status:400, headers:CORS });

    const key = `user:${email.toLowerCase()}`;
    const exists = await env.USERS.get(key);
    if(exists) return json({ ok:false, error:"Vartotojas jau egzistuoja" }, { status:409, headers:CORS });

    const { salt, hash } = await hashPassword(password);
    const user = { email: email.toLowerCase(), salt, hash, createdAt: new Date().toISOString() };

    await env.USERS.put(key, JSON.stringify(user));
    return json({ ok:true, message:"Registered" }, { headers:CORS });
  }catch(e){
    return json({ ok:false, error:"Server error" }, { status:500, headers:CORS });
  }
}