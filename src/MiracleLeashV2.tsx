/**
 * MiracleLeashV2 — "How It Works" animated explainer
 *
 * Mechanism (from real product demo IMG_5308.mov):
 *   1. Snap hook clips onto dog's collar D-ring
 *   2. Regular leash wraps around dog's chest
 *   3. Carabiner clips onto the leash (holds chest loop)
 *   → Pressure on chest (not neck) gently discourages pulling
 *
 * Style: Clean 2D flat illustration, dark bg, green/gold brand palette
 * Duration: 30s / 900 frames @ 30fps
 */

import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";

// ─── Duration ────────────────────────────────────────────────────────────────
export const V2_DURATION = 900; // 30 s @ 30 fps

// ─── Timeline (frame numbers) ────────────────────────────────────────────────
const T = {
  INTRO_S:    0,   INTRO_E:   75,   // 0–2.5s  brand intro
  PROD_S:    75,   PROD_E:   195,   // 2.5–6.5s product diagram
  S1_S:     195,   S1_E:     330,   // 6.5–11s  Step 1
  S2_S:     330,   S2_E:     495,   // 11–16.5s Step 2
  S3_S:     495,   S3_E:     630,   // 16.5–21s Step 3
  WALK_S:   630,   WALK_E:  780,    // 21–26s   walk demo
  OUTRO_S:  780,   OUTRO_E:  900,   // 26–30s   CTA
};

// ─── Palette ─────────────────────────────────────────────────────────────────
const BG       = "#07090f";
const WHITE    = "#ffffff";
const GOLD     = "#F5C842";
const GREEN    = "#2e7d32";
const GREEN_LT = "#66bb6a";
const RED      = "#d32f2f";
const STRAP    = "#1c1c1c";
const SILVER   = "#b0b8c8";
const FUR      = "#D4A855";
const FUR_DK   = "#a07030";
const LEASH_C  = "#2a2a2a";
const CYAN     = "#4FC3F7";
const AMBER    = "#FFA726";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const spr = (frame: number, fps: number, delay = 0, damping = 180) =>
  spring({ frame: frame - delay, fps, config: { damping } });

const ease = (f: number, i: [number, number], o: [number, number]) =>
  interpolate(f, i, o, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });

// ─── DOG ILLUSTRATION (SVG, side view facing right) ─────────────────────────
interface DogProps {
  showCollarRing?: boolean;
  snapHookProgress?: number;   // 0→1: snap hook moving toward collar
  leashWrapProgress?: number;  // 0→1: leash wrapping around chest
  carabinerProgress?: number;  // 0→1: carabiner clipping to leash
  pullProgress?: number;       // 0→1: dog pulling (leash tightens on chest)
  walkPhase?: number;          // continuous: leg animation
  showLeashLine?: boolean;     // show the main leash line from owner
  highlight?: "collar"|"chest"|"leash"|null;
}

const DogSVG: React.FC<DogProps> = ({
  showCollarRing = true,
  snapHookProgress = 0,
  leashWrapProgress = 0,
  carabinerProgress = 0,
  pullProgress = 0,
  walkPhase = 0,
  showLeashLine = false,
  highlight = null,
}) => {
  // ── Dog geometry ──────────────────────────────────────────────────
  // SVG viewBox: 0 0 900 600, rendered at 1080px wide
  // Dog center: body at (420, 310), head to the right

  const bx = 420, by = 310; // body center
  const hx = 660, hy = 250; // head center
  const neckX = 580, neckY = 275; // neck junction

  // Collar strip (red band across neck)
  const collarX1 = 555, collarY1 = 260;
  const collarW = 110, collarH = 28;

  // D-ring position (bottom center of collar)
  const dRingX = collarX1 + collarW / 2; // 610
  const dRingY = collarY1 + collarH + 8; // 296

  // Miracle leash strap endpoint (hanging below D-ring)
  const strapLen = 115;
  const carabinerY = dRingY + strapLen; // 411

  // Leash coming from owner (off-screen top-right) → clips to carabiner
  // Chest wrap path: goes under body bottom (~by+130=440)

  // Leg animation
  const legSwing = (i: number) =>
    Math.sin(walkPhase * Math.PI * 2 + (i * Math.PI) / 2) * 18;

  // Pull effect: horizontal offset on body
  const pullOffset = pullProgress * 24;

  // Chest highlight opacity
  const chestGlow = pullProgress > 0 ? interpolate(pullProgress, [0, 0.5, 1], [0, 0.5, 0.35]) : 0;

  // Leash wrap path (SVG cubic bezier around the chest)
  // Starts at top (where owner feeds leash), wraps under, comes back
  const wrapT = leashWrapProgress;
  const wrapDashArray = 420;
  const wrapDashOffset = wrapDashArray * (1 - wrapT);

  // Carabiner position on the leash (where it clips)
  const carabClipX = 350, carabClipY = 190; // on the leash going back up

  const snapHookX = interpolate(snapHookProgress, [0, 1], [610, dRingX]);
  const snapHookY = interpolate(snapHookProgress, [0, 1], [120, dRingY - 20]);

  return (
    <svg
      viewBox="0 0 900 600"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      <defs>
        <radialGradient id="furGrad" cx="50%" cy="40%">
          <stop offset="0%" stopColor={FUR} />
          <stop offset="100%" stopColor={FUR_DK} />
        </radialGradient>
        <radialGradient id="chestGlow" cx="50%" cy="50%">
          <stop offset="0%" stopColor={AMBER} stopOpacity={chestGlow * 0.9} />
          <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="softGlow">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── Shadow ── */}
      <ellipse cx={bx + pullOffset} cy={490} rx={260} ry={22}
        fill="rgba(0,0,0,0.35)" />

      {/* ── Tail (left of body) ── */}
      <path d={`M ${bx - 260 + pullOffset} ${by - 10}
                C ${bx - 310 + pullOffset} ${by - 80},
                  ${bx - 340 + pullOffset} ${by - 130},
                  ${bx - 295 + pullOffset} ${by - 160}`}
        fill="none" stroke={FUR_DK} strokeWidth={28} strokeLinecap="round" />
      <path d={`M ${bx - 260 + pullOffset} ${by - 10}
                C ${bx - 310 + pullOffset} ${by - 80},
                  ${bx - 340 + pullOffset} ${by - 130},
                  ${bx - 295 + pullOffset} ${by - 160}`}
        fill="none" stroke={FUR} strokeWidth={18} strokeLinecap="round" />

      {/* ── Body ── */}
      <ellipse cx={bx + pullOffset} cy={by} rx={260} ry={128}
        fill="url(#furGrad)" />
      {/* chest glow when pulling */}
      {chestGlow > 0 && (
        <ellipse cx={bx + pullOffset} cy={by + 60} rx={170} ry={90}
          fill="url(#chestGlow)" />
      )}
      {/* body fur texture lines */}
      <ellipse cx={bx + pullOffset} cy={by - 30} rx={200} ry={80}
        fill="none" stroke={FUR} strokeWidth={3} strokeOpacity={0.4} />

      {/* ── Back legs ── */}
      <g transform={`translate(${bx - 200 + pullOffset}, ${by + 100})`}>
        <rect x={-18} y={legSwing(2)} width={36} height={120} rx={18}
          fill={FUR_DK} />
        <rect x={-14} y={legSwing(2)} width={28} height={115} rx={14}
          fill={FUR} />
        {/* paw */}
        <ellipse cx={0} cy={legSwing(2) + 122} rx={22} ry={12} fill={FUR_DK} />
      </g>
      <g transform={`translate(${bx - 160 + pullOffset}, ${by + 108})`}>
        <rect x={-16} y={legSwing(3)} width={32} height={108} rx={16}
          fill={FUR_DK} opacity={0.7} />
        <ellipse cx={0} cy={legSwing(3) + 110} rx={20} ry={11} fill={FUR_DK} opacity={0.7} />
      </g>

      {/* ── Front legs ── */}
      <g transform={`translate(${bx + 140 + pullOffset}, ${by + 110})`}>
        <rect x={-18} y={legSwing(0)} width={36} height={118} rx={18}
          fill={FUR_DK} />
        <rect x={-14} y={legSwing(0)} width={28} height={112} rx={14}
          fill={FUR} />
        <ellipse cx={0} cy={legSwing(0) + 120} rx={22} ry={12} fill={FUR_DK} />
      </g>
      <g transform={`translate(${bx + 100 + pullOffset}, ${by + 118})`}>
        <rect x={-16} y={legSwing(1)} width={32} height={106} rx={16}
          fill={FUR_DK} opacity={0.7} />
        <ellipse cx={0} cy={legSwing(1) + 108} rx={20} ry={11} fill={FUR_DK} opacity={0.7} />
      </g>

      {/* ── Neck ── */}
      <ellipse cx={neckX + pullOffset} cy={neckY + 20} rx={55} ry={65}
        fill="url(#furGrad)" />

      {/* ── Head ── */}
      <circle cx={hx + pullOffset} cy={hy} r={110} fill="url(#furGrad)" />
      {/* forehead highlight */}
      <ellipse cx={hx + 10 + pullOffset} cy={hy - 30} rx={50} ry={40}
        fill={FUR} opacity={0.5} />

      {/* Ear */}
      <ellipse cx={hx - 55 + pullOffset} cy={hy - 50} rx={48} ry={78}
        fill={FUR_DK} transform={`rotate(-25,${hx - 55 + pullOffset},${hy - 50})`} />
      <ellipse cx={hx - 50 + pullOffset} cy={hy - 45} rx={35} ry={62}
        fill={FUR} opacity={0.6}
        transform={`rotate(-25,${hx - 50 + pullOffset},${hy - 45})`} />

      {/* Snout */}
      <ellipse cx={hx + 80 + pullOffset} cy={hy + 30} rx={70} ry={52}
        fill={FUR_DK} />
      <ellipse cx={hx + 82 + pullOffset} cy={hy + 26} rx={58} ry={42}
        fill={FUR} opacity={0.7} />
      {/* nose */}
      <ellipse cx={hx + 130 + pullOffset} cy={hy + 18} rx={22} ry={16}
        fill="#2a1a0a" />
      <ellipse cx={hx + 124 + pullOffset} cy={hy + 13} rx={7} ry={5}
        fill="rgba(255,255,255,0.4)" />

      {/* Eye */}
      <circle cx={hx + 45 + pullOffset} cy={hy - 15} r={18} fill="#2a1a0a" />
      <circle cx={hx + 47 + pullOffset} cy={hy - 17} r={6} fill="rgba(255,255,255,0.5)" />

      {/* ── Collar (red band) ── */}
      {showCollarRing && (
        <g filter={highlight === "collar" ? "url(#softGlow)" : undefined}>
          <rect x={collarX1 + pullOffset} y={collarY1} width={collarW} height={collarH}
            rx={8} fill={highlight === "collar" ? "#ff5252" : RED} />
          {/* buckle */}
          <rect x={collarX1 + 6 + pullOffset} y={collarY1 + 6} width={20} height={16}
            rx={3} fill="none" stroke={SILVER} strokeWidth={3} />
          {/* D-ring loop */}
          <path d={`M ${dRingX - 14 + pullOffset} ${collarY1 + collarH}
                    A 14 18 0 0 0 ${dRingX + 14 + pullOffset} ${collarY1 + collarH}`}
            fill="none" stroke={SILVER} strokeWidth={5}
            filter={highlight === "collar" ? "url(#glow)" : undefined} />
          {/* D-ring bar */}
          <line x1={dRingX - 14 + pullOffset} y1={collarY1 + collarH}
                x2={dRingX + 14 + pullOffset} y2={collarY1 + collarH}
            stroke={SILVER} strokeWidth={5} />
          {/* COLLAR label */}
          {highlight === "collar" && (
            <text x={dRingX + 30 + pullOffset} y={collarY1 + 20}
              fill={RED} fontSize={18} fontWeight="bold" fontFamily="Arial">
              COLLAR D-RING
            </text>
          )}
        </g>
      )}

      {/* ── Miracle Leash Strap ── */}
      {snapHookProgress > 0 && (
        <g opacity={Math.min(1, snapHookProgress * 2)}>
          {/* strap body: from D-ring down to carabiner */}
          <rect
            x={dRingX - 10 + pullOffset} y={dRingY}
            width={20} height={strapLen}
            rx={4} fill={STRAP}
          />
          {/* white label in middle */}
          <rect
            x={dRingX - 28 + pullOffset} y={dRingY + strapLen * 0.35}
            width={56} height={34}
            rx={4} fill={WHITE}
          />
          <text x={dRingX + pullOffset} y={dRingY + strapLen * 0.35 + 13}
            fill={GREEN} fontSize={9} fontWeight="900" textAnchor="middle"
            fontFamily="Arial Black, Arial">
            Miracle
          </text>
          <text x={dRingX + pullOffset} y={dRingY + strapLen * 0.35 + 25}
            fill={GREEN} fontSize={9} fontWeight="900" textAnchor="middle"
            fontFamily="Arial Black, Arial">
            Leash
          </text>

          {/* snap hook at top (moves to collar D-ring) */}
          <g transform={`translate(${snapHookX}, ${snapHookY})`}>
            {/* bolt snap body */}
            <rect x={-8} y={-8} width={16} height={28} rx={4} fill={SILVER} />
            {/* snap lever */}
            <path d="M -6 0 L -14 8 L -6 16" fill="none" stroke={SILVER} strokeWidth={3} strokeLinecap="round" />
          </g>

          {/* carabiner at bottom */}
          {snapHookProgress >= 0.8 && (
            <g transform={`translate(${dRingX + pullOffset}, ${carabinerY})`}
               opacity={interpolate(snapHookProgress, [0.8, 1], [0, 1])}>
              {/* D-ring carabiner */}
              <path d="M -14 0 A 14 20 0 0 1 14 0 L 14 30 A 14 20 0 0 1 -14 30 Z"
                fill="none" stroke={STRAP} strokeWidth={10} />
              <path d="M -14 0 A 14 20 0 0 1 14 0 L 14 30 A 14 20 0 0 1 -14 30 Z"
                fill="none" stroke={SILVER} strokeWidth={5} />
              {/* gate side */}
              <line x1={14} y1={0} x2={14} y2={30}
                stroke={interpolate(carabinerProgress, [0, 1], [0.6, 1]) > 0.5 ? GOLD : SILVER}
                strokeWidth={5}
                opacity={interpolate(carabinerProgress, [0, 1], [0.5, 1])} />
            </g>
          )}
        </g>
      )}

      {/* ── Leash line from owner + chest wrap ── */}
      {showLeashLine && (
        <g>
          {/* Main leash: owner hand (off top-right) → around chest */}
          {/* Pre-wrap: straight line from owner down to dog */}
          <line x1={820} y1={-50} x2={720 + pullOffset} y2={collarY1 + 10}
            stroke={LEASH_C} strokeWidth={8} strokeLinecap="round"
            opacity={leashWrapProgress < 0.1 ? 1 : 0} />

          {/* Chest wrap path */}
          <path
            d={`M 820 -50
                L ${720 + pullOffset} ${collarY1 + 10}
                C ${700 + pullOffset} ${collarY1 + 80},
                  ${bx + 160 + pullOffset} ${by + 145},
                  ${bx + pullOffset} ${by + 150}
                C ${bx - 140 + pullOffset} ${by + 150},
                  ${bx - 200 + pullOffset} ${by + 80},
                  ${carabClipX + pullOffset} ${carabClipY}`}
            fill="none"
            stroke={LEASH_C}
            strokeWidth={9}
            strokeLinecap="round"
            strokeDasharray={wrapDashArray + 400}
            strokeDashoffset={wrapDashOffset + (leashWrapProgress < 0.05 ? 900 : 0)}
            opacity={leashWrapProgress > 0 ? 1 : 0}
          />
          {/* Leash glow when pulling */}
          {pullProgress > 0 && (
            <path
              d={`M 820 -50
                  L ${720 + pullOffset} ${collarY1 + 10}
                  C ${700 + pullOffset} ${collarY1 + 80},
                    ${bx + 160 + pullOffset} ${by + 145},
                    ${bx + pullOffset} ${by + 150}
                  C ${bx - 140 + pullOffset} ${by + 150},
                    ${bx - 200 + pullOffset} ${by + 80},
                    ${carabClipX + pullOffset} ${carabClipY}`}
              fill="none"
              stroke={AMBER}
              strokeWidth={6}
              strokeLinecap="round"
              opacity={pullProgress * 0.7}
              filter="url(#glow)"
            />
          )}

          {/* Carabiner clip point on leash */}
          {carabinerProgress > 0 && (
            <g transform={`translate(${carabClipX + pullOffset}, ${carabClipY})`}
               opacity={carabinerProgress}>
              <circle r={14} fill={STRAP} stroke={SILVER} strokeWidth={4} />
              <circle r={6} fill={SILVER} />
            </g>
          )}
        </g>
      )}

      {/* ── Chest highlight ring ── */}
      {highlight === "chest" && (
        <ellipse cx={bx + pullOffset} cy={by + 60} rx={180} ry={110}
          fill="none" stroke={AMBER} strokeWidth={4}
          strokeDasharray="12 8" opacity={0.8}
          filter="url(#glow)" />
      )}
    </svg>
  );
};

// ─── PRODUCT DIAGRAM ─────────────────────────────────────────────────────────
const ProductDiagram: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const p1 = spr(frame, fps, 0, 160);
  const p2 = spr(frame, fps, 12, 160);
  const p3 = spr(frame, fps, 24, 160);
  const p4 = spr(frame, fps, 36, 160);
  const p5 = spr(frame, fps, 48, 160);
  const rotY = interpolate(frame, [0, 120], [0, Math.PI * 0.8], { extrapolateRight: "clamp" });
  const perspective = Math.cos(rotY) * 40;

  return (
    <svg viewBox="0 0 900 340" style={{ width: "100%", overflow: "visible" }}>
      <defs>
        <linearGradient id="strapGrad" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#333" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <filter id="prodGlow">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── Nylon strap body ── */}
      <g transform={`translate(450,170) scaleY(${1 - Math.abs(perspective) * 0.004})`}
         opacity={p1}>
        <rect x={-220} y={-32} width={440} height={64} rx={10}
          fill="url(#strapGrad)" stroke="#444" strokeWidth={2} />
        {/* nylon texture lines */}
        {[-140,-90,-40,10,60,110,160].map(tx => (
          <line key={tx} x1={tx} y1={-32} x2={tx} y2={32}
            stroke="#2a2a2a" strokeWidth={1.5} />
        ))}

        {/* White branded label */}
        <rect x={-68} y={-24} width={136} height={48} rx={6} fill={WHITE} />
        {/* paw icon */}
        <circle cx={-44} cy={0} r={10} fill="#1a1a1a" />
        <circle cx={-58} cy={-12} r={5} fill="#1a1a1a" />
        <circle cx={-44} cy={-16} r={5} fill="#1a1a1a" />
        <circle cx={-30} cy={-12} r={5} fill="#1a1a1a" />
        {/* brand text */}
        <text x={-14} y={-5} fontSize={14} fontWeight="900"
          fontFamily="Arial Black, Arial" fill="#1a1a1a">Miracle</text>
        <text x={-14} y={12} fontSize={14} fontWeight="900"
          fontFamily="Arial Black, Arial" fill={GREEN}>Leash</text>
      </g>

      {/* ── Snap Hook (left side) ── */}
      <g transform="translate(192,170)" opacity={p2}>
        {/* bolt snap body */}
        <rect x={-22} y={-38} width={44} height={76} rx={8}
          fill={SILVER} stroke="#888" strokeWidth={2} />
        {/* snap ring on top */}
        <ellipse cx={0} cy={-50} rx={18} ry={14}
          fill="none" stroke={SILVER} strokeWidth={6} />
        {/* lever */}
        <path d="M -20 -10 A 20 20 0 0 0 -20 20"
          fill="none" stroke="#888" strokeWidth={5} strokeLinecap="round" />
        <rect x={-26} y={-12} width={10} height={24} rx={3} fill="#aaa" />
        {/* shine */}
        <rect x={-8} y={-30} width={6} height={20} rx={3}
          fill="rgba(255,255,255,0.3)" />
      </g>

      {/* ── D-ring Carabiner (right side) ── */}
      <g transform="translate(708,170)" opacity={p3}>
        {/* carabiner body */}
        <path d="M -24 -40 A 24 40 0 0 1 24 -40 L 24 40 A 24 40 0 0 1 -24 40 Z"
          fill="none" stroke={STRAP} strokeWidth={16} />
        <path d="M -24 -40 A 24 40 0 0 1 24 -40 L 24 40 A 24 40 0 0 1 -24 40 Z"
          fill="none" stroke={SILVER} strokeWidth={8} />
        {/* gate */}
        <line x1={24} y1={-40} x2={24} y2={40}
          stroke={SILVER} strokeWidth={8} strokeLinecap="round" />
        {/* gate spring detail */}
        <line x1={18} y1={40} x2={28} y2={32}
          stroke={SILVER} strokeWidth={4} strokeLinecap="round" />
      </g>

      {/* ── Labels ── */}
      {/* Snap hook label */}
      <g transform="translate(192,240)" opacity={p2}>
        <line x1={0} y1={0} x2={0} y2={22} stroke={GOLD} strokeWidth={2} />
        <text x={0} y={40} textAnchor="middle" fill={GOLD}
          fontSize={20} fontWeight="bold" fontFamily="Arial Black, Arial">
          SNAP HOOK
        </text>
        <text x={0} y={60} textAnchor="middle" fill="rgba(255,255,255,0.6)"
          fontSize={15} fontFamily="Arial">
          clips to collar
        </text>
      </g>

      {/* Strap label */}
      <g transform="translate(450,240)" opacity={p4}>
        <line x1={0} y1={0} x2={0} y2={22} stroke={WHITE} strokeWidth={2} />
        <text x={0} y={40} textAnchor="middle" fill={WHITE}
          fontSize={20} fontWeight="bold" fontFamily="Arial Black, Arial">
          NYLON STRAP
        </text>
        <text x={0} y={60} textAnchor="middle" fill="rgba(255,255,255,0.6)"
          fontSize={15} fontFamily="Arial">
          durable · lightweight
        </text>
      </g>

      {/* Carabiner label */}
      <g transform="translate(708,240)" opacity={p3}>
        <line x1={0} y1={0} x2={0} y2={22} stroke={CYAN} strokeWidth={2} />
        <text x={0} y={40} textAnchor="middle" fill={CYAN}
          fontSize={20} fontWeight="bold" fontFamily="Arial Black, Arial">
          D-RING
        </text>
        <text x={0} y={60} textAnchor="middle" fill="rgba(255,255,255,0.6)"
          fontSize={15} fontFamily="Arial">
          clips to leash
        </text>
      </g>

      {/* Top tagline */}
      <g transform="translate(450,60)" opacity={p5}>
        <text x={0} y={0} textAnchor="middle" fill={WHITE}
          fontSize={26} fontWeight="900" fontFamily="Arial Black, Arial">
          Works with ANY standard leash
        </text>
      </g>
    </svg>
  );
};

// ─── STEP CARD ────────────────────────────────────────────────────────────────
const StepCard: React.FC<{
  num: number; title: string; sub: string;
  frame: number; fps: number; color?: string;
}> = ({ num, title, sub, frame, fps, color = GOLD }) => {
  const p = spr(frame, fps, 0, 200);
  return (
    <div style={{
      opacity: p,
      transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)`,
      display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    }}>
      {/* Step number badge */}
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: color, display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 30px ${color}88`,
      }}>
        <span style={{
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: 36, fontWeight: 900, color: BG, lineHeight: 1,
        }}>{num}</span>
      </div>
      <div style={{
        fontFamily: "'Arial Black', Arial, sans-serif",
        fontSize: 48, fontWeight: 900, color: WHITE,
        textAlign: "center", lineHeight: 1.1,
        textShadow: `0 0 30px ${color}66`,
      }}>{title}</div>
      <div style={{
        fontFamily: "Arial, sans-serif",
        fontSize: 28, color: "rgba(255,255,255,0.8)",
        textAlign: "center", lineHeight: 1.45, maxWidth: 820,
      }}>{sub}</div>
    </div>
  );
};

// ─── SCENE: Intro ─────────────────────────────────────────────────────────────
const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spr(frame, fps, 5, 220);
  const p2 = spr(frame, fps, 18, 220);
  const p3 = spr(frame, fps, 30, 220);

  return (
    <AbsoluteFill style={{ background: BG, alignItems: "center", justifyContent: "center" }}>
      {/* Background paw print faint */}
      <div style={{
        position: "absolute", fontSize: 600, opacity: 0.03,
        userSelect: "none",
        top: "50%", left: "50%", transform: "translate(-50%,-50%) rotate(-15deg)",
      }}>🐾</div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        {/* "Introducing:" */}
        <div style={{
          opacity: p, transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
          fontFamily: "Arial, sans-serif", fontSize: 32,
          color: "rgba(255,255,255,0.7)", letterSpacing: 6, textTransform: "uppercase",
        }}>Introducing</div>

        {/* Brand card — white rectangle matching real video */}
        <div style={{
          opacity: p2, transform: `scale(${interpolate(p2, [0, 1], [0.85, 1])})`,
          background: WHITE, borderRadius: 12, padding: "28px 48px",
          display: "flex", flexDirection: "column", alignItems: "center",
          boxShadow: "0 0 60px rgba(255,255,255,0.15)",
          minWidth: 680,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 4 }}>
            <span style={{ fontSize: 80 }}>🐾</span>
            <div>
              <div style={{
                fontFamily: "'Arial Black', Arial, sans-serif",
                fontSize: 80, fontWeight: 900, color: "#1a1a1a", lineHeight: 1,
              }}>Miracle</div>
              <div style={{
                fontFamily: "'Arial Black', Arial, sans-serif",
                fontSize: 80, fontWeight: 900, color: GREEN, lineHeight: 1,
              }}>Leash</div>
            </div>
          </div>
          <div style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 26, fontWeight: 900, color: "#1a1a1a",
            letterSpacing: 4, textTransform: "uppercase", marginTop: 8,
          }}>Take Back Control</div>
        </div>

        {/* tagline */}
        <div style={{
          opacity: p3, transform: `translateY(${interpolate(p3, [0, 1], [20, 0])}px)`,
          fontFamily: "Arial, sans-serif", fontSize: 28,
          color: "rgba(255,255,255,0.65)", textAlign: "center",
        }}>The attachment that stops pulling — instantly</div>
      </div>
    </AbsoluteFill>
  );
};

// ─── SCENE: Product Showcase ──────────────────────────────────────────────────
const SceneProduct: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const spin = spr(frame, fps, 0, 260);

  return (
    <AbsoluteFill style={{ background: BG }}>
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "center", padding: "0 40px",
      }}>
        {/* Headline */}
        <div style={{
          opacity: spr(frame, fps, 0, 200),
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: 52, fontWeight: 900, color: WHITE, textAlign: "center",
          marginBottom: 50,
          transform: `translateY(${interpolate(spr(frame, fps, 0, 200), [0, 1], [30, 0])}px)`,
        }}>Meet the <span style={{ color: GOLD }}>Miracle Leash</span></div>

        {/* Product diagram */}
        <div style={{
          width: "100%",
          transform: `scale(${interpolate(spin, [0, 1], [0.85, 1])})
                      perspective(600px) rotateY(${interpolate(spin, [0, 1], [-12, 0])}deg)`,
          opacity: spin,
        }}>
          <ProductDiagram frame={frame} fps={fps} />
        </div>

        {/* "Any leash. Any dog." */}
        <div style={{
          opacity: spr(frame, fps, 60, 200),
          transform: `translateY(${interpolate(spr(frame, fps, 60, 200), [0, 1], [20, 0])}px)`,
          marginTop: 60,
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: 38, fontWeight: 900, color: GREEN_LT, textAlign: "center",
          letterSpacing: 2,
        }}>🐕 Small, Medium & Large Dogs</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── SCENE: Step 1 ────────────────────────────────────────────────────────────
const SceneStep1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Snap hook travels to collar: frames 30→80
  const hookP = ease(frame, [30, 80], [0, 1]);
  // "click" flash at frame 80
  const clickFlash = interpolate(frame, [80, 85, 95], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // zoom in on collar area after clip
  const zoomP = ease(frame, [85, 110], [1, 1.35]);
  const zoomOx = ease(frame, [85, 110], [540, 680]);
  const zoomOy = ease(frame, [85, 110], [600, 500]);

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* Dog illustration — top portion */}
      <div style={{
        position: "absolute", top: 200, left: 0, right: 0, height: 700,
        transformOrigin: `${zoomOx}px ${zoomOy}px`,
        transform: `scale(${zoomP})`,
      }}>
        <DogSVG
          showCollarRing
          snapHookProgress={hookP}
          highlight="collar"
        />
      </div>

      {/* Click flash */}
      {clickFlash > 0 && (
        <AbsoluteFill style={{
          background: `rgba(255, 215, 0, ${clickFlash * 0.3})`,
          pointerEvents: "none",
        }} />
      )}

      {/* Step card at bottom */}
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        justifyContent: "flex-end", alignItems: "center",
        padding: "0 60px 120px", gap: 16,
      }}>
        <StepCard
          num={1} color={GOLD}
          title="Clip to Collar"
          sub={'Attach the snap hook to your dog\'s collar D-ring'}
          frame={frame} fps={fps}
        />

        {/* Tip bubble */}
        <div style={{
          opacity: ease(frame, [50, 70], [0, 1]),
          background: "rgba(245,200,66,0.12)", border: `1px solid ${GOLD}44`,
          borderRadius: 16, padding: "12px 28px", marginTop: 8,
        }}>
          <span style={{
            fontFamily: "Arial, sans-serif", fontSize: 22,
            color: "rgba(255,255,255,0.75)",
          }}>
            ✓ Works with any standard collar
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── SCENE: Step 2 ────────────────────────────────────────────────────────────
const SceneStep2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Leash starts wrapping at frame 30
  const wrapP = ease(frame, [30, 110], [0, 1]);

  // Zoom out to show full dog after wrap
  const zoomP = ease(frame, [0, 30], [1.2, 1]);

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* Dog illustration with leash wrapping */}
      <div style={{
        position: "absolute", top: 160, left: 0, right: 0, height: 750,
        transform: `scale(${zoomP})`, transformOrigin: "540px 580px",
      }}>
        <DogSVG
          showCollarRing
          snapHookProgress={1}
          leashWrapProgress={wrapP}
          showLeashLine
          highlight={wrapP > 0.3 ? "chest" : null}
        />
      </div>

      {/* Wrap path direction arrow */}
      {wrapP > 0.2 && wrapP < 0.9 && (
        <div style={{
          position: "absolute", top: 500, left: 80,
          opacity: interpolate(wrapP, [0.2, 0.4, 0.85, 0.9], [0, 1, 1, 0]),
          fontFamily: "Arial, sans-serif", fontSize: 24,
          color: AMBER, fontWeight: "bold",
        }}>
          ↻ wraps around chest
        </div>
      )}

      {/* Fun fact bubble (matching real video) */}
      <div style={{
        position: "absolute", top: 140, left: 50, right: 50,
        opacity: ease(frame, [60, 85], [0, 1]),
        background: "rgba(0,0,0,0.75)", borderRadius: 14, padding: "14px 24px",
        border: "1px solid rgba(255,255,255,0.15)",
      }}>
        <div style={{
          fontFamily: "Arial, sans-serif", fontSize: 20,
          color: "rgba(255,255,255,0.85)", lineHeight: 1.5, textAlign: "center",
        }}>
          💡 <em>Dogs are more obedient when tension is on their chest, not their neck</em>
        </div>
      </div>

      {/* Step card */}
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        justifyContent: "flex-end", alignItems: "center",
        padding: "0 60px 110px", gap: 16,
      }}>
        <StepCard
          num={2} color={AMBER}
          title="Wrap the Leash"
          sub="Thread your leash around your dog's chest"
          frame={frame} fps={fps}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── SCENE: Step 3 ────────────────────────────────────────────────────────────
const SceneStep3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const carabP = ease(frame, [25, 80], [0, 1]);
  const clickFlash = interpolate(frame, [80, 86, 100], [0, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* Dog — fully set up */}
      <div style={{ position: "absolute", top: 180, left: 0, right: 0, height: 730 }}>
        <DogSVG
          showCollarRing
          snapHookProgress={1}
          leashWrapProgress={1}
          carabinerProgress={carabP}
          showLeashLine
          highlight={carabP > 0.5 ? "leash" : null}
        />
      </div>

      {/* Clip flash */}
      {clickFlash > 0 && (
        <AbsoluteFill style={{
          background: `rgba(79, 195, 247, ${clickFlash * 0.25})`,
          pointerEvents: "none",
        }} />
      )}

      {/* Diagram callout: what the carabiner does */}
      <div style={{
        position: "absolute", top: 130, right: 50,
        opacity: ease(frame, [90, 115], [0, 1]),
        background: "rgba(79,195,247,0.12)", border: `1px solid ${CYAN}55`,
        borderRadius: 14, padding: "14px 22px", maxWidth: 320,
      }}>
        <div style={{
          fontFamily: "'Arial Black', Arial, sans-serif", fontSize: 20,
          color: CYAN, fontWeight: 900, marginBottom: 4,
        }}>CARABINER → LEASH</div>
        <div style={{
          fontFamily: "Arial, sans-serif", fontSize: 18,
          color: "rgba(255,255,255,0.75)", lineHeight: 1.4,
        }}>
          Locks the chest loop in place — keeps everything secure while you walk
        </div>
      </div>

      {/* Step card */}
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        justifyContent: "flex-end", alignItems: "center",
        padding: "0 60px 110px", gap: 16,
      }}>
        <StepCard
          num={3} color={CYAN}
          title="Clip to Leash"
          sub="Fasten the D-ring carabiner onto your leash"
          frame={frame} fps={fps}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── SCENE: Walk Demo ─────────────────────────────────────────────────────────
const SceneWalk: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Walk: 0-60
  // Pull: 60-100 (dog lunges, leash tightens on chest)
  // Redirect: 100-130 (dog calms)

  const walkPhase = frame * 0.04;
  const pullP = ease(frame, [60, 90], [0, 1]);
  const calmP = ease(frame, [100, 130], [0, 1]);
  const pullProgress = Math.max(0, pullP - calmP * pullP);

  // Dog's horizontal position (lunging forward then settling)
  const dogX = interpolate(pullProgress, [0, 1], [0, 35]);

  // Info badges
  const badge1 = spr(frame, fps, 15, 200);
  const badge2 = spr(frame, fps, 100, 200);

  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* Ground */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 300,
        background: "linear-gradient(to top, #0f1422, transparent)",
      }} />
      {/* Ground grid lines (horizontal) */}
      {[0, 60, 120, 180].map(d => (
        <div key={d} style={{
          position: "absolute", bottom: d, left: 0, right: 0,
          height: 1, background: "rgba(255,255,255,0.05)",
        }} />
      ))}

      {/* Walking dog */}
      <div style={{
        position: "absolute", top: 220, left: 0, right: 0, height: 750,
        transform: `translateX(${dogX}px)`,
      }}>
        <DogSVG
          showCollarRing
          snapHookProgress={1}
          leashWrapProgress={1}
          carabinerProgress={1}
          showLeashLine
          walkPhase={walkPhase}
          pullProgress={pullProgress}
          highlight={pullProgress > 0.3 ? "chest" : null}
        />
      </div>

      {/* Owner hand / leash top */}
      <div style={{
        position: "absolute", top: 80, right: 80,
        opacity: 0.85,
        fontSize: 56,
        transform: `rotate(${interpolate(pullProgress, [0, 1], [0, -15])}deg)`,
      }}>🤚</div>
      {/* leash line visual from hand to dog (CSS) */}
      <div style={{
        position: "absolute", top: 120, right: 100,
        width: 6, height: 160,
        background: `linear-gradient(to bottom, ${LEASH_C}, transparent)`,
        transform: `rotate(${interpolate(dogX, [0, 35], [15, 28])}deg)`,
        transformOrigin: "top center",
        borderRadius: 3,
      }} />

      {/* "Pull" moment caption */}
      {pullProgress > 0.3 && calmP < 0.5 && (
        <div style={{
          position: "absolute", top: 170, left: 50,
          opacity: interpolate(pullProgress, [0.3, 0.6], [0, 1]),
          background: "rgba(255,87,34,0.18)", border: "1px solid #ff5722aa",
          borderRadius: 12, padding: "10px 24px",
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: 26, fontWeight: 900, color: "#ff7043",
        }}>
          🐕 Dog pulls...
        </div>
      )}
      {pullProgress > 0.3 && (
        <div style={{
          position: "absolute", top: 230, left: 50,
          opacity: interpolate(pullProgress, [0.5, 0.85], [0, 1]),
          background: "rgba(46,125,50,0.18)", border: `1px solid ${GREEN}aa`,
          borderRadius: 12, padding: "10px 24px",
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: 26, fontWeight: 900, color: GREEN_LT,
        }}>
          ✓ Chest pressure redirects gently
        </div>
      )}

      {/* After calm — "no more pulling" badge */}
      {badge2 > 0.1 && (
        <div style={{
          position: "absolute", top: 180, left: 50, right: 50,
          opacity: badge2,
          transform: `scale(${interpolate(badge2, [0, 1], [0.9, 1])})`,
          background: "rgba(46,125,50,0.2)", border: `2px solid ${GREEN}`,
          borderRadius: 18, padding: "16px 30px", textAlign: "center",
        }}>
          <div style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 32, fontWeight: 900, color: GREEN_LT,
          }}>No harsh corrections needed</div>
          <div style={{
            fontFamily: "Arial, sans-serif", fontSize: 22,
            color: "rgba(255,255,255,0.75)", marginTop: 6,
          }}>
            Natural feedback = calmer walks
          </div>
        </div>
      )}

      {/* Step 4 card */}
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        justifyContent: "flex-end", alignItems: "center",
        padding: "0 60px 100px", gap: 12,
      }}>
        <div style={{
          opacity: badge1,
          transform: `translateY(${interpolate(badge1, [0, 1], [30, 0])}px)`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          <div style={{
            background: GREEN, borderRadius: 50, padding: "6px 28px",
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 22, fontWeight: 900, color: WHITE, letterSpacing: 3,
          }}>STEP 4</div>
          <div style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 60, fontWeight: 900, color: WHITE, textAlign: "center",
            lineHeight: 1.05, textShadow: `0 0 40px ${GREEN}66`,
          }}>Have a great walk! 🐾</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── SCENE: Outro CTA ─────────────────────────────────────────────────────────
const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const p1 = spr(frame, fps, 0, 200);
  const p2 = spr(frame, fps, 15, 200);
  const p3 = spr(frame, fps, 28, 200);
  const p4 = spr(frame, fps, 42, 200);
  const p5 = spr(frame, fps, 56, 200);

  // Spinning product behind logo
  const spin = frame * 0.8;

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at center, #0d1525 0%, ${BG} 100%)`,
      alignItems: "center", justifyContent: "center",
    }}>
      {/* Faint spinning product silhouette */}
      <div style={{
        position: "absolute",
        width: 820, height: 120,
        borderRadius: 16,
        background: "rgba(245,200,66,0.04)",
        transform: `rotate(${spin}deg)`,
        top: "50%", left: "50%",
        marginTop: -60, marginLeft: -410,
      }} />

      {/* Glow ring */}
      <div style={{
        position: "absolute",
        width: 600, height: 600, borderRadius: "50%",
        background: `radial-gradient(circle, ${GREEN}18 0%, transparent 70%)`,
        opacity: p1,
      }} />

      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 24, padding: "0 60px",
      }}>
        {/* Brand card */}
        <div style={{
          opacity: p1, transform: `scale(${interpolate(p1, [0, 1], [0.85, 1])})`,
          background: WHITE, borderRadius: 16, padding: "22px 52px",
          display: "flex", alignItems: "center", gap: 22,
          boxShadow: `0 0 60px rgba(46,125,50,0.4), 0 0 120px rgba(46,125,50,0.15)`,
        }}>
          <span style={{ fontSize: 72, lineHeight: 1 }}>🐾</span>
          <div>
            <div style={{
              fontFamily: "'Arial Black', Arial, sans-serif",
              fontSize: 72, fontWeight: 900, color: "#1a1a1a", lineHeight: 1,
            }}>Miracle</div>
            <div style={{
              fontFamily: "'Arial Black', Arial, sans-serif",
              fontSize: 72, fontWeight: 900, color: GREEN, lineHeight: 1,
            }}>Leash</div>
          </div>
        </div>

        {/* Tagline */}
        <div style={{
          opacity: p2, transform: `translateY(${interpolate(p2, [0, 1], [20, 0])}px)`,
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: 38, fontWeight: 900, color: WHITE, textAlign: "center",
          letterSpacing: 3, textTransform: "uppercase",
        }}>Take Back Control</div>

        {/* Stars */}
        <div style={{
          opacity: p3, transform: `translateY(${interpolate(p3, [0, 1], [15, 0])}px)`,
          display: "flex", gap: 8,
        }}>
          {[0,1,2,3,4].map(i => (
            <span key={i} style={{
              fontSize: 42,
              color: GOLD,
              filter: `drop-shadow(0 0 8px ${GOLD}88)`,
            }}>★</span>
          ))}
        </div>
        <div style={{
          opacity: p3, fontFamily: "Arial, sans-serif",
          fontSize: 24, color: "rgba(255,255,255,0.65)",
          marginTop: -14,
        }}>Thousands of happy dog owners</div>

        {/* URL */}
        <div style={{
          opacity: p4, transform: `translateY(${interpolate(p4, [0, 1], [15, 0])}px)`,
          background: `linear-gradient(135deg, ${GREEN}22, ${GREEN}44)`,
          border: `2px solid ${GREEN}`,
          borderRadius: 60, padding: "16px 60px",
          boxShadow: `0 0 30px ${GREEN}44`,
        }}>
          <div style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 40, fontWeight: 900, color: WHITE,
            letterSpacing: 1,
          }}>miracleleash.com</div>
        </div>

        {/* Amazon badge */}
        <div style={{
          opacity: p5, transform: `translateY(${interpolate(p5, [0, 1], [15, 0])}px)`,
          display: "flex", alignItems: "center", gap: 16,
          background: "rgba(255,153,0,0.15)", border: "2px solid #FF9900",
          borderRadius: 50, padding: "12px 40px",
        }}>
          <span style={{ fontSize: 30 }}>🛒</span>
          <div style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 26, fontWeight: 900, color: "#FF9900",
          }}>Available on Amazon</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── ROOT COMPONENT ───────────────────────────────────────────────────────────
export const MiracleLeashV2: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Sequence from={T.INTRO_S} durationInFrames={T.INTRO_E - T.INTRO_S}>
        <SceneIntro />
      </Sequence>
      <Sequence from={T.PROD_S} durationInFrames={T.PROD_E - T.PROD_S}>
        <SceneProduct />
      </Sequence>
      <Sequence from={T.S1_S} durationInFrames={T.S1_E - T.S1_S}>
        <SceneStep1 />
      </Sequence>
      <Sequence from={T.S2_S} durationInFrames={T.S2_E - T.S2_S}>
        <SceneStep2 />
      </Sequence>
      <Sequence from={T.S3_S} durationInFrames={T.S3_E - T.S3_S}>
        <SceneStep3 />
      </Sequence>
      <Sequence from={T.WALK_S} durationInFrames={T.WALK_E - T.WALK_S}>
        <SceneWalk />
      </Sequence>
      <Sequence from={T.OUTRO_S} durationInFrames={T.OUTRO_E - T.OUTRO_S}>
        <SceneOutro />
      </Sequence>
    </AbsoluteFill>
  );
};
