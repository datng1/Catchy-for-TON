export const ECONOMY = {
  energyCap: 5,
  energyRegenMinutes: 30,
  runDurationSeconds: 30,
  runFinishToleranceSeconds: 8,
  maxScorePerRun: 50_000,
  scoreGraceSeconds: 2,
  maxScoreBase: 2_400,
  maxScorePerSecond: 1_700,
  maxMemePointsPerDay: 1_000,
  referralBonusRate: 0.1,
  maxCountedReferralsPerDay: 20,
  disclaimer:
    "Meme Points are in-app points only. They are not tokens, not money, and do not guarantee any future reward."
} as const;

export function pointsFromScore(score: number) {
  return Math.max(0, Math.min(200, Math.floor(score / 250)));
}

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(xp / 120)) + 1);
}
