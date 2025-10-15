// functions/api/upload.js
// Cloudflare Pages Function
// POST /api/upload
export async function onRequestPost({ request, env }) {
  const MAX_FILES = Number(env.UPLOAD_MAX_FILES || 5);
  const MAX_FILE_BYTES = Number(env.MAX_FILE_BYTES || 10 * 1024 * 1024); // 10MB default
  const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

  // CORS headers for the demo (adjust in production)
  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) {
      return new Response(JSON.stringify({ ok: false, error: "Expected multipart/form-data" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" }});
    }

    const form = await request.formData();
    const files = form.getAll("files"); // expects input name="files"

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ ok: false, error: "No files" }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" }});
    }
    if (files.length > MAX_FILES) {
      return new Response(JSON.stringify({ ok: false, error: `Max ${MAX_FILES} files allowed` }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" }});
    }

    const uploaded = [];
    for (const file of files) {
      // file is a File object (web standard)
      const filename = file.name || `file-${Date.now()}`;
      const contentType = file.type || "application/octet-stream";
      if (!ALLOWED.includes(contentType)) {
        return new Response(JSON.stringify({ ok: false, error: `Invalid file type: ${contentType}` }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" }});
      }
      const arrayBuffer = await file.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_FILE_BYTES) {
        return new Response(JSON.stringify({ ok: false, error: `File too large: ${filename}` }), { status: 400, headers: { ...CORS, "Content-Type": "application/json" }});
      }

      // create unique key: shares/<timestamp>_<random>_<originalName>
      const ts = Date.now();
      const rnd = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
      const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const key = `uploads/${ts}_${rnd}_${safeName}`;

      // put into R2 binding (env.MY_BUCKET)
      await env.MY_BUCKET.put(key, arrayBuffer, {
        httpMetadata: { contentType },
      });

      uploaded.push({ key, filename, contentType, size: arrayBuffer.byteLength });
    }

    // create shareId
    const shareId = crypto.getRandomValues(new Uint32Array(2)).join("-") + "-" + Date.now().toString(36);
    const shareObj = {
      id: shareId,
      createdAt: new Date().toISOString(),
      files: uploaded
    };

    // store metadata as JSON (so later we can list files for the share)
    await env.MY_BUCKET.put(`shares/${shareId}.json`, JSON.stringify(shareObj), {
      httpMetadata: { contentType: "application/json" },
    });

    const shareUrl = `${new URL(request.url).origin}/api/share/${shareId}`;

    return new Response(JSON.stringify({ ok: true, shareId, shareUrl, files: uploaded }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Upload error:", err);
    return new Response(JSON.stringify({ ok: false, error: "Server error" }), { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }});
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }});
}
