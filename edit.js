const $ = s => document.querySelector(s);
const LABELS = { allergies: "Allergy", conditions: "Condition", meds: "Medication" };
let ownId = null, mode = "in";

/* ---------- form rows ---------- */
function addRow(kind, item = {}) {
  const hasNote = kind !== "meds";
  const d = document.createElement("div");
  d.className = "item";
  // Labels are fixed text; user data is set through .value below, never through innerHTML.
  d.innerHTML =
    `<label>${LABELS[kind]} (English)<input data-k="en"></label>` +
    `<label>${LABELS[kind]} (Filipino, optional)<input data-k="fil"></label>` +
    (hasNote
      ? `<label>What should responders know or do? (English)<input data-k="noteEn"></label>` +
        `<label>Same, in Filipino (optional)<input data-k="noteFil"></label>`
      : "") +
    `<button type="button" class="btn quiet rm">Remove</button>`;
  const set = (k, v) => { const e = d.querySelector(`[data-k="${k}"]`); if (e) e.value = v || ""; };
  set("en", item.en); set("fil", item.fil);
  if (hasNote) { set("noteEn", item.note && item.note.en); set("noteFil", item.note && item.note.fil); }
  $("#" + kind).append(d);
}

function collect(kind) {
  return [...document.querySelectorAll(`#${kind} .item`)].map(d => {
    const v = k => { const e = d.querySelector(`[data-k="${k}"]`); return e ? e.value.trim() : ""; };
    const o = { en: v("en"), fil: v("fil") };
    if (kind !== "meds") o.note = { en: v("noteEn"), fil: v("noteFil") };
    return o;
  }).filter(o => o.en);
}

const blank = () => ({ name: "", age: "", blood: "Unknown",
  contact: { name: "", rel: { en: "", fil: "" }, phone: "" }, allergies: [], conditions: [], meds: [] });

function fill(p) {
  const c = p.contact || {}, rel = c.rel || {};
  $("#name").value = p.name || "";
  $("#age").value = p.age || "";
  $("#blood").value = p.blood || "Unknown";
  $("#cname").value = c.name || "";
  $("#relEn").value = rel.en || "";
  $("#relFil").value = rel.fil || "";
  $("#phone").value = c.phone || "";
  ["allergies", "conditions", "meds"].forEach(k => {
    $("#" + k).innerHTML = "";
    (p[k] || []).forEach(item => addRow(k, item));
  });
}

/* ---------- messages ---------- */
function say(msg, ok) { const s = $("#status"); s.textContent = msg; s.className = ok ? "ok" : "err"; }
function loginSay(msg, ok) { const s = $("#loginStatus"); s.textContent = msg; s.className = ok ? "ok" : "err"; }
function authMsg(e) {
  const m = ((e && e.message) || "").toLowerCase(), code = (e && e.code) || "";
  if (code === "needs_confirmation") return "Account created, but the project still asks for email confirmation. Turn off 'Confirm email' in Supabase (see SETUP.md).";
  if (code === "user_already_exists" || m.includes("already registered")) return "That username is taken. Try another one.";
  if (code === "invalid_credentials" || m.includes("invalid login")) return "Wrong username or password.";
  if (code === "over_request_rate_limit" || (e && e.status === 429) || m.includes("rate limit")) return "Too many attempts. Please wait a few minutes and try again.";
  if (m.includes("invalid") && m.includes("email")) return "The sign-up was rejected. Change USERNAME_EMAIL_DOMAIN in config.js (see SETUP.md).";
  if (m.includes("password")) return e.message;
  return "Something went wrong: " + ((e && e.message) || "unknown error");
}

/* ---------- share link ---------- */
function scanLink() { return new URL("index.html?id=" + encodeURIComponent(ownId), location.href).href; }
function updateShare() {
  const on = !backend.demo && !!ownId;
  $("#shareBox").hidden = !on;
  if (on) $("#shareLink").value = scanLink();
}

/* ---------- screens ---------- */
function showLogin(msg) {
  $("#f").hidden = true; $("#login").hidden = false; $("#signout").hidden = true;
  setMode("in");
  loginSay(msg || "", !msg);
}
async function enter() {
  $("#login").hidden = true; $("#f").hidden = false;
  $("#signout").hidden = backend.demo;
  $("#reset").hidden = !backend.demo;
  const row = await backend.ownProfile();
  ownId = (row && row.id) || null;
  fill(row && validProfile(row.data) ? row.data : blank());
  updateShare();
}

/* ---------- events ---------- */
document.addEventListener("click", e => {
  const add = e.target.closest("[data-add]");
  if (add) { addRow(add.dataset.add); return; }
  const rm = e.target.closest(".rm");
  if (rm) rm.closest(".item").remove();
});

function setMode(m) {
  mode = m;
  document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-pressed", t.dataset.mode === m));
  $("#confirmRow").hidden = m === "in";
  $("#authBtn").textContent = m === "in" ? "Sign in" : "Create account";
  $("#password").autocomplete = m === "in" ? "current-password" : "new-password";
  $("#authHelp").textContent = m === "in"
    ? "Sign in with your username and password."
    : "Choose a username and a password of at least 8 characters. There is no email, so write your password down. If you forget it, the Aidly team has to reset it for you.";
  loginSay("", true);
}
document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => setMode(t.dataset.mode)));

$("#authForm").addEventListener("submit", async e => {
  e.preventDefault();
  const username = $("#username").value.trim().toLowerCase(), pw = $("#password").value;
  if (!/^[a-z0-9_.]{3,20}$/.test(username)) return loginSay("Username must be 3 to 20 characters: letters, numbers, dot or underscore.", false);
  if (pw.length < 8) return loginSay("Password must be at least 8 characters.", false);
  if (mode === "up" && pw !== $("#password2").value) return loginSay("The two passwords don't match.", false);
  const btn = e.submitter; if (btn) btn.disabled = true;
  loginSay(mode === "up" ? "Creating account…" : "Signing in…", true);
  try { if (mode === "up") await backend.signUp(username, pw); else await backend.signIn(username, pw); }
  catch (err) { loginSay(authMsg(err), false); if (btn) btn.disabled = false; return; }
  if (btn) btn.disabled = false;
  try { loginSay("", true); await enter(); $("#password").value = ""; $("#password2").value = ""; }
  catch (err) { showLogin("Signed in, but your profile could not be loaded: " + (err.message || "unknown error")); }
});

$("#signout").addEventListener("click", async () => { await backend.signOut(); location.reload(); });

$("#f").addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("#name").value.trim(), cname = $("#cname").value.trim(), phone = $("#phone").value.trim();
  const digits = phone.replace(/\D/g, "");
  const age = $("#age").value ? Number($("#age").value) : "";
  if (!name) return say("Please enter your name.", false);
  if (age !== "" && (age < 0 || age > 120)) return say("Please enter a valid age.", false);
  if (!cname) return say("Please enter an emergency contact name.", false);
  if (digits.length < 7 || digits.length > 15) return say("Please enter a valid phone number for your contact.", false);

  const profile = {
    name, age, blood: $("#blood").value,
    updated: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    contact: { name: cname, rel: { en: $("#relEn").value.trim(), fil: $("#relFil").value.trim() }, phone },
    allergies: collect("allergies"), conditions: collect("conditions"), meds: collect("meds")
  };

  say("Saving…", true);
  try {
    ownId = await backend.saveOwn(profile, ownId);
    updateShare();
    say(backend.demo ? "Saved on this browser. Open the scan page to see your changes."
                     : "Saved. Anyone with your link now sees the updated profile.", true);
  } catch (err) {
    if (err && (err.status === 401 || /jwt/i.test(err.message || ""))) showLogin("Your session expired. Please sign in again.");
    else say("Could not save: " + ((err && err.message) || "unknown error"), false);
  }
});

$("#copy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("#shareLink").value); say("Link copied.", true); }
  catch (e) { $("#shareLink").select(); say("Press and hold the link to copy it.", true); }
});

$("#reset").addEventListener("click", async () => {
  if (!confirm("Replace everything with the demo profile?")) return;
  backend.reset();
  const row = await backend.ownProfile();
  fill(row.data);
  say("Demo profile restored.", true);
});

/* ---------- start ---------- */
(async () => {
  $("#demoBanner").hidden = !backend.demo;
  try {
    const s = await backend.session();
    if (s) await enter(); else showLogin("");
  } catch (err) { showLogin("Could not connect: " + (err.message || "unknown error")); }
})();
