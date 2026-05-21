import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { nanoid } from "nanoid";
import { ECONOMY } from "./economy.js";

export type User = {
  id: string;
  telegramId: string;
  username: string;
  firstName: string;
  referralCode: string;
  referrerId?: string;
  walletAddress?: string;
  isBanned: boolean;
  isSuspicious: boolean;
  createdAt: string;
};

export type PlayerStats = {
  userId: string;
  level: number;
  xp: number;
  energy: number;
  memePoints: number;
  dailyPoints: number;
  dailyPointsDate: string;
  totalScore: number;
  bestScore: number;
  totalRuns: number;
  lastEnergyAt: string;
};

export type Run = {
  id: string;
  userId: string;
  startedAt: string;
  finishedAt?: string;
  score?: number;
  durationSeconds?: number;
  pointsEarned?: number;
  status: "started" | "finished" | "rejected";
};

export type DailyTask = {
  id: string;
  code: string;
  title: string;
  rewardPoints: number;
  isActive: boolean;
};

export type UserDailyTask = {
  userId: string;
  taskId: string;
  date: string;
  completedAt: string;
};

export type Referral = {
  referrerId: string;
  invitedId: string;
  pointsEarned: number;
  firstValidRunAt?: string;
  createdAt: string;
};

export type EconomyEvent = {
  id: string;
  userId: string;
  type: string;
  amount: number;
  createdAt: string;
};

export type Database = {
  users: User[];
  playerStats: PlayerStats[];
  runs: Run[];
  dailyTasks: DailyTask[];
  userDailyTasks: UserDailyTask[];
  referrals: Referral[];
  economyEvents: EconomyEvent[];
};

const defaultTasks: DailyTask[] = [
  { id: "join-channel", code: "join_channel", title: "Daily Check-in", rewardPoints: 80, isActive: true },
  { id: "join-group", code: "join_group", title: "Enter the blue-speed group", rewardPoints: 80, isActive: true },
  { id: "play-3", code: "play_3_runs", title: "Complete 3 sharp runs", rewardPoints: 120, isActive: true },
  { id: "invite-friend", code: "invite_friend", title: "Bring one real runner", rewardPoints: 150, isActive: true },
  { id: "meme-contest", code: "meme_contest", title: "Drop a CATCHY meme", rewardPoints: 100, isActive: true }
];

const demoUsers: User[] = [
  { id: "demo-orbit", telegramId: "demo-orbit", username: "orbit_degen", firstName: "Orbit", referralCode: "ORBIT", isBanned: false, isSuspicious: false, createdAt: "2026-05-01T09:00:00.000Z" },
  { id: "demo-zap", telegramId: "demo-zap", username: "zap_runner", firstName: "Zap", referralCode: "ZAPZAP", isBanned: false, isSuspicious: false, createdAt: "2026-05-02T09:00:00.000Z" },
  { id: "demo-mint", telegramId: "demo-mint", username: "mint_spark", firstName: "Mint", referralCode: "MINTY", isBanned: false, isSuspicious: false, createdAt: "2026-05-03T09:00:00.000Z" }
];

const demoStats: PlayerStats[] = [
  { userId: "demo-orbit", level: 5, xp: 1960, energy: 5, memePoints: 2280, dailyPoints: 720, dailyPointsDate: dayKey(), totalScore: 428900, bestScore: 38640, totalRuns: 18, lastEnergyAt: new Date().toISOString() },
  { userId: "demo-zap", level: 4, xp: 1280, energy: 4, memePoints: 1720, dailyPoints: 610, dailyPointsDate: dayKey(), totalScore: 312400, bestScore: 33410, totalRuns: 14, lastEnergyAt: new Date().toISOString() },
  { userId: "demo-mint", level: 3, xp: 840, energy: 3, memePoints: 1180, dailyPoints: 450, dailyPointsDate: dayKey(), totalScore: 215100, bestScore: 29580, totalRuns: 9, lastEnergyAt: new Date().toISOString() }
];

export class Store {
  private db: Database;
  private sqlite?: {
    exec: (sql: string) => void;
    prepare: (sql: string) => {
      run: (...args: unknown[]) => void;
      get: (...args: unknown[]) => unknown;
    };
  };

  constructor(private readonly filePath?: string) {
    if (filePath?.endsWith(".sqlite")) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const require = createRequire(import.meta.url);
      const { DatabaseSync } = require("node:sqlite") as { DatabaseSync: new (filename: string) => NonNullable<Store["sqlite"]> };
      this.sqlite = new DatabaseSync(filePath);
      this.sqlite.exec("CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, data TEXT NOT NULL)");
    }
    this.db = this.load();
    this.ensureDemoData();
  }

  reset() {
    this.db = this.fresh();
    this.persist();
  }

  data() {
    return this.db;
  }

  persist() {
    if (!this.filePath) return;
    if (this.sqlite) {
      this.sqlite
        .prepare("INSERT INTO app_state (id, data) VALUES ('main', ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data")
        .run(JSON.stringify(this.db));
      return;
    }
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.db, null, 2));
  }

  findUserById(userId: string) {
    return this.db.users.find((user) => user.id === userId);
  }

  findUserByTelegram(telegramId: string) {
    return this.db.users.find((user) => user.telegramId === telegramId);
  }

  findUserByReferralCode(code?: string) {
    if (!code) return undefined;
    return this.db.users.find((user) => user.referralCode.toLowerCase() === code.toLowerCase());
  }

  statsFor(userId: string, now = new Date()) {
    const stats = this.db.playerStats.find((item) => item.userId === userId);
    if (!stats) throw new Error("Missing player stats");
    this.regenerateEnergy(stats, now);
    this.resetDailyIfNeeded(stats, now);
    return stats;
  }

  createUser(input: { telegramId: string; username?: string; firstName?: string; referrerCode?: string }, now = new Date()) {
    const existing = this.findUserByTelegram(input.telegramId);
    if (existing) return { user: existing, created: false };

    const referrer = this.findUserByReferralCode(input.referrerCode);
    const user: User = {
      id: nanoid(),
      telegramId: input.telegramId,
      username: input.username || `catchy_${input.telegramId}`,
      firstName: input.firstName || "Catchy",
      referralCode: nanoid(8),
      referrerId: referrer?.telegramId === input.telegramId ? undefined : referrer?.id,
      isBanned: false,
      isSuspicious: false,
      createdAt: now.toISOString()
    };
    const stats: PlayerStats = {
      userId: user.id,
      level: 1,
      xp: 0,
      energy: ECONOMY.energyCap,
      memePoints: 0,
      dailyPoints: 0,
      dailyPointsDate: dayKey(now),
      totalScore: 0,
      bestScore: 0,
      totalRuns: 0,
      lastEnergyAt: now.toISOString()
    };
    this.db.users.push(user);
    this.db.playerStats.push(stats);
    if (user.referrerId) {
      this.db.referrals.push({
        referrerId: user.referrerId,
        invitedId: user.id,
        pointsEarned: 0,
        createdAt: now.toISOString()
      });
    }
    this.persist();
    return { user, created: true };
  }

  addEvent(userId: string, type: string, amount: number, now = new Date()) {
    this.db.economyEvents.push({ id: nanoid(), userId, type, amount, createdAt: now.toISOString() });
  }

  addDailyPoints(userId: string, requested: number, type: string, now = new Date()) {
    const stats = this.statsFor(userId, now);
    const remaining = Math.max(0, ECONOMY.maxMemePointsPerDay - stats.dailyPoints);
    const awarded = Math.max(0, Math.min(requested, remaining));
    stats.dailyPoints += awarded;
    stats.memePoints += awarded;
    stats.xp += awarded;
    stats.level = Math.max(stats.level, Math.floor(Math.sqrt(stats.xp / 120)) + 1);
    if (awarded > 0) this.addEvent(userId, type, awarded, now);
    this.persist();
    return awarded;
  }

  private regenerateEnergy(stats: PlayerStats, now: Date) {
    if (stats.energy >= ECONOMY.energyCap) {
      stats.lastEnergyAt = now.toISOString();
      return;
    }
    const last = new Date(stats.lastEnergyAt);
    const elapsedMs = now.getTime() - last.getTime();
    const units = Math.floor(elapsedMs / (ECONOMY.energyRegenMinutes * 60_000));
    if (units <= 0) return;
    stats.energy = Math.min(ECONOMY.energyCap, stats.energy + units);
    stats.lastEnergyAt = new Date(last.getTime() + units * ECONOMY.energyRegenMinutes * 60_000).toISOString();
  }

  private resetDailyIfNeeded(stats: PlayerStats, now: Date) {
    const today = dayKey(now);
    if (stats.dailyPointsDate !== today) {
      stats.dailyPoints = 0;
      stats.dailyPointsDate = today;
    }
  }

  private load(): Database {
    if (this.sqlite) {
      const row = this.sqlite.prepare("SELECT data FROM app_state WHERE id = 'main'").get() as { data: string } | undefined;
      return row ? JSON.parse(row.data) as Database : this.fresh();
    }
    if (!this.filePath || !fs.existsSync(this.filePath)) return this.fresh();
    return JSON.parse(fs.readFileSync(this.filePath, "utf8")) as Database;
  }

  private fresh(): Database {
    const shouldSeedDemo = Boolean(this.filePath);
    return {
      users: shouldSeedDemo ? [...demoUsers] : [],
      playerStats: shouldSeedDemo ? [...demoStats] : [],
      runs: [],
      dailyTasks: defaultTasks,
      userDailyTasks: [],
      referrals: [],
      economyEvents: []
    };
  }

  private ensureDemoData() {
    if (!this.filePath) return;
    let changed = false;
    for (const user of demoUsers) {
      if (!this.db.users.some((entry) => entry.id === user.id)) {
        this.db.users.push(user);
        changed = true;
      }
    }
    for (const stats of demoStats) {
      if (!this.db.playerStats.some((entry) => entry.userId === stats.userId)) {
        this.db.playerStats.push(stats);
        changed = true;
      }
    }
    if (changed) this.persist();
  }
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
