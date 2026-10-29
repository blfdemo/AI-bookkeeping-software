/* Ledger sign-in, two-step verification and security module.
   Front-end only: enforce every security check on the server in production. */
const MAC = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || "");
const AUTH = { step: "in", via: "Email", tries: 0, lock: 0, msg: "", bk: 0 };
const SEC = {
  phrase: "Blue heron 42", idle: 15, alerts: 1, last: Date.now(),
  sess: [["Mac · Chrome", "Chennai, IN", "This device"], ["Windows PC · Edge", "Chennai, IN", "2 days ago"], ["Mac · Safari", "Bengaluru, IN", "5 days ago"]]
};
const LOGO = "assets/img/logo.png"; // replace this one file to change the logo everywhere

const GOOGLE = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;
const APPLE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.37 12.62c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.1 8.79.73 1.06 1.6 2.25 2.74 2.21 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.66-2.15.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.3-.88-2.32-3.5zM14.2 6.05c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.55 1.31-.56.65-1.05 1.69-.92 2.68.97.08 1.96-.49 2.57-1.23z"/></svg>`;

const phraseBox = (hidden) => `<div class="phr" id="phr" ${hidden ? "hidden" : ""}>${ico("shield-check", 18)}<div><small>Your security phrase</small><b>${SEC.phrase.replace(/[&<>"]/g, "")}</b></div></div>`;
const pwField = (id, label, ac) => `<div class="fld"><label class="form-label" for="${id}">${label}</label><div class="pw"><input class="form-control" id="${id}" name="${id}" type="password" autocomplete="${ac}" minlength="8" required><button type="button" class="pwb" data-a="pw:${id}" aria-label="Show password">${ico("eye", 18)}</button></div></div>`;

const syncSw = () => document.querySelectorAll(".tsw").forEach(b => b.setAttribute("aria-checked", document.documentElement.dataset.bsTheme == "dark"));
const themeSw = () => `<button type="button" class="tsw" data-a="theme:flip" role="switch" aria-label="Dark mode" aria-checked="${document.documentElement.dataset.bsTheme == "dark"}"><span class="ti">${ico("sun", 15)}</span><span class="ti">${ico("moon", 15)}</span><i class="tk"></i></button>`;

function authView() {
  const s = AUTH.step, info = AUTH.msg; AUTH.msg = "";
  let re = ""; try { re = localStorage.re || "" } catch (_) {}
  const err = `<div class="alert-s ${info ? "info" : ""}" id="ae" role="alert" ${info ? "" : "hidden"}>${info}</div>`;
  const logo = `<img class="fm-logo" src="${LOGO}" alt="Ledger" width="48" height="48">`;
  const soc = v => `<div class="soc-g"><button type="button" class="btn btn-ghost w-100" data-a="soc:Google">${GOOGLE} ${v} with Google</button><button type="button" class="btn btn-ghost w-100" data-a="soc:Apple">${APPLE} ${v} with Apple</button></div><div class="or"><span>Or with email</span></div>`;
  let body = "";
  if (s == "in") body = `<form id="sf" novalidate>${logo}<h2>Sign in to your account</h2>${err}${soc("Sign in")}
<div class="fld"><input class="form-control" id="em" name="em" type="text" placeholder="Email or username" aria-label="Email or username" autocomplete="username" value="${re.replace(/[&<>"]/g, "")}"></div>${phraseBox(!re.includes("@"))}
<div class="fld"><div class="pw"><input class="form-control" id="pw" name="pw" type="password" placeholder="Password" aria-label="Password" autocomplete="current-password"><button type="button" class="pwb" data-a="pw:pw" aria-label="Show password">${ico("eye", 18)}</button></div></div>
<div class="d-flex justify-content-between align-items-center mb-3"><label class="form-check m-0"><input class="form-check-input" type="checkbox" id="rm" ${re ? "checked" : ""}><span class="form-check-label">Remember me</span></label><a href="#signin" data-a="step:forgot" class="small">Forgot Password?</a></div>
<button class="btn btn-dk w-100" id="sb">Sign In</button>
<p>Don’t have an account? <a href="#signin" data-a="step:up">Sign Up</a></p>
<div class="sec-note">${ico("shield", 16)}<span>Check that the address bar shows <b>ledger.app</b>. Ledger will never ask for your password or verification code by email, phone or chat.</span></div></form>`;
  else if (s == "up") body = `<form id="su" novalidate>${logo}<h2>Create your account</h2>${err}${soc("Sign up")}
<div class="fld"><input class="form-control" id="nm" placeholder="Full name" aria-label="Full name" autocomplete="name"></div>
<div class="fld"><input class="form-control" id="em" type="email" placeholder="Work email" aria-label="Work email" autocomplete="email"></div>
<div class="fld"><div class="pw"><input class="form-control" id="np" type="password" placeholder="Password" aria-label="Password" autocomplete="new-password"><button type="button" class="pwb" data-a="pw:np" aria-label="Show password">${ico("eye", 18)}</button></div></div><div class="meter" aria-hidden="true"><i id="mt"></i></div><small class="mt-s" id="ml">Use 12+ characters with a mix of letters, numbers and symbols.</small>
<button class="btn btn-dk w-100 mt-3">Create account</button>
<p>Already have an account? <a href="#signin" data-a="step:in">Sign In</a></p></form>`;
  else if (s == "forgot") body = `<form id="ff" novalidate>${logo}<h2>Reset your password</h2><p class="sub">Enter your email and we’ll send a reset link.</p>${err}
<div class="fld"><input class="form-control" id="em" type="email" placeholder="Email" aria-label="Email" autocomplete="username"></div>
<button class="btn btn-dk w-100">Send reset link</button><p><a href="#signin" data-a="step:in">Back to Sign In</a></p></form>`;
  else body = `<form id="mf" novalidate>${logo}<h2>Two-step verification</h2>
<p class="sub">${AUTH.bk ? "Enter one of your single-use backup codes." : "Open your authenticator app and enter the 6-digit code for Ledger."}</p>${err}${phraseBox(false)}
<div class="fld"><input class="form-control code" id="cd" aria-label="${AUTH.bk ? "Backup code" : "6-digit code"}" placeholder="${AUTH.bk ? "Backup code" : "000000"}" ${AUTH.bk ? 'maxlength="9" autocomplete="off"' : 'maxlength="6" inputmode="numeric" autocomplete="one-time-code"'}></div>
<label class="form-check mb-3"><input class="form-check-input" type="checkbox" id="tr"><span class="form-check-label">Trust this device for 30 days</span></label>
<button class="btn btn-dk w-100">Verify and continue</button>
<p><a href="#signin" data-a="bk">${AUTH.bk ? "Use authenticator app" : "Use a backup code"}</a> · <a href="#signin" data-a="step:in">Back to Sign In</a></p></form>`;
  return `<div class="auth"><section class="hero" aria-label="Ledger"><img class="hero-logo" src="assets/img/auth-logo.png" alt="Ledger" width="420" height="420">
<div class="hero-b"><h1>Bookkeeping that<br>runs itself.</h1><ul class="trust"><li><img src="assets/img/icon-fast.png" alt="" width="16" height="16">Fast &amp; secure</li><li><img src="assets/img/icon-gst.png" alt="" width="16" height="16">GST ready</li><li><img src="assets/img/icon-secure.png" alt="" width="16" height="16">Bank-grade protection</li></ul></div></section>
<section class="fm">${themeSw()}<div class="fm-in">${body}</div></section></div>`;
}

function aerr(m) { const e = document.getElementById("ae"); if (e) { e.textContent = m; e.className = "alert-s"; e.hidden = false } }
const okEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
function toMfa(via) { AUTH.via = via; AUTH.step = "mf"; AUTH.bk = 0; render() }
function finish(trust) {
  if (trust) try { localStorage.lt = String(Date.now() + 30 * 864e5) } catch (_) {}
  SEC.last = Date.now(); AUTH.step = "in"; AUTH.tries = 0; authed = true;
  try { sessionStorage.a = "1" } catch (_) {}
  location.hash = "dashboard"; render();
}
function trusted() { try { return +localStorage.lt > Date.now() } catch (_) { return false } }
function reset(msg) { authed = false; try { sessionStorage.a = "0" } catch (_) {} AUTH.step = "in"; AUTH.msg = msg || ""; if (document.getElementById("dlg")?.open) document.getElementById("dlg").close(); render() }

document.addEventListener("click", e => {
  const el = e.target.closest("[data-a]"); if (!el) return;
  const d = el.dataset.a, i = d.indexOf(":"), a = i < 0 ? d : d.slice(0, i), x = i < 0 ? "" : d.slice(i + 1);
  if (a == "theme") setTimeout(syncSw, 0);
  if (a == "step") { e.preventDefault(); AUTH.step = x; render() }
  else if (a == "soc") { el.disabled = true; el.textContent = "Connecting to " + x + "…"; setTimeout(() => trusted() ? finish() : toMfa(x), 600) }
  else if (a == "pw") { const f = document.getElementById(x), on = f.type == "password"; f.type = on ? "text" : "password"; el.innerHTML = ico(on ? "eye-off" : "eye", 18); el.setAttribute("aria-label", on ? "Hide password" : "Show password") }
  else if (a == "bk") { e.preventDefault(); AUTH.bk = AUTH.bk ? 0 : 1; render() }
  else if (a == "revoke") { SEC.sess.splice(+x, 1); render(); toast("Signed out of that device") }
  else if (a == "phrase") { const v = document.getElementById("ph").value.trim().slice(0, 24); if (v.length < 4) return toast("Use at least 4 characters"); SEC.phrase = v; toast("Anti-phishing phrase saved") }
  else if (a == "sec") setTimeout(() => document.getElementById("security")?.scrollIntoView({ behavior: "smooth" }), 80);
});

document.addEventListener("submit", e => {
  const f = e.target; if (!["sf", "su", "ff", "mf"].includes(f.id)) return;
  e.preventDefault();
  const v = id => (f.querySelector("#" + id)?.value || "").trim();
  if (f.id == "sf") {
    try { f.querySelector("#rm").checked ? localStorage.re = v("em") : localStorage.removeItem("re") } catch (_) {}
    const b = f.querySelector("#sb"); b.disabled = true; b.textContent = "Signing in…";
    setTimeout(() => trusted() ? finish() : toMfa("Email"), 400);
  } else if (f.id == "su") {
    if (!v("nm")) return aerr("Enter your name.");
    if (!okEmail(v("em"))) return aerr("Enter a valid email address.");
    if (strength(f.querySelector("#np").value) < 2) return aerr("Choose a stronger password.");
    toMfa("Email"); toast("Account created. Verify to continue");
  } else if (f.id == "ff") {
    if (!okEmail(v("em"))) return aerr("Enter a valid email address.");
    const e2 = document.getElementById("ae"); e2.className = "alert-s info"; e2.textContent = "If an account exists for that email, a reset link is on its way."; e2.hidden = false;
  } else finish(f.querySelector("#tr").checked);
});

function strength(p) { let s = 0; if (p.length >= 8) s++; if (p.length >= 12) s++; if (/[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p)) s++; if (/[^A-Za-z0-9]/.test(p)) s++; return Math.min(s, 4) }
document.addEventListener("input", e => {
  const t = e.target;
  if (t.id == "em" && document.getElementById("sf")) { const p = document.getElementById("phr"); if (p) p.hidden = !t.value.includes("@") }
  else if (t.id == "np") { const s = strength(t.value), m = document.getElementById("mt"); m.style.width = s * 25 + "%"; m.dataset.s = s; document.getElementById("ml").textContent = ["Too short", "Weak", "Fair", "Good", "Strong"][s] + (s < 4 ? ". Add length, capitals, numbers or symbols." : ". Nice.") }
  else if (t.id == "cd" && !AUTH.bk) { t.value = t.value.replace(/\D/g, "").slice(0, 6); if (t.value.length == 6) t.form.requestSubmit() }
});
document.addEventListener("change", e => { if (e.target.id == "idl") { SEC.idle = +e.target.value; toast("Auto sign-out set to " + SEC.idle + " minutes") } else if (e.target.id == "sal") { SEC.alerts = e.target.checked ? 1 : 0; toast(SEC.alerts ? "Sign-in alerts on" : "Sign-in alerts off") } });

/* Inactivity sign-out */
["pointerdown", "keydown", "scroll"].forEach(n => addEventListener(n, () => { SEC.last = Date.now() }, { passive: true }));
setInterval(() => { if (typeof authed != "undefined" && authed && Date.now() - SEC.last > SEC.idle * 6e4) reset("You were signed out after " + SEC.idle + " minutes of inactivity.") }, 15000);

/* Image fallback without inline handlers (keeps the strict CSP) */
addEventListener("error", e => { const t = e.target; if (t && t.tagName == "IMG" && !t.dataset.f) { t.dataset.f = 1; t.src = "assets/img/avatar.png" } }, true);

/* Settings > Security cards */
function secCards() {
  const sess = SEC.sess.map((r, i) => [`${ico(/Windows/.test(r[0]) ? "monitor" : /Mac/.test(r[0]) ? "monitor" : "smartphone", 16)} ${r[0]}<br><span style="color:var(--mu);font-size:13px">${r[1]}</span>`, r[2], i ? `<button class="btn btn-danger-soft btn-sm" data-a="revoke:${i}">Revoke</button>` : `<span class="badge rounded-pill pl p">Current</span>`]);
  const opt = n => `<option value="${n}" ${SEC.idle == n ? "selected" : ""}>${n} minutes</option>`;
  return `<div class="d-grid gap-3 mb-3 g2" id="security"><div class="card"><h2>${ico("shield-check", 18)} Sign-in security</h2>
<div class="sw"><div>Two-step verification<br><span style="color:var(--mu);font-size:13px">Authenticator app is active. Required for owners.</span></div><span class="badge rounded-pill pl p">Required</span></div>
<div class="sw"><div>Sign-in alerts<br><span style="color:var(--mu);font-size:13px">Email me when a new device signs in</span></div><div class="form-check form-switch m-0"><input class="form-check-input" id="sal" role="switch" type="checkbox" ${SEC.alerts ? "checked" : ""} aria-label="Sign-in alerts"></div></div>
<div class="fld mt-3"><label class="form-label" for="idl">Auto sign-out after inactivity</label><select class="form-select" id="idl">${[5, 15, 30, 60].map(opt).join("")}</select></div>
<div class="fld"><label class="form-label" for="ph">Anti-phishing phrase</label><div class="d-flex gap-2"><input class="form-control" id="ph" maxlength="24" value="${SEC.phrase.replace(/[&<>"]/g, "")}"><button class="btn btn-soft" data-a="phrase">Save</button></div><small class="mt-s">Shown on the sign-in and verification screens. If you don’t see it, don’t enter your details.</small></div>
<div class="d-flex gap-2 flex-wrap"><button class="btn btn-ghost" data-a="toast:Password reset link sent to your email">${ico("key", 16)} Change password</button><button class="btn btn-ghost" data-a="toast:New backup codes generated">Backup codes</button></div></div>
<div class="card"><h2>${ico("monitor", 18)} Active sessions</h2>${tbl(["Device", "Last active", ""], sess)}</div></div>`;
}
