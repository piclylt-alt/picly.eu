// /functions/api/subscribe.js
const cors = {
  "Access-Control-Allow-Origin": "*",        // arba tavo domeną
  "Access-Control-Allow-Methods": "POST,OPTIONS,GET",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors })
}

export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...cors },
  })
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context
    const body = await request.json()
    const { email } = body || {}

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      })
    }

    // Siunčiam per Resend REST (be Node SDK)
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`, // SVARBU: context.env
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Picly <noreply@picly.eu>",   // domenas turi būti verified Resend’e
        to: [email],
        subject: "Picly: registracija gauta",
        html: `<p>Ačiū! Patvirtinsime kuo greičiau.</p>`,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return new Response(JSON.stringify({ error: "Resend failed", details: text }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...cors },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error", details: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors },
    })
  }
}
