/**
 * MiracleLeashGuide2 – Advanced 3D How-To Video
 *
 * Features:
 *  • Real product video backdrop in intro + outro
 *  • 8-angle cinematic camera with smooth keyframe interpolation
 *  • Screen shake + red vignette when dog pulls
 *  • Particle burst at collar when loop tightens
 *  • Animated step-progress bar (top)
 *  • Captions at 62 % from top (not cramped at bottom)
 *  • Dynamic orbiting key-light, accent lights per phase
 *  • Ear-flap physics, head-turn idle, body-stretch walk cycle
 *  • 2-segment articulated tail, collar ID tag
 *  • Scrolling ground grid during walking phase
 */

import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { Video } from "@remotion/media";

// ─── Palette ──────────────────────────────────────────────────────────────────
const FUR        = "#D4A855";
const FUR_DARK   = "#9A6B20";
const COLLAR_RED = "#CC2222";
const LOOP_GOLD  = "#F5C842";
const LOOP_HOT   = "#FF6600";
const LEASH_BLUE = "#2255BB";
const BG_DARK    = "#07090f";
const GROUND_CLR = "#0f1422";
const GRID_CLR   = "#1a2035";
const GOLD       = "#F5C842";
const WHITE      = "#ffffff";
const CYAN       = "#4FC3F7";
const GREEN      = "#81C784";
const ORANGE     = "#FF7A00";

// ─── Timeline  (30 fps) ───────────────────────────────────────────────────────
const T = {
  INTRO_S  :   0,   //  0 – 4 s    product-video intro
  INTRO_E  : 120,
  DOG_S    : 120,   //  4 – 7 s    dog enters, orbit cam
  DOG_STBL : 210,   //  7 s        cam settles
  S1_S     : 270,   //  9 – 14 s   step 1 – attach loop (zoom front)
  S1_E     : 420,
  S2_S     : 420,   // 14 – 19 s   step 2 – connect leash (side angle)
  S2_E     : 570,
  S3_S     : 570,   // 19 – 21 s   step 3a – calm walk (low wide)
  PULL_S   : 630,   // 21 – 27 s   step 3b – pull + tighten
  PULL_E   : 810,
  RELAX_S  : 810,   // 27 – 31 s   step 4 – relax + loosen
  RELAX_E  : 930,
  OUTRO_S  : 930,   // 31 – 36 s   product-video outro / CTA
  TOTAL    : 1080,
};

export const GUIDE2_DURATION = T.TOTAL;

// ─── Camera keyframes  [frame, px, py, pz,  lx, ly, lz] ──────────────────────
const CAM_KF: number[][] = [
  [   0,   0.0, 4.0, 8.0,   0, 2.0, 0   ],   // intro elevated
  [ 120,   5.5, 3.2, 6.5,   0, 1.2, 0   ],   // dog enter – orbit right
  [ 185,   1.8, 2.7, 9.2,   0, 1.2, 0   ],   // sweeping left
  [ 270,   0.0, 2.5, 9.0,   0, 1.0, 0   ],   // settle neutral
  [ 330,   0.0, 2.0, 4.2,   0, 1.75,0.85],   // zoom collar front
  [ 420,   0.0, 2.0, 4.2,   0, 1.75,0.85],
  [ 480,  -4.8, 2.2, 3.8,   0, 1.55,0.5 ],   // side angle
  [ 570,  -4.8, 2.2, 3.8,   0, 1.55,0.5 ],
  [ 630,   1.0, 0.75,11.0,  0, 1.0, 0   ],   // low wide (dog toward cam)
  [ 660,   2.6, 1.55, 9.5,  0, 1.1,-0.5 ],   // pull – right tracking
  [ 810,   2.6, 1.55, 9.5,  0, 1.1,-0.5 ],
  [ 870,   0.0, 2.5, 8.5,   0, 1.0, 0   ],   // relax – normalise
  [ 930,   0.0, 2.5, 8.5,   0, 1.0, 0   ],
  [1020,   3.2, 3.5, 7.0,   0, 2.0, 0   ],   // outro orbit
  [1080,  -2.0, 3.5, 7.5,   0, 2.0, 0   ],
];

function camAt(frame: number): {
  pos : [number, number, number];
  look: [number, number, number];
} {
  const kf = CAM_KF;
  if (frame <= kf[0][0]) {
    const [, px, py, pz, lx, ly, lz] = kf[0];
    return { pos: [px, py, pz], look: [lx, ly, lz] };
  }
  const last = kf[kf.length - 1];
  if (frame >= last[0]) {
    const [, px, py, pz, lx, ly, lz] = last;
    return { pos: [px, py, pz], look: [lx, ly, lz] };
  }
  let i = 0;
  while (i < kf.length - 1 && kf[i + 1][0] <= frame) i++;
  const a = kf[i], b = kf[i + 1];
  const t = (frame - a[0]) / (b[0] - a[0]);
  const e = Easing.inOut(Easing.quad)(t);
  const lerp = (ai: number) => a[ai] + (b[ai] - a[ai]) * e;
  return {
    pos : [lerp(1), lerp(2), lerp(3)],
    look: [lerp(4), lerp(5), lerp(6)],
  };
}

// ─── Camera controller ────────────────────────────────────────────────────────
const CameraCtrl: React.FC<{
  frame  : number;
  pulling: boolean;
  dogZ   : number;
}> = ({ frame, pulling, dogZ }) => {
  const { camera } = useThree();
  const { pos, look } = camAt(frame);

  // Screen shake amplitude – ramps in then out over the pull phase
  const shakeIn  = interpolate(frame, [T.PULL_S, T.PULL_S + 25], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const shakeOut = interpolate(frame, [T.PULL_E - 25, T.PULL_E], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const shakeAmt = pulling ? Math.max(0, shakeIn - shakeOut) : 0;
  const sx = Math.sin(frame * 19.7) * 0.020 * shakeAmt;
  const sy = Math.sin(frame * 27.3) * 0.013 * shakeAmt;

  // Camera loosely tracks dog Z during pull
  const trackZ = pulling ? dogZ * 0.38 : 0;

  camera.position.set(pos[0] + sx, pos[1] + sy, pos[2]);
  camera.lookAt(look[0], look[1], look[2] + trackZ);
  return null;
};

// ─── Dynamic lighting ─────────────────────────────────────────────────────────
const Lights: React.FC<{
  frame    : number;
  pulling  : boolean;
  loopTight: number;
}> = ({ frame, pulling, loopTight }) => {
  const orbit = frame * 0.018;
  const lx = Math.sin(orbit) * 5;
  const lz = Math.cos(orbit) * 5;
  const pullFill = interpolate(loopTight, [0, 1], [0, 1.8]);
  return (
    <>
      <ambientLight intensity={0.50} />
      <directionalLight position={[4, 9, 6]} intensity={1.10} color="#fff8e0" castShadow />
      <pointLight position={[lx, 6, lz]} intensity={0.55} color={GOLD} />
      <pointLight position={[0, 2, 3]} intensity={pullFill} color={pulling ? ORANGE : GOLD} />
      <pointLight position={[-4, 3, -3]} intensity={0.30} color={CYAN} />
    </>
  );
};

// ─── Ground + scrolling grid ──────────────────────────────────────────────────
const Ground: React.FC<{
  frame  : number;
  fps    : number;
  walking: boolean;
  dogZ   : number;
}> = ({ frame, fps, walking, dogZ }) => {
  const appear = spring({ frame: frame - T.DOG_STBL, fps, config: { damping: 200 } });
  const scroll = walking ? dogZ * 0.85 : 0;
  const tiles  = Array.from({ length: 9 }, (_, i) => (i - 4) * 1.6);

  return (
    <>
      <mesh position={[0, 0, scroll]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[42, 42]} />
        <meshStandardMaterial color={GROUND_CLR} roughness={0.97} opacity={appear} transparent />
      </mesh>
      {tiles.map((v, i) => (
        <React.Fragment key={i}>
          <mesh position={[v, 0.008, scroll]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.012, 28]} />
            <meshStandardMaterial color={GRID_CLR} opacity={appear * 0.6} transparent />
          </mesh>
          <mesh position={[0, 0.008, v + scroll]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[28, 0.012]} />
            <meshStandardMaterial color={GRID_CLR} opacity={appear * 0.6} transparent />
          </mesh>
        </React.Fragment>
      ))}
    </>
  );
};

// ─── Collar-burst particles ───────────────────────────────────────────────────
const BurstParticles: React.FC<{
  frame  : number;
  pulling: boolean;
  dogZ   : number;
}> = ({ frame, pulling, dogZ }) => {
  const burst = interpolate(frame, [T.PULL_S + 5, T.PULL_S + 80], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const pts = React.useMemo(
    () =>
      Array.from({ length: 32 }, (_, i) => ({
        a : (i / 32) * Math.PI * 2,
        r : 0.7 + Math.sin(i * 1.9) * 0.5,
        sp: 0.75 + Math.cos(i * 2.7) * 0.35,
      })),
    []
  );

  if (!pulling && burst < 0.01) return null;

  return (
    <>
      {pts.map(({ a, r, sp }, i) => {
        const t  = burst * sp;
        const x  = Math.cos(a) * r * t * 1.9;
        const y  = 1.71 + t * 1.3;
        const z  = 0.91 + dogZ + Math.sin(a) * r * t * 1.9;
        const sc = Math.max(0, (1 - t)) * 0.075;
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[sc, 6, 6]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? GOLD : ORANGE}
              emissive={GOLD}
              emissiveIntensity={0.9}
            />
          </mesh>
        );
      })}
    </>
  );
};

// ─── Intro 3D scene (ring reveal) ────────────────────────────────────────────
const IntroRings: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const p    = spring({ frame, fps, config: { damping: 160 } });
  const sc   = interpolate(p, [0, 1], [0.01, 1]);
  const spin = frame * 0.022;
  const sp2  = -frame * 0.016;

  return (
    <group position={[0, 1.5, 0]}>
      <mesh rotation={[0.4, spin, 0.2]} scale={[sc, sc, sc]}>
        <torusGeometry args={[2.1, 0.075, 16, 100]} />
        <meshStandardMaterial color={GOLD} metalness={0.95} roughness={0.04}
          emissive={GOLD} emissiveIntensity={0.45} />
      </mesh>
      <mesh rotation={[-0.3, sp2, 0.5]} scale={[sc * 0.65, sc * 0.65, sc * 0.65]}>
        <torusGeometry args={[1.75, 0.055, 14, 80]} />
        <meshStandardMaterial color={CYAN} metalness={0.9} roughness={0.08}
          emissive={CYAN} emissiveIntensity={0.35} />
      </mesh>
      {Array.from({ length: 22 }).map((_, i) => {
        const a = (i / 22) * Math.PI * 2 + spin * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 2.1, Math.sin(a * 1.4) * 0.45, Math.sin(a) * 2.1]}>
            <sphereGeometry args={[0.055 * sc, 6, 6]} />
            <meshStandardMaterial color={i % 3 === 0 ? GOLD : WHITE}
              emissive={GOLD} emissiveIntensity={0.65} />
          </mesh>
        );
      })}
    </group>
  );
};

// ─── Outro 3D scene ───────────────────────────────────────────────────────────
const OutroRings: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const lf   = frame - T.OUTRO_S;
  const p    = spring({ frame: lf, fps, config: { damping: 160 } });
  const sc   = interpolate(p, [0, 1], [0.01, 1]);
  const spin = lf * 0.020;

  return (
    <group position={[0, 1.8, 0]}>
      <mesh rotation={[0.3, spin, 0.1]} scale={[sc, sc, sc]}>
        <torusGeometry args={[2.0, 0.082, 16, 100]} />
        <meshStandardMaterial color={GOLD} metalness={0.95} roughness={0.04}
          emissive={GOLD} emissiveIntensity={0.55} />
      </mesh>
      {Array.from({ length: 18 }).map((_, i) => {
        const a  = (i / 18) * Math.PI * 2 + spin * 1.6;
        const s2 = sc * 0.085;
        return (
          <mesh key={i} position={[Math.cos(a) * 2.2, Math.sin(a * 0.8) * 0.3, Math.sin(a) * 2.2]}>
            <sphereGeometry args={[s2, 6, 6]} />
            <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.75} />
          </mesh>
        );
      })}
    </group>
  );
};

// ─── 3D Dog ───────────────────────────────────────────────────────────────────
const Dog: React.FC<{
  frame    : number;
  fps      : number;
  walking  : boolean;
  pulling  : boolean;
  loopTight: number;
  dogZ     : number;
}> = ({ frame, fps, walking, pulling, loopTight, dogZ }) => {
  const enter   = spring({ frame: frame - T.DOG_S, fps, config: { damping: 120 } });
  const sc      = interpolate(enter, [0, 1], [0.01, 1]);
  const breathe = Math.sin(frame * 0.06) * 0.012;
  const cycle   = frame * 0.20;
  const wag     = Math.sin(frame * (walking && !pulling ? 0.30 : 0.10)) * (walking ? 0.62 : 0.34);
  const legFL   = walking ? Math.sin(cycle) * 0.64 : 0;
  const legFR   = walking ? Math.sin(cycle + Math.PI) * 0.64 : 0;
  const legBL   = walking ? Math.sin(cycle + Math.PI) * 0.64 : 0;
  const legBR   = walking ? Math.sin(cycle) * 0.64 : 0;
  const earFlop = walking ? Math.sin(cycle) * 0.08 : 0;
  const headY   = !walking && !pulling ? Math.sin(frame * 0.038) * 0.20 : 0;
  const headPit = pulling ? 0.28 : 0;
  const lean    = pulling ? 0.10 : 0;
  const stretch = walking ? 1 + Math.sin(cycle * 2) * 0.014 : 1;
  const loopR   = interpolate(loopTight, [0, 1], [0.30, 0.13]);
  const loopGlw = interpolate(loopTight, [0, 1], [0.06, 1.5]);
  const loopCol = loopTight > 0.4 ? LOOP_HOT : LOOP_GOLD;

  const legs: [number, number, number, number][] = [
    [-0.37, 0.72,  0.58, legFL],
    [ 0.37, 0.72,  0.58, legFR],
    [-0.37, 0.70, -0.64, legBL],
    [ 0.37, 0.70, -0.64, legBR],
  ];

  return (
    <group position={[0, 0, dogZ]} scale={[sc, sc, sc]}>

      {/* ── Body ── */}
      <mesh position={[0, 1.18 + breathe, 0]} scale={[1.30, 0.92 * stretch, 2.0]} rotation={[-lean, 0, 0]}>
        <boxGeometry /><meshStandardMaterial color={FUR} roughness={0.82} />
      </mesh>
      {/* Chest */}
      <mesh position={[0, 1.22 + breathe, 0.72]} rotation={[-0.14 - lean, 0, 0]}>
        <sphereGeometry args={[0.54, 12, 12]} /><meshStandardMaterial color={FUR} roughness={0.82} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 1.70 + breathe, 0.82]} rotation={[0.18 + lean, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.30, 0.52, 12]} /><meshStandardMaterial color={FUR} roughness={0.82} />
      </mesh>

      {/* ── Head ── */}
      <group position={[0, 2.11 + breathe, 1.06]} rotation={[headPit + lean, headY, 0]}>
        {/* Skull */}
        <mesh><sphereGeometry args={[0.52, 20, 20]} /><meshStandardMaterial color={FUR} roughness={0.82} /></mesh>
        {/* Forehead */}
        <mesh position={[0, 0.30, -0.10]}>
          <sphereGeometry args={[0.31, 12, 12]} /><meshStandardMaterial color={FUR} roughness={0.82} />
        </mesh>
        {/* Snout */}
        <mesh position={[0, -0.12, 0.42]}>
          <boxGeometry args={[0.35, 0.27, 0.42]} /><meshStandardMaterial color={FUR_DARK} roughness={0.9} />
        </mesh>
        {/* Lower jaw */}
        <mesh position={[0, -0.21, 0.39]}>
          <boxGeometry args={[0.30, 0.10, 0.38]} /><meshStandardMaterial color={FUR_DARK} roughness={0.9} />
        </mesh>
        {/* Nose */}
        <mesh position={[0, -0.08, 0.63]}>
          <sphereGeometry args={[0.088, 10, 10]} /><meshStandardMaterial color="#040404" roughness={0.2} metalness={0.4} />
        </mesh>
        {/* Eyes */}
        {([-1, 1] as const).map((s) => (
          <group key={s} position={[s * 0.20, 0.13, 0.44]}>
            <mesh><sphereGeometry args={[0.076, 12, 12]} /><meshStandardMaterial color="#060606" roughness={0.06} metalness={0.7} /></mesh>
            <mesh position={[s * -0.022, 0.030, 0.065]}>
              <sphereGeometry args={[0.024, 6, 6]} /><meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
        {/* Ears */}
        {([-1, 1] as const).map((s) => (
          <mesh key={s} position={[s * 0.44, 0.06, -0.08]} rotation={[0.10 + earFlop, 0, s * 0.34]}>
            <boxGeometry args={[0.20, 0.52, 0.15]} /><meshStandardMaterial color={FUR_DARK} roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* ── Red collar ── */}
      <mesh position={[0, 1.74 + breathe, 0.82]} rotation={[Math.PI / 2 + 0.12, 0, 0]}>
        <torusGeometry args={[0.29, 0.07, 10, 44]} />
        <meshStandardMaterial color={COLLAR_RED} metalness={0.25} roughness={0.65} />
      </mesh>
      {/* Collar ID tag */}
      <mesh position={[0, 1.65 + breathe, 0.93]}>
        <boxGeometry args={[0.14, 0.19, 0.04]} />
        <meshStandardMaterial color="#FFD700" metalness={0.85} roughness={0.15} />
      </mesh>

      {/* ── Miracle Leash loop ── */}
      {frame >= T.S1_S && (
        <group position={[0, 1.71 + breathe, 0.91]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[loopR, 0.042, 10, 50]} />
            <meshStandardMaterial color={loopCol} metalness={0.95} roughness={0.04}
              emissive={loopCol} emissiveIntensity={loopGlw} />
          </mesh>
          {/* Connector pin */}
          <mesh position={[0, -0.065, 0]}>
            <cylinderGeometry args={[0.030, 0.030, 0.12, 8]} />
            <meshStandardMaterial color="#aaaaaa" metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      )}

      {/* ── Legs ── */}
      {legs.map(([x, y, z, rot], i) => (
        <group key={i} position={[x, y, z]} rotation={[rot, 0, 0]}>
          <mesh position={[0, -0.22, 0]}>
            <cylinderGeometry args={[0.14, 0.12, 0.48, 10]} /><meshStandardMaterial color={FUR} roughness={0.82} />
          </mesh>
          <mesh position={[0, -0.57, 0.04]}>
            <cylinderGeometry args={[0.11, 0.09, 0.42, 10]} /><meshStandardMaterial color={FUR} roughness={0.82} />
          </mesh>
          <mesh position={[0, -0.84, 0.09]}>
            <boxGeometry args={[0.19, 0.11, 0.28]} /><meshStandardMaterial color={FUR_DARK} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* ── Tail (2-segment) ── */}
      <group position={[0, 1.40 + breathe, -0.96]} rotation={[-0.42, 0, wag]}>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.072, 0.13, 0.48, 8]} /><meshStandardMaterial color={FUR} roughness={0.80} />
        </mesh>
        <group position={[0, 0.49, 0]} rotation={[-0.20, 0, wag * 0.6]}>
          <mesh position={[0, 0.19, 0]}>
            <cylinderGeometry args={[0.050, 0.072, 0.40, 8]} /><meshStandardMaterial color={FUR} roughness={0.80} />
          </mesh>
        </group>
      </group>

    </group>
  );
};

// ─── Leash line + handle ──────────────────────────────────────────────────────
const LeashLine: React.FC<{
  frame  : number;
  fps    : number;
  pulling: boolean;
  dogZ   : number;
}> = ({ frame, fps, pulling, dogZ }) => {
  const appear = spring({ frame: frame - T.S2_S - 8, fps, config: { damping: 200 } });
  if (appear < 0.02) return null;

  const cy = 1.71, cz = 0.91 + dogZ;
  const hy = 4.9,  hz = pulling ? 0.55 + dogZ * 0.55 : 0.55;
  const dy = hy - cy, dz = hz - cz;
  const len = Math.sqrt(dy * dy + dz * dz);
  const rotX = -Math.atan2(dz, dy);

  return (
    <group scale={[appear, appear, appear]}>
      <mesh position={[0, (cy + hy) / 2, (cz + hz) / 2]} rotation={[rotX, 0, 0]}>
        <cylinderGeometry args={[0.027, 0.027, len, 8]} />
        <meshStandardMaterial color={LEASH_BLUE} metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[0, hy + 0.20, hz]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.19, 0.034, 8, 28]} />
        <meshStandardMaterial color={LEASH_BLUE} metalness={0.25} roughness={0.6} />
      </mesh>
    </group>
  );
};

// ─── Collar indicator arrow ───────────────────────────────────────────────────
const Arrow: React.FC<{ frame: number; fps: number; dogZ: number }> = ({ frame, fps, dogZ }) => {
  const show = interpolate(frame, [T.S1_S, T.S1_S + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const hide = interpolate(frame, [T.S2_S - 20, T.S2_S], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const op   = Math.max(0, show - hide);
  const bob  = Math.sin(frame * 0.16) * 0.15;
  if (op < 0.02) return null;

  return (
    <group position={[0, 2.85 + bob, 0.91 + dogZ]} rotation={[Math.PI, 0, 0]} scale={[op, op, op]}>
      <mesh><coneGeometry args={[0.14, 0.44, 8]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={1.3} />
      </mesh>
      <mesh position={[0, 0.40, 0]}>
        <cylinderGeometry args={[0.038, 0.038, 0.30, 8]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.9} />
      </mesh>
    </group>
  );
};

// ─── Caption  (positioned at 62 % from top) ───────────────────────────────────
const Caption: React.FC<{
  step   ?: number;
  eyebrow?: string;
  headline: string;
  body   ?: string;
  accent ?: string;
}> = ({ step, eyebrow, headline, body, accent = GOLD }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = (d: number) => spring({ frame: frame - d, fps, config: { damping: 200 } });
  const sl = (prog: number): React.CSSProperties => ({
    opacity  : prog,
    transform: `translateY(${interpolate(prog, [0, 1], [22, 0])}px)`,
  });

  return (
    <AbsoluteFill style={{
      display       : "flex",
      flexDirection : "column",
      alignItems    : "center",
      justifyContent: "flex-start",
      paddingTop    : "62%",
      paddingLeft   : 52,
      paddingRight  : 52,
      background    : "linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.50) 28%, transparent 55%)",
      pointerEvents : "none",
      gap           : 0,
    }}>

      {step !== undefined && (
        <div style={{ ...sl(p(0)), marginBottom: 10 }}>
          <div style={{
            display     : "inline-block",
            background  : accent,
            color       : "#000",
            fontFamily  : "'Arial Black', Arial, sans-serif",
            fontWeight  : 900,
            fontSize    : 22,
            padding     : "5px 22px",
            borderRadius: 30,
            letterSpacing: 2,
          }}>
            STEP {step} OF 4
          </div>
        </div>
      )}

      {eyebrow && (
        <div style={{ ...sl(p(5)), textAlign: "center", marginBottom: 10 }}>
          <div style={{
            fontFamily   : "'Arial Black', Arial, sans-serif",
            fontSize     : 25,
            fontWeight   : 900,
            letterSpacing: 4,
            color        : accent,
            textTransform: "uppercase",
          }}>
            {eyebrow}
          </div>
        </div>
      )}

      <div style={{ ...sl(p(10)), textAlign: "center", marginBottom: 14 }}>
        <div style={{
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontSize  : 64,
          fontWeight: 900,
          color     : WHITE,
          lineHeight: 1.08,
          textShadow: `0 0 36px ${accent}55, 0 4px 20px rgba(0,0,0,0.85)`,
        }}>
          {headline}
        </div>
      </div>

      {body && (
        <div style={{ ...sl(p(18)), textAlign: "center", marginBottom: 14 }}>
          <div style={{
            fontFamily: "Arial, sans-serif",
            fontSize  : 30,
            color     : "rgba(255,255,255,0.88)",
            lineHeight: 1.55,
            maxWidth  : 840,
            textShadow: "0 2px 12px rgba(0,0,0,0.7)",
          }}>
            {body}
          </div>
        </div>
      )}

      <div style={{ ...sl(p(25)) }}>
        <div style={{
          width      : 60,
          height     : 4,
          background : accent,
          borderRadius: 2,
          boxShadow  : `0 0 14px ${accent}`,
        }} />
      </div>
    </AbsoluteFill>
  );
};

// ─── Step progress bar ────────────────────────────────────────────────────────
const StepBar: React.FC<{ step: number; visible: boolean }> = ({ step, visible }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = spring({ frame, fps, config: { damping: 200 } });
  if (!visible) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* Labels */}
      <div style={{
        position: "absolute", top: 56, left: 60, right: 60,
        display: "flex", opacity: op * 0.65,
      }}>
        {["Attach", "Leash", "Walk", "Relax"].map((lbl, i) => (
          <div key={i} style={{
            flex: 1, textAlign: "center",
            fontFamily: "Arial, sans-serif", fontSize: 17,
            color: step > i ? GOLD : "rgba(255,255,255,0.5)",
            letterSpacing: 1,
          }}>
            {lbl}
          </div>
        ))}
      </div>
      {/* Bar */}
      <div style={{
        position: "absolute", top: 42, left: 60, right: 60,
        display: "flex", gap: 10, opacity: op,
      }}>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} style={{
            flex: 1, height: 5, borderRadius: 3,
            background : step >= s ? GOLD : "rgba(255,255,255,0.16)",
            boxShadow  : step === s ? `0 0 10px ${GOLD}` : "none",
          }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ─── Vignette – pulses red when loop is tight ─────────────────────────────────
const Vignette: React.FC<{ loopTight: number; frame: number }> = ({ loopTight, frame }) => {
  const pulse = interpolate(loopTight, [0, 1], [0, 0.28 + Math.sin(frame * 0.28) * 0.08]);
  return (
    <AbsoluteFill style={{
      background   : `radial-gradient(ellipse at center, transparent 30%, rgba(170,30,0,${pulse}) 100%)`,
      pointerEvents: "none",
    }} />
  );
};

// ─── Root composition ─────────────────────────────────────────────────────────
export const MiracleLeashGuide2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // State flags
  const isIntro  = frame < T.INTRO_E;
  const isOutro  = frame >= T.OUTRO_S;
  const hasDog   = frame >= T.DOG_S;
  const inGuide  = frame >= T.DOG_STBL && !isOutro;
  const walking  = frame >= T.S3_S && !isOutro;
  const pulling  = frame >= T.PULL_S && frame < T.PULL_E;

  // Loop tightness
  const tightIn  = interpolate(frame, [T.PULL_S, T.PULL_S + 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tightOut = interpolate(frame, [T.RELAX_S, T.RELAX_S + 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const loopTight = Math.max(0, tightIn - tightOut);

  // Dog Z movement
  const fwdIn  = interpolate(frame, [T.S3_S, T.S3_S + 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fwdOut = interpolate(frame, [T.RELAX_S, T.RELAX_S + 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dogZ   = interpolate(fwdIn - fwdOut, [-1, 0, 1], [0.5, 0, -0.80]);

  const currentStep =
    frame < T.S1_S ? 0 :
    frame < T.S2_S ? 1 :
    frame < T.S3_S ? 2 :
    frame < T.RELAX_S ? 3 : 4;

  return (
    <AbsoluteFill style={{ background: BG_DARK }}>

      {/* ── Product video background (intro + outro) ── */}
      {(isIntro || isOutro) && (
        <AbsoluteFill>
          <Video
            src={staticFile("miracle-leash.mp4")}
            objectFit="cover"
            style={{ width: "100%", height: "100%" }}
            muted
            loop
          />
          <AbsoluteFill style={{ background: "rgba(0,0,0,0.54)" }} />
        </AbsoluteFill>
      )}

      {/* ── 3D Canvas (transparent bg so product video shows through) ── */}
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <CameraCtrl frame={frame} pulling={pulling} dogZ={dogZ} />
        <Lights frame={frame} pulling={pulling} loopTight={loopTight} />

        {/* Intro rings */}
        {isIntro && <IntroRings frame={frame} fps={fps} />}

        {/* Outro rings */}
        {isOutro && <OutroRings frame={frame} fps={fps} />}

        {/* Main dog scene */}
        {hasDog && (
          <>
            <Ground frame={frame} fps={fps} walking={walking} dogZ={dogZ} />
            <Dog frame={frame} fps={fps} walking={walking} pulling={pulling} loopTight={loopTight} dogZ={dogZ} />
            <LeashLine frame={frame} fps={fps} pulling={pulling} dogZ={dogZ} />
            <Arrow frame={frame} fps={fps} dogZ={dogZ} />
            <BurstParticles frame={frame} pulling={pulling} dogZ={dogZ} />
          </>
        )}
      </ThreeCanvas>

      {/* ── Screen effects ── */}
      <AbsoluteFill style={{
        background   : "radial-gradient(ellipse at center, transparent 36%, rgba(0,0,0,0.60) 100%)",
        pointerEvents: "none",
      }} />
      <Vignette loopTight={loopTight} frame={frame} />

      {/* ── Step progress bar ── */}
      <StepBar step={currentStep} visible={inGuide} />

      {/* ── Captions (local frame via Sequence → useCurrentFrame) ── */}
      <Sequence from={T.INTRO_S} durationInFrames={T.INTRO_E - T.INTRO_S} premountFor={fps}>
        <Caption eyebrow="Introducing" headline="Miracle Leash"
          body="The smart attachment that transforms any leash into a calmer, happier walk."
          accent={GOLD} />
      </Sequence>

      <Sequence from={T.DOG_S} durationInFrames={T.S1_S - T.DOG_S} premountFor={fps}>
        <Caption eyebrow="Meet Your Dog" headline="Ready to Walk"
          body="Excited, curious — and sometimes hard to control on leash. Miracle Leash changes that."
          accent={GREEN} />
      </Sequence>

      <Sequence from={T.S1_S} durationInFrames={T.S1_E - T.S1_S} premountFor={fps}>
        <Caption step={1} eyebrow="Attach to Collar" headline="Loop It On"
          body="Slide the gold loop over your dog's collar or harness. No tools — clicks on in seconds."
          accent={CYAN} />
      </Sequence>

      <Sequence from={T.S2_S} durationInFrames={T.S2_E - T.S2_S} premountFor={fps}>
        <Caption step={2} eyebrow="Connect Your Leash" headline="Clip It In"
          body="Attach your existing leash to the Miracle Leash loop. Works with any leash or harness."
          accent={GREEN} />
      </Sequence>

      <Sequence from={T.S3_S} durationInFrames={T.PULL_S - T.S3_S} premountFor={fps}>
        <Caption step={3} eyebrow="Start Your Walk" headline="All Is Calm"
          body="The loop hangs loose. Your dog moves freely — the attachment is invisible when not needed."
          accent={GREEN} />
      </Sequence>

      <Sequence from={T.PULL_S} durationInFrames={T.PULL_E - T.PULL_S} premountFor={fps}>
        <Caption step={3} eyebrow="Dog Starts Pulling!" headline="Loop Tightens"
          body="Natural, gentle feedback — the loop signals your dog without yanking or pain."
          accent={ORANGE} />
      </Sequence>

      <Sequence from={T.RELAX_S} durationInFrames={T.OUTRO_S - T.RELAX_S} premountFor={fps}>
        <Caption step={4} eyebrow="Dog Relaxes" headline="Loop Loosens"
          body="The instant tension eases, the loop releases automatically. Calm walk restored."
          accent={GOLD} />
      </Sequence>

      <Sequence from={T.OUTRO_S} durationInFrames={T.TOTAL - T.OUTRO_S} premountFor={fps}>
        <Caption eyebrow="Get Yours Today" headline="miracleleash.com"
          body="Works with any leash  ·  Any dog  ·  Instant upgrade"
          accent={GOLD} />
      </Sequence>

    </AbsoluteFill>
  );
};
