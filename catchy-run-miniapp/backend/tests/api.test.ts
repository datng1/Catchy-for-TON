import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { ECONOMY } from "../src/economy.js";
import { Store } from "../src/store.js";

let store: Store;
let app: ReturnType<typeof createApp>;

async function login(telegramId: string, referrerCode?: string) {
  const res = await request(app).post("/api/auth/telegram").send({ telegramId, username: `u${telegramId}`, firstName: "Tester", referrerCode });
  expect(res.status).toBe(200);
  return res.body as { token: string; user: { referralCode: string } };
}

async function start(token: string) {
  const res = await request(app).post("/api/run/start").set("Authorization", `Bearer ${token}`).send();
  expect(res.status).toBe(200);
  return res.body.runId as string;
}

function ageRun(runId: string, seconds: number) {
  const run = store.data().runs.find((item) => item.id === runId);
  expect(run).toBeTruthy();
  run!.startedAt = new Date(Date.now() - seconds * 1000).toISOString();
}

beforeEach(() => {
  store = new Store();
  app = createApp(store);
});

describe("CATCHY API", () => {
  it("creates and preserves mock Telegram users", async () => {
    const first = await login("100");
    const second = await login("100");
    expect(second.user.referralCode).toBe(first.user.referralCode);
    expect(store.data().users).toHaveLength(1);
  });

  it("deducts energy on run start and awards points once", async () => {
    const { token } = await login("101");
    const runId = await start(token);
    const profile = await request(app).get("/api/profile").set("Authorization", `Bearer ${token}`);
    expect(profile.body.stats.energy).toBe(ECONOMY.energyCap - 1);

    ageRun(runId, 8);
    const finish = await request(app).post("/api/run/finish").set("Authorization", `Bearer ${token}`).send({ runId, score: 9000, durationSeconds: 8 });
    expect(finish.status).toBe(200);
    expect(finish.body.pointsEarned).toBeGreaterThan(0);

    const dup = await request(app).post("/api/run/finish").set("Authorization", `Bearer ${token}`).send({ runId, score: 9000, durationSeconds: 2 });
    expect(dup.status).toBe(409);
  });

  it("rejects invalid score and duration", async () => {
    const { token } = await login("102");
    const runId = await start(token);
    const badScore = await request(app).post("/api/run/finish").set("Authorization", `Bearer ${token}`).send({ runId, score: 60_000, durationSeconds: 2 });
    expect(badScore.status).toBe(400);

    const runId2 = await start(token);
    const badDuration = await request(app).post("/api/run/finish").set("Authorization", `Bearer ${token}`).send({ runId: runId2, score: 1000, durationSeconds: 50 });
    expect(badDuration.status).toBe(400);
  });

  it("rejects high scores that arrive faster than trusted server pace", async () => {
    const { token } = await login("104");
    const runId = await start(token);
    const finish = await request(app).post("/api/run/finish").set("Authorization", `Bearer ${token}`).send({ runId, score: 50_000, durationSeconds: 1 });
    expect(finish.status).toBe(400);
    expect(finish.body.error).toBe("Score exceeds trusted pace.");
  });

  it("never exceeds the daily Catchy Points cap", async () => {
    const { token } = await login("103");
    for (let i = 0; i < 5; i += 1) {
      const runId = await start(token);
      ageRun(runId, 31);
      await request(app).post("/api/run/finish").set("Authorization", `Bearer ${token}`).send({ runId, score: 50_000, durationSeconds: 30 });
    }
    const profile = await request(app).get("/api/profile").set("Authorization", `Bearer ${token}`);
    expect(profile.body.stats.dailyPoints).toBeLessThanOrEqual(ECONOMY.maxMemePointsPerDay);
  });

  it("does not award points or referral bonus for a zero-score run", async () => {
    const referrer = await login("150");
    const invited = await login("151", referrer.user.referralCode);
    const runId = await start(invited.token);
    const finish = await request(app).post("/api/run/finish").set("Authorization", `Bearer ${invited.token}`).send({ runId, score: 0, durationSeconds: 2 });
    expect(finish.status).toBe(200);
    expect(finish.body.pointsEarned).toBe(0);

    const refs = await request(app).get("/api/referrals").set("Authorization", `Bearer ${referrer.token}`);
    expect(refs.body.referrals[0].pointsEarned).toBe(0);
    expect(refs.body.referrals[0].firstValidRunAt).toBeUndefined();
  });

  it("locks invite task until a referred user completes a valid run", async () => {
    const referrer = await login("170");
    const before = await request(app).get("/api/tasks").set("Authorization", `Bearer ${referrer.token}`);
    expect(before.body.tasks.find((task: { code: string }) => task.code === "invite_friend").claimable).toBe(false);

    const blocked = await request(app).post("/api/tasks/claim").set("Authorization", `Bearer ${referrer.token}`).send({ taskId: "invite-friend" });
    expect(blocked.status).toBe(409);

    const invited = await login("171", referrer.user.referralCode);
    const runId = await start(invited.token);
    ageRun(runId, 8);
    await request(app).post("/api/run/finish").set("Authorization", `Bearer ${invited.token}`).send({ runId, score: 9000, durationSeconds: 8 });

    const after = await request(app).get("/api/tasks").set("Authorization", `Bearer ${referrer.token}`);
    expect(after.body.tasks.find((task: { code: string }) => task.code === "invite_friend").claimable).toBe(true);
  });

  it("requires a daily ad view before Daily Check-in can be claimed", async () => {
    const { token } = await login("175");
    const before = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    expect(before.body.tasks.find((task: { code: string }) => task.code === "join_channel").claimable).toBe(false);

    const blocked = await request(app).post("/api/tasks/claim").set("Authorization", `Bearer ${token}`).send({ taskId: "join-channel" });
    expect(blocked.status).toBe(409);

    const ads = await request(app).get("/api/ads?placement=daily_checkin").set("Authorization", `Bearer ${token}`);
    expect(ads.status).toBe(200);
    expect(ads.body.ads[0].id).toBeTruthy();

    const impression = await request(app).post(`/api/ads/${ads.body.ads[0].id}/impression`).set("Authorization", `Bearer ${token}`).send();
    expect(impression.status).toBe(200);

    const after = await request(app).get("/api/tasks").set("Authorization", `Bearer ${token}`);
    expect(after.body.tasks.find((task: { code: string }) => task.code === "join_channel").claimable).toBe(true);
  });

  it("binds only valid TON wallet addresses", async () => {
    const { token } = await login("180");
    const bad = await request(app).post("/api/wallet/bind").set("Authorization", `Bearer ${token}`).send({ address: "not-a-wallet" });
    expect(bad.status).toBe(400);

    const good = await request(app)
      .post("/api/wallet/bind")
      .set("Authorization", `Bearer ${token}`)
      .send({ address: "EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c" });
    expect(good.status).toBe(200);
    expect(good.body.user.walletAddress).toBe("UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ");
  });

  it("awards referral bonus after invited first valid run", async () => {
    const referrer = await login("200");
    const invited = await login("201", referrer.user.referralCode);
    const runId = await start(invited.token);
    ageRun(runId, 8);
    await request(app).post("/api/run/finish").set("Authorization", `Bearer ${invited.token}`).send({ runId, score: 9000, durationSeconds: 8 });

    const refs = await request(app).get("/api/referrals").set("Authorization", `Bearer ${referrer.token}`);
    expect(refs.body.referrals[0].pointsEarned).toBeGreaterThan(0);
  });
});
