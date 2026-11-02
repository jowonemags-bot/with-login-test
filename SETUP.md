# Aidly: connecting the login and database (Supabase)

Until you do this, the site runs in **demo mode** (no login, data saved in one browser only).
Login is a simple **username + password**. No email address is needed.

## 1. Create the project
1. Make a free account at supabase.com and create a new project.
2. Open **SQL Editor > New query**, paste everything from `supabase-setup.sql`, and click **Run**.
   This creates the profiles table and the rules: only a signed-in owner can read or change their own profile, and the public can read one profile only if they know its random ID.

## 2. Turn off email confirmation
1. Go to **Authentication > Sign In / Providers > Email** (the menu name may differ slightly).
2. Make sure Email is enabled, and turn **Confirm email OFF**.
   Why: the site turns each username into a fake email (`username@aidly-accounts.com`) behind the scenes. Nothing is ever sent to it, so it can't be confirmed.
3. Set the **minimum password length to 8** in the same settings area. (The site also enforces 8.)

If sign-up says the email is "invalid", change `USERNAME_EMAIL_DOMAIN` in `config.js` to another domain-like text and try again.

## 3. Connect the site
1. In Supabase open **Project Settings > API** (or **API Keys**).
2. Copy the **Project URL** and the **publishable** (or **anon**) key into `config.js`.
3. Never put a `secret` or `service_role` key in any site file.

## 4. Host it
Upload the whole folder to GitHub Pages or Netlify (it needs to be online, not opened from your computer).

## 5. Try it
1. Open `edit.html`, choose **Create account**, pick a username and password, fill in the profile, and save.
2. Copy the **scan link** shown (it looks like `.../index.html?id=x7k29abc4mnp`).
3. Open that link on a different phone. You should see the saved profile.
4. Write that link onto the NFC tag with an app such as NFC Tools.

## Good to know
- **No password recovery.** With no email, a forgotten password can't be reset by the user. A team member can reset or delete the account in Supabase under **Authentication > Users**. Adding a real email later is possible.
- The random ID in the link is the only thing protecting who can read a profile, so treat the link like a key and don't post it publicly.
- Supabase limits how many sign-ups and sign-in attempts one connection can make, so a burst of tries may show "Too many attempts". Wait a few minutes.
- Each username has one profile.
- `index.html` with no `?id=` shows the fictional sample profile.
- For a real launch you need a privacy notice and consent under the Data Privacy Act, and parent or guardian consent for anyone under 18.
