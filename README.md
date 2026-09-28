<p align="center">
  <img src="public/favicon.svg" alt="ChatLoop logo" width="84" height="84" />
</p>

<h1 align="center">ChatLoop</h1>

<p align="center">
  A real-time chat app with friends, voice notes, audio/video calls, an AI assistant and a full
  admin panel.<br />
  Designed and built by <a href="https://www.ehansiddique.com">Ehan Siddique</a>.
</p>

<p align="center">
  <a href="https://www.ehansiddique.com">Website</a> ·
  <a href="https://www.linkedin.com/in/ehan-siddique-0742aa34b/">LinkedIn</a> ·
  <a href="https://github.com/Fehan999">GitHub</a>
</p>

---

## About the project

I built ChatLoop on my own as a personal project, to see what it takes to make a chat app
that feels like the ones people use every day: messages that show up instantly, read
receipts, voice notes, calls that work on a phone, and the moderation side that nobody sees
but every real product needs.

It's a React single page app on top of Firebase (auth + Firestore), with Supabase storage for
files, WebRTC for calls and Google's Gemini API for the assistant. There's no custom backend,
so a lot of the interesting work is in the Firestore data model and the security rules.

If you just want to look around, open `/admin` and use the **guest login** shown on the
page. It shows the real dashboard in read-only mode.

## Features

**Chat**
- One-to-one chat with read receipts, typing indicator, edit/delete and date separators
- Reactions (one per person, double-click a message for ❤️)
- Voice notes with a real waveform, photos and files (drag and drop or paste a screenshot)
- Messages are paged, only the latest 100 are live and older ones load when you scroll up
- Unread badges, a sound for new messages, unread count in the tab title and optional
  desktop notifications

**Calls**
- Audio and video calls over WebRTC with mute, camera toggle and screen share
- The call screen opens the moment you tap, ringing, missed and declined calls show up
  in the chat, and a dropped connection tries to reconnect before giving up

**People**
- Friends: search by name, username or a 4-digit ID, send, accept, decline and remove
- Online / away / last seen, with a privacy switch to hide it
- Report a message, report a user (with one of their messages as proof), or report an
  account by its ID from Settings

**ChatLoop AI**
- A Gemini assistant pinned at the top of the chat list, with its own history per user
  and a lighter fallback model when the main one is busy

**Admin panel** (`/admin`)
- Live overview: users, online now, active today, sign-ups per day, messages,
  conversations, friendships, reports and suspensions
- Users: search, edit profiles, suspend and unsuspend
- Reports: resolve, dismiss, remove the reported message, suspend the user
- Announcements that pop up like a phone notification, once per person
- A read-only guest login so anyone can see the real dashboard without being able to
  change anything

## Tech stack

| Part | What I used |
| --- | --- |
| UI | React 18, Vite, Tailwind CSS, Framer Motion, react-icons |
| Routing | React Router 7, the dashboard and admin panel are lazy loaded |
| Auth | Firebase Auth (email/password, Google, GitHub) |
| Data | Cloud Firestore with real-time listeners and security rules |
| Files | Supabase Storage |
| Calls | WebRTC, Firestore is used for the signalling |
| AI | Google Gemini API over plain `fetch` |
| Hosting | Vercel (Firebase Hosting config is included too) |

## Getting started

You need Node 18 or newer.

```bash
git clone https://github.com/Fehan999/Chat-Loop.git
cd Chat-Loop
npm install
cp .env.example .env    # optional, see below
npm run dev
```

The app runs on http://localhost:5173.

### Environment variables

| Name | Needed? | What it's for |
| --- | --- | --- |
| `VITE_GEMINI_API_KEY` | only for the AI chat | Free key from [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `VITE_GEMINI_MODEL` | no | Defaults to `gemini-flash-latest` |
| `VITE_TURN_URLS`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` | recommended for calls | Your own TURN server so calls connect on mobile data and strict wifi. [Metered](https://www.metered.ca/stun-turn) and Cloudflare both have free tiers |

Everything else works without a `.env` file. The Firebase and Supabase keys in
`src/firebase/config.js` and `src/utils/supabase.js` are public client keys by design. What
people can actually read or write is decided by `firestore.rules` and the Supabase bucket
policies, not by hiding keys.

> `VITE_` variables end up in the browser bundle. Restrict the Gemini key to your domain in
> the Google Cloud console (API key -> Application restrictions -> Websites).

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the production build locally |
| `npm run lint` | ESLint, fails on any warning |
| `npm run format` | Prettier over `src/` |

## Firebase setup

1. **Auth** - enable Email/Password, Google and GitHub under Authentication -> Sign-in
   method, and add your domain under Authentication -> Settings -> Authorized domains.
2. **Password reset link** - in Authentication -> Templates -> Password reset, set the action
   URL to `https://<your-domain>/reset-password` so the link opens the app's own reset page.
3. **Rules and indexes** - deploy both from this repo:

   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules,firestore:indexes
   ```

   There are no composite indexes. `firestore.indexes.json` only switches on the collection
   group index for `messages.senderId`, which the admin message count uses.

## Supabase setup

Create a **public** bucket called `chat-attachments` with a policy that lets the `anon` role
insert and delete objects. Files are stored as:

```
images/…        photos sent in chat
voice/…         voice notes
attachments/…   everything else
profiles/…      profile pictures
```

## The admin panel

`/admin` opens a login screen with two ways in.

**Admin accounts** are the emails in `ADMIN_EMAILS` (`src/constants.js`), and the email has to
be verified. Google sign-in counts as verified, email/password accounts get a "Send email"
button. The same list is in `isAdmin()` in `firestore.rules`, so if you change one, change both.

**Guest login** - the details are printed on the login screen (`GUEST_EMAIL` /
`GUEST_PASSWORD`). The guest sees the live data, but every action just says "You're logged in
as guest, you can't edit or take action", emails are partly hidden, and `isGuest()` in the
rules blocks every write, so this isn't only a UI lock. The first guest login creates the
account by itself.

What the admin can do:

- **Overview** - every number comes from the database. Users, presence, sign-ups,
  friendships, reports and suspensions come from the live listeners. Messages and
  conversations are Firestore count queries (no documents are downloaded), re-counted every
  five minutes and saved to `appConfig/stats` so the guest can see them without reading any
  chat. AI chat messages are counted separately from messages between people.
- **Users** - edit name, bio and location, suspend with a reason, unsuspend.
- **Suspending** - the person gets a "suspended" screen. Their friends still see them in the
  chat list marked "Account suspended" and can't message or call them. The rules block that
  as well.
- **Reports** - a report can point at a message (shown in the card, can be removed) or at a
  whole account by ID.
- **Announcements** - a title and a message that drops in like a phone notification. Each
  person sees it once: the version they've seen is saved on their profile, so it doesn't come
  back on another device. Changing the wording sends it again.

---

## Developer guide

Notes for whoever works on this next (including future me). It should be enough to find
your way around without reading every file.

### Folder structure

```
src/
  App.jsx                 routes and the auth listener, dashboard + admin are lazy loaded
  constants.js            admin emails, guest login, limits, page sizes
  developer.js            my details, used on the login pages
  index.css               tailwind, shared classes (.btn-primary, .input-field, .card), logo css
  components/
    about/                "built by" strip and links on the login pages
    admin/                admin login, overview, users, reports, announcements, sign-ups chart
    auth/                 login, 3-step register, social login, password reset
    brand/Logo.jsx        the logo, pure html/css
    common/               Modal, ConfirmDialog, Toggle, SplashScreen, Markdown
    chat/
      ChatDashboard.jsx   the chat screen's brain, owns all the listeners
      Sidebar.jsx         chat list
      ChatArea.jsx        one conversation: header, messages, input, dialogs
      MessageList.jsx     bubbles, date separators, reactions, scroll handling
      MessageActions.jsx  the toolbar on a bubble (react, copy, edit, delete, report)
      MessageInput.jsx    text box, attachments, emoji picker, voice button
      VoiceRecorder.jsx   recording bar that replaces the input while recording
      AnnouncementPopup   the admin announcement notification
      ReportUserModal     report a user with a message, or by account ID
      SettingsPanel.jsx   profile, privacy, notifications, report by ID, password
      message/            modals and the voice note player
      call/               call screen and incoming call modal
      add_friend/         friends panel: discover, friends, requests, sent
      ai/                 ChatLoop AI chat
  firebase/               everything that talks to Firestore, one file per area
  service/                presence (online/away/offline) and the WebRTC call session
  hooks/                  live profiles, admin data, media queries, page titles
  utils/                  dates, status text, avatars, sounds, uploads
```

Rule of thumb: **components don't import from `firebase/firestore` directly.** If you need a
new read or write, add a function to the matching file in `src/firebase/` and call that.

### Firestore data model

| Path | What's in it |
| --- | --- |
| `users/{uid}` | profile, `friends: [uid]`, `status`, `lastSeen`, `showActiveStatus`, `banned`, `banReason`, `seenAnnouncement` |
| `friendRequests/{senderId}_{receiverId}` | `senderId`, `receiverId`, `status` (pending / accepted / declined / cancelled / removed) |
| `chats/{uidA}_{uidB}` | `participants`, `lastMessage`, `lastMessageTime`, `lastMessageSender`, `unreadCounts: { uid: n }` |
| `messages/{chatId}/messages/{id}` | `text`, `senderId`, `timestamp`, `read`, `attachments`, `reactions: { uid: emoji }`, `edited`, `deleted`, `type: "call"` |
| `typing/{chatId}` | `{ uid: true/false }` |
| `calls/{callId}` + `signals/` | call state, and the WebRTC offer / answer / ICE messages |
| `aiChats/{uid}/messages/{id}` | `role` (user / model), `text` |
| `reports/{id}` | `type`, `reason`, `reportedUserId`, `reportedBy`, optional `chatId` + `messageId` + `messageText` |
| `appConfig/announcement` | `title`, `text`, `active` |
| `appConfig/stats` | message and conversation counts saved by the admin panel |

A chat id is both uids sorted and joined with `_`, so you can always work out a
conversation's id without a query (`chatIdFor()` in `firestoreService.js`).

### How the main flows work

**Sending a message.** `sendMessage()` writes the message and updates the chat doc in one
batch: preview text, time, sender and `unreadCounts.<receiver> + 1`. Because it's one batch
the sidebar can't show a preview for a message that failed. Firestore applies the write
locally first, so the bubble shows instantly with a small clock until the server confirms.

**Unread counts and sounds.** The dashboard listens to chat docs, not to every conversation's
messages. When a chat's `lastMessageTime` moves forward and the sender isn't you, it plays
the sound (and a desktop notification if the tab is in the background). The first snapshot
after loading is skipped so opening the app doesn't replay old messages.

**Presence.** `service/userStatus.js` writes `online`, switches to `away` when the tab is
hidden and sends a heartbeat every two minutes. `resolvePresence()` treats an `online` older
than five minutes as offline (a killed tab never sends its offline write) and respects the
"show when I'm online" switch. `useLiveProfiles(ids)` keeps one listener per person in your
chat list.

**Friends.** `users.friends` is the source of truth. Accepting a request updates the request
and both friend lists in one batch. The rules only let you add or remove *your own* uid in
someone else's list.

**Calls.** `callService` owns the call document (`calling -> active -> ended`, or `missed` /
`rejected`). Final states go through a transaction so if both people hang up at once only
one "call ended" message is written. The call id is made on the client, so the call screen
opens immediately while the doc is written in the background, and hanging up waits for that
write so the other phone never keeps ringing. `createCallSession()` in
`service/webrtcService.js` owns the peer connection: local media, ICE candidates, offer and
answer over the `signals` subcollection, mute / camera / screen share, one ICE restart when
the network changes, and `close()` to clean everything up.

**Suspensions.** `banned` on the user doc. The banned person gets `BannedScreen`, friends see
"Account suspended" and lose the input and call buttons, and the rules refuse messages,
calls and friend requests to or from a banned account.

**Reports.** Message reports come from a bubble's menu. User reports either attach one of
that person's messages or report the account by its ID, and Settings has a search by ID for
people you don't have a chat with.

**Announcements.** `AnnouncementPopup` shows the announcement once. Its version is a short
hash of the title and text (`utils/announcement.js`), saved to `localStorage` and to
`users/{uid}.seenAnnouncement` the moment it appears.

**AI chat.** `aiChatService.js` calls the Gemini REST API with `fetch`, sends the last 20
messages as context and falls back to the lite model when the main one is overloaded. Errors
are saved as a reply so the conversation explains what went wrong. `Markdown.jsx` renders
replies without `dangerouslySetInnerHTML`.

### Security model

There's no server, so `firestore.rules` is the backend. The main ideas:

- you can only write your own profile, and never the `banned` fields
- chats and messages are only readable by the two participants
- admins are checked by verified email (`isAdmin()`), the guest login can read the admin
  data but can't write anything (`isGuest()`)
- banned accounts can't create messages, calls or friend requests, and can't be reached

The UI checks in `adminService.js` only decide what to show. If a rule and the UI disagree,
the rule wins.

### Styling

Tailwind everywhere. The shared pieces (`.btn-primary`, `.btn-secondary`, `.btn-danger`,
`.icon-btn`, `.input-field`, `.card`, `.thin-scroll`) live in `index.css`, so the auth pages,
chat and admin panel look the same. Brand colors are indigo-500 to violet-600. On phones
every input is 16px so iOS Safari doesn't zoom in when a field is focused.

### Code style

- Prettier (`npm run format`) with a 100 character line, ESLint must pass with zero warnings
- short comments above anything that isn't obvious, written as plain notes
- function components with hooks, anything that talks to Firebase lives in `src/firebase/`
- user facing errors go through `react-hot-toast`, never `alert()`

### Adding something new

1. Data first: add the read/write function in `src/firebase/`.
2. If it's a new collection, or a field someone else writes, update `firestore.rules`.
3. Build the UI from the shared classes and the `common/` components.
4. `npm run lint` and `npm run build` before pushing.

## Deploying

It's a static site, so Vercel, Netlify or Firebase Hosting all work. The app uses client-side
routes (`/auth`, `/admin`, `/reset-password`), so every path has to be sent to `index.html`.
`vercel.json` and the `hosting` block in `firebase.json` already do that.

```bash
npm run build
firebase deploy --only hosting    # or push to a Vercel project
```

Set the `VITE_` variables in the host's environment settings as well.

## Known limitations

- One-to-one chats only, no groups yet.
- Friend search loads the user list once and filters in the browser. Fine for a few
  thousand users, after that it should move to a search index.
- Without your own TURN server some calls between different networks won't connect.

## About me

I'm **Ehan Siddique**, a full-stack web developer. ChatLoop is one of my personal projects,
designed and built end to end by me. If you'd like to talk about it, or about work, you can
find me here:

- Website: [ehansiddique.com](https://www.ehansiddique.com)
- LinkedIn: [linkedin.com/in/ehan-siddique-0742aa34b](https://www.linkedin.com/in/ehan-siddique-0742aa34b/)
- GitHub: [github.com/Fehan999](https://github.com/Fehan999)

<p align="center">Designed & developed by <a href="https://www.ehansiddique.com">Ehan Siddique</a></p>
