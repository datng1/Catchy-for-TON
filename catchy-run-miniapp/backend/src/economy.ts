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
    "Catchy Points are in-app activity points. They are not tokens or money, but they will be a major factor in calculating future rewards if rewards are announced."
} as const;

export function pointsFromScore(score: number) {
  return Math.max(0, Math.min(200, Math.floor(score / 250)));
}

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(xp / 120)) + 1);
}
