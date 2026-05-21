import { useCallback, useEffect, useMemo, useState } from "react";
import { TonConnectButton, useTonAddress, useTonWallet } from "@tonconnect/ui-react";
import { api, type Ad, type Profile, type Stats, type Task } from "./api";
import { GameCanvas, type GameSummary } from "./GameCanvas";
import mascotHero from "./assets/mascot-hero.png";
import iconBoost from "./assets/icon-boost.png";
import iconFud from "./assets/icon-fud.png";
import iconPlay from "./assets/icon-play.png";
import iconShield from "./assets/icon-shield.png";
import iconSpark from "./assets/icon-spark.png";

type Screen = "home" | "play" | "tasks" | "friends" | "leaderboard" | "wallet" | "settings";
type Language = "en" | "ru";

const LANG_KEY = "catchy_language";

const copy = {
  en: {
    tabs: {
      home: ["Home", "Profile and season"],
      play: ["Play", "30-second run"],
      tasks: ["Tasks", "Daily retention"],
      friends: ["Friends", "Referral loop"],
      leaderboard: ["Leaders", "Competition"],
      wallet: ["Wallet", "Soon"],
      settings: ["Settings", "Language"]
    },
    brandEyebrow: "Telegram-native meme runner",
    tagline: "Catch TON sparks, dodge FUD, climb the meme board.",
    loading: "Charging blue sparks...",
    loadingMeta: "Preparing profile, energy and leaderboard",
    run: "Run",
    tokenStatus: "Token status",
    tokenNote: "MVP uses Catchy Points only. No token claim, no wallet transaction.",
    stats: {
      memePoints: "Catchy Points",
      offchain: "Off-chain activity",
      energy: "Energy",
      regen: "1 regen / 30 min",
      level: "Level",
      bestRun: "Best Run",
      totalRuns: "total runs"
    },
    home: {
      season: "Season 01 / Closed beta",
      sprint: "Blue Spark Sprint",
      level: "Level",
      runs: "runs",
      play: "Play 30s Run",
      empty: "Energy Empty",
      dailyCap: "Daily cap",
      nextLevel: "Next level spark",
      economyRule: "Economy rule",
      disclaimer: "Catchy Points are in-app activity points. They are not tokens or money, but they will be a major factor in calculating future rewards if rewards are announced.",
      quickTasks: "Daily Tasks",
      quickTasksCopy: "Claim social + run rewards",
      quickFriends: "Invite Friends",
      quickFriendsCopy: "Earn 10% after their first valid run",
      quickLeaders: "Leaderboard",
      quickLeadersCopy: "Today, all-time, referrers, early believers"
    },
    claim: {
      eyebrow: "Farming loop",
      title: "Blue Spark Farm",
      copy: "Check in, run, then claim the session pulse.",
      next: "Next claim",
      potential: "Potential",
      button: "Claim Soon"
    },
    mechanics: {
      spark: "Spark Stars",
      sparkCopy: "Tap blue stars for score. Misses subtract from the run.",
      boost: "Boost",
      boostCopy: "Gold sparks double score for a few seconds.",
      shield: "Shield",
      shieldCopy: "Green shields block the next FUD hit.",
      fud: "FUD Alerts",
      fudCopy: "Red blocks cut score unless shield is active."
    },
    boosts: {
      eyebrow: "Boosts",
      title: "Power cards",
      copy: "Inspired by tap-game boosters, but capped server-side for fair beta play.",
      turbo: "Turbo Tap",
      turboCopy: "Double score window during runs",
      full: "Full Energy",
      fullCopy: "Instant refill for beta testers",
      auto: "Auto Runner",
      autoCopy: "Offline points simulation later",
      guard: "Combo Guard",
      guardCopy: "Protects streak after one miss",
      locked: "Locked",
      soon: "Soon"
    },
    ladder: {
      eyebrow: "Progression",
      title: "Status ladder",
      copy: "A Bums-like rise in identity, without financial claims.",
      steps: ["Rookie Spark", "Street Runner", "Blue Degen", "TON Phantom"]
    },
    play: {
      eyebrow: "30-second run",
      title: "Catch sparks. Avoid FUD.",
      copy: "Only clean taps add score. Air taps, missed sparks, and FUD hits subtract from the run.",
      energyCost: "Energy Cost",
      energyCopy: "1 energy per run. Current energy:",
      antiInflation: "Anti Inflation",
      antiCopy: "Score only grows from clean hits. Misses and FUD reduce the final run score.",
      dailyCap: "Daily Cap",
      dailyCopy: "Catchy Points stop at 1,000 per day.",
      guideTitle: "How to play",
      guideSteps: ["Tap blue sparks before they pass you", "Avoid red FUD blocks unless your shield is active", "Clean hits add points; air taps and missed sparks subtract points", "Every 5 seconds sparks get smaller and faster"],
      start: "Start Run",
      complete: "Run Complete",
      streak: "Sharp Streak",
      collected: "Spark Collected",
      score: "Score",
      combo: "Best combo",
      hitMiss: "Hits/Misses",
      again: "Play Again",
      home: "Back Home"
    },
    tasks: {
      eyebrow: "Daily loop",
      title: "Stack points without touching tokens",
      copy: "Tasks are off-chain activity checks for beta retention and community energy.",
      claimedToday: "Claimed Today",
      rewardPolicy: "Reward Policy",
      rewardCopy: "Rewards respect the 1,000 points daily cap.",
      antiBot: "Anti-bot",
      antiCopy: "Run tasks need real server-validated play.",
      checkin: "Daily Check-in",
      checkinCopy: "Return tomorrow to keep your beta pulse alive.",
      drops: "Explore Drops",
      dropsCopy: "Partner and ecosystem tasks can appear here later.",
      meme: "Meme Contest",
      memeCopy: "Community posts can be rewarded without token promises.",
      claimed: "Claimed",
      claim: "Claim",
      watchAd: "Watch Ad",
      locked: "Locked",
      points: "points"
    },
    ads: {
      label: "Sponsored",
      watchTitle: "Sponsored break",
      watchCopy: "View this sponsor to unlock Daily Check-in.",
      done: "Ad viewed",
      visit: "Visit sponsor",
      continue: "Continue"
    },
    friends: {
      eyebrow: "Growth loop",
      title: "Invite runners, not bots",
      copy: "Referral points unlock only after a friend completes a valid run.",
      invite: "Your invite link",
      copyLink: "Copy",
      copied: "Copied",
      loading: "Loading invite link...",
      total: "total referral points",
      bonus: "Bonus",
      bonusCopy: "10% of invited player's valid Catchy Points.",
      limit: "Limit",
      limitCopy: "Max 20 counted referrals per day.",
      quality: "Quality",
      qualityCopy: "No bonus until the invited user plays.",
      squad: "Squad",
      tribe: "Blue Rabbit Tribe",
      tribeCopy: "Squad/tribe UI for community races, inspired by Notcoin squads and Blum tribes.",
      empty: "No invited runners yet",
      emptyCopy: "Share the link when the closed beta crew is ready."
    },
    leaders: {
      eyebrow: "Competition",
      title: "Meme board",
      copy: "Suspicious users stay out. Only server-awarded points count.",
      empty: "Leaderboard warming up",
      emptyCopy: "Finish a run to light up this board.",
      best: "best",
      boards: { today: "Today", allTime: "All Time", referrers: "Referrers", earlyBelievers: "Early" }
    },
    wallet: {
      eyebrow: "TON layer",
      title: "Wallet Connect",
      copy: "Connect a TON wallet for identity binding only. No token claim, no payment, and no transaction is requested in this MVP.",
      connect: "Connect wallet",
      connected: "Wallet connected",
      saved: "Saved to profile",
      notSaved: "Not saved yet",
      bind: "Save wallet",
      address: "Address",
      sdk: "TON SDK",
      sdkCopy: "Backend validates wallet addresses with @ton/core before saving.",
      safety: "Safety",
      safetyCopy: "CATCHY will never ask for seed phrases. This screen does not request transactions.",
      utility: "Future utility",
      utilityCopy: "Wallet-gated cosmetics, snapshots and community rewards can be added after rules are public.",
      steps: ["1. Connect wallet", "2. Save address", "3. Review beta activity", "4. Publish token rules before any claim"]
    },
    settings: {
      eyebrow: "App settings",
      title: "Language and local preferences",
      copy: "Switch the interface language. Your choice is saved on this device.",
      language: "Language",
      selected: "Selected",
      english: "English",
      russian: "Russian",
      noteTitle: "Telegram ready",
      note: "Language is stored locally now and can later be synced to your Telegram profile."
    },
    rail: {
      economy: "Economy",
      rules: "MVP rules",
      rulesList: ["5 energy cap", "30-second runs", "50,000 score cap", "1,000 points/day"],
      pulse: "Player pulse",
      loading: "Loading",
      earned: "Catchy Points earned",
      preparing: "Preparing local profile",
      roadmap: "Roadmap",
      steps: ["MVP core", "Growth loop", "Closed beta", "Token readiness"]
    }
  },
  ru: {
    tabs: {
      home: ["Главная", "Профиль и сезон"],
      play: ["Играть", "Забег 30 секунд"],
      tasks: ["Задания", "Ежедневная активность"],
      friends: ["Друзья", "Рефералы"],
      leaderboard: ["Лидеры", "Соревнование"],
      wallet: ["Кошелек", "Скоро"],
      settings: ["Настройки", "Язык"]
    },
    brandEyebrow: "Мем-раннер внутри Telegram",
    tagline: "Лови TON-искры, обходи FUD и поднимайся в мем-рейтинге.",
    loading: "Заряжаем голубые искры...",
    loadingMeta: "Готовим профиль, энергию и таблицу лидеров",
    run: "Забег",
    tokenStatus: "Статус токена",
    tokenNote: "В MVP используются только Catchy Points. Нет токена, клейма и транзакций.",
    stats: {
      memePoints: "Catchy Points",
      offchain: "Внутриигровая активность",
      energy: "Энергия",
      regen: "1 энергия / 30 мин",
      level: "Уровень",
      bestRun: "Лучший забег",
      totalRuns: "всего забегов"
    },
    home: {
      season: "Сезон 01 / Закрытая бета",
      sprint: "Blue Spark Sprint",
      level: "Уровень",
      runs: "забегов",
      play: "Играть 30 сек",
      empty: "Нет энергии",
      dailyCap: "Дневной лимит",
      nextLevel: "Искра до уровня",
      economyRule: "Правило экономики",
      disclaimer: "Catchy Points - это внутриигровые очки активности. Это не токены и не деньги, но они будут важной частью расчета будущих наград, если награды будут объявлены.",
      quickTasks: "Ежедневные задания",
      quickTasksCopy: "Забирай награды за соцсети и забеги",
      quickFriends: "Пригласить друзей",
      quickFriendsCopy: "Получай 10% после их первого честного забега",
      quickLeaders: "Таблица лидеров",
      quickLeadersCopy: "Сегодня, за все время, рефералы, ранние участники"
    },
    claim: {
      eyebrow: "Фарминг",
      title: "Blue Spark Farm",
      copy: "Зайди, сыграй и забери импульс сессии.",
      next: "Следующий клейм",
      potential: "Потенциал",
      button: "Скоро"
    },
    mechanics: {
      spark: "Искры",
      sparkCopy: "Жми по голубым искрам. Промахи уменьшают счет.",
      boost: "Буст",
      boostCopy: "Золотые искры удваивают очки на несколько секунд.",
      shield: "Щит",
      shieldCopy: "Зеленый щит блокирует следующий FUD.",
      fud: "FUD-сигналы",
      fudCopy: "Красные блоки снижают счет, если нет щита."
    },
    boosts: {
      eyebrow: "Бусты",
      title: "Карты силы",
      copy: "В духе tap-игр, но с серверными лимитами для честной беты.",
      turbo: "Turbo Tap",
      turboCopy: "Окно двойного счета во время забега",
      full: "Полная энергия",
      fullCopy: "Мгновенное восстановление для бета-тестеров",
      auto: "Auto Runner",
      autoCopy: "Оффлайн-очки появятся позже",
      guard: "Combo Guard",
      guardCopy: "Защитит серию после одного промаха",
      locked: "Закрыто",
      soon: "Скоро"
    },
    ladder: {
      eyebrow: "Прогресс",
      title: "Лестница статуса",
      copy: "Рост статуса как в Bums, но без финансовых обещаний.",
      steps: ["Rookie Spark", "Street Runner", "Blue Degen", "TON Phantom"]
    },
    play: {
      eyebrow: "Забег 30 секунд",
      title: "Лови искры. Избегай FUD.",
      copy: "Только точные клики добавляют счет. Промахи, пропущенные искры и FUD уменьшают результат.",
      energyCost: "Стоимость энергии",
      energyCopy: "1 энергия за забег. Сейчас энергии:",
      antiInflation: "Антиинфляция",
      antiCopy: "Счет растет только от точных кликов. Ошибки и FUD снижают итог.",
      dailyCap: "Дневной лимит",
      dailyCopy: "Catchy Points останавливаются на 1,000 в день.",
      guideTitle: "Как играть",
      guideSteps: ["Нажимай на голубые искры до того, как они улетят", "Избегай красных FUD-блоков, если нет щита", "Точные нажатия дают очки; промахи и пропущенные искры снимают очки", "Каждые 5 секунд искры становятся меньше и быстрее"],
      start: "Начать забег",
      complete: "Забег завершен",
      streak: "Точная серия",
      collected: "Искры собраны",
      score: "Счет",
      combo: "Лучшее комбо",
      hitMiss: "Попадания/промахи",
      again: "Играть снова",
      home: "На главную"
    },
    tasks: {
      eyebrow: "Ежедневный цикл",
      title: "Копи очки без токенов",
      copy: "Задания проверяют активность в бете и энергию сообщества.",
      claimedToday: "Забрано сегодня",
      rewardPolicy: "Правило наград",
      rewardCopy: "Награды учитывают дневной лимит 1,000 очков.",
      antiBot: "Антибот",
      antiCopy: "Игровые задания требуют серверно подтвержденного забега.",
      checkin: "Ежедневный вход",
      checkinCopy: "Вернись завтра, чтобы сохранить бета-пульс.",
      drops: "Дропы",
      dropsCopy: "Партнерские задания появятся здесь позже.",
      meme: "Мем-конкурс",
      memeCopy: "Посты сообщества могут получать награды без обещаний токена.",
      claimed: "Забрано",
      claim: "Забрать",
      locked: "Закрыто",
      points: "очков"
    },
    friends: {
      eyebrow: "Рост",
      title: "Зови игроков, не ботов",
      copy: "Реферальные очки открываются только после честного забега друга.",
      invite: "Твоя ссылка",
      loading: "Загружаем ссылку...",
      total: "реферальных очков всего",
      bonus: "Бонус",
      bonusCopy: "10% от честных Catchy Points приглашенного игрока.",
      limit: "Лимит",
      limitCopy: "До 20 засчитанных рефералов в день.",
      quality: "Качество",
      qualityCopy: "Бонуса нет, пока приглашенный не сыграет.",
      squad: "Команда",
      tribe: "Blue Rabbit Tribe",
      tribeCopy: "Командный UI для гонок сообщества в духе Notcoin squads и Blum tribes.",
      empty: "Пока нет приглашенных игроков",
      emptyCopy: "Поделись ссылкой, когда команда беты будет готова."
    },
    leaders: {
      eyebrow: "Соревнование",
      title: "Мем-рейтинг",
      copy: "Подозрительные игроки не попадают в рейтинг. Считаются только серверные очки.",
      empty: "Рейтинг прогревается",
      emptyCopy: "Заверши забег, чтобы зажечь таблицу.",
      best: "лучший",
      boards: { today: "Сегодня", allTime: "Все время", referrers: "Рефералы", earlyBelievers: "Ранние" }
    },
    wallet: {
      eyebrow: "Слой V2",
      title: "Кошелек скоро",
      copy: "В MVP нет токена, клейма и транзакций. CATCHY сначала строит игру и комьюнити.",
      now: "Сейчас",
      nowCopy: "Оффчейн-очки, лидерборд, удержание, качество рефералов.",
      before: "До токена",
      beforeCopy: "Правила снапшота, проверка ботов, метаданные, публичное предупреждение.",
      later: "Позже",
      laterCopy: "TON Connect, привязка кошелька, косметическая польза, награды сообщества.",
      steps: ["1. Набрать traction", "2. Проверить подозрительные аккаунты", "3. Опубликовать правила снапшота", "4. Добавить TON Connect позже"]
    },
    settings: {
      eyebrow: "Настройки",
      title: "Язык и локальные параметры",
      copy: "Переключи язык интерфейса. Выбор сохранится на этом устройстве.",
      language: "Язык",
      selected: "Выбрано",
      english: "Английский",
      russian: "Русский",
      noteTitle: "Готово для Telegram",
      note: "Сейчас язык хранится локально, позже его можно синхронизировать с Telegram-профилем."
    },
    rail: {
      economy: "Экономика",
      rules: "Правила MVP",
      rulesList: ["Лимит энергии 5", "Забеги по 30 секунд", "Лимит счета 50,000", "1,000 очков/день"],
      pulse: "Пульс игрока",
      loading: "Загрузка",
      earned: "Catchy Points заработано",
      preparing: "Готовим локальный профиль",
      roadmap: "План",
      steps: ["MVP core", "Growth loop", "Закрытая бета", "Готовность к токену"]
    }
  }
} as const;

type Copy = (typeof copy)[Language];
const adCopy = {
  label: "Sponsored",
  watchTitle: "Sponsored break",
  watchCopy: "View this sponsor to unlock Daily Check-in.",
  done: "Ad viewed",
  visit: "Visit sponsor",
  continue: "Continue"
};

function getInitialLanguage(): Language {
  const saved = localStorage.getItem(LANG_KEY);
  return saved === "ru" ? "ru" : "en";
}

export function App() {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const [screen, setScreen] = useState<Screen>("home");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [homeAd, setHomeAd] = useState<Ad | null>(null);
  const [afterRunAd, setAfterRunAd] = useState<Ad | null>(null);
  const [referrals, setReferrals] = useState<{ inviteLink: string; referrals: Array<{ pointsEarned: number; invited: { username: string } }>; totalBonus: number } | null>(null);
  const [leaders, setLeaders] = useState<Array<{ rank: number; user: { telegramId: string; username: string; firstName: string }; score: number; bestScore: number }>>([]);
  const [leaderType, setLeaderType] = useState("today");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const t = copy[language];
  const tabs = useMemo<Array<{ id: Screen; label: string; hint: string }>>(() => [
    { id: "home", label: t.tabs.home[0], hint: t.tabs.home[1] },
    { id: "play", label: t.tabs.play[0], hint: t.tabs.play[1] },
    { id: "tasks", label: t.tabs.tasks[0], hint: t.tabs.tasks[1] },
    { id: "friends", label: t.tabs.friends[0], hint: t.tabs.friends[1] },
    { id: "leaderboard", label: t.tabs.leaderboard[0], hint: t.tabs.leaderboard[1] },
    { id: "wallet", label: t.tabs.wallet[0], hint: t.tabs.wallet[1] },
    { id: "settings", label: t.tabs.settings[0], hint: t.tabs.settings[1] }
  ], [t]);

  function setLanguage(next: Language) {
    setLanguageState(next);
    localStorage.setItem(LANG_KEY, next);
  }

  const refreshProfile = useCallback(async () => {
    const next = await api.profile();
    setProfile(next);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setSplashDone(true), 850);
    return () => window.clearTimeout(timer);
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

  useEffect(() => {
    if (!profile) return;
    api.ads("home_top").then((res) => setHomeAd(res.ads[0] || null)).catch(() => setHomeAd(null));
    api.ads("after_run").then((res) => setAfterRunAd(res.ads[0] || null)).catch(() => setAfterRunAd(null));
  }, [profile]);

  const statCards = useMemo(() => profile ? [
    [t.stats.memePoints, formatNumber(profile.stats.memePoints), t.stats.offchain],
    [t.stats.energy, `${profile.stats.energy}/5`, t.stats.regen],
    [t.stats.level, profile.stats.level, `${profile.stats.xp} XP`],
    [t.stats.bestRun, formatNumber(profile.stats.bestScore), `${profile.stats.totalRuns} ${t.stats.totalRuns}`]
  ] : [], [profile, t]);

  if (loading || !splashDone) return <Loading t={t} />;

  return (
    <main className="app-shell">
      <aside className="desktop-rail">
        <BrandBlock compact t={t} />
        <nav className="side-nav" aria-label="Desktop navigation">
          {tabs.map((tab) => (
            <button className={screen === tab.id ? "active" : ""} key={tab.id} onClick={() => setScreen(tab.id)}>
              <strong>{tab.label}</strong>
              <span>{tab.hint}</span>
            </button>
          ))}
        </nav>
        <div className="rail-note">
          <strong>{t.tokenStatus}</strong>
          <span>{t.tokenNote}</span>
        </div>
      </aside>

      <section className="app-main">
        <header className="hero">
          <BrandBlock t={t} />
          <div className="hero-actions">
            <button className="mini-chip" onClick={() => setScreen("play")}>{t.run}</button>
            <button className="mini-chip soft" onClick={() => setScreen("tasks")}>{t.tabs.tasks[0]}</button>
            <button className="mini-chip soft" onClick={() => setScreen("settings")}>{language.toUpperCase()}</button>
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
              ad={homeAd}
              disclaimer={language === "ru" ? t.home.disclaimer : profile.disclaimer}
              t={t}
            />
          )}
          {screen === "play" && <Play ad={afterRunAd} onDone={refreshProfile} onError={setError} stats={profile?.stats} onHome={() => setScreen("home")} t={t} />}
          {screen === "tasks" && (
            <Tasks
              tasks={tasks}
              t={t}
              onRefresh={async () => setTasks((await api.tasks()).tasks)}
              onClaim={async (taskId) => {
                const res = await api.claimTask(taskId);
                setProfile((old) => old && ({ ...old, stats: res.stats }));
                setTasks((await api.tasks()).tasks);
              }}
            />
          )}
          {screen === "friends" && <Friends referrals={referrals} t={t} />}
          {screen === "leaderboard" && <Leaderboard rows={leaders} type={leaderType} onType={setLeaderType} t={t} />}
          {screen === "wallet" && <Wallet user={profile?.user} onBound={refreshProfile} onError={setError} t={t} />}
          {screen === "settings" && <Settings language={language} onLanguage={setLanguage} t={t} />}
        </section>
      </section>

      <aside className="insight-rail">
        <InsightRail stats={profile?.stats} t={t} />
      </aside>

      <nav className="bottom-nav" aria-label="Main navigation">
        {tabs.filter((tab) => tab.id !== "play").map((tab) => (
          <button className={screen === tab.id ? "active" : ""} key={tab.id} onClick={() => setScreen(tab.id)}>{tab.label}</button>
        ))}
      </nav>
    </main>
  );
}

function BrandBlock({ compact = false, t }: { compact?: boolean; t: Copy }) {
  return (
    <div className={compact ? "brand-block compact-brand" : "brand-block"}>
      <div className="mascot" aria-label="CATCHY mascot">
        <img src={mascotHero} alt="" />
      </div>
      <div className="title-block">
        <p className="eyebrow">{t.brandEyebrow}</p>
        <h1>CATCHY RUN</h1>
        {!compact && <p className="tagline">{t.tagline}</p>}
      </div>
    </div>
  );
}

function Loading({ t }: { t: Copy }) {
  return (
    <main className="app-shell loading splash-screen">
      <div className="splash-card">
        <div className="splash-mascot" aria-label="CATCHY mascot">
          <img src={mascotHero} alt="" />
        </div>
        <h1>CATCHY RUN</h1>
        <p>{t.loading}</p>
        <span>{t.loadingMeta}</span>
        <div className="splash-track"><i /></div>
      </div>
    </main>
  );
}

function Home({ stats, username, onPlay, onScreen, ad, disclaimer, t }: { stats: Stats; username: string; onPlay: () => void; onScreen: (screen: Screen) => void; ad: Ad | null; disclaimer: string; t: Copy }) {
  const dailyPercent = Math.min(100, Math.round((stats.dailyPoints / 1000) * 100));
  const xpPercent = Math.min(100, Math.round(((stats.xp % 120) / 120) * 100));
  return (
    <div className="home-grid">
      <section className="season-card feature-card">
        <div>
          <p className="eyebrow">{t.home.season}</p>
          <h2>{t.home.sprint}</h2>
          <span>@{username} / {t.home.level} {stats.level} / {stats.totalRuns} {t.home.runs}</span>
        </div>
        <button className="play-button hero-play" disabled={stats.energy <= 0} onClick={onPlay}>{stats.energy > 0 ? t.home.play : t.home.empty}</button>
      </section>

      <div className="home-columns">
        <section className="detail-stack">
          <ClaimPanel stats={stats} t={t} />
          <Progress label={t.home.dailyCap} value={`${stats.dailyPoints}/1000`} percent={dailyPercent} />
          <Progress label={t.home.nextLevel} value={`${stats.xp % 120}/120 XP`} percent={xpPercent} />
          <div className="mechanic-grid">
            <InfoTile icon="spark" title={t.mechanics.spark} copy={t.mechanics.sparkCopy} />
            <InfoTile icon="boost" title={t.mechanics.boost} copy={t.mechanics.boostCopy} />
            <InfoTile icon="shield" title={t.mechanics.shield} copy={t.mechanics.shieldCopy} />
            <InfoTile icon="fud" title={t.mechanics.fud} copy={t.mechanics.fudCopy} />
          </div>
          <BoostDeck t={t} />
        </section>

        <section className="detail-stack">
          <StatusLadder stats={stats} t={t} />
          <div className="quick-actions">
            <button onClick={() => onScreen("tasks")}><strong>{t.home.quickTasks}</strong><span>{t.home.quickTasksCopy}</span></button>
            <button onClick={() => onScreen("friends")}><strong>{t.home.quickFriends}</strong><span>{t.home.quickFriendsCopy}</span></button>
            <button onClick={() => onScreen("leaderboard")}><strong>{t.home.quickLeaders}</strong><span>{t.home.quickLeadersCopy}</span></button>
          </div>
          <div className="rule-card">
            <strong>{t.home.economyRule}</strong>
            <span>{disclaimer}</span>
          </div>
          {ad && <AdBanner ad={ad} />}
        </section>
      </div>
    </div>
  );
}

function ClaimPanel({ stats, t }: { stats: Stats; t: Copy }) {
  return (
    <section className="claim-panel">
      <div>
        <p className="eyebrow">{t.claim.eyebrow}</p>
        <h3>{t.claim.title}</h3>
        <span>{t.claim.copy}</span>
      </div>
      <div className="claim-metrics">
        <span><strong>{stats.energy}/5</strong>{t.stats.energy}</span>
        <span><strong>2h 18m</strong>{t.claim.next}</span>
        <span><strong>+120</strong>{t.claim.potential}</span>
      </div>
      <button className="secondary-action">{t.claim.button}</button>
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

function BoostDeck({ t }: { t: Copy }) {
  const boosts = [
    ["boost", t.boosts.turbo, t.boosts.turboCopy, "Daily x2"],
    ["play", t.boosts.full, t.boosts.fullCopy, "3/day"],
    ["spark", t.boosts.auto, t.boosts.autoCopy, t.boosts.locked],
    ["shield", t.boosts.guard, t.boosts.guardCopy, t.boosts.soon]
  ];
  return (
    <section className="boost-deck">
      <ScreenTitle eyebrow={t.boosts.eyebrow} title={t.boosts.title} copy={t.boosts.copy} />
      <div className="boost-grid">
        {boosts.map(([icon, title, copy, tag]) => <InfoTile key={title} icon={icon as "spark" | "boost" | "shield" | "fud" | "play"} title={`${title} / ${tag}`} copy={copy} />)}
      </div>
    </section>
  );
}

function StatusLadder({ stats, t }: { stats: Stats; t: Copy }) {
  const level = stats.level;
  const steps: Array<[string, boolean]> = [
    [t.ladder.steps[0], level >= 1],
    [t.ladder.steps[1], level >= 2],
    [t.ladder.steps[2], level >= 4],
    [t.ladder.steps[3], level >= 7]
  ];
  return (
    <section className="status-ladder">
      <ScreenTitle eyebrow={t.ladder.eyebrow} title={t.ladder.title} copy={t.ladder.copy} />
      <div className="ladder-list">
        {steps.map(([label, active]) => <span className={active ? "active" : ""} key={String(label)}>{label}</span>)}
      </div>
    </section>
  );
}


function Play({ ad, onDone, onError, stats, onHome, t }: { ad: Ad | null; onDone: () => Promise<void>; onError: (msg: string) => void; stats?: Stats; onHome: () => void; t: Copy }) {
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
          <ScreenTitle eyebrow={t.play.eyebrow} title={t.play.title} copy={t.play.copy} />
          <div className="run-prep-grid">
            <InfoTile title={t.play.energyCost} copy={`${t.play.energyCopy} ${stats?.energy ?? 0}/5.`} />
            <InfoTile title={t.play.antiInflation} copy={t.play.antiCopy} />
            <InfoTile title={t.play.dailyCap} copy={t.play.dailyCopy} />
          </div>
          <section className="how-to-play">
            <div>
              <p className="eyebrow">{t.mechanics.spark}</p>
              <h3>{t.play.guideTitle}</h3>
            </div>
            <ol>
              {t.play.guideSteps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>
          <button className="play-button compact" disabled={!stats || stats.energy <= 0} onClick={start}>{t.play.start}</button>
        </div>
      )}
      {run && <GameCanvas durationSeconds={run.durationSeconds} onFinish={finish} />}
      {result && (
        <div className="result-backdrop" role="dialog" aria-modal="true" aria-label="Run result">
          <div className="result-card">
            <p className="eyebrow">{t.play.complete}</p>
            <h2>{result.summary.combo >= 6 ? t.play.streak : t.play.collected}</h2>
            <div className="result-metrics">
              <span><strong>{formatNumber(result.score)}</strong>{t.play.score}</span>
              <span><strong>x{result.summary.combo}</strong>{t.play.combo}</span>
              <span><strong>{result.summary.hits}/{result.summary.misses}</strong>{t.play.hitMiss}</span>
              <span><strong>+{result.pointsEarned}</strong>{t.stats.memePoints}</span>
            </div>
            {ad && <AdBanner ad={ad} compact />}
            <div className="result-actions">
              <button onClick={start}>{t.play.again}</button>
              <button className="secondary-action" onClick={onHome}>{t.play.home}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tasks({ tasks, onClaim, onRefresh, t }: { tasks: Task[]; onClaim: (taskId: string) => Promise<void>; onRefresh: () => Promise<void>; t: Copy }) {
  const claimed = tasks.filter((task) => task.claimed).length;
  const [watching, setWatching] = useState(false);
  const [watchAd, setWatchAd] = useState<Ad | null>(null);
  const watchAdLabel = "watchAd" in t.tasks ? t.tasks.watchAd : "Watch Ad";

  async function openWatchAd() {
    const res = await api.ads("daily_checkin");
    setWatchAd(res.ads[0] || null);
    setWatching(true);
  }

  return (
    <div className="screen-stack">
      <ScreenTitle eyebrow={t.tasks.eyebrow} title={t.tasks.title} copy={t.tasks.copy} />
      <div className="summary-strip">
        <InfoTile title={t.tasks.claimedToday} copy={`${claimed}/${tasks.length || 5} ${t.tabs.tasks[0].toLowerCase()}`} />
        <InfoTile title={t.tasks.rewardPolicy} copy={t.tasks.rewardCopy} />
        <InfoTile title={t.tasks.antiBot} copy={t.tasks.antiCopy} />
      </div>
      <div className="campaign-board">
        <InfoTile icon="spark" title={t.tasks.checkin} copy={t.tasks.checkinCopy} />
        <InfoTile icon="boost" title={t.tasks.drops} copy={t.tasks.dropsCopy} />
        <InfoTile icon="play" title={t.tasks.meme} copy={t.tasks.memeCopy} />
      </div>
      <div className="list">
        {tasks.map((task) => (
          <article className="row mission-row" key={task.id}>
            <div>
              <strong>{taskTitle(task, t)}</strong>
              <span>{taskCopy(task.code, t)} / +{task.rewardPoints} {t.tasks.points}</span>
            </div>
            <button
              disabled={task.claimed || (!task.claimable && task.code !== "join_channel")}
              onClick={() => task.code === "join_channel" && !task.claimable ? openWatchAd() : onClaim(task.id)}
            >
              {task.claimed ? t.tasks.claimed : task.code === "join_channel" && !task.claimable ? watchAdLabel : task.claimable ? t.tasks.claim : t.tasks.locked}
            </button>
          </article>
        ))}
      </div>
      {watching && <WatchAdModal ad={watchAd} onClose={() => setWatching(false)} onViewed={onRefresh} />}
    </div>
  );
}

function Friends({ referrals, t }: { referrals: { inviteLink: string; referrals: Array<{ pointsEarned: number; invited: { username: string } }>; totalBonus: number } | null; t: Copy }) {
  const [copied, setCopied] = useState(false);
  const inviteLink = referrals?.inviteLink || "";
  const copyLabel = "copyLink" in t.friends ? t.friends.copyLink : "Copy";
  const copiedLabel = "copied" in t.friends ? t.friends.copied : "Copied";

  async function copyInvite() {
    if (!inviteLink) return;
    await navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="friends screen-stack">
      <ScreenTitle eyebrow={t.friends.eyebrow} title={t.friends.title} copy={t.friends.copy} />
      <div className="invite-card">
        <span>{t.friends.invite}</span>
        <div className="invite-link-row">
          <p>{inviteLink || t.friends.loading}</p>
          <button disabled={!inviteLink} onClick={copyInvite}>{copied ? copiedLabel : copyLabel}</button>
        </div>
        <strong>{referrals?.totalBonus || 0} {t.friends.total}</strong>
      </div>
      <div className="summary-strip">
        <InfoTile title={t.friends.bonus} copy={t.friends.bonusCopy} />
        <InfoTile title={t.friends.limit} copy={t.friends.limitCopy} />
        <InfoTile title={t.friends.quality} copy={t.friends.qualityCopy} />
      </div>
      <div className="squad-card">
        <div>
          <p className="eyebrow">{t.friends.squad}</p>
          <h3>{t.friends.tribe}</h3>
          <span>{t.friends.tribeCopy}</span>
        </div>
        <strong>Rank #12</strong>
      </div>
      {referrals?.referrals.length ? referrals.referrals.map((ref) => (
        <div className="row" key={ref.invited.username}><strong>@{ref.invited.username}</strong><span>+{ref.pointsEarned}</span></div>
      )) : <EmptyState title={t.friends.empty} copy={t.friends.emptyCopy} />}
    </div>
  );
}

function AdBanner({ ad, compact = false }: { ad: Ad; compact?: boolean }) {
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    if (tracked) return;
    setTracked(true);
    api.adImpression(ad.id).catch(() => undefined);
  }, [ad.id, tracked]);

  async function openAd() {
    const res = await api.adClick(ad.id);
    window.open(res.targetUrl || ad.targetUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <article className={compact ? "ad-banner compact-ad" : "ad-banner"}>
      <span>{adCopy.label} / {ad.sponsor}</span>
      <strong>{ad.title}</strong>
      <p>{ad.copy}</p>
      <button onClick={openAd}>{ad.cta}</button>
    </article>
  );
}

function WatchAdModal({ ad, onClose, onViewed }: { ad: Ad | null; onClose: () => void; onViewed: () => Promise<void> }) {
  const [viewed, setViewed] = useState(false);

  async function markViewed() {
    if (!ad) return;
    await api.adImpression(ad.id);
    setViewed(true);
    await onViewed();
  }

  async function visitSponsor() {
    if (!ad) return;
    const res = await api.adClick(ad.id);
    window.open(res.targetUrl || ad.targetUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="result-backdrop" role="dialog" aria-modal="true" aria-label={adCopy.watchTitle}>
      <div className="result-card ad-modal">
        <p className="eyebrow">{adCopy.label}</p>
        <h2>{ad?.title || adCopy.watchTitle}</h2>
        <span>{ad?.copy || adCopy.watchCopy}</span>
        <div className="result-actions">
          <button onClick={visitSponsor} disabled={!ad}>{ad?.cta || adCopy.visit}</button>
          <button className="secondary-action" onClick={markViewed} disabled={!ad || viewed}>{viewed ? adCopy.done : adCopy.continue}</button>
        </div>
        <button className="secondary-action" onClick={onClose}>{viewed ? "OK" : "Close"}</button>
      </div>
    </div>
  );
}

function Leaderboard({ rows, type, onType, t }: { rows: Array<{ rank: number; user: { telegramId: string; username: string; firstName: string }; score: number; bestScore: number }>; type: string; onType: (type: string) => void; t: Copy }) {
  return (
    <div className="screen-stack">
      <ScreenTitle eyebrow={t.leaders.eyebrow} title={t.leaders.title} copy={t.leaders.copy} />
      <div className="segments">{["today", "allTime", "referrers", "earlyBelievers"].map((item) => <button className={type === item ? "active" : ""} key={item} onClick={() => onType(item)}>{labelForBoard(item, t)}</button>)}</div>
      <div className="podium">
        {rows.slice(0, 3).map((row) => <div className="podium-card" key={row.rank}><span>#{row.rank}</span><strong>{row.user.firstName}</strong><small>TG ID {row.user.telegramId}</small><em>{row.score} pts</em></div>)}
      </div>
      <div className="list">
        {rows.length ? rows.map((row) => (
          <article className="row leader-row" key={`${row.rank}-${row.user.telegramId || row.user.username}`}>
            <div>
              <strong>#{row.rank} {row.user.firstName}</strong>
              <span>@{row.user.username || "runner"} / TG ID {row.user.telegramId || "unknown"} / {t.leaders.best} {row.bestScore}</span>
            </div>
            <em>{row.score} pts</em>
          </article>
        )) : <EmptyState title={t.leaders.empty} copy={t.leaders.emptyCopy} />}
      </div>
    </div>
  );
}

function Wallet({ user, onBound, onError, t }: { user?: Profile["user"]; onBound: () => void; onError: (message: string) => void; t: Copy }) {
  const friendlyAddress = useTonAddress();
  const rawAddress = useTonAddress(false);
  const wallet = useTonWallet();
  const [saving, setSaving] = useState(false);
  const savedAddress = user?.walletAddress || "";
  const isSaved = Boolean(rawAddress && savedAddress === rawAddress);
  const walletCopy = {
    connect: "Connect wallet",
    connected: "Wallet connected",
    saved: "Saved to profile",
    notSaved: "Not saved yet",
    bind: "Save wallet",
    address: "Address",
    sdk: "TON SDK",
    sdkCopy: "Backend validates wallet addresses with @ton/core before saving.",
    safety: "Safety",
    safetyCopy: "CATCHY will never ask for seed phrases. This screen does not request transactions.",
    utility: "Future utility",
    utilityCopy: "Wallet-gated cosmetics, snapshots and community rewards can be added after rules are public.",
    ...t.wallet
  };

  const bindWallet = async () => {
    if (!rawAddress) return;
    setSaving(true);
    try {
      await api.bindWallet(rawAddress);
      await onBound();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save wallet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wallet screen-stack">
      <ScreenTitle eyebrow={t.wallet.eyebrow} title={t.wallet.title} copy={t.wallet.copy} />
      <section className="wallet-connect-panel">
        <div>
          <p className="eyebrow">{wallet ? walletCopy.connected : walletCopy.connect}</p>
          <h3>{wallet?.device.appName || "TON Connect"}</h3>
          <span>{rawAddress ? (isSaved ? walletCopy.saved : walletCopy.notSaved) : t.wallet.copy}</span>
        </div>
        <TonConnectButton />
      </section>
      {friendlyAddress && (
        <section className="wallet-address-card">
          <p className="eyebrow">{walletCopy.address}</p>
          <strong>{friendlyAddress}</strong>
          <button disabled={saving || isSaved} onClick={bindWallet}>{saving ? "Saving..." : isSaved ? walletCopy.saved : walletCopy.bind}</button>
        </section>
      )}
      <div className="wallet-grid">
        <InfoTile title={walletCopy.sdk} copy={walletCopy.sdkCopy} />
        <InfoTile title={walletCopy.safety} copy={walletCopy.safetyCopy} />
        <InfoTile title={walletCopy.utility} copy={walletCopy.utilityCopy} />
      </div>
      <div className="wallet-timeline">
        {t.wallet.steps.map((step) => <span key={step}>{step}</span>)}
      </div>
    </div>
  );
}

function Settings({ language, onLanguage, t }: { language: Language; onLanguage: (language: Language) => void; t: Copy }) {
  return (
    <div className="settings screen-stack">
      <ScreenTitle eyebrow={t.settings.eyebrow} title={t.settings.title} copy={t.settings.copy} />
      <section className="language-card">
        <div>
          <p className="eyebrow">{t.settings.language}</p>
          <h3>{language === "en" ? t.settings.english : t.settings.russian}</h3>
          <span>{t.settings.selected}: {language.toUpperCase()}</span>
        </div>
        <div className="language-toggle" role="group" aria-label="Language">
          <button className={language === "en" ? "active" : ""} onClick={() => onLanguage("en")}>EN</button>
          <button className={language === "ru" ? "active" : ""} onClick={() => onLanguage("ru")}>RU</button>
        </div>
      </section>
      <InfoTile title={t.settings.noteTitle} copy={t.settings.note} />
    </div>
  );
}

function InsightRail({ stats, t }: { stats?: Stats; t: Copy }) {
  return (
    <div className="insight-stack">
      <section className="rail-card">
        <p className="eyebrow">{t.rail.economy}</p>
        <h3>{t.rail.rules}</h3>
        <ul>
          {t.rail.rulesList.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <section className="rail-card">
        <p className="eyebrow">{t.rail.pulse}</p>
        <h3>{stats ? `${stats.totalRuns} ${t.home.runs}` : t.rail.loading}</h3>
        <span>{stats ? `${formatNumber(stats.memePoints)} ${t.rail.earned}` : t.rail.preparing}</span>
      </section>
      <section className="rail-card">
        <p className="eyebrow">{t.rail.roadmap}</p>
        <div className="mini-roadmap">
          {t.rail.steps.map((step, index) => <span className={index < 2 ? "done" : ""} key={step}>{step}</span>)}
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

function taskTitle(task: Task, t: Copy) {
  const titles: Record<string, string> = {
    join_channel: t.tasks.checkin,
    join_group: t.tasks.drops,
    play_3_runs: t.play.title,
    invite_friend: t.home.quickFriends,
    meme_contest: t.tasks.meme,
    join: t.tasks.checkin,
    runs: t.play.title,
    invite: t.home.quickFriends,
    meme: t.tasks.meme
  };
  return titles[task.code] || task.title;
}

function taskCopy(code: string, t: Copy) {
  const copy: Record<string, string> = {
    join_channel: t.settings.noteTitle,
    join_group: t.tasks.drops,
    play_3_runs: t.tasks.antiBot,
    invite_friend: t.friends.title,
    meme_contest: t.tasks.meme,
    join: t.settings.noteTitle,
    runs: t.tasks.antiBot,
    invite: t.friends.title,
    meme: t.tasks.meme
  };
  return copy[code] || t.tasks.copy;
}

function labelForBoard(type: string, t: Copy) {
  const labels: Record<string, string> = t.leaders.boards;
  return labels[type] || type;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
