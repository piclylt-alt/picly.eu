// Cloudflare Pages Function: /api/upload
// Reikalavimai: R2 binding "MY_BUCKET" (Pages → Settings → Functions → R2 bindings)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  // Jei reikia: "Access-Control-Max-Age": "86400",
};

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...CORS, "Content-Type": "application/json" } });

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });

// konfiga – gali persirašyti į env kintamuosius, jei norėsi
const MAX_FILES = 5;        // max 5 failai
const MAX_SIZE_MB = 10;     // max 10 MB vienam failui
const ALLOWED = ["image/jpeg", "image/png", "image/webp"]; // pagal tavo frontą

const sanitize = (name = "") => name.replace(/[^\w.\-]+/g, "_").slice(0, 160);

export async function onRequestPost({ request, env }) {
  try {
    if (!env.MY_BUCKET) {
      return json({ ok: false, error: "R2 nėra sukonfigūruotas (trūksta binding 'MY_BUCKET')." }, 500);
    }

    const ct = request.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return json({ ok: false, error: "Tikimasi multipart/form-data." }, 400);
    }

    const form = await request.formData();
    const files = form.getAll("files").filter(Boolean);

    if (!files.length) return json({ ok: false, error: "Pridėk bent 1 failą." }, 400);
    if (files.length > MAX_FILES) return json({ ok: false, error: `Max ${MAX_FILES} failai.` }, 400);

    // Validacija + įkėlimas
    const shareId = `s_${Math.random().toString(36).slice(2, 10)}`;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const saved = [];

    for (const f of files) {
      const sizeMb = (f.size || 0) / (1024 * 1024);
      const type = f.type || "application/octet-stream";
      if (!ALLOWED.includes(type)) return json({ ok: false, error: `Neleidžiamas tipas: ${type}` }, 400);
      if (sizeMb > MAX_SIZE_MB) return json({ ok: false, error: `Failas per didelis (> ${MAX_SIZE_MB} MB).` }, 400);

      const safe = sanitize(f.name || "file");
      const key = `uploads/${today}/${shareId}/${safe}`;

      // R2 įkėlimas
      await env.MY_BUCKET.put(key, f.stream(), {
        httpMetadata: { contentType: type },
      });

      saved.push({
        key,
        filename: safe,
        size: f.size || 0,
        type,
      });
    }

    // Share JSON – tai skaito tavo /api/share/[shareId].js
    const shareJson = {
      id: shareId,
      createdAt: new Date().toISOString(),
      files: saved,
    };

    await env.MY_BUCKET.put(`shares/${shareId}.json`, JSON.stringify(shareJson), {
      httpMetadata: { contentType: "application/json" },
    });

    const origin = new URL(request.url).origin;
    const shareUrl = `${origin}/api/share/${shareId}`;
    return json({ ok: true, shareUrl }, 200);
  } catch (e) {
    return json({ ok: false, error: "Serverio klaida", details: String(e).slice(0, 300) }, 500);
  }
}
