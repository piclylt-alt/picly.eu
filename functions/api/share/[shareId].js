// functions/api/share/[shareId].js
export async function onRequestGet({ params, env, request }) {
  const CORS = { "Access-Control-Allow-Origin": "*" };
  const shareId = params.shareId;
  try {
    const obj = await env.MY_BUCKET.get(`shares/${shareId}.json`);
    if (!obj) return new Response(JSON.stringify({ ok: false, error: "Share not found" }), { status: 404, headers: { ...CORS, "Content-Type": "application/json" }});
    const txt = await obj.text();
    const json = JSON.parse(txt);

    // For each file, create a download endpoint URL
    const base = new URL(request.url).origin;
    json.files = json.files.map(f => ({
      ...f,
      downloadUrl: `${base}/api/download/${encodeURIComponent(f.key)}`
    }));

    return new Response(JSON.stringify({ ok: true, share: json }), { status: 200, headers: { ...CORS, "Content-Type": "application/json" }});
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), { status: 500, headers: { ...CORS, "Content-Type": "application/json" }});
  }
}
