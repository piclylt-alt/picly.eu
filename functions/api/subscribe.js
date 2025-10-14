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
    const { email, source } = body || {}
    const trimmedEmail = typeof email === "string" ? email.trim() : ""

    if (!trimmedEmail) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      })
    }

    const emailRegex = /.+@.+\..+/
    if (!emailRegex.test(trimmedEmail)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...cors },
      })
    }

    const fromEmail = env.FROM_EMAIL?.trim()
    const ownerEmail = env.OWNER_EMAIL?.trim()

    if (!fromEmail || !ownerEmail || !env.RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Server misconfigured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...cors },
        },
      )
    }

    // Siunčiam per Resend REST (be Node SDK)
    const resendFetch = (payload) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

    const subscriberPayload = {
      from: fromEmail,
      to: trimmedEmail,
      reply_to: ownerEmail,
      subject: "Picly: registracija gauta",
      html: `<p>Ačiū! Patvirtinsime kuo greičiau.</p>`,
      text: "Ačiū! Patvirtinsime kuo greičiau.",
    }

    const ownerPayload = {
      from: fromEmail,
      to: ownerEmail,
      subject: "Naujas Picly užsiregistravęs lankytojas",
      html: `<p>Naujas lankytojas nori prisijungti.</p><p><strong>El. paštas:</strong> ${trimmedEmail}</p><p><strong>Forma:</strong> ${source || "unknown"}</p>`,
      text: `Naujas lankytojas: ${trimmedEmail}\nForma: ${source || "unknown"}`,
      reply_to: trimmedEmail,
    }

    const [subscriberRes, ownerRes] = await Promise.all([
      resendFetch(subscriberPayload),
      resendFetch(ownerPayload),
    ])

    if (!subscriberRes.ok || !ownerRes.ok) {
      const [subscriberText, ownerText] = await Promise.all([
        subscriberRes.text(),
        ownerRes.text(),
      ])
      return new Response(
        JSON.stringify({
          error: "Resend failed",
          details: { subscriber: subscriberText, owner: ownerText },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...cors },
        },
      )
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
