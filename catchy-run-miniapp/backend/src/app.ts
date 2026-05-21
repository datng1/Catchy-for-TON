import cors from "cors";
import express, { type Request, type Response, type NextFunction } from "express";
import crypto from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import { Address } from "@ton/core";
import { ECONOMY, pointsFromScore } from "./economy.js";
import { Store, dayKey, type User } from "./store.js";

type AuthedRequest = Request & { user?: User };

export function createApp(store = new Store(process.env.CATCHY_DB_PATH || defaultDbPath())) {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(async (_req, _res, next) => {
    try {
      await store.ready();
      next();
    } catch (error) {
      next(error);
    }
  });

  app.get("/health", (_req, res) => res.json({ ok: true, name: "catchy-run-api" }));

  app.post("/api/auth/telegram", async (req, res) => {
    const { mode = "mock", telegramId, username, firstName, startParam, referrerCode, initData } = req.body || {};
    let authUser = { telegramId: String(telegramId || ""), username, firstName, referrerCode: referrerCode || startParam };

    if (mode !== "mock") {
      if (!process.env.TELEGRAM_BOT_TOKEN) {
      return res.status(400).json({ error: "Real Telegram initData validation requires TELEGRAM_BOT_TOKEN." });
      }
      const telegram = validateTelegramInitData(String(initData || ""), process.env.TELEGRAM_BOT_TOKEN);
      if (!telegram) return res.status(401).json({ error: "Invalid Telegram initData." });
      authUser = {
        telegramId: String(telegram.user.id),
        username: telegram.user.username,
        firstName: telegram.user.first_name,
        referrerCode: telegram.startParam
      };
    }
    if (!authUser.telegramId) return res.status(400).json({ error: "telegramId is required for local mock auth." });

    const { user } = store.createUser(authUser);
    await store.persist();
    res.json({ token: tokenFor(user.id), user: publicUser(user) });
  });

  app.get("/api/economy/config", (_req, res) => res.json(ECONOMY));

  app.use("/api", auth(store));

  app.get("/api/profile", (req: AuthedRequest, res) => {
    const user = req.user!;
    res.json({ user: publicUser(user), stats: store.statsFor(user.id), disclaimer: ECONOMY.disclaimer });
  });

  app.post("/api/wallet/bind", async (req: AuthedRequest, res) => {
    const user = req.user!;
    const address = String(req.body?.address || "").trim();
    if (!address) return res.status(400).json({ error: "Wallet address is required." });
    let normalized = "";
    try {
      normalized = Address.parse(address).toString({ bounceable: false, urlSafe: true });
    } catch {
      return res.status(400).json({ error: "Invalid TON wallet address." });
    }
    user.walletAddress = normalized;
    store.addEvent(user.id, "wallet_bind", 0);
    await store.persist();
    res.json({ user: publicUser(user) });
  });

  app.post("/api/run/start", async (req: AuthedRequest, res) => {
    const user = req.user!;
    if (user.isBanned || user.isSuspicious) return res.status(403).json({ error: "User is not eligible for runs." });
    const stats = store.statsFor(user.id);
    if (stats.energy <= 0) return res.status(409).json({ error: "No energy available." });
    stats.energy -= 1;
    if (stats.energy === ECONOMY.energyCap - 1) stats.lastEnergyAt = new Date().toISOString();
    const run = { id: nanoid(), userId: user.id, startedAt: new Date().toISOString(), status: "started" as const };
    store.data().runs.push(run);
    await store.persist();
    res.json({ runId: run.id, durationSeconds: ECONOMY.runDurationSeconds, maxScore: ECONOMY.maxScorePerRun, energy: stats.energy });
  });

  app.post("/api/run/finish", async (req: AuthedRequest, res) => {
    const user = req.user!;
    const { runId, score, durationSeconds } = req.body || {};
    const run = store.data().runs.find((item) => item.id === runId && item.userId === user.id);
    if (!run) return res.status(404).json({ error: "Run not found." });
    if (run.status !== "started") return res.status(409).json({ error: "Run already finished." });
    const numericScore = Number(score);
    const numericDuration = Number(durationSeconds);
    const elapsedSeconds = (Date.now() - new Date(run.startedAt).getTime()) / 1000;
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > ECONOMY.maxScorePerRun) {
      run.status = "rejected";
      await store.persist();
      return res.status(400).json({ error: "Invalid score." });
    }
    if (!Number.isFinite(numericDuration) || numericDuration < 0 || numericDuration > ECONOMY.runDurationSeconds + ECONOMY.runFinishToleranceSeconds) {
      run.status = "rejected";
      await store.persist();
      return res.status(400).json({ error: "Invalid duration." });
    }
    if (numericDuration > elapsedSeconds + ECONOMY.runFinishToleranceSeconds) {
      run.status = "rejected";
      await store.persist();
      return res.status(400).json({ error: "Run finished too early." });
    }
    const trustedSeconds = Math.min(ECONOMY.runDurationSeconds, Math.max(0, elapsedSeconds + ECONOMY.scoreGraceSeconds));
    const trustedScoreCap = Math.min(ECONOMY.maxScorePerRun, ECONOMY.maxScoreBase + trustedSeconds * ECONOMY.maxScorePerSecond);
    if (numericScore > trustedScoreCap) {
      run.status = "rejected";
      await store.persist();
      return res.status(400).json({ error: "Score exceeds trusted pace." });
    }

    const requestedPoints = pointsFromScore(numericScore);
    const awarded = store.addDailyPoints(user.id, requestedPoints, "run_finish");
    const stats = store.statsFor(user.id);
    stats.totalScore += numericScore;
    stats.bestScore = Math.max(stats.bestScore, numericScore);
    stats.totalRuns += 1;
    run.status = "finished";
    run.finishedAt = new Date().toISOString();
    run.score = numericScore;
    run.durationSeconds = numericDuration;
    run.pointsEarned = awarded;
    maybeAwardReferral(store, user.id, awarded);
    await store.persist();
    res.json({ score: numericScore, pointsEarned: awarded, stats });
  });

  app.get("/api/tasks", (req: AuthedRequest, res) => {
    const today = dayKey();
    const user = req.user!;
    const claims = store.data().userDailyTasks.filter((claim) => claim.userId === user.id && claim.date === today);
    res.json({
      tasks: store.data().dailyTasks.filter((task) => task.isActive).map((task) => ({
        ...task,
        claimed: claims.some((claim) => claim.taskId === task.id),
        claimable: isTaskClaimable(store, user, task.code)
      }))
    });
  });

  app.post("/api/tasks/claim", async (req: AuthedRequest, res) => {
    const { taskId } = req.body || {};
    const task = store.data().dailyTasks.find((item) => item.id === taskId && item.isActive);
    if (!task) return res.status(404).json({ error: "Task not found." });
    const today = dayKey();
    if (store.data().userDailyTasks.some((claim) => claim.userId === req.user!.id && claim.taskId === task.id && claim.date === today)) {
      return res.status(409).json({ error: "Task already claimed." });
    }
    if (!isTaskClaimable(store, req.user!, task.code)) {
      return res.status(409).json({ error: "Task is not complete yet." });
    }
    const pointsEarned = store.addDailyPoints(req.user!.id, task.rewardPoints, "task_claim");
    store.data().userDailyTasks.push({ userId: req.user!.id, taskId: task.id, date: today, completedAt: new Date().toISOString() });
    await store.persist();
    res.json({ taskId: task.id, pointsEarned, stats: store.statsFor(req.user!.id) });
  });

  app.get("/api/referrals", (req: AuthedRequest, res) => {
    const user = req.user!;
    const refs = store.data().referrals.filter((ref) => ref.referrerId === user.id);
    res.json({
      inviteLink: `https://t.me/${botUsername()}?startapp=${user.referralCode}`,
      referralCode: user.referralCode,
      referrals: refs.map((ref) => ({ ...ref, invited: publicUser(store.findUserById(ref.invitedId)!) })),
      totalBonus: refs.reduce((sum, ref) => sum + ref.pointsEarned, 0)
    });
  });

  app.get("/api/leaderboard", (req, res) => {
    const type = String(req.query.type || "today");
    const rows = store.data().playerStats
      .map((stats) => ({ stats, user: store.findUserById(stats.userId)! }))
      .filter((row) => row.user && !row.user.isBanned && !row.user.isSuspicious)
      .sort((a, b) => {
        if (type === "referrers") {
          const ac = store.data().referrals.filter((ref) => ref.referrerId === a.user.id).length;
          const bc = store.data().referrals.filter((ref) => ref.referrerId === b.user.id).length;
          return bc - ac;
        }
        if (type === "earlyBelievers") return new Date(a.user.createdAt).getTime() - new Date(b.user.createdAt).getTime();
        return (type === "allTime" ? b.stats.memePoints - a.stats.memePoints : b.stats.dailyPoints - a.stats.dailyPoints);
      })
      .slice(0, 25)
      .map((row, index) => ({ rank: index + 1, user: publicUser(row.user), score: type === "allTime" ? row.stats.memePoints : row.stats.dailyPoints, bestScore: row.stats.bestScore }));
    res.json({ type, rows });
  });

  const staticRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../frontend/dist");
  if (fsExists(staticRoot)) {
    app.use(express.static(staticRoot));
    app.get("*", (_req, res) => res.sendFile(path.join(staticRoot, "index.html")));
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error." });
  });

  return app;
}

function fsExists(target: string) {
  return Boolean(target) && path.isAbsolute(target) && existsSync(target);
}

function defaultDbPath() {
  const appDir = path.dirname(fileURLToPath(import.meta.url));
  const backendRoot = path.basename(path.dirname(appDir)) === "dist" ? path.resolve(appDir, "../..") : path.resolve(appDir, "..");
  return path.join(backendRoot, "data", "local.sqlite");
}

function auth(store: Store) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
    const userId = userIdFromToken(token);
    const user = userId ? store.findUserById(userId) : undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized." });
    req.user = user;
    next();
  };
}

function maybeAwardReferral(store: Store, invitedId: string, pointsEarned: number) {
  const referral = store.data().referrals.find((item) => item.invitedId === invitedId);
  if (!referral || referral.firstValidRunAt || pointsEarned <= 0) return;
  const todayCount = store.data().referrals.filter((item) => item.referrerId === referral.referrerId && item.firstValidRunAt?.startsWith(dayKey())).length;
  if (todayCount >= ECONOMY.maxCountedReferralsPerDay) return;
  const bonus = Math.floor(pointsEarned * ECONOMY.referralBonusRate);
  referral.firstValidRunAt = new Date().toISOString();
  referral.pointsEarned += store.addDailyPoints(referral.referrerId, bonus, "referral_bonus");
}

function isTaskClaimable(store: Store, user: User, code: string) {
  if (code === "play_3_runs") return store.statsFor(user.id).totalRuns >= 3;
  if (code === "invite_friend") {
    return store.data().referrals.some((ref) => ref.referrerId === user.id && Boolean(ref.firstValidRunAt));
  }
  if (code === "join_group" || code === "meme_contest") return false;
  return code === "join_channel";
}

function publicUser(user: User) {
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username,
    firstName: user.firstName,
    referralCode: user.referralCode,
    walletAddress: user.walletAddress
  };
}

function botUsername() {
  return process.env.TELEGRAM_BOT_USERNAME || "Catchymemeforton_bot";
}

function validateTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  const rawUser = params.get("user");
  if (!hash || !rawUser) return undefined;
  params.delete("hash");
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(calculated, "hex"), Buffer.from(hash, "hex"))) return undefined;
  const user = JSON.parse(rawUser) as { id: number; username?: string; first_name?: string };
  return { user, startParam: params.get("start_param") || undefined };
}

function tokenFor(userId: string) {
  return Buffer.from(`catchy:${userId}`).toString("base64url");
}

function userIdFromToken(token: string) {
  const decoded = Buffer.from(token, "base64url").toString("utf8");
  return decoded.startsWith("catchy:") ? decoded.slice("catchy:".length) : "";
}
