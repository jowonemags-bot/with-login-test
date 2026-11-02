/* Paste your Supabase project values here (see SETUP.md).
   The URL and the publishable/anon key are meant to be public: the database rules
   (Row Level Security) are what protect the data.
   NEVER paste a "secret" or "service_role" key into any file on this site. */
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_KEY = "YOUR_PUBLISHABLE_OR_ANON_KEY";

/* Username + password login: Supabase needs an email-shaped ID, so the username is turned into
   "username@<this domain>". No email is ever sent to it. If Supabase rejects sign-ups with an
   "invalid email" error, change this to another domain-like text. */
const USERNAME_EMAIL_DOMAIN = "aidly-accounts.com";
