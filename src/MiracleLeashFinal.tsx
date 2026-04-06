/**
 * MiracleLeashFinal
 *
 * Full product video with:
 *  • Accurate 3D product model (snap-hook · strap · branded label · D-ring carabiner)
 *  • 3D golden retriever with red collar + D-ring attachment point
 *  • Animated hand hooking the product onto the collar (Step 1)
 *  • Leash clip animation (Step 2)
 *  • Walk → pull → relax mechanism demo
 *  • Cinematic multi-angle camera (8 positions)
 *  • Real product video backdrop on intro + outro
 *  • Step progress bar, captions at 62 %, vignette, screen shake, particle burst
 *  • Outro CTA with spinning product + brand + URL
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
const METAL       = "#101010";
const METAL_LT    = "#2a2a2a";
const LABEL_BG    = "#f0f0f0";
const STRAP_BLK   = "#0c0c0c";
const BRAND_GRN   = "#2e7d32";
const FUR         = "#D4A855";
const FUR_DARK    = "#9A6B20";
const COLLAR_RED  = "#CC2222";
const LEASH_BLUE  = "#1a3a99";
const BG_DARK     = "#07090f";
const GROUND_CLR  = "#0f1422";
const GRID_CLR    = "#18213a";
const GOLD        = "#F5C842";
const WHITE       = "#ffffff";
const CYAN        = "#4FC3F7";
const GREEN       = "#81C784";
const ORANGE      = "#FF6600";
const SKIN        = "#c8845a";
const SKIN_DARK   = "#a06040";

// ─── Timeline  (30 fps) ───────────────────────────────────────────────────────
const T = {
  INTRO_S   :   0,   //  0 –  5 s  product spin + brand title
  INTRO_E   : 150,
  ORBIT_S   : 150,   //  5 –  9 s  product orbit – detail callouts
  ORBIT_E   : 270,
  DOG_S     : 270,   //  9 – 12 s  dog enters, sits
  ATTACH_S  : 360,   // 12 – 17 s  hand hooks product to collar
  ATTACH_E  : 510,
  LEASH_S   : 510,   // 17 – 21 s  connect leash
  LEASH_E   : 630,
  WALK_S    : 630,   // 21 – 24 s  calm walk
  PULL_S    : 720,   // 24 – 28 s  pull + tighten
  PULL_E    : 840,
  RELAX_S   : 840,   // 28 – 31 s  relax + loosen
  RELAX_E   : 930,
  OUTRO_S   : 930,   // 31 – 36 s  CTA outro
  TOTAL     : 1080,
};

export const FINAL_DURATION = T.TOTAL;

// ─── Camera keyframes  [f, px, py, pz,  lx, ly, lz] ─────────────────────────
const CAM: number[][] = [
  [   0,  0.0, 1.5, 5.5,   0, 0.0, 0  ],  // intro front
  [  60,  2.5, 2.5, 5.0,   0, 0.0, 0  ],  // angle right
  [ 150, -2.5, 1.5, 5.0,   0, 0.0, 0  ],  // orbit left
  [ 210,  0.5, 3.2, 4.8,   0, 0.0, 0  ],  // orbit top
  [ 270,  0.0, 2.5, 9.0,   0, 1.0, 0  ],  // pull back – dog
  [ 360,  0.0, 2.5, 9.0,   0, 1.0, 0  ],
  [ 400,  2.2, 2.0, 5.5,   0, 1.6, 0.85], // attach – right-front
  [ 450,  0.5, 1.9, 4.2,   0, 1.65,0.88], // attach – close
  [ 510,  0.0, 1.9, 4.2,   0, 1.65,0.88],
  [ 560, -4.5, 2.2, 3.8,   0, 1.55,0.5 ], // leash – side
  [ 630, -4.5, 2.2, 3.8,   0, 1.55,0.5 ],
  [ 660,  1.0, 0.7,11.0,   0, 1.0, 0  ],  // low wide walk
  [ 690,  2.5, 1.5, 9.5,   0, 1.1,-0.5 ], // pull track
  [ 840,  2.5, 1.5, 9.5,   0, 1.1,-0.5 ],
  [ 880,  0.0, 2.5, 8.5,   0, 1.0, 0  ],  // relax
  [ 930,  0.0, 2.5, 8.5,   0, 1.0, 0  ],
  [1020,  3.0, 3.5, 7.0,   0, 1.8, 0  ],  // outro orbit
  [1080, -2.5, 3.5, 7.5,   0, 1.8, 0  ],
];

function camAt(f: number) {
  if (f <= CAM[0][0]) {
    const [, px, py, pz, lx, ly, lz] = CAM[0];
    return { pos: [px, py, pz] as [number,number,number], look: [lx, ly, lz] as [number,number,number] };
  }
  const last = CAM[CAM.length - 1];
  if (f >= last[0]) {
    const [, px, py, pz, lx, ly, lz] = last;
    return { pos: [px, py, pz] as [number,number,number], look: [lx, ly, lz] as [number,number,number] };
  }
  let i = 0;
  while (i < CAM.length - 1 && CAM[i + 1][0] <= f) i++;
  const a = CAM[i], b = CAM[i + 1];
  const t = Easing.inOut(Easing.quad)((f - a[0]) / (b[0] - a[0]));
  const L = (j: number) => a[j] + (b[j] - a[j]) * t;
  return {
    pos : [L(1), L(2), L(3)] as [number,number,number],
    look: [L(4), L(5), L(6)] as [number,number,number],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const spr = (f: number, fps: number, delay = 0, damp = 200) =>
  spring({ frame: f - delay, fps, config: { damping: damp } });
const rng = (f: number, a: number, b: number, oa = 0, ob = 1) =>
  interpolate(f, [a, b], [oa, ob], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

// ─── Camera controller ────────────────────────────────────────────────────────
const CameraCtrl: React.FC<{ frame: number; pulling: boolean; dogZ: number }> = ({ frame, pulling, dogZ }) => {
  const { camera } = useThree();
  const { pos, look } = camAt(frame);
  const shakeAmt = pulling
    ? Math.max(0, rng(frame, T.PULL_S, T.PULL_S + 25) - rng(frame, T.PULL_E - 25, T.PULL_E))
    : 0;
  const sx = Math.sin(frame * 19.7) * 0.018 * shakeAmt;
  const sy = Math.sin(frame * 27.3) * 0.012 * shakeAmt;
  camera.position.set(pos[0] + sx, pos[1] + sy, pos[2]);
  camera.lookAt(look[0], look[1], look[2] + (pulling ? dogZ * 0.35 : 0));
  return null;
};

// ─── Lights ───────────────────────────────────────────────────────────────────
const Lights: React.FC<{ frame: number; loopTight: number }> = ({ frame, loopTight }) => {
  const orbit  = frame * 0.018;
  const fill   = interpolate(loopTight, [0, 1], [0, 2.0]);
  const isIntro = frame < T.ORBIT_E;
  return (
    <>
      <ambientLight intensity={isIntro ? 0.35 : 0.50} />
      <directionalLight position={[4, 9, 6]} intensity={1.1} color="#fff8e0" />
      {/* Orbiting key */}
      <pointLight position={[Math.sin(orbit) * 5, 6, Math.cos(orbit) * 5]} intensity={isIntro ? 1.2 : 0.55} color={GOLD} />
      {/* Intro – dramatic side light */}
      {isIntro && <spotLight position={[-4, 6, 3]} angle={0.45} intensity={2.5} color="#ffffff" />}
      {/* Pull fill */}
      <pointLight position={[0, 2, 3]} intensity={fill} color={ORANGE} />
      {/* Cool fill */}
      <pointLight position={[-4, 3, -3]} intensity={0.30} color={CYAN} />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ─── 3D PRODUCT MODEL ────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

/** Black metallic material shorthand */
const Met: React.FC<{ color?: string; metalness?: number; roughness?: number }> = (
  { color = METAL, metalness = 0.88, roughness = 0.15 }
) => <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />;

/** Snap-bolt hook (left end of product) */
const SnapHook: React.FC = () => (
  <group>
    {/* Outer arch */}
    <mesh position={[0, 0.19, 0]}>
      <torusGeometry args={[0.20, 0.056, 9, 18, Math.PI]} />
      <Met />
    </mesh>
    {/* Left spine (full) */}
    <mesh position={[-0.20, -0.07, 0]}>
      <cylinderGeometry args={[0.056, 0.056, 0.54, 9]} />
      <Met />
    </mesh>
    {/* Right spine/gate (shorter) */}
    <mesh position={[0.20, 0.04, 0]}>
      <cylinderGeometry args={[0.056, 0.056, 0.32, 9]} />
      <Met />
    </mesh>
    {/* Bottom bridge */}
    <mesh position={[0, -0.36, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.056, 0.056, 0.40, 9]} />
      <Met />
    </mesh>
    {/* Security-button box */}
    <mesh position={[0.265, -0.06, 0]}>
      <boxGeometry args={[0.085, 0.20, 0.32]} />
      <Met color={METAL_LT} metalness={0.75} roughness={0.25} />
    </mesh>
    {/* Button */}
    <mesh position={[0.31, -0.06, 0.10]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.048, 0.048, 0.08, 9]} />
      <Met color="#333" metalness={0.65} roughness={0.35} />
    </mesh>
    {/* Body holes */}
    {[0.06, -0.06].map((y, i) => (
      <mesh key={i} position={[0.32, y, -0.06]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.030, 0.030, 0.095, 8]} />
        <meshStandardMaterial color="#080808" />
      </mesh>
    ))}
    {/* Bottom pivot (connects to strap) */}
    <mesh position={[0, -0.435, 0]} rotation={[0, Math.PI / 2, 0]}>
      <cylinderGeometry args={[0.062, 0.062, 0.32, 9]} />
      <Met />
    </mesh>
  </group>
);

/** Rectangular carabiner D-ring (right end) */
const Carabiner: React.FC = () => (
  <group>
    {/* Top bar */}
    <mesh position={[0, 0.26, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.052, 0.052, 0.52, 9]} /><Met />
    </mesh>
    {/* Bottom bar */}
    <mesh position={[0, -0.26, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.052, 0.052, 0.52, 9]} /><Met />
    </mesh>
    {/* Left spine */}
    <mesh position={[-0.26, 0, 0]}>
      <cylinderGeometry args={[0.052, 0.052, 0.52, 9]} /><Met />
    </mesh>
    {/* Right gate (shorter with gap) */}
    <mesh position={[0.26, 0.10, 0]}>
      <cylinderGeometry args={[0.052, 0.052, 0.32, 9]} /><Met />
    </mesh>
    {/* Rounded corners */}
    {([ [-0.26, 0.26], [-0.26, -0.26], [0.26, 0.26] ] as [number,number][]).map(([x, y], i) => (
      <mesh key={i} position={[x, y, 0]}>
        <sphereGeometry args={[0.056, 9, 9]} /><Met />
      </mesh>
    ))}
    {/* Bottom pivot */}
    <mesh position={[0, -0.30, 0]} rotation={[0, Math.PI / 2, 0]}>
      <cylinderGeometry args={[0.065, 0.065, 0.10, 9]} /><Met />
    </mesh>
  </group>
);

/** Paw-print embossed on label */
const PawPrint: React.FC = () => {
  const PAD = "#1a1a1a";
  const toes: [number, number][] = [[-0.070, -0.06], [-0.026, -0.09], [0.022, -0.09], [0.066, -0.06]];
  return (
    <group position={[-0.18, 0.106, 0]}>
      {/* Main pad */}
      <mesh position={[0, 0, 0.04]}>
        <sphereGeometry args={[0.062, 10, 10]} />
        <meshStandardMaterial color={PAD} />
      </mesh>
      {/* Toe pads */}
      {toes.map(([x, z], i) => (
        <mesh key={i} position={[x, 0, z]}>
          <sphereGeometry args={[0.032, 8, 8]} />
          <meshStandardMaterial color={PAD} />
        </mesh>
      ))}
    </group>
  );
};

/** The full Miracle Leash product */
const ProductModel: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale    ?: number;
  glowStrength?: number;   // 0 = none, 1 = full glow on carabiner
}> = ({ position = [0,0,0], rotation = [0,0,0], scale = 1, glowStrength = 0 }) => {
  const loopGlow = interpolate(glowStrength, [0, 1], [0.0, 1.4]);
  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
      {/* ── Nylon strap ── */}
      <mesh>
        <boxGeometry args={[2.1, 0.135, 0.42]} />
        <meshStandardMaterial color={STRAP_BLK} roughness={0.88} metalness={0.0} />
      </mesh>

      {/* ── White label ── */}
      <mesh position={[0, 0.080, 0]}>
        <boxGeometry args={[0.88, 0.018, 0.40]} />
        <meshStandardMaterial color={LABEL_BG} roughness={0.65} />
      </mesh>
      {/* Stitching border */}
      <mesh position={[0, 0.092, 0]}>
        <boxGeometry args={[0.84, 0.006, 0.36]} />
        <meshStandardMaterial color="#d4d4d4" roughness={0.7} />
      </mesh>

      {/* ── Paw print ── */}
      <PawPrint />

      {/* ── "Miracle" text block (dark bar) ── */}
      <mesh position={[0.08, 0.092, -0.05]}>
        <boxGeometry args={[0.36, 0.006, 0.14]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
      </mesh>
      {/* ── "Leash" text block (green bar) ── */}
      <mesh position={[0.08, 0.092, 0.05]}>
        <boxGeometry args={[0.36, 0.006, 0.10]} />
        <meshStandardMaterial color={BRAND_GRN} roughness={0.5} emissive={BRAND_GRN} emissiveIntensity={0.2} />
      </mesh>
      {/* ── Tagline bar ── */}
      <mesh position={[0.08, 0.092, 0.135]}>
        <boxGeometry args={[0.40, 0.005, 0.055]} />
        <meshStandardMaterial color="#333" roughness={0.6} />
      </mesh>

      {/* ── Snap hook (left, x = -1.22) ── */}
      <group position={[-1.22, 0, 0]}>
        <SnapHook />
      </group>

      {/* ── Carabiner D-ring (right, x = +1.22) with glow when active ── */}
      <group position={[1.22, 0, 0]}>
        <Carabiner />
        {glowStrength > 0.01 && (
          <mesh position={[0, 0, 0]}>
            <torusGeometry args={[0.28, 0.015, 8, 40]} />
            <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={loopGlow} transparent opacity={0.7} />
          </mesh>
        )}
      </group>
    </group>
  );
};

// ─── 3D Hand (right hand gripping product) ───────────────────────────────────
const Hand: React.FC<{
  frame    : number;
  fps      : number;
  progress : number;   // 0 = open/far · 1 = gripping · 2 = released/withdrawn
  productY : number;
  productZ : number;
}> = ({ frame, fps, progress, productY, productZ }) => {
  const grip   = Math.min(1, Math.max(0, (progress - 0) / 0.6));
  const appear = rng(frame, T.ATTACH_S, T.ATTACH_S + 30);
  const withdraw = rng(frame, T.ATTACH_E - 35, T.ATTACH_E);
  const visible = appear - withdraw;
  if (visible < 0.02) return null;

  // Hand position: enters from right, hovers over product, guides to collar
  const handX = interpolate(progress, [0, 0.4, 1.0, 1.8, 2.0], [4.0, 1.5, 0.6, 2.5, 5.0]);
  const handY = productY + 0.15;
  const handZ = productZ - 0.05;

  const fingerCurl = grip;
  const thumbCurl  = grip * 0.8;

  return (
    <group position={[handX, handY, handZ]} scale={[visible, visible, visible]}>
      {/* Wrist / forearm */}
      <mesh position={[0.65, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.17, 0.19, 1.4, 12]} />
        <meshStandardMaterial color={SKIN} roughness={0.72} />
      </mesh>
      {/* Palm */}
      <mesh>
        <boxGeometry args={[0.48, 0.14, 0.40]} />
        <meshStandardMaterial color={SKIN} roughness={0.72} />
      </mesh>

      {/* Thumb */}
      <group position={[0.10, 0, -0.24]} rotation={[0, 0.55, -thumbCurl * 0.9]}>
        <mesh position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.056, 0.056, 0.22, 8]} />
          <meshStandardMaterial color={SKIN} roughness={0.72} />
        </mesh>
        <mesh position={[-0.26, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.045, 0.045, 0.18, 8]} />
          <meshStandardMaterial color={SKIN_DARK} roughness={0.75} />
        </mesh>
      </group>

      {/* 4 Fingers */}
      {([[-0.14, -0.08], [0, -0.10], [0.14, -0.10], [0.26, -0.08]] as [number,number][]).map(([x, z], i) => (
        <group key={i} position={[-0.27, 0, (z + 0.18 * i * 0.08)]}
               rotation={[0, 0, -fingerCurl * (0.9 + i * 0.04)]}>
          <mesh position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.042, 0.042, 0.24, 8]} />
            <meshStandardMaterial color={SKIN} roughness={0.72} />
          </mesh>
          <mesh position={[-0.28, 0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.036, 0.036, 0.20, 8]} />
            <meshStandardMaterial color={SKIN} roughness={0.72} />
          </mesh>
          {/* Knuckle */}
          <mesh position={[0, 0.07, 0]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color={SKIN_DARK} roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ─── D-ring on dog collar (the attachment point) ──────────────────────────────
const CollarDRing: React.FC<{ breathe: number; glowing: boolean }> = ({ breathe, glowing }) => (
  <mesh position={[0, 1.68 + breathe, 0.97]} rotation={[Math.PI / 2, 0, 0]}>
    <torusGeometry args={[0.095, 0.025, 8, 24]} />
    <meshStandardMaterial
      color="#888" metalness={0.92} roughness={0.08}
      emissive={glowing ? GOLD : "#000"} emissiveIntensity={glowing ? 0.8 : 0} />
  </mesh>
);

// ─── Intro orbital rings (decorative) ────────────────────────────────────────
const IntroOrbits: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const p   = spr(frame, fps, 0, 150);
  const sc  = interpolate(p, [0, 1], [0.01, 1]);
  const sp  = frame * 0.020;
  const sp2 = -frame * 0.015;
  return (
    <group>
      <mesh rotation={[0.4, sp, 0.2]} scale={[sc, sc, sc]}>
        <torusGeometry args={[3.0, 0.055, 12, 80]} />
        <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.1}
          emissive={GOLD} emissiveIntensity={0.25} />
      </mesh>
      <mesh rotation={[-0.3, sp2, 0.5]} scale={[sc * 0.7, sc * 0.7, sc * 0.7]}>
        <torusGeometry args={[2.2, 0.04, 12, 60]} />
        <meshStandardMaterial color={CYAN} metalness={0.85} roughness={0.12}
          emissive={CYAN} emissiveIntensity={0.2} />
      </mesh>
      {Array.from({ length: 24 }).map((_, i) => {
        const a = (i / 24) * Math.PI * 2 + sp * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 3.0, Math.sin(a * 1.3) * 0.5, Math.sin(a) * 3.0]}>
            <sphereGeometry args={[0.048 * sc, 6, 6]} />
            <meshStandardMaterial color={i % 3 === 0 ? GOLD : WHITE}
              emissive={GOLD} emissiveIntensity={0.6} />
          </mesh>
        );
      })}
    </group>
  );
};

// ─── Outro rings ─────────────────────────────────────────────────────────────
const OutroOrbits: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const lf  = frame - T.OUTRO_S;
  const p   = spr(lf, fps, 0, 150);
  const sc  = interpolate(p, [0, 1], [0.01, 1]);
  const sp  = lf * 0.018;
  return (
    <group position={[0, 1.0, 0]}>
      <mesh rotation={[0.3, sp, 0.1]} scale={[sc, sc, sc]}>
        <torusGeometry args={[2.4, 0.065, 14, 90]} />
        <meshStandardMaterial color={GOLD} metalness={0.92} roughness={0.06}
          emissive={GOLD} emissiveIntensity={0.50} />
      </mesh>
      {Array.from({ length: 20 }).map((_, i) => {
        const a = (i / 20) * Math.PI * 2 + sp * 1.8;
        return (
          <mesh key={i} position={[Math.cos(a) * 2.6, Math.sin(a * 0.8) * 0.35, Math.sin(a) * 2.6]}>
            <sphereGeometry args={[0.060 * sc, 6, 6]} />
            <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.8} />
          </mesh>
        );
      })}
    </group>
  );
};

// ─── Ground + grid ────────────────────────────────────────────────────────────
const Ground: React.FC<{ frame: number; fps: number; walking: boolean; dogZ: number }> = (
  { frame, fps, walking, dogZ }
) => {
  const op     = spr(frame, fps, T.DOG_S + 60, 200);
  const scroll = walking ? dogZ * 0.85 : 0;
  const tiles  = Array.from({ length: 9 }, (_, i) => (i - 4) * 1.6);
  return (
    <>
      <mesh position={[0, 0, scroll]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color={GROUND_CLR} roughness={0.97} opacity={op} transparent />
      </mesh>
      {tiles.map((v, i) => (
        <React.Fragment key={i}>
          <mesh position={[v, 0.008, scroll]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.012, 26]} />
            <meshStandardMaterial color={GRID_CLR} opacity={op * 0.55} transparent />
          </mesh>
          <mesh position={[0, 0.008, v + scroll]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[26, 0.012]} />
            <meshStandardMaterial color={GRID_CLR} opacity={op * 0.55} transparent />
          </mesh>
        </React.Fragment>
      ))}
    </>
  );
};

// ─── Burst particles ──────────────────────────────────────────────────────────
const Burst: React.FC<{ frame: number; pulling: boolean; dogZ: number }> = ({ frame, pulling, dogZ }) => {
  const burst = rng(frame, T.PULL_S + 5, T.PULL_S + 80);
  const pts = React.useMemo(() =>
    Array.from({ length: 32 }, (_, i) => ({
      a : (i / 32) * Math.PI * 2,
      r : 0.7 + Math.sin(i * 1.9) * 0.5,
      sp: 0.75 + Math.cos(i * 2.7) * 0.35,
    })), []);

  if (!pulling && burst < 0.01) return null;
  return (
    <>
      {pts.map(({ a, r, sp }, i) => {
        const t  = burst * sp;
        const x  = Math.cos(a) * r * t * 2.0;
        const y  = 1.72 + t * 1.4;
        const z  = 0.91 + dogZ + Math.sin(a) * r * t * 2.0;
        const sc = Math.max(0, 1 - t) * 0.075;
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[sc, 6, 6]} />
            <meshStandardMaterial color={i % 2 === 0 ? GOLD : ORANGE} emissive={GOLD} emissiveIntensity={0.9} />
          </mesh>
        );
      })}
    </>
  );
};

// ─── 3D Dog (golden retriever) ───────────────────────────────────────────────
const Dog: React.FC<{
  frame    : number;
  fps      : number;
  walking  : boolean;
  pulling  : boolean;
  loopTight: number;
  dogZ     : number;
  showProduct: boolean;   // whether miracle leash is attached
}> = ({ frame, fps, walking, pulling, loopTight, dogZ, showProduct }) => {
  const enter   = spr(frame, fps, T.DOG_S, 120);
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
  const legs: [number, number, number, number][] = [
    [-0.37, 0.72,  0.58, legFL],
    [ 0.37, 0.72,  0.58, legFR],
    [-0.37, 0.70, -0.64, legBL],
    [ 0.37, 0.70, -0.64, legBR],
  ];

  return (
    <group position={[0, 0, dogZ]} scale={[sc, sc, sc]}>
      {/* Body */}
      <mesh position={[0, 1.18 + breathe, 0]} scale={[1.30, 0.92, 2.0]} rotation={[-lean, 0, 0]}>
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
      {/* Head */}
      <group position={[0, 2.11 + breathe, 1.06]} rotation={[headPit + lean, headY, 0]}>
        <mesh><sphereGeometry args={[0.52, 20, 20]} /><meshStandardMaterial color={FUR} roughness={0.82} /></mesh>
        <mesh position={[0, 0.30, -0.10]}><sphereGeometry args={[0.31, 12, 12]} /><meshStandardMaterial color={FUR} roughness={0.82} /></mesh>
        <mesh position={[0, -0.12, 0.42]}><boxGeometry args={[0.35, 0.27, 0.42]} /><meshStandardMaterial color={FUR_DARK} roughness={0.9} /></mesh>
        <mesh position={[0, -0.21, 0.39]}><boxGeometry args={[0.30, 0.10, 0.38]} /><meshStandardMaterial color={FUR_DARK} roughness={0.9} /></mesh>
        <mesh position={[0, -0.08, 0.63]}><sphereGeometry args={[0.088, 10, 10]} /><meshStandardMaterial color="#040404" roughness={0.2} metalness={0.4} /></mesh>
        {([-1, 1] as const).map((s) => (
          <group key={s} position={[s * 0.20, 0.13, 0.44]}>
            <mesh><sphereGeometry args={[0.076, 12, 12]} /><meshStandardMaterial color="#060606" roughness={0.06} metalness={0.7} /></mesh>
            <mesh position={[s * -0.022, 0.030, 0.065]}><sphereGeometry args={[0.024, 6, 6]} /><meshStandardMaterial color="#ffffff" /></mesh>
          </group>
        ))}
        {([-1, 1] as const).map((s) => (
          <mesh key={s} position={[s * 0.44, 0.06, -0.08]} rotation={[0.10 + earFlop, 0, s * 0.34]}>
            <boxGeometry args={[0.20, 0.52, 0.15]} /><meshStandardMaterial color={FUR_DARK} roughness={0.9} />
          </mesh>
        ))}
      </group>
      {/* Red collar */}
      <mesh position={[0, 1.74 + breathe, 0.82]} rotation={[Math.PI / 2 + 0.12, 0, 0]}>
        <torusGeometry args={[0.29, 0.07, 10, 44]} /><meshStandardMaterial color={COLLAR_RED} metalness={0.25} roughness={0.65} />
      </mesh>
      {/* Collar D-ring */}
      <CollarDRing breathe={breathe} glowing={frame > T.ATTACH_S - 30 && frame < T.ATTACH_E} />

      {/* Legs */}
      {legs.map(([x, y, z, rot], i) => (
        <group key={i} position={[x, y, z]} rotation={[rot, 0, 0]}>
          <mesh position={[0, -0.22, 0]}><cylinderGeometry args={[0.14, 0.12, 0.48, 10]} /><meshStandardMaterial color={FUR} roughness={0.82} /></mesh>
          <mesh position={[0, -0.57, 0.04]}><cylinderGeometry args={[0.11, 0.09, 0.42, 10]} /><meshStandardMaterial color={FUR} roughness={0.82} /></mesh>
          <mesh position={[0, -0.84, 0.09]}><boxGeometry args={[0.19, 0.11, 0.28]} /><meshStandardMaterial color={FUR_DARK} roughness={0.9} /></mesh>
        </group>
      ))}
      {/* Tail */}
      <group position={[0, 1.40 + breathe, -0.96]} rotation={[-0.42, 0, wag]}>
        <mesh position={[0, 0.22, 0]}><cylinderGeometry args={[0.072, 0.13, 0.48, 8]} /><meshStandardMaterial color={FUR} roughness={0.80} /></mesh>
        <group position={[0, 0.49, 0]} rotation={[-0.20, 0, wag * 0.6]}>
          <mesh position={[0, 0.19, 0]}><cylinderGeometry args={[0.050, 0.072, 0.40, 8]} /><meshStandardMaterial color={FUR} roughness={0.80} /></mesh>
        </group>
      </group>
    </group>
  );
};

// ─── Leash line ───────────────────────────────────────────────────────────────
const LeashLine: React.FC<{ frame: number; fps: number; pulling: boolean; dogZ: number }> = (
  { frame, fps, pulling, dogZ }
) => {
  const appear = spr(frame, fps, T.LEASH_S + 10, 200);
  if (appear < 0.02) return null;
  const cy = 1.68, cz = 0.97 + dogZ;
  const hy = 4.8, hz = pulling ? 0.55 + dogZ * 0.55 : 0.6;
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

// ─── Caption (62 % from top) ──────────────────────────────────────────────────
const Caption: React.FC<{
  step   ?: number;
  eyebrow?: string;
  headline: string;
  body   ?: string;
  accent ?: string;
}> = ({ step, eyebrow, headline, body, accent = GOLD }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p  = (d: number) => spr(frame, fps, d);
  const sl = (prog: number): React.CSSProperties => ({
    opacity  : prog,
    transform: `translateY(${interpolate(prog, [0, 1], [22, 0])}px)`,
  });
  return (
    <AbsoluteFill style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "flex-start", paddingTop: "62%",
      paddingLeft: 52, paddingRight: 52,
      background: "linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.45) 28%, transparent 55%)",
      pointerEvents: "none", gap: 0,
    }}>
      {step !== undefined && (
        <div style={{ ...sl(p(0)), marginBottom: 10 }}>
          <div style={{
            display: "inline-block", background: accent, color: "#000",
            fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900,
            fontSize: 22, padding: "5px 22px", borderRadius: 30, letterSpacing: 2,
          }}>STEP {step} OF 4</div>
        </div>
      )}
      {eyebrow && (
        <div style={{ ...sl(p(5)), textAlign: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontSize: 25,
            fontWeight: 900, letterSpacing: 4, color: accent, textTransform: "uppercase" }}>
            {eyebrow}
          </div>
        </div>
      )}
      <div style={{ ...sl(p(10)), textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontSize: 64,
          fontWeight: 900, color: WHITE, lineHeight: 1.08,
          textShadow: `0 0 36px ${accent}55, 0 4px 20px rgba(0,0,0,0.85)` }}>
          {headline}
        </div>
      </div>
      {body && (
        <div style={{ ...sl(p(18)), textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontFamily: "Arial, sans-serif", fontSize: 30, color: "rgba(255,255,255,0.88)",
            lineHeight: 1.55, maxWidth: 840, textShadow: "0 2px 12px rgba(0,0,0,0.7)" }}>
            {body}
          </div>
        </div>
      )}
      <div style={{ ...sl(p(25)) }}>
        <div style={{ width: 60, height: 4, background: accent, borderRadius: 2, boxShadow: `0 0 14px ${accent}` }} />
      </div>
    </AbsoluteFill>
  );
};

// ─── Step progress bar ────────────────────────────────────────────────────────
const StepBar: React.FC<{ step: number; visible: boolean }> = ({ step, visible }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = spr(frame, fps, 0);
  if (!visible) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 42, left: 60, right: 60, display: "flex", gap: 10, opacity: op }}>
        {[1,2,3,4].map((s) => (
          <div key={s} style={{ flex: 1, height: 5, borderRadius: 3,
            background: step >= s ? GOLD : "rgba(255,255,255,0.16)",
            boxShadow: step === s ? `0 0 10px ${GOLD}` : "none" }} />
        ))}
      </div>
      <div style={{ position: "absolute", top: 56, left: 60, right: 60, display: "flex", opacity: op * 0.65 }}>
        {["Attach","Connect","Walk","Calm"].map((lbl, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center",
            fontFamily: "Arial, sans-serif", fontSize: 17,
            color: step > i ? GOLD : "rgba(255,255,255,0.5)", letterSpacing: 1 }}>
            {lbl}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ─── Red pull vignette ────────────────────────────────────────────────────────
const Vignette: React.FC<{ loopTight: number; frame: number }> = ({ loopTight, frame }) => {
  const pulse = interpolate(loopTight, [0, 1], [0, 0.30 + Math.sin(frame * 0.28) * 0.08]);
  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at center, transparent 30%, rgba(170,30,0,${pulse}) 100%)`,
      pointerEvents: "none",
    }} />
  );
};

// ─── Outro CTA overlay ────────────────────────────────────────────────────────
const OutroCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p  = (d: number) => spr(frame, fps, d);
  const sl = (prog: number): React.CSSProperties => ({
    opacity: prog, transform: `translateY(${interpolate(prog, [0, 1], [24, 0])}px)`,
  });

  return (
    <AbsoluteFill style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 55%, transparent 80%)",
      pointerEvents: "none", paddingTop: "50%",
    }}>
      {/* Brand */}
      <div style={{ ...sl(p(0)), textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontSize: 88,
          fontWeight: 900, color: WHITE, letterSpacing: -1,
          textShadow: `0 0 40px ${GOLD}66, 0 4px 24px rgba(0,0,0,0.9)` }}>
          Miracle<span style={{ color: BRAND_GRN }}>Leash</span>
        </div>
      </div>
      <div style={{ ...sl(p(6)), textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontSize: 28,
          fontWeight: 900, letterSpacing: 6, color: GOLD, textTransform: "uppercase" }}>
          Take Back Control
        </div>
      </div>
      {/* Divider */}
      <div style={{ ...sl(p(12)), marginBottom: 20 }}>
        <div style={{ width: 80, height: 4, background: GOLD, borderRadius: 2, boxShadow: `0 0 16px ${GOLD}` }} />
      </div>
      {/* URL */}
      <div style={{ ...sl(p(16)), textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontFamily: "'Arial Black', Arial, sans-serif", fontSize: 46,
          fontWeight: 900, color: WHITE, textShadow: `0 0 30px ${GOLD}55` }}>
          miracleleash.com
        </div>
      </div>
      {/* Amazon badge */}
      <div style={{ ...sl(p(22)), textAlign: "center", marginBottom: 16 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 10,
          background: "#FF9900", color: "#000",
          fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900,
          fontSize: 22, padding: "8px 28px", borderRadius: 8, letterSpacing: 1,
        }}>
          🛒 Available on Amazon
        </div>
      </div>
      {/* Stars */}
      <div style={{ ...sl(p(28)), textAlign: "center" }}>
        <div style={{ fontSize: 36, letterSpacing: 4 }}>⭐⭐⭐⭐⭐</div>
        <div style={{ fontFamily: "Arial, sans-serif", fontSize: 20,
          color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
          Works with any leash · Any dog · Instant upgrade
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Main composition ─────────────────────────────────────────────────────────
export const MiracleLeashFinal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Phase flags
  const isIntro     = frame < T.ORBIT_E;
  const isOutro     = frame >= T.OUTRO_S;
  const hasDog      = frame >= T.DOG_S;
  const inGuide     = frame >= T.DOG_S && !isOutro;
  const isAttaching = frame >= T.ATTACH_S && frame < T.ATTACH_E;
  const showProduct = frame >= T.ATTACH_E;      // permanently attached after step 1
  const walking     = frame >= T.WALK_S && !isOutro;
  const pulling     = frame >= T.PULL_S && frame < T.PULL_E;

  // Loop / product tightness
  const tightIn  = rng(frame, T.PULL_S, T.PULL_S + 70);
  const tightOut = rng(frame, T.RELAX_S, T.RELAX_S + 80);
  const loopTight = Math.max(0, tightIn - tightOut);

  // Dog Z position
  const fwdIn  = rng(frame, T.WALK_S, T.WALK_S + 90);
  const fwdOut = rng(frame, T.RELAX_S, T.RELAX_S + 60);
  const dogZ   = interpolate(fwdIn - fwdOut, [-1, 0, 1], [0.5, 0, -0.80]);

  // Product position & rotation during attach sequence
  const attachP = rng(frame, T.ATTACH_S, T.ATTACH_E);

  // Product "floats above" before attach, then snaps to collar
  const prodYFloat = 4.2, prodZFloat = 0.9;
  const prodYAttach = 1.62, prodZAttach = 0.95;
  const productY = isAttaching
    ? interpolate(attachP, [0, 0.6, 0.85, 1.0], [prodYFloat, 2.2, prodYAttach, prodYAttach])
    : (showProduct ? prodYAttach + dogZ * 0 : (isOutro ? 1.5 : 0));
  const productZ = isAttaching
    ? interpolate(attachP, [0, 0.6, 0.85, 1.0], [prodZFloat, 0.92, prodZAttach, prodZAttach])
    : (showProduct ? prodZAttach : (isOutro ? 0 : 0));

  // Product rotation: horizontal in intro → vertical when attached
  const rotZ_idle = isOutro
    ? frame * 0.018
    : (isIntro ? frame * 0.015 : 0);
  const rotX_attach = isAttaching
    ? interpolate(attachP, [0, 1], [0, -Math.PI / 2 + 0.12])
    : (showProduct ? -Math.PI / 2 + 0.12 : 0);

  // Snap bounce at attachment moment
  const snapBounce = rng(frame, T.ATTACH_S + 140, T.ATTACH_S + 160)
    - rng(frame, T.ATTACH_S + 155, T.ATTACH_S + 175);
  const productScale = showProduct ? 1 + snapBounce * 0.18 : 1;

  // Product position in intro/showcase — center of scene
  const productPos: [number, number, number] = isIntro
    ? [0, 0, 0]
    : isOutro
    ? [0, 1.5, 0]
    : (showProduct || isAttaching)
    ? [0, productY, productZ]
    : [0, prodYFloat, prodZFloat];

  const productRot: [number, number, number] = [
    rotX_attach,
    isIntro ? 0 : (isOutro ? frame * 0.018 : 0),
    isIntro ? rotZ_idle : 0,
  ];

  const currentStep =
    frame < T.ATTACH_S ? 0 :
    frame < T.LEASH_S  ? 1 :
    frame < T.WALK_S   ? 2 :
    frame < T.RELAX_S  ? 3 : 4;

  return (
    <AbsoluteFill style={{ background: BG_DARK }}>

      {/* Product video background (intro + outro) */}
      {(isIntro || isOutro) && (
        <AbsoluteFill>
          <Video src={staticFile("miracle-leash.mp4")} objectFit="cover"
            style={{ width: "100%", height: "100%" }} muted loop />
          <AbsoluteFill style={{ background: "rgba(0,0,0,0.58)" }} />
        </AbsoluteFill>
      )}

      {/* 3D Canvas */}
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <CameraCtrl frame={frame} pulling={pulling} dogZ={dogZ} />
        <Lights frame={frame} loopTight={loopTight} />

        {/* Decorative orbit rings */}
        {isIntro   && <IntroOrbits frame={frame} fps={fps} />}
        {isOutro   && <OutroOrbits frame={frame} fps={fps} />}

        {/* THE PRODUCT MODEL */}
        <ProductModel
          position={productPos}
          rotation={productRot}
          scale={productScale}
          glowStrength={loopTight}
        />

        {/* Dog + environment */}
        {hasDog && (
          <>
            <Ground frame={frame} fps={fps} walking={walking} dogZ={dogZ} />
            <Dog
              frame={frame} fps={fps}
              walking={walking} pulling={pulling}
              loopTight={loopTight} dogZ={dogZ}
              showProduct={showProduct}
            />
            <LeashLine frame={frame} fps={fps} pulling={pulling} dogZ={dogZ} />
            <Burst frame={frame} pulling={pulling} dogZ={dogZ} />
          </>
        )}

        {/* Hand animation (attach sequence) */}
        {isAttaching && (
          <Hand
            frame={frame} fps={fps}
            progress={attachP * 2.0}
            productY={productY}
            productZ={productZ}
          />
        )}
      </ThreeCanvas>

      {/* Screen effects */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, transparent 36%, rgba(0,0,0,0.60) 100%)", pointerEvents: "none" }} />
      <Vignette loopTight={loopTight} frame={frame} />

      {/* Step bar */}
      <StepBar step={currentStep} visible={inGuide} />

      {/* ── Captions ── */}
      <Sequence from={T.INTRO_S} durationInFrames={T.INTRO_E} premountFor={fps}>
        <Caption eyebrow="Introducing" headline="Miracle Leash"
          body="The smart attachment that transforms any leash into a calmer, happier walk." accent={GOLD} />
      </Sequence>

      <Sequence from={T.ORBIT_S} durationInFrames={T.ORBIT_E - T.ORBIT_S} premountFor={fps}>
        <Caption eyebrow="Snap Hook · Strap · Carabiner" headline="One Attachment"
          body="Reinforced hardware. Branded label. Connects in seconds to any collar or harness." accent={CYAN} />
      </Sequence>

      <Sequence from={T.DOG_S} durationInFrames={T.ATTACH_S - T.DOG_S} premountFor={fps}>
        <Caption eyebrow="Meet Your Dog" headline="Ready to Walk"
          body="Excited and hard to control. The Miracle Leash attachment changes that forever." accent={GREEN} />
      </Sequence>

      <Sequence from={T.ATTACH_S} durationInFrames={T.ATTACH_E - T.ATTACH_S} premountFor={fps}>
        <Caption step={1} eyebrow="Hook Snap Bolt to Collar Ring" headline="Attach in Seconds"
          body="Clip the snap-bolt hook onto your dog's collar D-ring. No tools. No fuss." accent={CYAN} />
      </Sequence>

      <Sequence from={T.LEASH_S} durationInFrames={T.LEASH_E - T.LEASH_S} premountFor={fps}>
        <Caption step={2} eyebrow="Connect Your Existing Leash" headline="Clip It In"
          body="Attach any standard leash to the carabiner D-ring on the other end." accent={GREEN} />
      </Sequence>

      <Sequence from={T.WALK_S} durationInFrames={T.PULL_S - T.WALK_S} premountFor={fps}>
        <Caption step={3} eyebrow="Start Your Walk" headline="All Is Calm"
          body="The attachment hangs loose. Your dog moves freely and comfortably." accent={GREEN} />
      </Sequence>

      <Sequence from={T.PULL_S} durationInFrames={T.PULL_E - T.PULL_S} premountFor={fps}>
        <Caption step={3} eyebrow="Dog Starts Pulling!" headline="Tightens Gently"
          body="The attachment reacts instantly — gentle pressure signals your dog to slow down." accent={ORANGE} />
      </Sequence>

      <Sequence from={T.RELAX_S} durationInFrames={T.OUTRO_S - T.RELAX_S} premountFor={fps}>
        <Caption step={4} eyebrow="Dog Relaxes" headline="Releases Instantly"
          body="The moment your dog eases up, the attachment loosens automatically. Perfect harmony." accent={GOLD} />
      </Sequence>

      {/* Outro CTA */}
      {isOutro && (
        <Sequence from={T.OUTRO_S} durationInFrames={T.TOTAL - T.OUTRO_S} premountFor={fps}>
          <OutroCTA />
        </Sequence>
      )}

    </AbsoluteFill>
  );
};
