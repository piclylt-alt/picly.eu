// functions/api/download/[...key].js
export async function onRequestGet({ params, env }) {
  const CORS = { "Access-Control-Allow-Origin": "*" };
  // params.key may be url-encoded with slashes; in Pages Functions use a rest param [...key]
  const key = params.key; // Pages passes decoded path param
  if (!key) return new Response("Missing key", { status: 400, headers: CORS });

  try {
    const obj = await env.MY_BUCKET.get(key);
    if (!obj) return new Response("Not found", { status: 404, headers: CORS });

    // stream the object back with correct headers
    const headers = new Headers();
    headers.set("Content-Type", obj.httpMetadata?.contentType || "application/octet-stream");
    // set a download filename:
    const filename = key.split("/").pop();
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    headers.set("Cache-Control", "public, max-age=3600");

    const body = obj.body; // ReadableStream
    return new Response(body, { status: 200, headers });
  } catch (err) {
    console.error("Download error:", err);
    return new Response("Server error", { status: 500, headers: CORS });
  }
}
