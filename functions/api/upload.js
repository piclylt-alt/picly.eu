// /functions/api/upload.js
// Aptarnauja: prisijungusį ir DEMO (neprisijungusį) su limitais.
// DEMO ribojimai
const MAX_FILES_DEMO = 5;
const MAX_SIZE_DEMO  = 10 * 1024 * 1024; // 10 MB

import { json, parseCookies, validEmail } from "../_lib/session.js";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

const uidOf = (email="") => email.toLowerCase().replace(/[^\w.\-]+/g,'_');
const safe   = (s="") => String(s||"").replace(/[^\w.\-() ]+/g,"_");

export async function onRequestPost({ request, env }) {
  try {
    const cookies = parseCookies(request);
    const sid = cookies.picly_sess || null;
    const sess = sid ? await env.SESSIONS.get(`sess:${sid}`, "json") : null;
    const authed = !!(sess?.email && validEmail(sess.email));

    const form  = await request.formData();
    const files = form.getAll("files").filter(f => f && typeof f === "object");
    if (!files.length) return json({ ok:false, error:"Failų nerasta" }, { status:400, headers:CORS });

    const folderId  = String(form.get("folderId") || "").trim();
    const wantShare = /^(1|true|yes)$/i.test(String(form.get("share")||""));

    // --- DEMO (neprisijungęs) ---
    if (!authed) {
      // DEMO leidžiam TIK be folderId ir visada kuriam share
      if (folderId) return json({ ok:false, error:"Neautorizuota: folderId leidžiamas tik prisijungus" }, { status:401, headers:CORS });

      // Limitai
      if (files.length > MAX_FILES_DEMO) {
        return json({ ok:false, error:`Maks. ${MAX_FILES_DEMO} failai demo režime` }, { status:400, headers:CORS });
      }
      for (const f of files) {
        if ((f.size||0) > MAX_SIZE_DEMO) {
          return json({ ok:false, error:`Failas "${f.name}" viršija 10 MB demo limitą` }, { status:400, headers:CORS });
        }
      }

      const now = Date.now();
      const shareId = crypto.randomUUID().slice(0,8);
      const basePrefix = `demo/${shareId}/`;
      const saved = [];

      for (const file of files) {
        const name = safe(file.name || "file");
        const key  = `${basePrefix}${now}-${name}`;
        await env.MY_BUCKET.put(key, file.stream(), {
          httpMetadata: { contentType: file.type || "application/octet-stream" }
        });
        saved.push({ key, filename: name, size: file.size || 0 });
      }

      // DEMO share (nėra USER_SHARES indekso atnaujinimo)
      const payload = { id: shareId, createdAt: new Date().toISOString(), files: saved, demo: true };
      await env.MY_BUCKET.put(`shares/${shareId}.json`, JSON.stringify(payload), {
        httpMetadata: { contentType: "application/json" }
      });

      return json({ ok:true, shareUrl: `/share/${shareId}` }, { headers:CORS });
    }

    // --- PRISIJUNGĘS vartotojas ---
    const uid = uidOf(sess.email);
    const now = Date.now();
    const saved = [];

    // Kur keliam?
    const basePrefix = folderId
      ? `u/${uid}/folders/${folderId}/`
      : `u/${uid}/inbox/${now}/`;

    for (const file of files) {
      const name = safe(file.name || "file");
      const key  = `${basePrefix}${now}-${name}`;
      await env.MY_BUCKET.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || "application/octet-stream" }
      });
      saved.push({ key, filename: name, size: file.size || 0 });
    }

    // Kada kuriam share?
    // - jei nėra folderId → visada (landing "real" atvejis)
    // - jei yra folderId → tik jei share=1
    if (!folderId || wantShare) {
      const shareId = crypto.randomUUID().slice(0,8);
      const payload = { id: shareId, createdAt: new Date().toISOString(), files: saved };
      await env.MY_BUCKET.put(`shares/${shareId}.json`, JSON.stringify(payload), {
        httpMetadata: { contentType: "application/json" }
      });

      // įrašom į USER_SHARES indeksą, kad account'e matytų
      const idxKey = `user:${uid}:shares`;
      const raw = await env.USER_SHARES.get(idxKey) || "[]";
      const arr = JSON.parse(raw);
      arr.unshift(shareId);
      await env.USER_SHARES.put(idxKey, JSON.stringify(arr));

      return json({ ok:true, shareUrl: `/share/${shareId}` }, { headers:CORS });
    }

    // tik įkėlimas į folderį (be share dabar)
    return json({ ok:true, uploaded: saved }, { headers:CORS });

  } catch (e) {
    return json({ ok:false, error:"Serverio klaida" }, { status:500, headers:CORS });
  }
}
