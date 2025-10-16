// Mobile nav
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
if(navToggle){ navToggle.addEventListener('click', ()=> navLinks.classList.toggle('show')); }
const yearEl = document.getElementById('year');
if(yearEl){ yearEl.textContent = new Date().getFullYear(); }

// Subscribe handler (Cloudflare Pages Function: /api/subscribe)
async function wireForm(formId, msgId){
  const form = document.getElementById(formId);
  const msg = document.getElementById(msgId);
  if(!form) return;
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = form.querySelector('input[name="email"]').value.trim();
    msg.textContent = "Siunčiame...";
    try{
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, source: formId })
      });
      const data = await res.json().catch(()=>({}));
      if(res.ok){
        msg.textContent = "Ačiū! Patvirtinimas išsiųstas.";
        form.reset();
      }else{
        msg.textContent = data.error || "Įvyko klaida. Pabandyk dar kartą.";
      }
    }catch(err){
      msg.textContent = "Tinklo klaida.";
    }
  });
}
wireForm('earlyAccessForm','earlyAccessMsg');
wireForm('betaForm','betaMsg');