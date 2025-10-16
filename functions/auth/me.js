// GET /api/auth/me -> { loggedIn, email }
import { json, parseCookies } from "../../_lib/session.js";

export async function onRequestGet({ request, env }){
  const cookies = parseCookies(request);
  const sid = cookies.picly_sess;
  if(!sid) return json({ loggedIn:false });

  const data = await env.SESSIONS.get(`sess:${sid}`, "json");
  if(!data) return json({ loggedIn:false });

  return json({ loggedIn:true, email: data.email });
}
