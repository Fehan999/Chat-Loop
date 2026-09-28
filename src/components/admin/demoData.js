// made up data for the public admin demo. seeded, so every visitor sees the
// same numbers, and dates are relative to today so the charts never look stale

const FIRST_NAMES = [
  "Aarav",
  "Maya",
  "Liam",
  "Sara",
  "Omar",
  "Chloe",
  "Ibrahim",
  "Nina",
  "Lucas",
  "Ayesha",
  "Daniel",
  "Zara",
  "Mateo",
  "Hana",
  "Noah",
  "Fatima",
  "Ethan",
  "Leila",
  "Arjun",
  "Emma",
  "Yusuf",
  "Sofia",
  "Ryan",
  "Amira",
  "Kenji",
  "Olivia",
  "Hamza",
  "Priya",
  "Leo",
  "Mina",
];

const LAST_NAMES = [
  "Khan",
  "Patel",
  "Rahman",
  "Silva",
  "Nguyen",
  "Garcia",
  "Ahmed",
  "Kim",
  "Costa",
  "Ali",
  "Hughes",
  "Rossi",
  "Chowdhury",
  "Tanaka",
  "Ibrahim",
  "Novak",
  "Hassan",
  "Singh",
  "Lopez",
  "Ward",
];

const CITIES = [
  "Dhaka",
  "London",
  "Toronto",
  "Dubai",
  "Berlin",
  "Lagos",
  "Sydney",
  "Karachi",
  "Lisbon",
  "",
];

const BIOS = [
  "coffee first, questions later",
  "design student, cat person",
  "always down for a game night",
  "learning to code one bug at a time",
  "",
  "football > everything",
  "",
  "photographer on weekends",
];

const REASONS = [
  "Spam or scam",
  "Harassment or bullying",
  "Fake account",
  "Inappropriate content",
  "Spam or misleading",
];

const MESSAGE_SNIPPETS = [
  "click this link to claim your free gift card!!",
  "you're so annoying honestly, just leave",
  "send me your number and I'll add you to the group",
  "buy followers cheap, dm me",
];

// small deterministic random so the demo doesn't change on every refresh
const seeded = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const DAY = 24 * 60 * 60 * 1000;

const buildUsers = (random, now) =>
  Array.from({ length: 186 }, (_, i) => {
    const first = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)];
    const name = `${first} ${last}`;
    const uniqueId = String(1000 + Math.floor(random() * 9000));
    // skewed towards recent days so the signup chart has a bit of life
    const daysAgo = Math.floor(Math.pow(random(), 1.8) * 160);
    const roll = random();
    const status = roll < 0.18 ? "online" : roll < 0.26 ? "away" : "offline";

    return {
      id: `demo-${i + 1}`,
      name,
      email: `${first}.${last}${i}@example.com`.toLowerCase(),
      username: `@${first}${last}_${uniqueId}`.toLowerCase(),
      uniqueId,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&bold=true`,
      bio: BIOS[Math.floor(random() * BIOS.length)],
      location: CITIES[Math.floor(random() * CITIES.length)],
      status,
      friends: Array.from({ length: Math.floor(random() * 24) }, (_, f) => `demo-${f}`),
      createdAt: new Date(now - daysAgo * DAY - Math.floor(random() * DAY)),
      lastSeen: new Date(now - (status === "offline" ? Math.floor(random() * 6 * DAY) : 30000)),
      banned: i === 7 || i === 41,
      banReason: i === 7 || i === 41 ? "Repeated spam" : "",
    };
  });

const buildReports = (random, now, users) =>
  Array.from({ length: 9 }, (_, i) => {
    const reported = users[Math.floor(random() * users.length)];
    const reporter = users[Math.floor(random() * users.length)];
    const isMessage = random() > 0.4;
    const status = i < 4 ? "pending" : i < 7 ? "resolved" : "dismissed";

    return {
      id: `demo-report-${i + 1}`,
      type: isMessage ? "message" : "user",
      reason: REASONS[Math.floor(random() * REASONS.length)],
      reportedUserId: reported.id,
      reportedUserName: reported.name,
      reportedBy: reporter.id,
      messageText: isMessage
        ? MESSAGE_SNIPPETS[Math.floor(random() * MESSAGE_SNIPPETS.length)]
        : "",
      status,
      createdAt: new Date(now - i * 0.7 * DAY - Math.floor((random() * DAY) / 2)),
    };
  });

export const buildDemoData = () => {
  const random = seeded(20240518);
  const now = Date.now();
  const users = buildUsers(random, now);
  const reports = buildReports(random, now, users);

  return {
    users,
    reports,
    counts: { conversations: 612, messages: 18934 },
    announcement: {
      text: "Voice notes now show a real waveform. Update your app if they look flat.",
      active: true,
    },
  };
};
