export type Profile = {
  user: { id: string; username: string; firstName: string; referralCode: string; walletAddress?: string };
  stats: Stats;
  disclaimer: string;
};

export type Stats = {
  level: number;
  xp: number;
  energy: number;
  memePoints: number;
  dailyPoints: number;
  totalScore: number;
  bestScore: number;
  totalRuns: number;
};

export type Task = {
  id: string;
  code: string;
  title: string;
  rewardPoints: number;
  claimed: boolean;
  claimable: boolean;
};

type ReferralResponse = {
  inviteLink: string;
  referralCode: string;
  referrals: Array<{ pointsEarned: number; invited: { username: string } }>;
  totalBonus: number;
};

type LeaderboardResponse = {
  rows: Array<{ rank: number; user: { username: string; firstName: string }; score: number; bestScore: number }>;
};

const API_BASE = import.meta.env.VITE_API_BASE || "";
const TOKEN_KEY = "catchy_token";
const PROFILE_KEY = "catchy_mock_profile";
const TASKS_KEY = "catchy_mock_tasks";
const DISCLAIMER =
  "Catchy Points are in-app activity points. They are not tokens or money, but they will be a major factor in calculating future rewards if rewards are announced.";

let token = localStorage.getItem(TOKEN_KEY) || "";

class ApiHttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const defaultStats: Stats = {
  level: 1,
  xp: 0,
  energy: 5,
  memePoints: 0,
  dailyPoints: 0,
  totalScore: 0,
  bestScore: 0,
  totalRuns: 0
};

const defaultTasks: Task[] = [
  { id: "join-channel", code: "join", title: "Daily Check-in", rewardPoints: 80, claimed: false, claimable: true },
  { id: "play-three", code: "runs", title: "Play 3 runs", rewardPoints: 120, claimed: false, claimable: false },
  { id: "invite-friend", code: "invite", title: "Invite a friend", rewardPoints: 150, claimed: false, claimable: false },
  { id: "meme-contest", code: "meme", title: "Post a CATCHY meme", rewardPoints: 200, claimed: false, claimable: true }
];

function makeProfile(): Profile {
  const fallbackId = localStorage.getItem("catchy_mock_id") || "100001";
  localStorage.setItem("catchy_mock_id", fallbackId);
  return {
    user: {
      id: fallbackId,
      username: "blue_runner",
      firstName: "Catchy",
      referralCode: `CATCHY${fallbackId}`
    },
    stats: defaultStats,
    disclaimer: DISCLAIMER
  };
}

function getMockProfile(): Profile {
  const saved = localStorage.getItem(PROFILE_KEY);
  return saved ? (JSON.parse(saved) as Profile) : makeProfile();
}

function setMockProfile(profile: Profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function getMockTasks(): Task[] {
  const saved = localStorage.getItem(TASKS_KEY);
  return saved ? (JSON.parse(saved) as Task[]) : defaultTasks;
}

function setMockTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

async function requestApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiHttpError(body.error || "API request failed", response.status);
  return body as T;
}

async function fallbackOnOffline<T>(apiCall: () => Promise<T>, mockCall: () => T | Promise<T>): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (error instanceof ApiHttpError) throw error;
    return mockCall();
  }
}

function updatePlayTask() {
  const tasks = getMockTasks().map((task) => {
    if (task.id !== "play-three" || task.claimed) return task;
    const current = Number(localStorage.getItem("catchy_mock_runs_today") || "0") + 1;
    localStorage.setItem("catchy_mock_runs_today", String(current));
    return { ...task, claimable: current >= 3 };
  });
  setMockTasks(tasks);
}

export const api = {
  async login() {
    return fallbackOnOffline(
      async () => {
        const tg = window.Telegram?.WebApp;
        tg?.ready?.();
        const user = tg?.initDataUnsafe?.user;
        const startParam = tg?.initDataUnsafe?.start_param;
        const fallbackId =
          localStorage.getItem("catchy_mock_id") || String(Math.floor(100000 + Math.random() * 900000));
        localStorage.setItem("catchy_mock_id", fallbackId);
        const res = await requestApi<{ token: string; user: Profile["user"] }>("/api/auth/telegram", {
          method: "POST",
          body: JSON.stringify({
            mode: user ? "telegram" : "mock",
            initData: tg?.initData || "",
            telegramId: user?.id || fallbackId,
            username: user?.username || "blue_runner",
            firstName: user?.first_name || "Catchy",
            startParam
          })
        });
        token = res.token;
        localStorage.setItem(TOKEN_KEY, token);
        return res;
      },
      () => {
        const profile = getMockProfile();
        setMockProfile(profile);
        token = "mock-session";
        localStorage.setItem(TOKEN_KEY, token);
        return { token, user: profile.user };
      }
    );
  },

  profile: () => fallbackOnOffline(() => requestApi<Profile>("/api/profile"), getMockProfile),

  config: () =>
    fallbackOnOffline(() => requestApi<Record<string, unknown>>("/api/economy/config"), () => ({
      energyCap: 5,
      energyRegenMinutes: 30,
      runDurationSeconds: 30,
      maxScorePerRun: 50000,
      maxMemePointsPerDay: 1000
    })),

  startRun: () =>
    fallbackOnOffline(
      () =>
        requestApi<{ runId: string; durationSeconds: number; maxScore: number; energy: number }>("/api/run/start", {
          method: "POST",
          body: "{}"
        }),
      () => {
        const profile = getMockProfile();
        if (profile.stats.energy <= 0) throw new Error("Energy Empty");
        const next = { ...profile, stats: { ...profile.stats, energy: profile.stats.energy - 1 } };
        setMockProfile(next);
        return { runId: `mock-${Date.now()}`, durationSeconds: 30, maxScore: 50000, energy: next.stats.energy };
      }
    ),

  finishRun: (runId: string, score: number, durationSeconds: number) =>
    fallbackOnOffline(
      () =>
        requestApi<{ pointsEarned: number; stats: Stats }>("/api/run/finish", {
          method: "POST",
          body: JSON.stringify({ runId, score, durationSeconds })
        }),
      () => {
        const profile = getMockProfile();
        const safeScore = Math.min(Math.max(Math.round(score), 0), 50000);
        const pointsEarned = Math.max(0, Math.min(Math.floor(safeScore / 250), 1000 - profile.stats.dailyPoints));
        const xp = profile.stats.xp + Math.floor(safeScore / 600);
        const stats: Stats = {
          ...profile.stats,
          xp,
          level: Math.max(1, 1 + Math.floor(xp / 100)),
          memePoints: profile.stats.memePoints + pointsEarned,
          dailyPoints: profile.stats.dailyPoints + pointsEarned,
          totalScore: profile.stats.totalScore + safeScore,
          bestScore: Math.max(profile.stats.bestScore, safeScore),
          totalRuns: profile.stats.totalRuns + 1
        };
        setMockProfile({ ...profile, stats });
        updatePlayTask();
        return { pointsEarned, stats };
      }
    ),

  tasks: () => fallbackOnOffline(() => requestApi<{ tasks: Task[] }>("/api/tasks"), () => ({ tasks: getMockTasks() })),

  claimTask: (taskId: string) =>
    fallbackOnOffline(
      () =>
        requestApi<{ pointsEarned: number; stats: Stats }>("/api/tasks/claim", {
          method: "POST",
          body: JSON.stringify({ taskId })
        }),
      () => {
        const tasks = getMockTasks();
        const task = tasks.find((item) => item.id === taskId);
        if (!task || task.claimed || !task.claimable) throw new Error("Task is not claimable yet");
        const profile = getMockProfile();
        const pointsEarned = Math.max(0, Math.min(task.rewardPoints, 1000 - profile.stats.dailyPoints));
        const stats = {
          ...profile.stats,
          memePoints: profile.stats.memePoints + pointsEarned,
          dailyPoints: profile.stats.dailyPoints + pointsEarned
        };
        setMockProfile({ ...profile, stats });
        setMockTasks(tasks.map((item) => (item.id === taskId ? { ...item, claimed: true, claimable: false } : item)));
        return { pointsEarned, stats };
      }
    ),

  bindWallet: (address: string) =>
    requestApi<{ user: Profile["user"] }>("/api/wallet/bind", {
      method: "POST",
      body: JSON.stringify({ address })
    }),

  referrals: () =>
    fallbackOnOffline(() => requestApi<ReferralResponse>("/api/referrals"), () => {
      const profile = getMockProfile();
      return {
        inviteLink: `https://t.me/Catchymemeforton_bot?startapp=${profile.user.referralCode}`,
        referralCode: profile.user.referralCode,
        totalBonus: 24,
        referrals: [
          { pointsEarned: 24, invited: { username: "aqua_ace" } },
          { pointsEarned: 0, invited: { username: "first_run_soon" } }
        ]
      };
    }),

  leaderboard: (type: string) =>
    fallbackOnOffline(() => requestApi<LeaderboardResponse>(`/api/leaderboard?type=${type}`), () => {
      const profile = getMockProfile();
      const rows: LeaderboardResponse["rows"] = [
        { rank: 1, user: { username: "aqua_ace", firstName: "Aqua" }, score: 48600, bestScore: 48600 },
        { rank: 2, user: profile.user, score: Math.max(37200, profile.stats.bestScore), bestScore: profile.stats.bestScore },
        { rank: 3, user: { username: "pixel_ton", firstName: "Pixel" }, score: 34550, bestScore: 34550 },
        { rank: 4, user: { username: "moon_tapper", firstName: "Moon" }, score: 29820, bestScore: 29820 }
      ]
        .sort((a, b) => b.score - a.score)
        .map((row, index) => ({ ...row, rank: index + 1 }));
      return { rows };
    })
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        initData?: string;
        initDataUnsafe?: { start_param?: string; user?: { id: number; username?: string; first_name?: string } };
      };
    };
  }
}
