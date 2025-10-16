// functions/api/download/[[key]].js
const CORS = { "Access-Control-Allow-Origin": "*" };

const mimeByExt = (name = "") => {
  const ext = name.split(".").pop().toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png":  return "image/png";
    case "webp": return "image/webp";
    case "gif":  return "image/gif";
    case "svg":  return "image/svg+xml";
    case "pdf":  return "application/pdf";
    case "txt":  return "text/plain; charset=utf-8";
    default:     return "application/octet-stream";
  }
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ params, env, request }) {
  try {
    if (!env.MY_BUCKET) {
      return new Response("R2 not configured", { status: 500, headers: CORS });
    }

    // Labai svarbu: sugauti VISĄ kelią ir iš-decode'inti
    const raw = params.key || "";
    const key = decodeURIComponent(raw);

    const obj = await env.MY_BUCKET.get(key);
    if (!obj) {
      return new Response("Not found", { status: 404, headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8" } });
    }

    // Tipas iš R2 metadata arba pagal plėtinį
    const metaType = obj.httpMetadata?.contentType;
    const type = metaType || mimeByExt(key);

    // Parsisiuntimui naudok ?download=1
    const url = new URL(request.url);
    const wantDownload = url.searchParams.has("download");

    const headers = {
      ...CORS,
      "Content-Type": type,
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    if (wantDownload) {
      const filename = key.split("/").pop() || "file";
      headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    } else {
      // inline peržiūrai – nieko papildomai
    }

    return new Response(obj.body, { status: 200, headers });
  } catch (e) {
    return new Response("Server error", { status: 500, headers: CORS });
  }
}
