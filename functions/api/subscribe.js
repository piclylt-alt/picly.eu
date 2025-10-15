// /functions/api/subscribe.js

// Utilities
function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
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

// Preflight (OPTIONS /api/subscribe)
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }});
}

// POST /api/subscribe
export async function onRequestPost({ request, env }) {
  try {
    const body = await readBodySmart(request);
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Neteisingas el. pašto formatas' }, 400);
    }
    if (!env?.RESEND_API_KEY) {
      return json({ error: 'Serverio konfigūracija: trūksta RESEND_API_KEY' }, 500);
    }

    // Use your Resend-verified sender, e.g. "Picly <noreply@picly.eu>"
    const from = (env.FROM_EMAIL && env.FROM_EMAIL.includes('@'))
      ? env.FROM_EMAIL
      : 'Picly <onboarding@resend.dev>'; // fallback for quick tests (prefer your domain)

    const ownerEmail = env.OWNER_EMAIL || 'hello@picly.eu';

    // 1) Notify owner
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

    // 2) Confirm to subscriber
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
      'Access-Control-Allow-Origin': '*',
    });
  } catch (e) {
    return json({ error: 'Serverio klaida', details: String(e).slice(0, 600) }, 500);
  }
}
