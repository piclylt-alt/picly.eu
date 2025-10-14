// functions/api/subscribe.js

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

function json(obj, status=200, extraHeaders={}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders }
  });
}

// Health-check
export async function onRequestGet() {
  return new Response('OK', { status: 200 });
}

// (nebūtina, bet jei kažkur bus CORS preflight)
export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}

// PAGRINDAS: POST /api/subscribe
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await readBodySmart(request);
    const email = String(body?.email || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Neteisingas el. pašto formatas' }, 400);
    }
    if (!env?.RESEND_API_KEY) {
      return json({ error: 'Nėra RESEND_API_KEY (Secret)' }, 500);
    }

    const from = env.FROM_EMAIL?.includes('@') ? env.FROM_EMAIL : 'Pickly <onboarding@resend.dev>';
    const ownerEmail = env.OWNER_EMAIL || 'pickly.lt@gmail.com';

    // 1) Laiškas tau
    const r1 = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from, to: [ownerEmail],
        subject: 'Naujas prenumeratorius',
        text: `El. paštas: ${email}\nLaikas: ${new Date().toISOString()}`
      })
    });
    if (!r1.ok) {
      const t = (await r1.text().catch(()=>''))?.slice(0,600);
      return json({ error:'Owner email klaida', status:r1.status, details:t }, 500);
    }

    // 2) Patvirtinimas vartotojui
    const r2 = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from, to: [email],
        subject: 'Sveikas atvykęs į Pickly 👋',
        text: 'Labas! Dėkui, kad prisijungei prie laukiančiųjų sąrašo. Netrukus atsiųsime daugiau naujienų.\n– Pickly komanda'
      })
    });
    if (!r2.ok) {
      const t = (await r2.text().catch(()=>''))?.slice(0,600);
      return json({ error:'Subscriber email klaida', status:r2.status, details:t }, 500);
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error:'Serverio klaida', details:String(e).slice(0,600) }, 500);
  }
}
