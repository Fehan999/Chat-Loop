<p align="center">
  <img src="public/favicon.svg" alt="ChatLoop logo" width="84" height="84" />
</p>

<h1 align="center">ChatLoop</h1>

<p align="center">
  A real-time chat app with friends, voice notes, audio/video calls and a built-in AI helper.<br />
  React + Firebase, with Supabase for file storage.
</p>

---

## What's in it

- **One-to-one chat** with read receipts, typing indicator, edit/delete, and date separators
- **Reactions** (one per person, double-click a message for ❤️)
- **Voice notes** with a real waveform, plus photos and file attachments (drag & drop or paste)
- **Audio and video calls** over WebRTC, with mute, camera toggle and screen share
- **Friends** - search by name, username or a 4-digit ID, send/accept/decline requests
- **ChatLoop AI** - a Gemini-powered assistant pinned at the top of the chat list
- **Notifications** - message sound, unread count in the tab title, optional desktop notifications
- **Online status** with last seen, and a privacy switch to hide it
- **Admin panel** at `/admin` - users, reports, bans and an announcement banner

## Tech stack

| Part | What we use |
| --- | --- |
| UI | React 18, Vite, Tailwind CSS, Framer Motion, react-icons |
| Auth | Firebase Auth (email/password, Google, GitHub) |
| Data | Cloud Firestore (real-time listeners) |
| Files | Supabase Storage, bucket `chat-attachments` |
| Calls | WebRTC, with Firestore used for signalling |
| AI | Google Gemini API (free tier from Google AI Studio) |

## Getting started

You need Node 18 or newer.

```bash
git clone https://github.com/Fehan999/Chat-Loop.git
cd Chat-Loop
npm install
cp .env.example .env    # then add your Gemini key, see below
npm run dev
```

The app runs on http://localhost:5173.

### Environment variables

| Name | Needed? | What it's for |
| --- | --- | --- |
| `VITE_GEMINI_API_KEY` | only for AI chat | Free key from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `VITE_GEMINI_MODEL` | no | Defaults to `gemini-flash-latest` |

Everything else works without a `.env` file. The Firebase and Supabase keys in
`src/firebase/config.js` and `src/utils/supabase.js` are public client keys by
design - what people can actually read or write is decided by `firestore.rules`
and the Supabase bucket policies.

> The Gemini key ends up in the browser bundle, like any `VITE_` variable. Restrict it to
> your site's domain in the Google Cloud console (API key -> Application restrictions ->
> Websites) so nobody can reuse it somewhere else.

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint, fails on any warning |
| `npm run format` | Prettier over `src/` |

## Firebase setup

1. **Auth** - enable Email/Password, Google and GitHub under Authentication -> Sign-in method.
   Add your deployed domain under Authentication -> Settings -> Authorized domains.
2. **Password reset link** - in Authentication -> Templates -> Password reset, set the action
   URL to `https://<your-domain>/reset-password` so the link opens our own reset page.
3. **Security rules** - deploy the rules from this repo:

   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules
   ```

   No composite indexes are needed, every query was written to work with Firestore's
   automatic single-field indexes.

## Supabase setup

Create a **public** bucket called `chat-attachments` and add a storage policy that lets
the `anon` role insert and delete objects in it. Files are saved as:

```
images/…    photos sent in chat
voice/…     voice notes
attachments/…   everything else
profiles/…  profile pictures
```

## The admin panel

Open `/admin`. It starts with a login screen and there are two ways in:

**Admin accounts** - `itsfehan@gmail.com` and `business.ehansiddique@gmail.com` (`ADMIN_EMAILS`
in `src/constants.js`). The email has to be verified: Google sign-in is verified automatically,
email/password accounts get a "Send email" button on the admin page. Admins can edit profiles,
suspend accounts (they get a suspended screen on their next load), work through reports, remove
reported messages and send announcements.

**Guest login** - the credentials are shown right on the login screen
(`GUEST_EMAIL` / `GUEST_PASSWORD` in `src/constants.js`). The guest sees the live dashboard,
users and reports, but every button just says "You're logged in as guest, you can't edit or take
action". Emails are partly hidden and the message counts stay admin only, since counting them
needs access to private chats. The first guest login creates the Firebase account on its own, so
there's nothing to set up besides having Email/Password sign-in enabled.

The same checks are in `firestore.rules` (`isAdmin()` and `isGuest()`), so the lock isn't just
the UI: the guest account can't write anything anywhere. If you change any of these emails,
change them in both places and redeploy the rules.

Normal users don't get an admin button in the app, only admin accounts see it in the sidebar.

**Overview** - every number is real. Users, online now, active today, sign-ups, friendships,
reports and suspensions come straight from the live users and reports data. Messages and
conversations use Firestore count queries; the admin's browser re-counts every few minutes and
saves the result to `appConfig/stats`, which is what the guest login reads.

**Reports** - when someone reports a user they either pick one of that person's messages as proof
(it shows up in the report and the admin can remove it), or report the whole account by its ID.
Settings also has a "Report a user" box to find someone by their 4 digit ID, for people you don't
have a chat with.

**Announcements** - a title and a message. It drops in like a phone notification (swipe it up to
dismiss) and each person sees it once: the version they've seen is saved on their profile as
`seenAnnouncement`, so it doesn't come back on another device either. Changing the wording sends
it again as a new announcement.

---

## Developer guide

This part is for whoever works on the code next. It should be enough to find your way
around without reading every file.

### Folder structure

```
src/
  App.jsx                  routes + auth listener, dashboard and admin are lazy loaded
  constants.js             app wide settings (admin emails, guest login, limits)
  developer.js             my details, used on the login pages and for seo
  index.css                tailwind + shared classes (.btn-primary, .input-field, .card) + logo css
  components/
    brand/Logo.jsx         the logo, pure html/css
    common/                Modal, ConfirmDialog, Toggle, SplashScreen, Markdown
    auth/                  login, register (3 steps), social login, password reset
    chat/
      ChatDashboard.jsx    the brain of the chat screen, owns all listeners
      Sidebar.jsx          chat list
      ChatArea.jsx         one conversation (header, list, input, dialogs)
      MessageList.jsx      bubbles, date separators, reactions, scroll handling
      MessageActions.jsx   hover toolbar on a bubble (react / copy / edit / delete / report)
      MessageInput.jsx     text box, attachments, emoji picker, voice button
      VoiceRecorder.jsx    recording bar that replaces the input while recording
      message/             modals + the voice note player
      call/                call screen and incoming call modal
      add_friend/          the friends panel (discover, friends, requests, sent)
      ai/                  ChatLoop AI chat
    admin/                 admin login, dashboard sections
    about/                 the "built by" card and links on the login pages
  firebase/                everything that talks to Firestore, one file per area
  service/                 presence (online/away/offline) and the WebRTC session
  hooks/                   useLiveProfiles, useAdminData, media query helpers
  utils/                   dates, status text, avatars, sounds, supabase uploads
```

Rule of thumb: **components never import from `firebase/firestore` directly** (the one
exception is `SearchTab`, which reads the users collection once). If you need a new read or
write, add a function to the matching file in `src/firebase/` and call that.

### Firestore data model

| Path | What's in it |
| --- | --- |
| `users/{uid}` | profile, `friends: [uid]`, `status`, `lastSeen`, `showActiveStatus`, `banned` |
| `friendRequests/{senderId}_{receiverId}` | `senderId`, `receiverId`, `status` (pending / accepted / declined / cancelled / removed) |
| `chats/{uidA}_{uidB}` | `participants`, `lastMessage`, `lastMessageTime`, `lastMessageSender`, `unreadCounts: { uid: n }` |
| `messages/{chatId}/messages/{id}` | `text`, `senderId`, `timestamp`, `read`, `attachments`, `reactions: { uid: emoji }`, `edited`, `deleted`, `type: "call"` |
| `typing/{chatId}` | `{ uid: true/false }` |
| `calls/{callId}` + `signals/` | call state and the WebRTC offer/answer/ice messages |
| `aiChats/{uid}/messages/{id}` | `role` (user / model), `text` |
| `reports/{id}` | message or user reports for the admin panel |
| `appConfig/announcement` | `title`, `text`, `active` |
| `appConfig/stats` | message and conversation counts saved by the admin panel |

Chat ids are just both uids sorted and joined with `_`, so you can always work out the id
of a conversation without a query (`chatIdFor()` in `firestoreService.js`).

### How the main flows work

**Sending a message.** `sendMessage()` writes the message and updates the chat doc in one
batch: last message preview, time, sender and `unreadCounts.<receiver> + 1`. Because it's one
batch, the sidebar can't show a preview for a message that failed. Firestore shows the write
locally straight away, so the bubble appears instantly with a small clock icon until the
server confirms it.

**Unread counts and sounds.** The dashboard listens to the chat docs only, not to every
conversation's messages. When a chat's `lastMessageTime` moves forward and the sender isn't
you, it plays the sound (and a desktop notification if the tab is in the background). The
first snapshot after loading is skipped, so opening the app doesn't replay old messages.
Opening a chat marks the loaded messages as read and resets your counter in the same batch.

**Profiles and online status.** `useLiveProfiles(ids)` keeps one snapshot listener per person
in your chat list and adds or removes listeners as the list changes. `resolvePresence()`
turns a user doc into what others should see: it respects the "show when I'm online"
setting, and treats an `online` status older than five minutes as offline (a tab that was
killed never sends its offline write). `service/userStatus.js` sends a heartbeat every two
minutes and switches to `away` when the tab is hidden.

**Messages are paged.** Only the latest 100 messages of the open chat are live. "Load earlier
messages" raises the limit and `MessageList` keeps your scroll position.

**Reactions.** Stored as `{ [uid]: emoji }` on the message, so everyone gets one reaction.
Picking the same emoji again removes it. `getGroupedReactions()` turns that into chips.

**Voice notes.** `VoiceRecorder` picks a format the browser supports (webm/opus, or mp4 on
Safari), samples the mic level while recording, and saves 28 waveform values with the file.
The length is saved too, because Chrome reports `Infinity` for recorded webm files.

**Calls.** `callService` owns the call document (`calling -> active -> ended`, or `missed` /
`rejected`). Final states go through a transaction so if both people hang up at once only
one "call ended" message is written. `createCallSession()` in `service/webrtcService.js`
owns the peer connection for one call: local media, ICE candidates, offer/answer over the
`signals` subcollection (each side ignores its own signals), mute/camera/screen share, and
`close()` to clean it all up. Incoming calls are listened for at the dashboard level, so the
phone rings whichever chat you have open.

> Calls use Google's public STUN server and the free Open Relay TURN server. For something
> production grade, swap in your own TURN server in `ICE_SERVERS`.

**Friends.** `users.friends` is the source of truth. Accepting a request updates the request
and both friend lists in one batch. Removing a friend clears both lists and marks the old
request as `removed`. The rules only let you add or remove *your own* uid in someone else's
list.

**AI chat.** `aiChatService.js` calls the Gemini REST endpoint with `fetch` (no SDK). It
sends the last 20 messages as context with a short system prompt. Errors (rate limit, bad
key, network) are saved as a reply, so the conversation explains what went wrong.
`Markdown.jsx` renders the replies without `dangerouslySetInnerHTML`.

### Styling

Tailwind everywhere. The shared pieces (`.btn-primary`, `.btn-secondary`, `.btn-danger`,
`.icon-btn`, `.input-field`, `.card`, `.thin-scroll`) live in `index.css` under
`@layer components`, so the auth pages, chat and admin panel all look the same. Brand colors
are Tailwind's indigo-500 to violet-600. Please reuse those classes before adding new
one-off styles.

### Code style

- Prettier (`npm run format`) with a 100 character line, ESLint must pass with zero warnings.
- Short comments above functions that aren't obvious, written as plain notes. No comment
  banners, no commented-out code.
- Components are function components with hooks. Anything that talks to Firebase lives in
  `src/firebase/`.
- User facing errors go through `react-hot-toast`, not `alert()`.

### Adding something new, a checklist

1. Data first: add the read/write function in `src/firebase/`.
2. If it's a new collection or a new field someone else writes, update `firestore.rules`.
3. Build the UI from the shared classes and `common/` components.
4. `npm run lint` and `npm run build` before pushing.

## Deploying

It's a static site, so Vercel, Netlify or Firebase Hosting all work. The app uses client-side
routes (`/auth`, `/admin`, `/reset-password`), so the host has to send every path to
`index.html`. `vercel.json` and the `hosting` block in `firebase.json` already do that.

```bash
npm run build
firebase deploy --only hosting    # or push to a Vercel project
```

Remember to set `VITE_GEMINI_API_KEY` in the host's environment settings too.

## Known limitations

- Only one-to-one chats for now, no groups.
- Search loads the user list once and filters in the browser. That's fine for a few thousand
  users, beyond that it should move to a proper search index.
- The public TURN server is fine for demos but not something to rely on.

---

## About me

I'm **Ehan Siddique**, a full-stack web developer. I designed and built ChatLoop on my own as a
personal project, from the chat and calls to the AI helper and the admin panel.

- Website: [ehansiddique.com](https://www.ehansiddique.com)
- LinkedIn: [linkedin.com/in/ehan-siddique-0742aa34b](https://www.linkedin.com/in/ehan-siddique-0742aa34b/)
- GitHub: [github.com/Fehan999](https://github.com/Fehan999)

<p align="center">Designed & developed by <a href="https://www.ehansiddique.com">Ehan Siddique</a></p>
