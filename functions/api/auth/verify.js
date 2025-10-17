// GET (iš laiško) arba POST { email, code } -> sukuria sesiją ir nustato slapuką
import { json, parseCookies, cookie, validEmail, randomId } from "../../_lib/session.js";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestGet(ctx){ return verify(ctx, new URL(ctx.request.url).searchParams); }
export async function onRequestPost(ctx){ return verify(ctx, new URLSearchParams(await ctx.request.text())); }

async function verify({ request, env }, params){
  try{
    const email = (params.get("email") || "").toLowerCase();
    const code  = params.get("code") || "";
    const t     = params.get("t") || ""; // optional token

    if(!validEmail(email) || !code) return json({ ok:false, error:"Blogi duomenys" }, { status:400, headers:CORS });

    const key = `code:${email}`;
    const rec = await env.AUTH_CODES.get(key, "json");
    if(!rec || rec.code !== code || (rec.token && t && rec.token !== t)){
      return json({ ok:false, error:"Kodas neteisingas arba pasibaigęs" }, { status:400, headers:CORS });
    }

    // sunaikinam kodą
    await env.AUTH_CODES.delete(key);

    // sukurti sesiją (30 dienų)
    const sid = `s_${randomId(18)}`;
    await env.SESSIONS.put(`sess:${sid}`, JSON.stringify({ email }), { expirationTtl: 60*60*24*30 });

    const headers = {
      ...CORS,
      "Set-Cookie": cookie("picly_sess", sid, { maxAge: 60*60*24*30 }),
      "Content-Type": "application/json",
    };

    // jei GET iš laiško -> redirect į /account (arba /)
    if(request.method === "GET"){
      return new Response(null, { status: 302, headers: { ...headers, "Location": "/account" } });
    }
    return json({ ok:true }, { headers });
  }catch(e){
    return json({ ok:false, error:"Serverio klaida" }, { status:500, headers:CORS });
  }
}
