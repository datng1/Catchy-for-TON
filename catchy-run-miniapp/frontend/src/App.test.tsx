import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const profile = {
  user: { id: "u1", username: "blue_runner", firstName: "Catchy", referralCode: "abc" },
  stats: { level: 1, xp: 0, energy: 5, memePoints: 0, dailyPoints: 0, totalScore: 0, bestScore: 0, totalRuns: 0 },
  disclaimer: "Meme Points are in-app points only. They are not tokens, not money, and do not guarantee any future reward."
};

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/auth/telegram")) return json({ token: "abc", user: profile.user });
    if (url.includes("/api/profile")) return json(profile);
    if (url.includes("/api/tasks")) return json({ tasks: [{ id: "join-channel", code: "join", title: "Join channel", rewardPoints: 80, claimed: false, claimable: true }] });
    if (url.includes("/api/referrals")) return json({ inviteLink: "https://t.me/CatchyRunBot/app?startapp=abc", referrals: [], totalBonus: 0 });
    if (url.includes("/api/leaderboard")) return json({ rows: [{ rank: 1, user: profile.user, score: 100, bestScore: 9000 }] });
    if (url.includes("/api/run/start")) return json({ runId: "run1", durationSeconds: 30, maxScore: 50000, energy: 4 });
    if (url.includes("/api/run/finish")) return json({ pointsEarned: 50, stats: { ...profile.stats, memePoints: 50, energy: 4 } });
    return json({});
  }));
});

describe("App", () => {
  it("renders home without Telegram and navigates screens", async () => {
    render(<App />);
    expect(await screen.findByText("Play 30s Run")).toBeInTheDocument();
    fireEvent.click(screen.getAllByText("Tasks").at(-1)!);
    expect(await screen.findByText("Join channel")).toBeInTheDocument();
    fireEvent.click(screen.getAllByText("Friends").at(-1)!);
    await waitFor(() => expect(screen.getAllByText("Friends").length).toBeGreaterThan(0));
    fireEvent.click(screen.getAllByText("Leaders").at(-1)!);
    await waitFor(() => expect(screen.getAllByText(/#1/).length).toBeGreaterThan(0));
  });

  it("starts and finishes a run", async () => {
    render(<App />);
    fireEvent.click(await screen.findByText("Play 30s Run"));
    fireEvent.click(await screen.findByText("Start Run"));
    fireEvent.click(await screen.findByText("Finish Run"));
    await waitFor(() => expect(screen.getByText("Run Complete")).toBeInTheDocument());
    expect(screen.getByText("+50")).toBeInTheDocument();
    expect(screen.getAllByText("Meme Points").length).toBeGreaterThan(0);
  });
});

function json(data: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);
}
