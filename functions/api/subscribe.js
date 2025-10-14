// /functions/api/subscribe.js
<<<<<<< Updated upstream
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
=======

// Small helpers
function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...extra }
  });
}
async function readBodySmart(request) {
  const ct = request.headers.get('content-type') || '';
  if (ct.includes('application/json')) return await request.json().catch(()=> ({}));
  if (ct.includes('application/x-www-form-urlencoded')) {
    const txt = await request.text(); const p = new URLSearchParams(txt);
    return Object.fromEntries(p.entries());
  }
  if (ct.includes('multipart/form-data')) {
    const form = await request.formData(); const o = {};
    for (const [k,v] of form.entries()) o[k] = typeof v === 'string' ? v : '';
    return o;
  }
  return await request.json().catch(() => ({}));
}
function esc(s = '') {
  return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Health-check (GET /api/subscribe)
export async function onRequestGet() {
  return new Response('OK', { status: 200 });
}

// Optional preflight (OPTIONS /api/subscribe)
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: {
    // if same-origin, this isn't needed; harmless to keep
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }});
}

// POST /api/subscribe
export async function onRequestPost({ request, env }) {
>>>>>>> Stashed changes
  try {
    const { request, env } = context
    const body = await request.json()
    const { email, source } = body || {}
    const trimmedEmail = typeof email === "string" ? email.trim() : ""

<<<<<<< Updated upstream
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
=======
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Neteisingas el. pašto formatas' }, 400);
    }
    if (!env?.RESEND_API_KEY) {
      return json({ error: 'Serverio konfigūracija: trūksta RESEND_API_KEY' }, 500);
    }

    // Use a verified sender on your Resend-verified domain:
    // e.g., "Picly <noreply@picly.eu>"
    const from = (env.FROM_EMAIL && env.FROM_EMAIL.includes('@'))
      ? env.FROM_EMAIL
      : 'Picly <onboarding@resend.dev>'; // fallback for testing; prefer your domain

    // Where you (the owner) want to receive signup pings
    const ownerEmail = env.OWNER_EMAIL || 'hello@picly.eu';

    // 1) Notify the owner
    const ownerPayload = {
      from,
      to: [ownerEmail],
      subject: 'Naujas prenumeratorius (Picly)',
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
          <h3>Naujas prenumeratorius</h3>
          <p><strong>El. paštas:</strong> ${esc(email)}</p>
          <p><strong>Laikas:</strong> ${new Date().toISOString()}</p>
        </div>
      `,
      text: `El. paštas: ${email}\nLaikas: ${new Date().toISOString()}`
    };

    const r1 = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ownerPayload),
    });

    const r1body = await r1.json().catch(() => ({}));
    if (!r1.ok) {
      return json({ error: 'Owner email klaida', details: r1body?.message || r1body }, 502);
    }

    // 2) Confirm to the subscriber
    const userPayload = {
      from,
      to: [email],
      subject: 'Sveikas atvykęs į Picly 👋',
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
          <h2>Ačiū, kad prisijungei!</h2>
          <p>Įtraukėme tavo el. paštą: <strong>${esc(email)}</strong>.</p>
          <p>Greitai atsiųsime naujienas apie ankstyvą prieigą.</p>
          <hr />
          <p style="font-size:12px;color:#666">Jei tai ne tu – ignoruok šį laišką.</p>
        </div>
      `,
      text: 'Dėkui, kad prisijungei prie laukiančiųjų sąrašo. Greitai atsiųsime naujienas. – Picly komanda'
    };

    const r2 = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userPayload),
    });

    const r2body = await r2.json().catch(() => ({}));
    if (!r2.ok) {
      return json({ error: 'Subscriber email klaida', details: r2body?.message || r2body }, 502);
    }

    return json({ message: 'Išsiųsta. Patikrink paštą!' }, 200, {
      // same-origin calls do not need CORS; keeping permissive CORS for flexibility
      'Access-Control-Allow-Origin': '*',
    });
  } catch (e) {
    return json({ error: 'Serverio klaida', details: String(e).slice(0, 600) }, 500);
>>>>>>> Stashed changes
  }
}
