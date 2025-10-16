// POST /api/auth/request  { email }
import { json, validEmail, randomId } from "../../_lib/session.js";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

export async function onRequestPost({ request, env }) {
  try{
    const { email } = await request.json();
    if(!validEmail(email)) return json({ ok:false, error:"Neteisingas el. paštas" }, { status:400, headers:CORS });

    const code = (Math.floor(100000 + Math.random()*900000)).toString(); // 6 sk.
    const token = randomId(16);
    const key   = `code:${email.toLowerCase()}`;

    // KV: kodas + token (10 min)
    await env.AUTH_CODES.put(key, JSON.stringify({ code, token }), { expirationTtl: 600 });

    // Magic link (GET)
    const origin = new URL(request.url).origin;
    const link = `${origin}/api/auth/verify?email=${encodeURIComponent(email)}&code=${code}&t=${token}`;

    // Siunčiam per Resend
    const subject = "Tavo prisijungimo kodas";
    const html = `
      <div style="font-family:Inter,system-ui,sans-serif">
        <h2>Prisijungimo kodas</h2>
        <p>Naudok šį kodą: <b style="font-size:20px">${code}</b> (galioja 10 min.)</p>
        <p>Arba spausk: <a href="${link}">Prisijungti</a></p>
      </div>`;
    const r = await fetch("https://api.resend.com/emails", {
      method:"POST",
      headers:{ "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type":"application/json" },
      body: JSON.stringify({ from: env.FROM_EMAIL, to: email, subject, html })
    });

    if(!r.ok){
      const text = await r.text();
      return json({ ok:false, error:"Nepavyko išsiųsti laiško", details:text }, { status:500, headers:CORS });
    }

    return json({ ok:true, message:"Kodą išsiuntėme į el. paštą" }, { headers:CORS });
  }catch(e){
    return json({ ok:false, error:"Serverio klaida" }, { status:500, headers:CORS });
  }
}
