// POST /api/auth/logout -> ištrina sesiją ir slapuką
import { json, parseCookies, cookie } from "../../_lib/session.js";

export async function onRequestPost({ request, env }){
  const cookies = parseCookies(request);
  const sid = cookies.picly_sess;
  if(sid) await env.SESSIONS.delete(`sess:${sid}`);
  return new Response(null, {
    status: 204,
    headers: {
      "Set-Cookie": cookie("picly_sess","", { maxAge: 0 }),
    }
  });
}
