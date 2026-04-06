/**
 * MiracleLeashV3 — Professional 3D "How It Works" Explainer
 *
 * Mechanism (verified from IMG_5308.mov):
 *   1. Snap hook clips to dog's collar D-ring
 *   2. Regular leash wraps around dog's chest (under belly)
 *   3. D-ring carabiner clips onto the leash → locks chest loop
 *   → Pressure shifts from neck to chest, discouraging pulling gently
 *
 * Features:
 *  • Full ThreeCanvas 3D for all how-to scenes
 *  • Detailed golden retriever: body, head, ears, snout, 4 legs, tail, collar, D-ring
 *  • Accurate product model: nylon strap + snap hook + carabiner + white label
 *  • Animated snap hook flying to collar D-ring
 *  • Animated leash tube wrapping around chest
 *  • Animated carabiner sliding to leash
 *  • Walk cycle with leg animation
 *  • Pull moment: chest-glow + camera shake
 *  • 12-keyframe cinematic camera system
 *  • CSS intro (brand card) + CSS outro (CTA)
 *  • Step progress bar + captions
 */

import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

// ─── Duration ────────────────────────────────────────────────────────────────
export const V3_DURATION = 960; // 32 s @ 30 fps

// ─── Timeline ────────────────────────────────────────────────────────────────
const T = {
  INTRO_S:    0,   INTRO_E:   75,  // 0–2.5s  CSS brand intro
  PROD_S:    75,   PROD_E:   195,  // 2.5–6.5s 3D product spin
  S1_S:     195,   S1_E:     345,  // 6.5–11.5s Step 1 – snap hook → collar
  S2_S:     345,   S2_E:     495,  // 11.5–16.5s Step 2 – leash wraps chest
  S3_S:     495,   S3_E:     615,  // 16.5–20.5s Step 3 – carabiner → leash
  WALK_S:   615,   WALK_E:  780,   // 20.5–26s walk/pull/redirect
  OUTRO_S:  780,   OUTRO_E:  960,  // 26–32s   CSS CTA
};

// ─── Palette ─────────────────────────────────────────────────────────────────
const FUR      = "#D4A855";
const FUR_DK   = "#9A6B20";
const FUR_NOSE = "#2a1a0a";
const COLLAR_R = "#CC2222";
const METAL    = "#b0b8c8";
const METAL_DK = "#1c1c1c";
const LABEL_W  = "#f0f0f0";
const BRAND_GN = "#2e7d32";
const LEASH_C  = "#1a1a1a";
const GOLD     = "#F5C842";
const WHITE    = "#ffffff";
const CYAN     = "#4FC3F7";
const AMBER    = "#FFA726";
const BG       = "#07090f";
const GREEN    = "#2e7d32";
const GREEN_LT = "#66bb6a";
const GROUND   = "#0d1220";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const spr = (f: number, fps: number, delay = 0, damp = 180) =>
  spring({ frame: f - delay, fps, config: { damping: damp } });

const ease = (f: number, i: [number, number], o: [number, number]) =>
  interpolate(f, i, o, {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

// ─── Camera controller ───────────────────────────────────────────────────────
// Each keyframe: [frame, px, py, pz, lx, ly, lz]
const camAt = (
  kfs: number[][],
  frame: number,
): { pos: [number, number, number]; look: [number, number, number] } => {
  let a = kfs[0], b = kfs[kfs.length - 1];
  for (let i = 0; i < kfs.length - 1; i++) {
    if (frame >= kfs[i][0] && frame <= kfs[i + 1][0]) {
      a = kfs[i]; b = kfs[i + 1]; break;
    }
  }
  const t = a[0] === b[0] ? 1 :
    Easing.inOut(Easing.quad)(Math.min(1, Math.max(0, (frame - a[0]) / (b[0] - a[0]))));
  const lerp = (ai: number, bi: number) => a[ai] + (b[bi] - a[ai]) * t;
  return {
    pos: [lerp(1, 1), lerp(2, 2), lerp(3, 3)],
    look: [lerp(4, 4), lerp(5, 5), lerp(6, 6)],
  };
};

// ─── 3D: Golden Retriever ────────────────────────────────────────────────────
// Dog is centered at origin, facing +X, lying/standing on y≈-1
interface DogProps {
  walkPhase?: number;      // 0–1 for leg cycle
  bodyStretch?: number;    // 0=rest, 1=pulling
  collarGlow?: number;     // 0-1
  chestGlow?: number;      // 0-1
  tailWag?: number;        // continuous
}

const Dog3D: React.FC<DogProps> = ({
  walkPhase = 0,
  bodyStretch = 0,
  collarGlow = 0,
  chestGlow = 0,
  tailWag = 0,
}) => {
  const legSw = (i: number) => Math.sin(walkPhase * Math.PI * 2 + i * Math.PI * 0.5) * 0.38;
  const tailAngle = Math.sin(tailWag * Math.PI * 2) * 0.4;

  const furMat = (
    <meshStandardMaterial color={FUR} roughness={0.85} metalness={0} />
  );
  const furDkMat = (
    <meshStandardMaterial color={FUR_DK} roughness={0.9} metalness={0} />
  );

  return (
    <group>
      {/* ── Body ── */}
      <mesh position={[0, 0, 0]} scale={[1 + bodyStretch * 0.08, 1, 1]}>
        <sphereGeometry args={[1.1, 24, 16]} />
        <meshStandardMaterial color={FUR} roughness={0.85} />
      </mesh>
      {/* chest fluff (slightly lighter sphere) */}
      <mesh position={[0.7, -0.2, 0]}>
        <sphereGeometry args={[0.65, 16, 12]} />
        <meshStandardMaterial color={FUR} roughness={0.9} />
      </mesh>

      {/* ── Chest glow ring (shows during pull) ── */}
      {chestGlow > 0 && (
        <mesh position={[0.3, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.9, 0.06, 12, 48]} />
          <meshStandardMaterial
            color={AMBER} emissive={AMBER}
            emissiveIntensity={chestGlow * 3}
            transparent opacity={chestGlow * 0.9}
          />
        </mesh>
      )}

      {/* ── Neck ── */}
      <mesh position={[1.1, 0.3, 0]} rotation={[0, 0, -0.5]}>
        <cylinderGeometry args={[0.42, 0.52, 0.72, 16]} />
        {furMat}
      </mesh>

      {/* ── Head ── */}
      <mesh position={[1.7, 0.7, 0]}>
        <sphereGeometry args={[0.62, 20, 16]} />
        {furMat}
      </mesh>
      {/* Snout */}
      <mesh position={[2.22, 0.52, 0]}>
        <boxGeometry args={[0.55, 0.36, 0.46]} />
        {furDkMat}
      </mesh>
      {/* Nose */}
      <mesh position={[2.5, 0.58, 0]}>
        <sphereGeometry args={[0.13, 10, 8]} />
        <meshStandardMaterial color={FUR_NOSE} roughness={0.6} />
      </mesh>
      {/* Eye L */}
      <mesh position={[2.1, 0.85, 0.36]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color={FUR_NOSE} roughness={0.3} metalness={0.3} />
      </mesh>
      {/* Eye R */}
      <mesh position={[2.1, 0.85, -0.36]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color={FUR_NOSE} roughness={0.3} metalness={0.3} />
      </mesh>
      {/* Ear L */}
      <mesh position={[1.6, 0.9, 0.52]} rotation={[0.2, 0, 0.25]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        {furDkMat}
      </mesh>
      <mesh position={[1.58, 0.68, 0.62]} rotation={[0.3, 0, 0.1]}>
        <sphereGeometry args={[0.22, 10, 8]} />
        {furDkMat}
      </mesh>
      {/* Ear R */}
      <mesh position={[1.6, 0.9, -0.52]} rotation={[-0.2, 0, -0.25]}>
        <sphereGeometry args={[0.28, 12, 10]} />
        {furDkMat}
      </mesh>
      <mesh position={[1.58, 0.68, -0.62]} rotation={[-0.3, 0, -0.1]}>
        <sphereGeometry args={[0.22, 10, 8]} />
        {furDkMat}
      </mesh>

      {/* ── Collar (red torus) ── */}
      <mesh position={[1.1, 0.3, 0]} rotation={[0, 0, 0.5]}>
        <torusGeometry args={[0.48, 0.07, 14, 48]} />
        <meshStandardMaterial
          color={collarGlow > 0 ? "#ff5252" : COLLAR_R}
          roughness={0.5}
          emissive={collarGlow > 0 ? "#ff3333" : "#000"}
          emissiveIntensity={collarGlow * 2}
        />
      </mesh>
      {/* D-ring on collar (small torus hanging below) */}
      <mesh position={[1.08, -0.2, 0]}>
        <torusGeometry args={[0.12, 0.028, 10, 28]} />
        <meshStandardMaterial color={METAL} metalness={0.9} roughness={0.15} />
      </mesh>

      {/* ── Legs (4) ── */}
      {/* Front-right */}
      <group position={[0.65, -0.9, 0.45]} rotation={[legSw(0), 0, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.16, 0.13, 0.7, 12]} />
          {furMat}
        </mesh>
        {/* paw */}
        <mesh position={[0, -0.68, 0]}>
          <sphereGeometry args={[0.15, 10, 8]} />
          {furDkMat}
        </mesh>
      </group>
      {/* Front-left */}
      <group position={[0.65, -0.9, -0.45]} rotation={[legSw(2), 0, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.16, 0.13, 0.7, 12]} />
          {furMat}
        </mesh>
        <mesh position={[0, -0.68, 0]}>
          <sphereGeometry args={[0.15, 10, 8]} />
          {furDkMat}
        </mesh>
      </group>
      {/* Back-right */}
      <group position={[-0.65, -0.9, 0.45]} rotation={[legSw(1), 0, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.17, 0.13, 0.72, 12]} />
          {furMat}
        </mesh>
        <mesh position={[0, -0.7, 0]}>
          <sphereGeometry args={[0.15, 10, 8]} />
          {furDkMat}
        </mesh>
      </group>
      {/* Back-left */}
      <group position={[-0.65, -0.9, -0.45]} rotation={[legSw(3), 0, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.17, 0.13, 0.72, 12]} />
          {furMat}
        </mesh>
        <mesh position={[0, -0.7, 0]}>
          <sphereGeometry args={[0.15, 10, 8]} />
          {furDkMat}
        </mesh>
      </group>

      {/* ── Tail ── */}
      <group position={[-1.08, 0.3, 0]} rotation={[0, 0, tailAngle + 0.4]}>
        <mesh position={[0, 0.35, 0]}>
          <cylinderGeometry args={[0.14, 0.08, 0.7, 10]} />
          {furDkMat}
        </mesh>
        <group position={[0, 0.72, 0]} rotation={[0, 0, 0.4]}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.08, 0.04, 0.5, 10]} />
            {furDkMat}
          </mesh>
        </group>
      </group>
    </group>
  );
};

// ─── 3D: Miracle Leash Product ────────────────────────────────────────────────
interface ProductProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  glowSnap?: number;   // 0-1 highlight snap hook
  glowCarab?: number;  // 0-1 highlight carabiner
}

const Product3D: React.FC<ProductProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  glowSnap = 0,
  glowCarab = 0,
}) => (
  <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
    {/* Nylon strap */}
    <mesh>
      <boxGeometry args={[2.4, 0.14, 0.44]} />
      <meshStandardMaterial color={METAL_DK} roughness={0.7} />
    </mesh>
    {/* Nylon texture ridges */}
    {[-0.8, -0.3, 0.2, 0.7].map((x, i) => (
      <mesh key={i} position={[x, 0, 0]}>
        <boxGeometry args={[0.04, 0.15, 0.46]} />
        <meshStandardMaterial color="#111" roughness={0.8} />
      </mesh>
    ))}

    {/* White label */}
    <mesh position={[0, 0.08, 0]}>
      <boxGeometry args={[0.92, 0.04, 0.40]} />
      <meshStandardMaterial color={LABEL_W} roughness={0.6} />
    </mesh>
    {/* Label paw icon (small dark box) */}
    <mesh position={[-0.28, 0.11, 0]}>
      <sphereGeometry args={[0.09, 8, 6]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
    </mesh>
    {/* Label text bars */}
    <mesh position={[0.08, 0.11, 0]}>
      <boxGeometry args={[0.36, 0.04, 0.1]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
    </mesh>
    <mesh position={[0.08, 0.11, -0.14]}>
      <boxGeometry args={[0.36, 0.04, 0.08]} />
      <meshStandardMaterial color={BRAND_GN} roughness={0.7} />
    </mesh>

    {/* Snap hook (left end) */}
    <group position={[-1.38, 0, 0]}>
      {/* bolt body */}
      <mesh>
        <boxGeometry args={[0.22, 0.32, 0.28]} />
        <meshStandardMaterial
          color={METAL} metalness={0.88} roughness={0.12}
          emissive={glowSnap > 0 ? GOLD : "#000"}
          emissiveIntensity={glowSnap * 2}
        />
      </mesh>
      {/* snap ring (arch) */}
      <mesh position={[0, 0.28, 0]}>
        <torusGeometry args={[0.16, 0.045, 10, 24, Math.PI]} />
        <meshStandardMaterial color={METAL} metalness={0.88} roughness={0.12} />
      </mesh>
      {/* spring lever */}
      <mesh position={[-0.14, 0, 0]}>
        <boxGeometry args={[0.06, 0.28, 0.1]} />
        <meshStandardMaterial color="#999" metalness={0.7} roughness={0.2} />
      </mesh>
    </group>

    {/* D-ring carabiner (right end) */}
    <group position={[1.38, 0, 0]}>
      {/* outer loop */}
      <mesh>
        <torusGeometry args={[0.22, 0.06, 10, 32, Math.PI * 1.75]} />
        <meshStandardMaterial
          color={METAL_DK} metalness={0.5} roughness={0.3}
          emissive={glowCarab > 0 ? CYAN : "#000"}
          emissiveIntensity={glowCarab * 2}
        />
      </mesh>
      {/* straight bar */}
      <mesh position={[0, -0.22, 0]}>
        <boxGeometry args={[0.44, 0.1, 0.1]} />
        <meshStandardMaterial color={METAL_DK} metalness={0.5} roughness={0.3} />
      </mesh>
      {/* gate */}
      <mesh position={[0.24, 0.05, 0]}>
        <boxGeometry args={[0.1, 0.42, 0.08]} />
        <meshStandardMaterial
          color={glowCarab > 0 ? CYAN : METAL}
          metalness={0.8} roughness={0.15}
          emissive={glowCarab > 0 ? CYAN : "#000"}
          emissiveIntensity={glowCarab * 1.5}
        />
      </mesh>
    </group>
  </group>
);

// ─── 3D: Leash Tube (chest wrap) ─────────────────────────────────────────────
const LeashTube: React.FC<{ progress: number; tension?: number }> = ({
  progress,
  tension = 0,
}) => {
  const tube = React.useMemo(() => {
    // CatmullRom path: from owner hand → around chest → up to carabiner
    const pts = [
      new THREE.Vector3(3.5, 4.5, 0),    // owner hand (top-right)
      new THREE.Vector3(2.2, 1.8, 0),    // near head/collar
      new THREE.Vector3(1.5, -0.5, 0.9), // front of chest
      new THREE.Vector3(0, -1.4, 1.1),   // under chest right
      new THREE.Vector3(-0.8, -1.4, 0),  // under belly
      new THREE.Vector3(0, -1.4, -1.1),  // under chest left
      new THREE.Vector3(1.5, -0.5, -0.9),// chest left
      new THREE.Vector3(1.2, 0.6, -0.7), // back up to carabiner side
    ];
    return new THREE.CatmullRomCurve3(pts);
  }, []);

  const pts = tube.getPoints(60);
  const visibleCount = Math.floor(progress * pts.length);
  const visiblePts = pts.slice(0, Math.max(2, visibleCount));

  const visCurve = React.useMemo(
    () => new THREE.CatmullRomCurve3(visiblePts),
    [progress]  // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (visiblePts.length < 2) return null;

  return (
    <mesh>
      <tubeGeometry args={[visCurve, 40, 0.045 + tension * 0.02, 8, false]} />
      <meshStandardMaterial
        color={LEASH_C}
        roughness={0.6}
        emissive={tension > 0 ? AMBER : "#000"}
        emissiveIntensity={tension * 1.2}
      />
    </mesh>
  );
};

// ─── 3D: Ground + Grid ───────────────────────────────────────────────────────
const Ground: React.FC<{ scrollZ?: number }> = ({ scrollZ = 0 }) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.65, 0]}>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color={GROUND} roughness={1} />
    </mesh>
    {/* Grid lines */}
    {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map(i => (
      <React.Fragment key={i}>
        <mesh position={[i * 1.2, -1.64, (scrollZ % 1.2) - 6]}>
          <boxGeometry args={[0.015, 0.01, 24]} />
          <meshStandardMaterial color="#1a2540" />
        </mesh>
        <mesh position={[0, -1.64, (i * 1.2 + scrollZ) % 12 - 6]}>
          <boxGeometry args={[24, 0.01, 0.015]} />
          <meshStandardMaterial color="#1a2540" />
        </mesh>
      </React.Fragment>
    ))}
  </group>
);

// ─── Camera controller component ─────────────────────────────────────────────
const Cam: React.FC<{ frame: number; kfs: number[][] }> = ({ frame, kfs }) => {
  const { camera } = useThree();
  const { pos, look } = camAt(kfs, frame);
  camera.position.set(...pos);
  camera.lookAt(...look);
  return null;
};

// ─── STEP LABEL OVERLAY ───────────────────────────────────────────────────────
const StepOverlay: React.FC<{
  frame: number; fps: number;
  num: number; title: string; body: string;
  color?: string;
}> = ({ frame, fps, num, title, body, color = GOLD }) => {
  const p = spr(frame, fps, 0, 200);
  return (
    <AbsoluteFill style={{
      display: "flex", flexDirection: "column",
      justifyContent: "flex-end", alignItems: "center",
      padding: "0 64px 110px", gap: 14,
      pointerEvents: "none",
    }}>
      {/* gradient shelf */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 520,
        background: "linear-gradient(to top, rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "relative",
        opacity: p, transform: `translateY(${interpolate(p, [0, 1], [36, 0])}px)`,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      }}>
        {/* badge */}
        <div style={{
          background: color, borderRadius: 50, padding: "6px 30px",
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: 22, fontWeight: 900, color: BG, letterSpacing: 3,
          boxShadow: `0 0 24px ${color}88`,
        }}>STEP {num}</div>
        <div style={{
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: 58, fontWeight: 900, color: WHITE, textAlign: "center",
          lineHeight: 1.08, textShadow: `0 0 40px ${color}66`,
        }}>{title}</div>
        <div style={{
          fontFamily: "Arial, sans-serif", fontSize: 30,
          color: "rgba(255,255,255,0.82)", textAlign: "center",
          lineHeight: 1.5, maxWidth: 860,
        }}>{body}</div>
      </div>
    </AbsoluteFill>
  );
};

// ─── STEP PROGRESS BAR ────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ step: number }> = ({ step }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0,
      height: 6, background: "rgba(255,255,255,0.1)",
      display: "flex",
    }}>
      {[1, 2, 3, 4].map(s => (
        <div key={s} style={{
          flex: 1, height: "100%",
          background: s <= step ? GOLD : "transparent",
          borderRight: "1px solid rgba(255,255,255,0.05)",
          transition: "background 0.3s",
          boxShadow: s === step ? `0 0 12px ${GOLD}` : "none",
        }} />
      ))}
    </div>
  </AbsoluteFill>
);

// ─── SCENE: CSS Intro ────────────────────────────────────────────────────────
const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p1 = spr(frame, fps, 5, 220);
  const p2 = spr(frame, fps, 18, 220);
  const p3 = spr(frame, fps, 32, 220);

  return (
    <AbsoluteFill style={{
      background: BG, alignItems: "center", justifyContent: "center",
    }}>
      {/* subtle radial bg glow */}
      <div style={{
        position: "absolute", width: 700, height: 700, borderRadius: "50%",
        background: `radial-gradient(circle, ${GREEN}1a 0%, transparent 70%)`,
        opacity: p1,
      }} />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        <div style={{
          opacity: p1, transform: `translateY(${interpolate(p1, [0, 1], [28, 0])}px)`,
          fontFamily: "Arial, sans-serif", fontSize: 30,
          color: "rgba(255,255,255,0.65)", letterSpacing: 8, textTransform: "uppercase",
        }}>Introducing</div>

        {/* Brand card */}
        <div style={{
          opacity: p2, transform: `scale(${interpolate(p2, [0, 1], [0.87, 1])})`,
          background: WHITE, borderRadius: 14, padding: "26px 52px",
          display: "flex", alignItems: "center", gap: 24,
          boxShadow: `0 0 80px rgba(46,125,50,0.35), 0 8px 40px rgba(0,0,0,0.5)`,
          minWidth: 660,
        }}>
          <span style={{ fontSize: 80 }}>🐾</span>
          <div>
            <div style={{
              fontFamily: "'Arial Black', Arial, sans-serif",
              fontSize: 82, fontWeight: 900, color: "#1a1a1a", lineHeight: 1,
            }}>Miracle</div>
            <div style={{
              fontFamily: "'Arial Black', Arial, sans-serif",
              fontSize: 82, fontWeight: 900, color: GREEN, lineHeight: 1,
            }}>Leash</div>
          </div>
        </div>

        <div style={{
          opacity: p2,
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: 26, fontWeight: 900, color: "#1a1a1a",
          background: WHITE, padding: "8px 32px", borderRadius: 6,
          letterSpacing: 4, textTransform: "uppercase",
          transform: `scale(${interpolate(p2, [0, 1], [0.9, 1])})`,
        }}>Take Back Control</div>

        <div style={{
          opacity: p3, transform: `translateY(${interpolate(p3, [0, 1], [18, 0])}px)`,
          fontFamily: "Arial, sans-serif", fontSize: 30,
          color: "rgba(255,255,255,0.65)", textAlign: "center",
        }}>
          Stops pulling — without harsh corrections
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── SCENE: 3D Product Showcase ───────────────────────────────────────────────
const PROD_CAMS: number[][] = [
  [  0,  0, 0.8, 4.0,   0, 0,  0],
  [ 60,  2.5, 1.2, 3.5,  0, 0,  0],
  [120, -2.0, 0.8, 3.5,  0, 0,  0],
];

const SceneProduct: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const rotY = frame * 0.022;

  return (
    <AbsoluteFill style={{ background: BG }}>
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[4, 6, 5]} intensity={1.5} color="#fff8e0" />
        <pointLight position={[-3, 2, 3]} intensity={0.8} color={GOLD} />
        <pointLight position={[3, -1, -3]} intensity={0.5} color={CYAN} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={PROD_CAMS} />
          <group rotation={[0.18, rotY, 0]}>
            <Product3D scale={1.1} />
          </group>
        </Sequence>
      </ThreeCanvas>

      {/* Text overlay */}
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        justifyContent: "flex-end", alignItems: "center",
        padding: "0 64px 110px", gap: 12, pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 480,
          background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)",
        }} />
        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{
            opacity: spr(frame, fps, 8, 220),
            transform: `translateY(${interpolate(spr(frame, fps, 8, 220), [0, 1], [30, 0])}px)`,
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 62, fontWeight: 900, color: WHITE,
            textShadow: `0 0 40px ${GOLD}66`,
          }}>The <span style={{ color: GOLD }}>Miracle Leash</span></div>
          <div style={{
            opacity: spr(frame, fps, 22, 220),
            transform: `translateY(${interpolate(spr(frame, fps, 22, 220), [0, 1], [20, 0])}px)`,
            fontFamily: "Arial, sans-serif", fontSize: 32,
            color: "rgba(255,255,255,0.75)", marginTop: 10,
          }}>
            Snap Hook · Nylon Strap · D-Ring Carabiner
          </div>
          {/* labels */}
          <div style={{
            display: "flex", gap: 24, justifyContent: "center", marginTop: 18,
            opacity: spr(frame, fps, 38, 220),
          }}>
            {[
              ["SNAP HOOK", GOLD, "→ collar"],
              ["STRAP", WHITE, "nylon"],
              ["D-RING", CYAN, "→ leash"],
            ].map(([label, color, sub]) => (
              <div key={label} style={{
                background: "rgba(255,255,255,0.07)",
                border: `1px solid ${color}44`,
                borderRadius: 12, padding: "10px 22px",
                textAlign: "center",
              }}>
                <div style={{
                  fontFamily: "'Arial Black', Arial, sans-serif",
                  fontSize: 20, fontWeight: 900, color: color as string,
                }}>{label}</div>
                <div style={{
                  fontFamily: "Arial, sans-serif",
                  fontSize: 16, color: "rgba(255,255,255,0.55)",
                }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── SCENE: Step 1 – Snap hook → Collar ──────────────────────────────────────
const S1_CAMS: number[][] = [
  [  0,  3.0, 2.5, 5.0,   1.1, 0.3,  0],
  [ 40,  0.8, 1.8, 4.2,   1.1, 0.2,  0],
  [100,  0.2, 2.0, 3.8,   1.1, 0.3,  0],
  [150,  1.6, 2.8, 3.5,   1.1, 0.0,  0],
];

const SceneStep1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Product flies in and snaps to collar position
  const flyP = ease(frame, [20, 80], [0, 1]);
  // Product position: starts above-right, moves to collar D-ring position
  const px = interpolate(flyP, [0, 1], [3.5, 0.95]);
  const py = interpolate(flyP, [0, 1], [3.0, -0.18]);
  const pz = interpolate(flyP, [0, 1], [2.0, 0.0]);
  const pscale = interpolate(flyP, [0, 0.3, 1], [0.4, 0.5, 0.42]);
  const prot = interpolate(flyP, [0, 1], [0.8, -Math.PI / 2 + 0.1]) as number;

  // snap flash at frame 82
  const snapFlash = interpolate(frame, [82, 86, 100], [0, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const collarGlow = ease(frame, [82, 130], [0, 1]);

  return (
    <AbsoluteFill style={{ background: BG }}>
      {snapFlash > 0 && (
        <AbsoluteFill style={{
          background: `rgba(245,200,66,${snapFlash * 0.35})`,
          pointerEvents: "none",
        }} />
      )}

      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 8, 4]} intensity={1.4} color="#fff8e0" />
        <pointLight position={[0, 3, 3]} intensity={0.8} color={GOLD} />
        <pointLight position={[-4, 1, 1]} intensity={0.5} color={CYAN} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={S1_CAMS} />
          <Dog3D collarGlow={collarGlow} />
          <Ground />
          {/* Product flying toward collar */}
          <Product3D
            position={[px, py, pz]}
            rotation={[prot, 0, 0]}
            scale={pscale}
            glowSnap={interpolate(flyP, [0.8, 1], [0, 1])}
          />
          {/* Snap flash particle */}
          {snapFlash > 0 && (
            <mesh position={[1.08, -0.2, 0]}>
              <sphereGeometry args={[snapFlash * 0.3, 8, 8]} />
              <meshStandardMaterial
                color={GOLD} emissive={GOLD}
                emissiveIntensity={3} transparent
                opacity={snapFlash * 0.8}
              />
            </mesh>
          )}
        </Sequence>
      </ThreeCanvas>

      <ProgressBar step={1} />
      <StepOverlay
        frame={frame} fps={fps} num={1}
        title="Clip to Collar"
        body="Attach the snap hook to your dog's collar D-ring"
        color={GOLD}
      />
    </AbsoluteFill>
  );
};

// ─── SCENE: Step 2 – Leash wraps around chest ────────────────────────────────
const S2_CAMS: number[][] = [
  [  0, -5.0, 2.2, 4.0,   0, 0.0,  0],
  [ 50, -4.2, 1.8, 5.5,   0, 0.0,  0],
  [100, -2.8, 1.5, 6.5,   0, -0.3, 0],
  [150,  0.5, 3.5, 7.0,   0, -0.5, 0],
];

const SceneStep2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const wrapP = ease(frame, [25, 130], [0, 1]);
  const tension = ease(frame, [130, 150], [0, 0.4]);

  return (
    <AbsoluteFill style={{ background: BG }}>
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <ambientLight intensity={0.45} />
        <directionalLight position={[-3, 7, 4]} intensity={1.3} color="#fff8e0" />
        <pointLight position={[2, 2, 3]} intensity={0.7} color={AMBER} />
        <pointLight position={[-3, -1, -2]} intensity={0.4} color={CYAN} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={S2_CAMS} />
          <Dog3D
            chestGlow={tension}
          />
          {/* Product already attached at collar */}
          <Product3D
            position={[0.95, -0.18, 0]}
            rotation={[-Math.PI / 2 + 0.1, 0, 0]}
            scale={0.42}
          />
          {/* Leash wrapping around chest */}
          <LeashTube progress={wrapP} tension={tension} />
          <Ground />
        </Sequence>
      </ThreeCanvas>

      {/* Fun fact */}
      <div style={{
        position: "absolute", top: 110, left: 50, right: 50,
        opacity: ease(frame, [70, 100], [0, 1]),
        background: "rgba(0,0,0,0.75)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16, padding: "14px 26px",
      }}>
        <div style={{
          fontFamily: "Arial, sans-serif", fontSize: 22,
          color: "rgba(255,255,255,0.82)", lineHeight: 1.5, textAlign: "center",
        }}>
          💡 Dogs respond better to <strong style={{ color: AMBER }}>chest tension</strong> than neck tension
        </div>
      </div>

      <ProgressBar step={2} />
      <StepOverlay
        frame={frame} fps={fps} num={2}
        title="Wrap Around Chest"
        body="Thread your leash under and around your dog's chest"
        color={AMBER}
      />
    </AbsoluteFill>
  );
};

// ─── SCENE: Step 3 – Carabiner → Leash ───────────────────────────────────────
const S3_CAMS: number[][] = [
  [  0,  0.5, 3.0, 5.5,   0, -0.5, 0],
  [ 50,  2.5, 2.0, 4.5,   1.2, -0.3, 0],
  [100,  1.0, 1.5, 4.0,   1.2, -0.5, 0],
];

const SceneStep3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const carabP = ease(frame, [20, 85], [0, 1]);
  const snapFlash = interpolate(frame, [85, 90, 105], [0, 1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // carabiner moves from offset position toward leash attachment point
  const cx = interpolate(carabP, [0, 1], [2.8, 1.2]);
  const cy = interpolate(carabP, [0, 1], [2.5, -0.4]);
  const cz = interpolate(carabP, [0, 1], [-1.5, -0.8]);

  return (
    <AbsoluteFill style={{ background: BG }}>
      {snapFlash > 0 && (
        <AbsoluteFill style={{
          background: `rgba(79,195,247,${snapFlash * 0.28})`,
          pointerEvents: "none",
        }} />
      )}

      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <ambientLight intensity={0.45} />
        <directionalLight position={[4, 8, 3]} intensity={1.3} color="#fff8e0" />
        <pointLight position={[-2, 2, 4]} intensity={0.8} color={CYAN} />
        <pointLight position={[3, -1, -2]} intensity={0.4} color={GOLD} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={S3_CAMS} />
          <Dog3D />
          {/* Full leash wrap already in place */}
          <LeashTube progress={1} tension={0} />
          {/* Product at collar */}
          <Product3D
            position={[0.95, -0.18, 0]}
            rotation={[-Math.PI / 2 + 0.1, 0, 0]}
            scale={0.42}
          />
          {/* Carabiner sliding toward leash */}
          <group position={[cx, cy, cz]}>
            <mesh>
              <torusGeometry args={[0.22, 0.06, 10, 32, Math.PI * 1.75]} />
              <meshStandardMaterial
                color={METAL_DK} metalness={0.6} roughness={0.25}
                emissive={CYAN} emissiveIntensity={carabP * 1.5}
              />
            </mesh>
            <mesh position={[0, -0.22, 0]}>
              <boxGeometry args={[0.44, 0.1, 0.1]} />
              <meshStandardMaterial color={METAL_DK} metalness={0.6} roughness={0.25} />
            </mesh>
          </group>
          {/* Clip flash */}
          {snapFlash > 0 && (
            <mesh position={[1.2, -0.4, -0.8]}>
              <sphereGeometry args={[snapFlash * 0.25, 8, 8]} />
              <meshStandardMaterial
                color={CYAN} emissive={CYAN} emissiveIntensity={4}
                transparent opacity={snapFlash * 0.85}
              />
            </mesh>
          )}
          <Ground />
        </Sequence>
      </ThreeCanvas>

      {/* Callout */}
      <div style={{
        position: "absolute", top: 110, right: 50,
        opacity: ease(frame, [90, 120], [0, 1]),
        background: "rgba(79,195,247,0.1)",
        border: `1px solid ${CYAN}55`,
        borderRadius: 14, padding: "14px 24px", maxWidth: 340,
      }}>
        <div style={{
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: 20, fontWeight: 900, color: CYAN, marginBottom: 4,
        }}>LOCKS THE CHEST LOOP</div>
        <div style={{
          fontFamily: "Arial, sans-serif", fontSize: 18,
          color: "rgba(255,255,255,0.72)", lineHeight: 1.45,
        }}>
          The carabiner keeps the chest wrap secure throughout your walk
        </div>
      </div>

      <ProgressBar step={3} />
      <StepOverlay
        frame={frame} fps={fps} num={3}
        title="Clip to Leash"
        body="Fasten the D-ring carabiner onto your leash — setup complete"
        color={CYAN}
      />
    </AbsoluteFill>
  );
};

// ─── SCENE: Walk Demo ─────────────────────────────────────────────────────────
const WALK_CAMS: number[][] = [
  [  0,  1.0, 1.2, 9.0,   0, 0.0,  0],
  [ 40,  3.5, 1.5, 7.5,  0,  0.2,  0],  // pull — side-right
  [ 90,  0.0, 0.8, 10.0,  0, 0.0,  0],  // relaxed wide
  [130, -4.0, 2.0, 6.0,   0, 0.2,  0],  // side-left
  [165,  1.5, 2.5, 8.0,   0, 0.5,  0],  // settle
];

const SceneWalk: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const walkPhase = frame * 0.045;
  // Pull: 40–85, calm: 90+
  const pullP = ease(frame, [40, 75], [0, 1]);
  const calmP = ease(frame, [88, 115], [0, 1]);
  const chestGlow = Math.max(0, pullP - calmP);
  const tension = chestGlow * 0.6;
  const stretch = pullP * (1 - calmP) * 0.12;

  // Camera shake during pull
  const shakeX = chestGlow * Math.sin(frame * 19.7) * 0.04;
  const shakeY = chestGlow * Math.sin(frame * 13.1) * 0.025;

  // Dog moves forward during pull
  const dogX = ease(frame, [40, 85], [0, 0.6]) - ease(frame, [88, 115], [0, 0.6]);

  return (
    <AbsoluteFill style={{ background: BG }}>
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 8, 5]} intensity={1.3} color="#fff8e0" />
        <pointLight
          position={[2, 3, 3]} intensity={0.7}
          color={chestGlow > 0 ? AMBER : GREEN_LT}
        />
        <pointLight position={[-3, 1, -2]} intensity={0.4} color={CYAN} />
        <Sequence layout="none">
          <CamWithShake frame={frame} kfs={WALK_CAMS} shakeX={shakeX} shakeY={shakeY} />
          <group position={[dogX, 0, 0]}>
            <Dog3D
              walkPhase={walkPhase}
              bodyStretch={stretch}
              chestGlow={chestGlow}
              tailWag={walkPhase}
            />
            <LeashTube progress={1} tension={tension} />
            <Product3D
              position={[0.95, -0.18, 0]}
              rotation={[-Math.PI / 2 + 0.1, 0, 0]}
              scale={0.42}
            />
          </group>
          <Ground scrollZ={-walkPhase * 0.8} />
        </Sequence>
      </ThreeCanvas>

      {/* "Dog pulls" moment */}
      {pullP > 0.3 && calmP < 0.4 && (
        <div style={{
          position: "absolute", top: 180, left: 60,
          opacity: interpolate(pullP, [0.3, 0.6], [0, 1]) * (1 - calmP),
          background: "rgba(255,87,34,0.18)",
          border: "1px solid #ff5722aa",
          borderRadius: 14, padding: "12px 26px",
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: 28, fontWeight: 900, color: "#ff7043",
        }}>🐕 Dog pulls...</div>
      )}
      {chestGlow > 0.3 && (
        <div style={{
          position: "absolute", top: 240, left: 60,
          opacity: chestGlow * (1 - calmP * 0.5),
          background: "rgba(255,167,38,0.16)",
          border: `1px solid ${AMBER}aa`,
          borderRadius: 14, padding: "12px 26px",
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: 26, fontWeight: 900, color: AMBER,
        }}>✓ Chest pressure redirects gently</div>
      )}
      {/* After calm */}
      {calmP > 0.5 && (
        <div style={{
          position: "absolute", top: 180, left: 50, right: 50,
          opacity: calmP,
          transform: `scale(${interpolate(calmP, [0.5, 1], [0.9, 1])})`,
          background: "rgba(46,125,50,0.18)",
          border: `2px solid ${GREEN}`,
          borderRadius: 18, padding: "16px 30px", textAlign: "center",
        }}>
          <div style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 34, fontWeight: 900, color: GREEN_LT,
          }}>No harsh corrections needed</div>
          <div style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 24, color: "rgba(255,255,255,0.72)", marginTop: 6,
          }}>Natural feedback = calmer walks 🐾</div>
        </div>
      )}

      <ProgressBar step={4} />
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column",
        justifyContent: "flex-end", alignItems: "center",
        padding: "0 64px 110px", gap: 14, pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 380,
          background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)",
        }} />
        <div style={{
          position: "relative",
          opacity: spr(frame, fps, 0, 200),
          transform: `translateY(${interpolate(spr(frame, fps, 0, 200), [0, 1], [30, 0])}px)`,
          textAlign: "center",
        }}>
          <div style={{
            background: GREEN, borderRadius: 50, padding: "6px 30px",
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 22, fontWeight: 900, color: WHITE, letterSpacing: 3,
            display: "inline-block", marginBottom: 12,
          }}>STEP 4</div>
          <div style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 62, fontWeight: 900, color: WHITE,
            lineHeight: 1.05, textShadow: `0 0 40px ${GREEN}66`,
          }}>Have a great walk! 🐾</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Camera with shake
const CamWithShake: React.FC<{
  frame: number; kfs: number[][]; shakeX: number; shakeY: number;
}> = ({ frame, kfs, shakeX, shakeY }) => {
  const { camera } = useThree();
  const { pos, look } = camAt(kfs, frame);
  camera.position.set(pos[0] + shakeX, pos[1] + shakeY, pos[2]);
  camera.lookAt(look[0], look[1], look[2]);
  return null;
};

// ─── SCENE: CSS Outro ─────────────────────────────────────────────────────────
const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p1 = spr(frame, fps, 0, 200);
  const p2 = spr(frame, fps, 14, 200);
  const p3 = spr(frame, fps, 28, 200);
  const p4 = spr(frame, fps, 42, 200);
  const p5 = spr(frame, fps, 56, 200);

  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at center, #0e1a28 0%, ${BG} 100%)`,
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        position: "absolute", width: 700, height: 700, borderRadius: "50%",
        background: `radial-gradient(circle, ${GREEN}22 0%, transparent 70%)`,
        opacity: p1,
      }} />

      <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", gap: 22, padding: "0 64px",
      }}>
        {/* Brand card */}
        <div style={{
          opacity: p1, transform: `scale(${interpolate(p1, [0, 1], [0.86, 1])})`,
          background: WHITE, borderRadius: 16, padding: "24px 54px",
          display: "flex", alignItems: "center", gap: 24,
          boxShadow: `0 0 80px rgba(46,125,50,0.5), 0 8px 50px rgba(0,0,0,0.5)`,
        }}>
          <span style={{ fontSize: 76 }}>🐾</span>
          <div>
            <div style={{
              fontFamily: "'Arial Black', Arial, sans-serif",
              fontSize: 78, fontWeight: 900, color: "#1a1a1a", lineHeight: 1,
            }}>Miracle</div>
            <div style={{
              fontFamily: "'Arial Black', Arial, sans-serif",
              fontSize: 78, fontWeight: 900, color: GREEN, lineHeight: 1,
            }}>Leash</div>
          </div>
        </div>

        {/* Tagline */}
        <div style={{
          opacity: p2, transform: `translateY(${interpolate(p2, [0, 1], [18, 0])}px)`,
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize: 36, fontWeight: 900, color: WHITE, textAlign: "center",
          letterSpacing: 3, textTransform: "uppercase",
        }}>Take Back Control</div>

        {/* Stars */}
        <div style={{
          opacity: p3, display: "flex", gap: 10,
          transform: `translateY(${interpolate(p3, [0, 1], [16, 0])}px)`,
        }}>
          {[0,1,2,3,4].map(i => (
            <span key={i} style={{
              fontSize: 44, color: GOLD,
              filter: `drop-shadow(0 0 8px ${GOLD}aa)`,
            }}>★</span>
          ))}
        </div>
        <div style={{
          opacity: p3, fontFamily: "Arial, sans-serif",
          fontSize: 24, color: "rgba(255,255,255,0.6)", marginTop: -12,
        }}>Thousands of happy dog owners</div>

        {/* URL */}
        <div style={{
          opacity: p4, transform: `translateY(${interpolate(p4, [0, 1], [14, 0])}px)`,
          background: `linear-gradient(135deg, ${GREEN}28, ${GREEN}50)`,
          border: `2px solid ${GREEN}`,
          borderRadius: 60, padding: "16px 62px",
          boxShadow: `0 0 30px ${GREEN}55`,
        }}>
          <div style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 42, fontWeight: 900, color: WHITE, letterSpacing: 1,
          }}>miracleleash.com</div>
        </div>

        {/* Amazon */}
        <div style={{
          opacity: p5, transform: `translateY(${interpolate(p5, [0, 1], [14, 0])}px)`,
          display: "flex", alignItems: "center", gap: 18,
          background: "rgba(255,153,0,0.15)", border: "2px solid #FF9900",
          borderRadius: 50, padding: "12px 42px",
        }}>
          <span style={{ fontSize: 32 }}>🛒</span>
          <div style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 28, fontWeight: 900, color: "#FF9900",
          }}>Available on Amazon</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export const MiracleLeashV3: React.FC = () => (
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
