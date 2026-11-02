/* Aidly storage layer.
   - If config.js is filled in: profiles live in Supabase. The owner signs in with a username
     and password and can write only their own profile. Anyone with the link can read it.
   - If not: DEMO MODE. Data is kept in this browser only and there is no login. */

const clone = o => JSON.parse(JSON.stringify(o));

const DEFAULT_PROFILE = {
  name: "Migi Santos", age: 31, blood: "O+", updated: "24 Oct 2026",
  contact: { name: "Ana Santos", rel: { en: "sister", fil: "kapatid" }, phone: "0917 000 0000" },
  allergies: [{ en: "Penicillin", fil: "Penicillin",
    note: { en: "Do not give penicillin-type antibiotics.", fil: "Huwag magbigay ng antibiotic na uri ng penicillin." } }],
  conditions: [{ en: "Asthma", fil: "Hika",
    note: { en: "May need a rescue inhaler. Check the bag.", fil: "Maaaring kailanganin ang inhaler. Tingnan ang bag." } }],
  meds: [{ en: "Rescue inhaler (salbutamol), as needed", fil: "Rescue inhaler (salbutamol), kung kinakailangan" }]
};

function validProfile(p) {
  return !!(p && typeof p === "object" && p.name && p.contact &&
    Array.isArray(p.allergies) && Array.isArray(p.conditions) && Array.isArray(p.meds));
}

const CONFIGURED = typeof SUPABASE_URL === "string" && typeof SUPABASE_KEY === "string" &&
  SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && !SUPABASE_KEY.includes("YOUR_");

/* ---------- Demo backend (this browser only) ---------- */
const LOCAL_KEY = "aidly.profile.v1";
function localRead() {
  try { const p = JSON.parse(localStorage.getItem(LOCAL_KEY)); if (validProfile(p)) return p; } catch (e) { /* use default */ }
  return clone(DEFAULT_PROFILE);
}
const localBackend = {
  demo: true,
  async session() { return { user: { email: "demo" } }; },
  async signIn() {}, async signUp() {}, async signOut() {},
  async ownProfile() { return { id: "demo", data: localRead() }; },
  async saveOwn(profile) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(profile)); } catch (e) { throw new Error("Your browser is blocking storage."); }
    return "demo";
  },
  async publicProfile() { return localRead(); },
  reset() { try { localStorage.removeItem(LOCAL_KEY); } catch (e) { /* ignore */ } }
};

/* ---------- Supabase backend ---------- */
function randomId() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";           // no look-alike characters
  return [...crypto.getRandomValues(new Uint8Array(12))].map(x => chars[x % chars.length]).join("");
}
const sb = (CONFIGURED && typeof window !== "undefined" && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const emailFor = u => `${u}@${typeof USERNAME_EMAIL_DOMAIN === "string" ? USERNAME_EMAIL_DOMAIN : "aidly-accounts.com"}`;

const supaBackend = {
  demo: false,
  async session() { const { data } = await sb.auth.getSession(); return data.session; },
  // Supabase needs an email-shaped ID, so the username becomes "username@<fake domain>".
  // "Confirm email" must be OFF in Supabase so no email is needed (see SETUP.md).
  async signUp(username, password) {
    const { data, error } = await sb.auth.signUp({ email: emailFor(username), password });
    if (error) throw error;
    if (!data.session) { const e = new Error("needs confirmation"); e.code = "needs_confirmation"; throw e; }
  },
  async signIn(username, password) {
    const { error } = await sb.auth.signInWithPassword({ email: emailFor(username), password });
    if (error) throw error;
  },
  async signOut() { await sb.auth.signOut(); },
  // Row Level Security means this can only ever return the signed-in owner's own row.
  async ownProfile() {
    const { data, error } = await sb.from("profiles").select("id,data").maybeSingle();
    if (error) throw error;
    return data;
  },
  async saveOwn(profile, existingId) {
    if (existingId) {
      const { error } = await sb.from("profiles")
        .update({ data: profile, updated_at: new Date().toISOString() }).eq("id", existingId);
      if (error) throw error;
      return existingId;
    }
    const { data: { user } } = await sb.auth.getUser();
    for (let i = 0; i < 3; i++) {
      const id = randomId();
      const { error } = await sb.from("profiles").insert({ id, owner_id: user.id, data: profile });
      if (!error) return id;
      if (error.code !== "23505") throw error;              // 23505 = ID already taken, try another
    }
    throw new Error("Could not create your profile link. Please try again.");
  },
  // Public read of ONE profile by its random ID (the table itself is not readable by the public).
  async publicProfile(id) {
    if (!id) return clone(DEFAULT_PROFILE);                  // no ?id= in the link: show the sample
    const { data, error } = await sb.rpc("get_profile", { p_id: id });
    if (error) throw error;
    return data;
  }
};

const backend = sb ? supaBackend : localBackend;
