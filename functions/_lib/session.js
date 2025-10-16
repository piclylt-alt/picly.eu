// functions/_lib/session.js
export function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  return Object.fromEntries(header.split(/; */).filter(Boolean).map(c => {
    const idx = c.indexOf("="); 
    const k = decodeURIComponent(c.slice(0, idx).trim());
    const v = decodeURIComponent(c.slice(idx + 1).trim());
    return [k, v];
  }));
}

export function cookie(name, value, opts = {}) {
  const o = { path: "/", httpOnly: true, sameSite: "Lax", secure: true, ...opts };
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (o.maxAge != null) parts.push(`Max-Age=${o.maxAge}`);
  if (o.expires) parts.push(`Expires=${o.expires.toUTCString()}`);
  if (o.path) parts.push(`Path=${o.path}`);
  if (o.domain) parts.push(`Domain=${o.domain}`);
  if (o.httpOnly) parts.push(`HttpOnly`);
  if (o.secure) parts.push(`Secure`);
  if (o.sameSite) parts.push(`SameSite=${o.sameSite}`);
  return parts.join("; ");
}

export function json(obj, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export function validEmail(email=""){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function randomId(len=24){
  return [...crypto.getRandomValues(new Uint8Array(len))]
    .map(b => b.toString(16).padStart(2,"0")).join("");
}
// functions/_lib/session.js  (papildymui)
export async function hashPassword(password, salt=null){
  const enc = new TextEncoder();
  salt = salt || [...crypto.getRandomValues(new Uint8Array(16))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), {name:"PBKDF2"}, false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 120000, hash: "SHA-256" },
    keyMaterial, 256
  );
  const hashHex = Array.from(new Uint8Array(derived)).map(b=>b.toString(16).padStart(2,'0')).join('');
  return { salt, hash: hashHex };
}

export async function verifyPassword(password, salt, expectedHash){
  const { hash } = await hashPassword(password, salt);
  return hash === expectedHash;
}