import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type Profile, type Stats, type Task } from "./api";
import { GameCanvas, type GameSummary } from "./GameCanvas";
import mascotHero from "./assets/mascot-hero.png";
import iconBoost from "./assets/icon-boost.png";
import iconFud from "./assets/icon-fud.png";
import iconPlay from "./assets/icon-play.png";
import iconShield from "./assets/icon-shield.png";
import iconSpark from "./assets/icon-spark.png";

type Screen = "home" | "play" | "tasks" | "friends" | "leaderboard" | "wallet";

const tabs: Array<{ id: Screen; label: string; hint: string }> = [
  { id: "home", label: "Home", hint: "Profile and season" },
  { id: "play", label: "Play", hint: "30-second run" },
  { id: "tasks", label: "Tasks", hint: "Daily retention" },
  { id: "friends", label: "Friends", hint: "Referral loop" },
  { id: "leaderboard", label: "Leaders", hint: "Competition" },
  { id: "wallet", label: "Wallet", hint: "Soon" }
];

export function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [referrals, setReferrals] = useState<{ inviteLink: string; referrals: Array<{ pointsEarned: number; invited: { username: string } }>; totalBonus: number } | null>(null);
  const [leaders, setLeaders] = useState<Array<{ rank: number; user: { username: string; firstName: string }; score: number; bestScore: number }>>([]);
  const [leaderType, setLeaderType] = useState("today");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const next = await api.profile();
    setProfile(next);
  }, []);

  useEffect(() => {
    api.login()
      .then(refreshProfile)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refreshProfile]);

  useEffect(() => {
    if (!profile) return;
    if (screen === "tasks") api.tasks().then((res) => setTasks(res.tasks)).catch((err: Error) => setError(err.message));
    if (screen === "friends") api.referrals().then(setReferrals).catch((err: Error) => setError(err.message));
    if (screen === "leaderboard") api.leaderboard(leaderType).then((res) => setLeaders(res.rows)).catch((err: Error) => setError(err.message));
  }, [screen, profile, leaderType]);

  const statCards = useMemo(() => profile ? [
    ["Meme Points", formatNumber(profile.stats.memePoints), "Off-chain activity"],
    ["Energy", `${profile.stats.energy}/5`, "1 regen / 30 min"],
    ["Level", profile.stats.level, `${profile.stats.xp} XP`],
    ["Best Run", formatNumber(profile.stats.bestScore), `${profile.stats.totalRuns} total runs`]
  ] : [], [profile]);

  if (loading) return <Loading />;

  return (
    <main className="app-shell">
      <aside className="desktop-rail">
        <BrandBlock compact />
        <nav className="side-nav" aria-label="Desktop navigation">
          {tabs.map((tab) => (
            <button className={screen === tab.id ? "active" : ""} key={tab.id} onClick={() => setScreen(tab.id)}>
              <strong>{tab.label}</strong>
              <span>{tab.hint}</span>
            </button>
          ))}
        </nav>
        <div className="rail-note">
          <strong>Token status</strong>
          <span>MVP uses Meme Points only. No token claim, no wallet transaction.</span>
        </div>
      </aside>

      <section className="app-main">
        <header className="hero">
          <BrandBlock />
          <div className="hero-actions">
            <button className="mini-chip" onClick={() => setScreen("play")}>Run</button>
            <button className="mini-chip soft" onClick={() => setScreen("tasks")}>Tasks</button>
          </div>
        </header>

        {error && <button className="error" onClick={() => setError("")}>{error}</button>}

        {profile && (
          <section className="stats-grid" aria-label="Player stats">
            {statCards.map(([label, value, hint]) => (
              <div className="stat" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>{hint}</small>
              </div>
            ))}
          </section>
        )}

        <section className={`panel panel-${screen}`}>
          {screen === "home" && profile && (
            <Home
              stats={profile.stats}
              username={profile.user.username}
              onPlay={() => setScreen("play")}
              onScreen={setScreen}
              disclaimer={profile.disclaimer}
            />
          )}
        {screen === "play" && <Play onDone={refreshProfile} onError={setError} stats={profile?.stats} onHome={() => setScreen("home")} />}
          {screen === "tasks" && (
            <Tasks
              tasks={tasks}
              onClaim={async (taskId) => {
                const res = await api.claimTask(taskId);
                setProfile((old) => old && ({ ...old, stats: res.stats }));
                setTasks((await api.tasks()).tasks);
              }}
            />
          )}
          {screen === "friends" && <Friends referrals={referrals} />}
          {screen === "leaderboard" && <Leaderboard rows={leaders} type={leaderType} onType={setLeaderType} />}
          {screen === "wallet" && <Wallet />}
        </section>
      </section>

      <aside className="insight-rail">
        <InsightRail stats={profile?.stats} />
      </aside>

      <nav className="bottom-nav" aria-label="Main navigation">
        {tabs.filter((tab) => tab.id !== "play").map((tab) => (
          <button className={screen === tab.id ? "active" : ""} key={tab.id} onClick={() => setScreen(tab.id)}>{tab.label}</button>
        ))}
      </nav>
    </main>
  );
}

function BrandBlock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand-block compact-brand" : "brand-block"}>
      <div className="mascot" aria-label="CATCHY mascot">
        <img src={mascotHero} alt="" />
      </div>
      <div className="title-block">
        <p className="eyebrow">Telegram-native meme runner</p>
        <h1>CATCHY RUN</h1>
        {!compact && <p className="tagline">Catch TON sparks, dodge FUD, climb the meme board.</p>}
      </div>
    </div>
  );
}

function Loading() {
  return <main className="app-shell loading"><div className="orb" /><h1>CATCHY RUN</h1><p>Charging blue sparks...</p></main>;
}

function Home({ stats, username, onPlay, onScreen, disclaimer }: { stats: Stats; username: string; onPlay: () => void; onScreen: (screen: Screen) => void; disclaimer: string }) {
  const dailyPercent = Math.min(100, Math.round((stats.dailyPoints / 1000) * 100));
  const xpPercent = Math.min(100, Math.round(((stats.xp % 120) / 120) * 100));
  return (
    <div className="home-grid">
      <section className="season-card feature-card">
        <div>
          <p className="eyebrow">Season 01 / Closed beta</p>
          <h2>Blue Spark Sprint</h2>
          <span>@{username} / Level {stats.level} / {stats.totalRuns} runs</span>
        </div>
        <button className="play-button hero-play" disabled={stats.energy <= 0} onClick={onPlay}>{stats.energy > 0 ? "Play 30s Run" : "Energy Empty"}</button>
      </section>

      <div className="home-columns">
        <section className="detail-stack">
          <ClaimPanel stats={stats} />
          <Progress label="Daily cap" value={`${stats.dailyPoints}/1000`} percent={dailyPercent} />
          <Progress label="Next level spark" value={`${stats.xp % 120}/120 XP`} percent={xpPercent} />
          <div className="mechanic-grid">
            <InfoTile icon="spark" title="Spark Stars" copy="Tap blue stars for score. Misses subtract from the run." />
            <InfoTile icon="boost" title="Boost" copy="Gold sparks double score for a few seconds." />
            <InfoTile icon="shield" title="Shield" copy="Green shields block the next FUD hit." />
            <InfoTile icon="fud" title="FUD Alerts" copy="Red blocks cut score unless shield is active." />
          </div>
          <BoostDeck />
        </section>

        <section className="detail-stack">
          <StatusLadder stats={stats} />
          <div className="quick-actions">
            <button onClick={() => onScreen("tasks")}><strong>Daily Tasks</strong><span>Claim social + run rewards</span></button>
            <button onClick={() => onScreen("friends")}><strong>Invite Friends</strong><span>Earn 10% after their first valid run</span></button>
            <button onClick={() => onScreen("leaderboard")}><strong>Leaderboard</strong><span>Today, all-time, referrers, early believers</span></button>
          </div>
          <div className="rule-card">
            <strong>Economy rule</strong>
            <span>{disclaimer}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

function ClaimPanel({ stats }: { stats: Stats }) {
  return (
    <section className="claim-panel">
      <div>
        <p className="eyebrow">Farming loop</p>
        <h3>Blue Spark Farm</h3>
        <span>Check in, run, then claim the session pulse.</span>
      </div>
      <div className="claim-metrics">
        <span><strong>{stats.energy}/5</strong>Energy</span>
        <span><strong>2h 18m</strong>Next claim</span>
        <span><strong>+120</strong>Potential</span>
      </div>
      <button className="secondary-action">Claim Soon</button>
    </section>
  );
}

function Progress({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div className="progress-card">
      <div><span>{label}</span><strong>{value}</strong></div>
      <div className="progress-track"><i style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

function InfoTile({ title, copy, icon }: { title: string; copy: string; icon?: "spark" | "boost" | "shield" | "fud" | "play" }) {
  return <article className="info-tile">{icon && <AssetIcon kind={icon} />}<strong>{title}</strong><span>{copy}</span></article>;
}

function AssetIcon({ kind }: { kind: "spark" | "boost" | "shield" | "fud" | "play" }) {
  const icons = { spark: iconSpark, boost: iconBoost, shield: iconShield, fud: iconFud, play: iconPlay };
  return <img className="asset-icon" src={icons[kind]} alt="" aria-hidden="true" />;
}

function BoostDeck() {
  const boosts = [
    ["boost", "Turbo Tap", "Double score window during runs", "Daily x2"],
    ["play", "Full Energy", "Instant refill for beta testers", "3/day"],
    ["spark", "Auto Runner", "Offline points simulation later", "Locked"],
    ["shield", "Combo Guard", "Protects streak after one miss", "Soon"]
  ];
  return (
    <section className="boost-deck">
      <ScreenTitle eyebrow="Boosts" title="Power cards" copy="Inspired by tap-game boosters, but capped server-side for fair beta play." />
      <div className="boost-grid">
        {boosts.map(([icon, title, copy, tag]) => <InfoTile key={title} icon={icon as "spark" | "boost" | "shield" | "fud" | "play"} title={`${title} / ${tag}`} copy={copy} />)}
      </div>
    </section>
  );
}

function StatusLadder({ stats }: { stats: Stats }) {
  const level = stats.level;
  const steps = [
    ["Rookie Spark", level >= 1],
    ["Street Runner", level >= 2],
    ["Blue Degen", level >= 4],
    ["TON Phantom", level >= 7]
  ];
  return (
    <section className="status-ladder">
      <ScreenTitle eyebrow="Progression" title="Status ladder" copy="A Bums-like rise in identity, without financial claims." />
      <div className="ladder-list">
        {steps.map(([label, active]) => <span className={active ? "active" : ""} key={String(label)}>{label}</span>)}
      </div>
    </section>
  );
}


function Play({ onDone, onError, stats, onHome }: { onDone: () => Promise<void>; onError: (msg: string) => void; stats?: Stats; onHome: () => void }) {
  const [run, setRun] = useState<{ runId: string; durationSeconds: number } | null>(null);
  const [result, setResult] = useState<{ score: number; pointsEarned: number; summary: GameSummary } | null>(null);

  async function start() {
    try {
      setResult(null);
      setRun(await api.startRun());
    } catch (err) {
      onError((err as Error).message);
    }
  }

  async function finish(score: number, durationSeconds: number, summary: GameSummary) {
    if (!run) return;
    try {
      const res = await api.finishRun(run.runId, score, durationSeconds);
      setResult({ score, pointsEarned: res.pointsEarned, summary });
      setRun(null);
      await onDone();
    } catch (err) {
      onError((err as Error).message);
      setRun(null);
    }
  }

  return (
    <div className="play-screen">
      {!run && (
        <div className="pre-run">
          <ScreenTitle eyebrow="30-second run" title="Catch sparks. Avoid FUD." copy="Only clean taps add score. Air taps, missed sparks, and FUD hits subtract from the run." />
          <div className="run-prep-grid">
            <InfoTile title="Energy Cost" copy={`1 energy per run. Current energy: ${stats?.energy ?? 0}/5.`} />
            <InfoTile title="Anti Inflation" copy="Score only grows from clean hits. Misses and FUD reduce the final run score." />
            <InfoTile title="Daily Cap" copy="Meme Points stop at 1,000 per day." />
          </div>
          <button className="play-button compact" disabled={!stats || stats.energy <= 0} onClick={start}>Start Run</button>
        </div>
      )}
      {run && <GameCanvas durationSeconds={run.durationSeconds} onFinish={finish} />}
      {result && (
        <div className="result-backdrop" role="dialog" aria-modal="true" aria-label="Run result">
          <div className="result-card">
            <p className="eyebrow">Run Complete</p>
            <h2>{result.summary.combo >= 6 ? "Sharp Streak" : "Spark Collected"}</h2>
            <div className="result-metrics">
              <span><strong>{formatNumber(result.score)}</strong>Score</span>
              <span><strong>x{result.summary.combo}</strong>Best combo</span>
              <span><strong>{result.summary.hits}/{result.summary.misses}</strong>Hits/Misses</span>
              <span><strong>+{result.pointsEarned}</strong>Meme Points</span>
            </div>
            <div className="result-actions">
              <button onClick={start}>Play Again</button>
              <button className="secondary-action" onClick={onHome}>Back Home</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tasks({ tasks, onClaim }: { tasks: Task[]; onClaim: (taskId: string) => Promise<void> }) {
  const claimed = tasks.filter((task) => task.claimed).length;
  return (
    <div className="screen-stack">
      <ScreenTitle eyebrow="Daily loop" title="Stack points without touching tokens" copy="Tasks are off-chain activity checks for beta retention and community energy." />
      <div className="summary-strip">
        <InfoTile title="Claimed Today" copy={`${claimed}/${tasks.length || 5} tasks`} />
        <InfoTile title="Reward Policy" copy="Rewards respect the 1,000 points daily cap." />
        <InfoTile title="Anti-bot" copy="Run tasks need real server-validated play." />
      </div>
      <div className="campaign-board">
        <InfoTile icon="spark" title="Daily Check-in" copy="Return tomorrow to keep your beta pulse alive." />
        <InfoTile icon="boost" title="Explore Drops" copy="Partner and ecosystem tasks can appear here later." />
        <InfoTile icon="play" title="Meme Contest" copy="Community posts can be rewarded without token promises." />
      </div>
      <div className="list">
        {tasks.map((task) => (
          <article className="row mission-row" key={task.id}>
            <div>
              <strong>{task.title}</strong>
              <span>{taskCopy(task.code)} / +{task.rewardPoints} points</span>
            </div>
            <button disabled={task.claimed || !task.claimable} onClick={() => onClaim(task.id)}>{task.claimed ? "Claimed" : task.claimable ? "Claim" : "Locked"}</button>
          </article>
        ))}
      </div>
    </div>
  );
}

function Friends({ referrals }: { referrals: { inviteLink: string; referrals: Array<{ pointsEarned: number; invited: { username: string } }>; totalBonus: number } | null }) {
  return (
    <div className="friends screen-stack">
      <ScreenTitle eyebrow="Growth loop" title="Invite runners, not bots" copy="Referral points unlock only after a friend completes a valid run." />
      <div className="invite-card">
        <span>Your invite link</span>
        <p>{referrals?.inviteLink || "Loading invite link..."}</p>
        <strong>{referrals?.totalBonus || 0} total referral points</strong>
      </div>
      <div className="summary-strip">
        <InfoTile title="Bonus" copy="10% of invited player's valid Meme Points." />
        <InfoTile title="Limit" copy="Max 20 counted referrals per day." />
        <InfoTile title="Quality" copy="No bonus until the invited user plays." />
      </div>
      <div className="squad-card">
        <div>
          <p className="eyebrow">Squad</p>
          <h3>Blue Rabbit Tribe</h3>
          <span>Squad/tribe UI for community races, inspired by Notcoin squads and Blum tribes.</span>
        </div>
        <strong>Rank #12</strong>
      </div>
      {referrals?.referrals.length ? referrals.referrals.map((ref) => (
        <div className="row" key={ref.invited.username}><strong>@{ref.invited.username}</strong><span>+{ref.pointsEarned}</span></div>
      )) : <EmptyState title="No invited runners yet" copy="Share the link when the closed beta crew is ready." />}
    </div>
  );
}

function Leaderboard({ rows, type, onType }: { rows: Array<{ rank: number; user: { username: string; firstName: string }; score: number; bestScore: number }>; type: string; onType: (type: string) => void }) {
  return (
    <div className="screen-stack">
      <ScreenTitle eyebrow="Competition" title="Meme board" copy="Suspicious users stay out. Only server-awarded points count." />
      <div className="segments">{["today", "allTime", "referrers", "earlyBelievers"].map((item) => <button className={type === item ? "active" : ""} key={item} onClick={() => onType(item)}>{labelForBoard(item)}</button>)}</div>
      <div className="podium">
        {rows.slice(0, 3).map((row) => <div className="podium-card" key={row.rank}><span>#{row.rank}</span><strong>{row.user.firstName}</strong><em>{row.score} pts</em></div>)}
      </div>
      <div className="list">
        {rows.length ? rows.map((row) => (
          <article className="row leader-row" key={`${row.rank}-${row.user.username}`}>
            <div><strong>#{row.rank} {row.user.firstName}</strong><span>@{row.user.username || "runner"} / best {row.bestScore}</span></div>
            <em>{row.score} pts</em>
          </article>
        )) : <EmptyState title="Leaderboard warming up" copy="Finish a run to light up this board." />}
      </div>
    </div>
  );
}

function Wallet() {
  return (
    <div className="wallet screen-stack">
      <ScreenTitle eyebrow="V2 layer" title="Wallet Soon" copy="No token, no claim, no transaction in this MVP. CATCHY starts as a game and community loop first." />
      <div className="wallet-grid">
        <InfoTile title="Now" copy="Off-chain points, leaderboard, retention, referral quality." />
        <InfoTile title="Before token" copy="Snapshot rules, bot review, metadata check, public warning." />
        <InfoTile title="Later" copy="TON Connect, wallet binding, cosmetic utility, community rewards." />
      </div>
      <div className="wallet-timeline">
        <span>1. Build app traction</span>
        <span>2. Review suspicious accounts</span>
        <span>3. Publish snapshot rules</span>
        <span>4. Add TON Connect later</span>
      </div>
    </div>
  );
}

function InsightRail({ stats }: { stats?: Stats }) {
  return (
    <div className="insight-stack">
      <section className="rail-card">
        <p className="eyebrow">Economy</p>
        <h3>MVP rules</h3>
        <ul>
          <li>5 energy cap</li>
          <li>30-second runs</li>
          <li>50,000 score cap</li>
          <li>1,000 points/day</li>
        </ul>
      </section>
      <section className="rail-card">
        <p className="eyebrow">Player pulse</p>
        <h3>{stats ? `${stats.totalRuns} runs` : "Loading"}</h3>
        <span>{stats ? `${formatNumber(stats.memePoints)} Meme Points earned` : "Preparing local profile"}</span>
      </section>
      <section className="rail-card">
        <p className="eyebrow">Roadmap</p>
        <div className="mini-roadmap">
          <span className="done">MVP core</span>
          <span className="done">Growth loop</span>
          <span>Closed beta</span>
          <span>Token readiness</span>
        </div>
      </section>
    </div>
  );
}

function ScreenTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return <header className="screen-title"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><span>{copy}</span></header>;
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><strong>{title}</strong><span>{copy}</span></div>;
}

function taskCopy(code: string) {
  const copy: Record<string, string> = {
    join_channel: "Official updates",
    join_group: "Community signal",
    play_3_runs: "Prove retention",
    invite_friend: "Organic growth",
    meme_contest: "Culture fuel",
    join: "Official updates",
    runs: "Prove retention",
    invite: "Organic growth",
    meme: "Culture fuel"
  };
  return copy[code] || "Beta activity";
}

function labelForBoard(type: string) {
  const labels: Record<string, string> = {
    today: "Today",
    allTime: "All Time",
    referrers: "Referrers",
    earlyBelievers: "Early"
  };
  return labels[type] || type;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
