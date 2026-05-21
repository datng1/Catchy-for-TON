import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type TouchEvent } from "react";
import iconBoost from "./assets/icon-boost.png";
import iconFud from "./assets/icon-fud.png";
import iconShield from "./assets/icon-shield.png";
import iconSpark from "./assets/icon-spark.png";
import mascotRunner from "./assets/mascot-runner.png";

export type GameSummary = {
  combo: number;
  hits: number;
  misses: number;
};

type Target = {
  id: number;
  kind: "spark" | "fud" | "boost" | "shield";
  x: number;
  y: number;
  radius: number;
  speed: number;
  wobble: number;
  difficultyStep: number;
};

const WIDTH = 720;
const HEIGHT = 420;
const DIFFICULTY_INTERVAL_SECONDS = 5;
const MAX_SCORE = 50_000;
const AIR_TAP_PENALTY = 180;
const MISSED_COLLECTIBLE_PENALTY = 260;
const FUD_HIT_PENALTY = 700;
const SPARK_REWARD = 420;
const POWER_REWARD = 560;
const COMBO_BONUS = 45;

function getDifficultyStep(elapsed: number) {
  return Math.floor(elapsed / DIFFICULTY_INTERVAL_SECONDS);
}

function clampScore(score: number) {
  return Math.min(MAX_SCORE, Math.max(0, Math.round(score)));
}

function makeTarget(id: number, elapsed: number): Target {
  const difficultyStep = getDifficultyStep(elapsed);
  const sizeScale = Math.max(0.42, 1 - difficultyStep * 0.115);
  const speedBonus = difficultyStep * 62;
  const roll = Math.random();
  const kind: Target["kind"] = roll > 0.86 ? "shield" : roll > 0.76 ? "boost" : roll > 0.24 ? "spark" : "fud";
  const baseRadius = kind === "fud" ? 31 : 27;
  return {
    id,
    kind,
    x: WIDTH + 44,
    y: 92 + Math.random() * 220,
    radius: Math.max(11, baseRadius * sizeScale),
    speed: 220 + Math.random() * 120 + speedBonus + Math.min(70, elapsed * 2),
    wobble: Math.random() * Math.PI * 2,
    difficultyStep
  };
}

function drawMascot(ctx: CanvasRenderingContext2D, runner: HTMLImageElement | null, y: number, shield: boolean) {
  ctx.save();
  ctx.translate(122, y);
  if (shield) {
    ctx.strokeStyle = "rgba(75, 240, 199, .72)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.ellipse(8, -2, 72, 58, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (runner?.complete && runner.naturalWidth > 0) {
    ctx.drawImage(runner, -98, -105, 210, 196);
    ctx.restore();
    return;
  }

  const body = ctx.createRadialGradient(12, -18, 8, 0, 0, 58);
  body.addColorStop(0, "#f7fdff");
  body.addColorStop(0.5, "#7deaff");
  body.addColorStop(1, "#0784bf");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 58, 42, -0.04, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#3bd5ff";
  ctx.beginPath();
  ctx.ellipse(-20, -52, 14, 52, -0.58, 0, Math.PI * 2);
  ctx.ellipse(20, -52, 14, 52, 0.58, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#052f49";
  ctx.beginPath();
  ctx.ellipse(-12, -9, 5, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(23, -10, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#052f49";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(2, 10);
  ctx.quadraticCurveTo(20, 22, 42, 8);
  ctx.stroke();

  ctx.strokeStyle = "#bff8ff";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-64, -8);
  ctx.lineTo(-120, -24);
  ctx.moveTo(-68, 10);
  ctx.lineTo(-124, 20);
  ctx.stroke();
  ctx.restore();
}

function drawTarget(ctx: CanvasRenderingContext2D, images: Record<Target["kind"], HTMLImageElement | null>, target: Target, frame: number) {
  const y = target.y + Math.sin(frame / 18 + target.wobble) * 8;
  ctx.save();
  ctx.translate(target.x, y);

  const image = images[target.kind];
  if (image?.complete && image.naturalWidth > 0) {
    const size = Math.max(30, target.radius * (target.kind === "fud" ? 2.38 : 2.36));
    ctx.drawImage(image, -size / 2, -size / 2, size, size);
    ctx.restore();
    return;
  }

  if (target.kind === "spark" || target.kind === "boost" || target.kind === "shield") {
    const gradient = ctx.createRadialGradient(0, 0, 3, 0, 0, target.radius);
    gradient.addColorStop(0, "#ffffff");
    gradient.addColorStop(0.45, target.kind === "boost" ? "#ffe77a" : target.kind === "shield" ? "#8df9cf" : "#83f3ff");
    gradient.addColorStop(1, target.kind === "boost" ? "#ffb84a" : target.kind === "shield" ? "#20c9a3" : "#1ab8ee");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const radius = i % 2 === 0 ? target.radius : target.radius * 0.46;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = "#ff6e8a";
    ctx.beginPath();
    ctx.roundRect(-32, -25, 64, 50, 13);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 17px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("FUD", 0, 0);
  }

  ctx.restore();
}

export function GameCanvas({
  durationSeconds,
  onFinish
}: {
  durationSeconds: number;
  onFinish: (score: number, durationSeconds: number, summary: GameSummary) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const runnerRef = useRef<HTMLImageElement | null>(null);
  const iconRefs = useRef<Record<Target["kind"], HTMLImageElement | null>>({ spark: null, fud: null, boost: null, shield: null });
  const targetsRef = useRef<Target[]>([]);
  const nextIdRef = useRef(1);
  const startRef = useRef(performance.now());
  const lastRef = useRef(performance.now());
  const spawnRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);
  const hitsRef = useRef(0);
  const missesRef = useRef(0);
  const shieldRef = useRef(0);
  const boostRef = useRef(0);
  const finishedRef = useRef(false);
  const lastInputRef = useRef(0);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [feedback, setFeedback] = useState("Catch sparks. Dodge FUD.");
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [difficulty, setDifficulty] = useState(1);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const elapsed = Math.min(durationSeconds, Math.round((performance.now() - startRef.current) / 1000));
    onFinish(Math.min(50000, Math.max(0, Math.round(scoreRef.current))), elapsed, {
      combo: bestComboRef.current,
      hits: hitsRef.current,
      misses: missesRef.current
    });
  }, [durationSeconds, onFinish]);

  const tap = useCallback((clientX?: number, clientY?: number) => {
    const canvas = canvasRef.current;
    if (!canvas || finishedRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX === undefined ? WIDTH / 2 : ((clientX - rect.left) / rect.width) * WIDTH;
    const y = clientY === undefined ? HEIGHT / 2 : ((clientY - rect.top) / rect.height) * HEIGHT;
    const target = targetsRef.current.find((item) => {
      const clickForgiveness = Math.max(4, 18 - item.difficultyStep * 3);
      return Math.hypot(item.x - x, item.y - y) <= item.radius + clickForgiveness;
    });

    if (!target) {
      comboRef.current = 0;
      missesRef.current += 1;
      scoreRef.current = clampScore(scoreRef.current - AIR_TAP_PENALTY);
      setCombo(0);
      setMisses(missesRef.current);
      setScore(scoreRef.current);
      setFeedback(`Air tap -${AIR_TAP_PENALTY}`);
      return;
    }

    targetsRef.current = targetsRef.current.filter((item) => item.id !== target.id);
    if (target.kind === "fud") {
      if (shieldRef.current > 0) {
        shieldRef.current = 0;
        setFeedback("Shield blocked FUD");
      } else {
        comboRef.current = 0;
        missesRef.current += 1;
        scoreRef.current = clampScore(scoreRef.current - FUD_HIT_PENALTY);
        setFeedback(`FUD hit -${FUD_HIT_PENALTY}`);
      }
    } else {
      const multiplier = boostRef.current > 0 ? 2 : 1;
      comboRef.current += 1;
      bestComboRef.current = Math.max(bestComboRef.current, comboRef.current);
      hitsRef.current += 1;
      if (target.kind === "shield") shieldRef.current = 5;
      if (target.kind === "boost") boostRef.current = 4;
      const baseReward = target.kind === "spark" ? SPARK_REWARD : POWER_REWARD;
      const comboReward = Math.min(360, comboRef.current * COMBO_BONUS);
      const earned = baseReward * multiplier + comboReward;
      scoreRef.current = clampScore(scoreRef.current + earned);
      setFeedback(comboRef.current > 5 ? `Sharp streak +${earned}` : target.kind === "spark" ? `Spark caught +${earned}` : `Power up +${earned}`);
    }

    setScore(scoreRef.current);
    setCombo(comboRef.current);
    setHits(hitsRef.current);
    setMisses(missesRef.current);
  }, []);

  const tapFromPoint = useCallback((clientX: number, clientY: number, source: "pointer" | "touch" | "click") => {
    const now = performance.now();
    if (source !== "pointer" && now - lastInputRef.current < 90) return;
    lastInputRef.current = now;
    tap(clientX, clientY);
  }, [tap]);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    tapFromPoint(event.clientX, event.clientY, "pointer");
  }, [tapFromPoint]);

  const handleTouchStart = useCallback((event: TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const touch = event.changedTouches[0];
    if (touch) tapFromPoint(touch.clientX, touch.clientY, "touch");
  }, [tapFromPoint]);

  const handleClick = useCallback((event: MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    tapFromPoint(event.clientX, event.clientY, "click");
  }, [tapFromPoint]);

  useEffect(() => {
    const runner = new Image();
    runner.src = mascotRunner;
    runnerRef.current = runner;
    const sources: Record<Target["kind"], string> = { spark: iconSpark, fud: iconFud, boost: iconBoost, shield: iconShield };
    iconRefs.current = Object.fromEntries(Object.entries(sources).map(([kind, src]) => {
      const image = new Image();
      image.src = src;
      return [kind, image];
    })) as Record<Target["kind"], HTMLImageElement>;
    let raf = 0;
    let frame = 0;
    const loop = (now: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx || finishedRef.current) return;

      const delta = Math.min(0.06, (now - lastRef.current) / 1000);
      lastRef.current = now;
      const elapsed = (now - startRef.current) / 1000;
      const difficultyStep = getDifficultyStep(elapsed);
      const remaining = Math.max(0, durationSeconds - elapsed);
      setTimeLeft(Math.ceil(remaining));
      setDifficulty(difficultyStep + 1);
      frame += 1;

      shieldRef.current = Math.max(0, shieldRef.current - delta);
      boostRef.current = Math.max(0, boostRef.current - delta);
      spawnRef.current -= delta;
      if (spawnRef.current <= 0) {
        targetsRef.current.push(makeTarget(nextIdRef.current, elapsed));
        nextIdRef.current += 1;
        spawnRef.current = Math.max(0.2, 0.82 - difficultyStep * 0.09);
      }

      let missedCollectibles = 0;
      targetsRef.current = targetsRef.current
        .map((target) => {
          const liveDifficultyBoost = 1 + Math.max(0, difficultyStep - target.difficultyStep) * 0.12;
          return { ...target, x: target.x - target.speed * liveDifficultyBoost * delta };
        })
        .filter((target) => {
          const missed = target.x < -70;
          if (missed && target.kind !== "fud") {
            missedCollectibles += 1;
          }
          return !missed;
        });

      if (missedCollectibles > 0) {
        comboRef.current = 0;
        missesRef.current += missedCollectibles;
        scoreRef.current = clampScore(scoreRef.current - MISSED_COLLECTIBLE_PENALTY * missedCollectibles);
        setCombo(0);
        setMisses(missesRef.current);
        setScore(scoreRef.current);
        setFeedback(missedCollectibles === 1 ? `Missed spark -${MISSED_COLLECTIBLE_PENALTY}` : `${missedCollectibles} missed -${MISSED_COLLECTIBLE_PENALTY * missedCollectibles}`);
      }

      const grd = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      grd.addColorStop(0, "#ebfcff");
      grd.addColorStop(0.58, "#aeefff");
      grd.addColorStop(1, "#7ed7f2");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.fillStyle = "rgba(255,255,255,.55)";
      for (let i = 0; i < 12; i += 1) {
        ctx.beginPath();
        ctx.roundRect((frame * 1.5 + i * 84) % (WIDTH + 90) - 90, 42 + (i % 4) * 54, 58, 10, 6);
        ctx.fill();
      }

      ctx.fillStyle = "rgba(5,59,92,.13)";
      ctx.fillRect(0, HEIGHT - 54, WIDTH, 54);
      ctx.fillStyle = "rgba(255,255,255,.35)";
      for (let i = 0; i < 7; i += 1) ctx.fillRect((frame * 5 + i * 130) % (WIDTH + 90) - 90, HEIGHT - 28, 70, 8);

      drawMascot(ctx, runnerRef.current, HEIGHT - 88 - Math.sin(frame / 8) * 8, shieldRef.current > 0);
      targetsRef.current.forEach((target) => drawTarget(ctx, iconRefs.current, target, frame));

      if (boostRef.current > 0 || shieldRef.current > 0) {
        ctx.fillStyle = "rgba(4,47,73,.72)";
        ctx.font = "800 18px Inter, sans-serif";
        ctx.fillText(`${boostRef.current > 0 ? "BOOST x2 " : ""}${shieldRef.current > 0 ? "SHIELD" : ""}`, 22, 34);
      }

      if (remaining <= 0) {
        finish();
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [durationSeconds, finish]);

  return (
    <div className="game-wrap">
      <div className="hud">
        <span>{timeLeft}s</span>
        <span>Score {score}</span>
        <span>Lv {difficulty} / x{combo}</span>
      </div>
      <canvas
        ref={canvasRef}
        width={WIDTH}
        height={HEIGHT}
        onPointerDown={handlePointerDown}
        onTouchStart={handleTouchStart}
        onClick={handleClick}
        aria-label="CATCHY runner game"
      />
      <div className="hit-miss" aria-live="polite">
        <span>{feedback}</span>
        <span>{hits} hits</span>
        <span>{misses} misses</span>
      </div>
      <button className="tap-button" onClick={() => tap()}>Tap Center</button>
      <button className="ghost" onClick={finish}>Finish Run</button>
    </div>
  );
}
