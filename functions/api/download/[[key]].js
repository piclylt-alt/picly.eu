// functions/api/download/[[key]].js
export async function onRequestGet({ params, env }) {
  const CORS = { "Access-Control-Allow-Origin": "*" };

  // Catch-all paramas Pages'e su dvigubais skliaustais ateina kaip viena eilutė su vidiniais /
  const key = params.key; 
  if (!key) return new Response("Missing key", { status: 400, headers: CORS });

  try {
    const obj = await env.MY_BUCKET.get(key);
    if (!obj) return new Response("Not found", { status: 404, headers: CORS });

    const headers = new Headers();
    headers.set("Content-Type", obj.httpMetadata?.contentType || "application/octet-stream");
    headers.set("Cache-Control", "public, max-age=3600");
    const filename = key.split("/").pop() || "file";
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);

    return new Response(obj.body, { status: 200, headers });
  } catch (err) {
    console.error("Download error:", err);
    return new Response("Server error", { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }});
}
