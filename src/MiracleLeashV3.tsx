/**
 * MiracleLeashV3 — Real 3D Dog + Accurate Product Animation
 *
 * Uses wonder-unit "wonderdog.glb" (MIT) with full 46-bone skeleton.
 * Key additions vs previous version:
 *   • BoltSnap3D   — accurate bolt-snap hook, animated spring gate
 *   • RectCarabiner3D — accurate rectangular D-carabiner, animated gate
 *   • MiracleLeashProduct3D — complete accurate product model
 *   • SceneAttach  — CLOSE-UP: snap hook approaches D-ring, gate opens,
 *                    ring enters, gate clicks shut (gold flash)
 *   • Fixed body bob (was 0.00027 world-units; now visible 5 cm)
 *   • Trot gait w/ hip sway, spine flex, head nod
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
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// ─── Preload ──────────────────────────────────────────────────────────────────
useGLTF.preload(staticFile("dog.glb"));

// ─── Duration ────────────────────────────────────────────────────────────────
export const V3_DURATION = 960; // 32 s @ 30 fps

// ─── Timeline ────────────────────────────────────────────────────────────────
const T = {
  INTRO_S:  0,   INTRO_E:  60,
  PROD_S:   60,  PROD_E:  210,
  ATT_S:   210,  ATT_E:   390,   // ← NEW: close-up attachment
  S1_S:    390,  S1_E:    510,
  S2_S:    510,  S2_E:    660,
  WALK_S:  660,  WALK_E:  840,
  OUTRO_S: 840,  OUTRO_E: 960,
};

// ─── Palette ──────────────────────────────────────────────────────────────────
const METAL_BLK = "#141414";
const METAL_SLV = "#c4ccd6";
const METAL_SLV2= "#9aaab8";
const LABEL_W   = "#f2f2f2";
const BRAND_GN  = "#2e7d32";
const COLLAR_R  = "#c62828";
const LEASH_ORG = "#FF6B00";
const GOLD      = "#F5C842";
const WHITE     = "#ffffff";
const CYAN      = "#4FC3F7";
const AMBER     = "#FFA726";
const BG_DARK   = "#07090f";
const GREEN     = "#2e7d32";
const GREEN_LT  = "#66bb6a";
const GROUND_G  = "#0c1220";
const GRID_C    = "#16243c";
const SKY_T     = "#0c1628";
const SKY_B     = "#18263e";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const spr = (f: number, fps: number, delay = 0, damp = 180) =>
  spring({ frame: f - delay, fps, config: { damping: damp } });

const cl = (f: number, i: [number, number], o: [number, number]) =>
  interpolate(f, i, o, { extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic) });

const camAt = (kfs: number[][], frame: number) => {
  let a = kfs[0], b = kfs[kfs.length - 1];
  for (let i = 0; i < kfs.length - 1; i++) {
    if (frame >= kfs[i][0] && frame <= kfs[i + 1][0]) { a = kfs[i]; b = kfs[i + 1]; break; }
  }
  const t = a[0] === b[0] ? 1 : Easing.inOut(Easing.quad)(
    Math.min(1, Math.max(0, (frame - a[0]) / (b[0] - a[0]))));
  const lp = (ai: number) => a[ai] + (b[ai] - a[ai]) * t;
  return { pos: [lp(1), lp(2), lp(3)] as [number,number,number],
           look: [lp(4), lp(5), lp(6)] as [number,number,number] };
};

const Cam: React.FC<{ frame: number; kfs: number[][]; sx?: number; sy?: number }> =
  ({ frame, kfs, sx = 0, sy = 0 }) => {
    const { camera } = useThree();
    const { pos, look } = camAt(kfs, frame);
    camera.position.set(pos[0] + sx, pos[1] + sy, pos[2]);
    camera.lookAt(...look);
    return null;
  };

// ─── Bolt Snap 3D ─────────────────────────────────────────────────────────────
// Matches the small trigger-snap on the LEFT of the real Miracle Leash product.
// gateOpen 0=closed  1=fully open (~37°)
const BoltSnap3D: React.FC<{
  gateOpen?: number;
  glowColor?: string;
  glowInt?: number;
}> = ({ gateOpen = 0, glowColor = "#000000", glowInt = 0 }) => {
  const gate = gateOpen * 0.65; // radians

  const bm = (
    <meshStandardMaterial color={METAL_BLK} metalness={0.92} roughness={0.09}
      emissive={glowColor} emissiveIntensity={glowInt} />
  );
  const sm = (
    <meshStandardMaterial color={METAL_SLV2} metalness={0.88} roughness={0.14}
      emissive={glowColor} emissiveIntensity={glowInt * 0.6} />
  );

  return (
    <group>
      {/* ── BODY ───────────────────────────────────────────────────── */}
      {/* Upper solid block */}
      <mesh position={[0, 0.115, 0]}>{bm}
        <boxGeometry args={[0.235, 0.295, 0.115]} />
      </mesh>
      {/* Lower left pillar (flanking the opening) */}
      <mesh position={[-0.082, -0.175, 0]}>{bm}
        <boxGeometry args={[0.068, 0.215, 0.115]} />
      </mesh>
      {/* Lower right pillar */}
      <mesh position={[0.082, -0.175, 0]}>{bm}
        <boxGeometry args={[0.068, 0.215, 0.115]} />
      </mesh>
      {/* Bottom connector bar (below opening) */}
      <mesh position={[0, -0.285, 0]}>{bm}
        <boxGeometry args={[0.235, 0.052, 0.115]} />
      </mesh>

      {/* ── DECORATIVE HOLES on front face ─────────────────────────── */}
      <mesh position={[0, 0.185, 0.055]}>
        <circleGeometry args={[0.052, 14]} />
        <meshStandardMaterial color="#060606" />
      </mesh>
      <mesh position={[0, 0.035, 0.055]}>
        <circleGeometry args={[0.038, 14]} />
        <meshStandardMaterial color="#060606" />
      </mesh>

      {/* ── TOP LOOP (where strap webbing threads through) ─────────── */}
      <mesh position={[0, 0.32, 0]}>
        <torusGeometry args={[0.082, 0.024, 8, 22, Math.PI]} />
        {bm}
      </mesh>

      {/* ── TRIGGER / BUTTON on the back ───────────────────────────── */}
      <mesh position={[-0.14, 0.06, 0]}>
        <boxGeometry args={[0.042, 0.175, 0.092]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.75} roughness={0.28} />
      </mesh>

      {/* ── SPRING GATE ────────────────────────────────────────────── */}
      {/* Pivots from lower-left corner; opens inward to the right */}
      <group position={[-0.082, -0.235, 0]} rotation={[0, 0, gate]}>
        <mesh position={[0.1, 0.006, 0]}>
          <boxGeometry args={[0.19, 0.034, 0.096]} />
          {sm}
        </mesh>
      </group>

      {/* Small hinge pin at gate pivot */}
      <mesh position={[-0.082, -0.235, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.13, 8]} />
        <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
};

// ─── Rectangular D-Carabiner 3D ───────────────────────────────────────────────
// Matches the large rectangular carabiner on the RIGHT of the Miracle Leash.
// gateOpen 0=closed  1=open (~25°)
const RectCarabiner3D: React.FC<{
  gateOpen?: number;
  glowColor?: string;
  glowInt?: number;
}> = ({ gateOpen = 0, glowColor = "#000000", glowInt = 0 }) => {
  const gateRot = gateOpen * 0.42; // radians Y-axis

  const dm = (
    <meshStandardMaterial color="#161616" metalness={0.68} roughness={0.26}
      emissive={glowColor} emissiveIntensity={glowInt} />
  );
  const gm = (
    <meshStandardMaterial color={METAL_SLV2} metalness={0.88} roughness={0.14}
      emissive={glowColor} emissiveIntensity={glowInt * 0.7} />
  );

  return (
    <group>
      {/* Top bar */}
      <mesh position={[0, 0.275, 0]}>{dm}
        <boxGeometry args={[0.52, 0.115, 0.122]} />
      </mesh>
      {/* Bottom bar */}
      <mesh position={[0, -0.275, 0]}>{dm}
        <boxGeometry args={[0.52, 0.115, 0.122]} />
      </mesh>
      {/* Left side (solid, no gate) */}
      <mesh position={[-0.215, 0, 0]}>{dm}
        <boxGeometry args={[0.092, 0.665, 0.122]} />
      </mesh>
      {/* Right side — upper post */}
      <mesh position={[0.215, 0.205, 0]}>{dm}
        <boxGeometry args={[0.092, 0.265, 0.122]} />
      </mesh>
      {/* Right side — lower post */}
      <mesh position={[0.215, -0.195, 0]}>{dm}
        <boxGeometry args={[0.092, 0.225, 0.122]} />
      </mesh>

      {/* Gate — pivots at top-right [0.215, 0.055, 0] */}
      <group position={[0.215, 0.055, 0]} rotation={[0, gateRot, 0]}>
        {/* Gate bar spans the gap */}
        <mesh position={[0, -0.19, 0]}>{gm}
          <boxGeometry args={[0.092, 0.32, 0.105]} />
        </mesh>
        {/* Tiny spring pin */}
        <mesh position={[0, 0.005, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.135, 8]} />
          <meshStandardMaterial color="#777" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    </group>
  );
};

// ─── Miracle Leash Product 3D ─────────────────────────────────────────────────
// Full product matching the real photo: bolt-snap — strap/label — rect-carabiner
interface ProdProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  snapGate?: number;
  carabGate?: number;
  glowSnap?: number;
  glowCarab?: number;
}

const MiracleLeashProduct3D: React.FC<ProdProps> = ({
  position = [0, 0, 0], rotation = [0, 0, 0], scale = 1,
  snapGate = 0, carabGate = 0, glowSnap = 0, glowCarab = 0,
}) => (
  <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
    {/* ── BOLT SNAP (left) ─────────────────────────── */}
    <group position={[-1.55, 0, 0]} rotation={[0, 0, Math.PI * 0.5]}>
      <BoltSnap3D gateOpen={snapGate}
        glowColor={glowSnap > 0 ? GOLD : "#000"} glowInt={glowSnap * 2.8} />
    </group>

    {/* ── NYLON STRAP ──────────────────────────────── */}
    {/* Main strap body */}
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[2.18, 0.17, 0.47]} />
      <meshStandardMaterial color="#222222" roughness={0.78} />
    </mesh>
    {/* Strap weave ribs */}
    {[...Array(14)].map((_, i) => (
      <mesh key={i} position={[i * 0.165 - 1.07, 0, 0]}>
        <boxGeometry args={[0.04, 0.18, 0.49]} />
        <meshStandardMaterial color="#0c0c0c" roughness={0.88} />
      </mesh>
    ))}

    {/* ── WHITE LABEL PATCH ────────────────────────── */}
    <mesh position={[0, 0.1, 0]}>
      <boxGeometry args={[0.96, 0.044, 0.45]} />
      <meshStandardMaterial color={LABEL_W} roughness={0.65} />
    </mesh>
    {/* Stitching dots around label edge */}
    {[-0.44, -0.22, 0, 0.22, 0.44].map((x, i) => (
      <React.Fragment key={i}>
        <mesh position={[x, 0.12, 0.21]}>
          <boxGeometry args={[0.025, 0.014, 0.01]} />
          <meshStandardMaterial color="#888" />
        </mesh>
        <mesh position={[x, 0.12, -0.21]}>
          <boxGeometry args={[0.025, 0.014, 0.01]} />
          <meshStandardMaterial color="#888" />
        </mesh>
      </React.Fragment>
    ))}
    {/* Paw print — main pad */}
    <mesh position={[-0.29, 0.13, 0.06]}>
      <sphereGeometry args={[0.09, 10, 7]} />
      <meshStandardMaterial color="#1a1a1a" />
    </mesh>
    {/* Paw toes */}
    {[[-0.35, 0.13, 0.16], [-0.26, 0.13, 0.19], [-0.18, 0.13, 0.18],
      [-0.13, 0.13, 0.10]].map(([px, py, pz], i) => (
      <mesh key={i} position={[px as number, py as number, pz as number]}>
        <sphereGeometry args={[0.042, 8, 6]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    ))}
    {/* "Miracle" green text bar */}
    <mesh position={[0.09, 0.13, -0.04]}>
      <boxGeometry args={[0.48, 0.036, 0.15]} />
      <meshStandardMaterial color={BRAND_GN} roughness={0.55} />
    </mesh>
    {/* "Leash" text bar */}
    <mesh position={[0.09, 0.13, 0.10]}>
      <boxGeometry args={[0.38, 0.036, 0.11]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.55} />
    </mesh>
    {/* "TAKE BACK CONTROL" bar */}
    <mesh position={[0.09, 0.13, 0.19]}>
      <boxGeometry args={[0.46, 0.022, 0.05]} />
      <meshStandardMaterial color="#444" roughness={0.6} />
    </mesh>

    {/* ── RECT CARABINER (right) ────────────────────── */}
    <group position={[1.62, 0, 0]} rotation={[0, 0, -Math.PI * 0.5]}>
      <RectCarabiner3D gateOpen={carabGate}
        glowColor={glowCarab > 0 ? CYAN : "#000"} glowInt={glowCarab * 2.8} />
    </group>
  </group>
);

// ─── Dog Model ────────────────────────────────────────────────────────────────
interface DogModelProps {
  walkPhase?: number;
  tailWag?: number;
  headTurn?: number;
  jawOpen?: number;
  pullLean?: number;
  chestGlowVal?: number;
  collarGlowVal?: number;
  scale?: number;
}

const DogModel: React.FC<DogModelProps> = ({
  walkPhase = 0, tailWag = 0, headTurn = 0, jawOpen = 0,
  pullLean = 0, chestGlowVal = 0, collarGlowVal = 0, scale = 1,
}) => {
  const { scene } = useGLTF(staticFile("dog.glb")) as any;

  // Clone once per mount so we never mutate the shared cached scene
  const dog = React.useMemo(() => scene.clone(true), [scene]);

  // Build bone map + capture rest positions
  const { B, restHipsY } = React.useMemo(() => {
    const m: Record<string, THREE.Object3D> = {};
    dog.traverse((o: THREE.Object3D) => { if (o.name) m[o.name] = o; });
    return {
      B: m,
      restHipsY: (m.Hips as THREE.Bone)?.position.y ?? 0,
    };
  }, [dog]);

  // ── Gait ────────────────────────────────────────────────────────────────────
  // Trot gait: diagonal pairs move together (RF+LB, LF+RB)
  const sw  = Math.sin(walkPhase * Math.PI * 2);          // RF + LB
  const sw2 = Math.sin(walkPhase * Math.PI * 2 + Math.PI); // LF + RB

  // Front-right leg (called "RightArm" in humanoid rig)
  if (B.RightArm)     (B.RightArm     as THREE.Bone).rotation.x =  sw  * 0.58;
  if (B.RightForeArm) (B.RightForeArm as THREE.Bone).rotation.x = Math.max(0,  sw) * 0.42;
  // Front-left leg
  if (B.LeftArm)      (B.LeftArm      as THREE.Bone).rotation.x =  sw2 * 0.58;
  if (B.LeftForeArm)  (B.LeftForeArm  as THREE.Bone).rotation.x = Math.max(0, sw2) * 0.42;
  // Back-right leg
  if (B.RightUpLeg)   (B.RightUpLeg   as THREE.Bone).rotation.x = sw2 * 0.54;
  if (B.RightLeg)     (B.RightLeg     as THREE.Bone).rotation.x = Math.max(0, sw2) * 0.38;
  // Back-left leg
  if (B.LeftUpLeg)    (B.LeftUpLeg    as THREE.Bone).rotation.x = sw  * 0.54;
  if (B.LeftLeg)      (B.LeftLeg      as THREE.Bone).rotation.x = Math.max(0,  sw) * 0.38;

  // ── Body bob + hip sway ─────────────────────────────────────────────────────
  // Body bobs at 2× stride frequency (each step creates a bob)
  const bob = Math.abs(Math.sin(walkPhase * Math.PI * 2)) * 2.8; // model-space units
  if (B.Hips) {
    (B.Hips as THREE.Bone).position.y = restHipsY + bob;
    (B.Hips as THREE.Bone).rotation.z = sw * 0.055 + pullLean * 0.09;
    (B.Hips as THREE.Bone).rotation.x = pullLean * 0.06;
  }

  // ── Spine flex ──────────────────────────────────────────────────────────────
  if (B.Spine)  (B.Spine  as THREE.Bone).rotation.z = Math.sin(walkPhase * Math.PI * 2) * 0.038;
  if (B.Spine1) (B.Spine1 as THREE.Bone).rotation.z = Math.sin(walkPhase * Math.PI * 2 + 0.4) * 0.028;

  // ── Tail wag ────────────────────────────────────────────────────────────────
  const tw = Math.sin(tailWag * Math.PI * 4);
  if (B.Tail)  (B.Tail  as THREE.Bone).rotation.z = tw * 0.58;
  if (B.Tail1) (B.Tail1 as THREE.Bone).rotation.z = tw * 0.46;
  if (B.Tail2) (B.Tail2 as THREE.Bone).rotation.z = tw * 0.34;
  if (B.Tail3) (B.Tail3 as THREE.Bone).rotation.z = tw * 0.20;

  // ── Head ────────────────────────────────────────────────────────────────────
  if (B.Head) {
    (B.Head as THREE.Bone).rotation.y = headTurn;
    (B.Head as THREE.Bone).rotation.x = pullLean * 0.14 +
      Math.sin(walkPhase * Math.PI * 2) * 0.04; // slight nod
  }
  if (B.Neck) (B.Neck as THREE.Bone).rotation.x = -pullLean * 0.09;
  if (B.Jaw)  (B.Jaw  as THREE.Bone).rotation.x = jawOpen * 0.34;

  // ── Ear flap ────────────────────────────────────────────────────────────────
  const ef = Math.sin(walkPhase * Math.PI * 2) * 0.11;
  if (B.RightEar) (B.RightEar as THREE.Bone).rotation.z =  ef;
  if (B.LeftEar)  (B.LeftEar  as THREE.Bone).rotation.z = -ef;

  // Dog faces -Z at rest; rotation PI turns it to face +Z (camera-friendly)
  return (
    <group scale={[scale, scale, scale]} rotation={[0, Math.PI, 0]}>
      <primitive object={dog} />

      {/* Red collar at neck (model-space neck ≈ [0, 55, 60]) */}
      <mesh position={[0, 55, 60]}>
        <torusGeometry args={[21, 4.2, 14, 52]} />
        <meshStandardMaterial
          color={collarGlowVal > 0 ? "#ff5252" : COLLAR_R}
          roughness={0.42}
          emissive={COLLAR_R}
          emissiveIntensity={0.12 + collarGlowVal * 2.5}
        />
      </mesh>

      {/* D-ring on collar (silver small torus — this is what the snap hooks onto) */}
      <mesh position={[0, 37, 70]} rotation={[Math.PI * 0.3, 0, 0]}>
        <torusGeometry args={[8.5, 2.0, 10, 30]} />
        <meshStandardMaterial color={METAL_SLV} metalness={0.96} roughness={0.08} />
      </mesh>

      {/* Chest glow on pull */}
      {chestGlowVal > 0 && (
        <mesh position={[0, 36, 30]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[32, 3.5, 12, 52]} />
          <meshStandardMaterial
            color={AMBER} emissive={AMBER}
            emissiveIntensity={chestGlowVal * 5}
            transparent opacity={chestGlowVal * 0.9}
          />
        </mesh>
      )}
    </group>
  );
};

// ─── Leash Tube ───────────────────────────────────────────────────────────────
const LeashTube: React.FC<{ progress: number; tension?: number }> = ({ progress, tension = 0 }) => {
  const curve = React.useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3( 1.6,  2.9,  0.0),
    new THREE.Vector3( 1.3,  2.0,  0.1),
    new THREE.Vector3( 1.0,  1.2,  0.0),
    new THREE.Vector3( 0.9,  0.6,  0.5),
    new THREE.Vector3( 0.4, -0.2,  0.7),
    new THREE.Vector3(-0.2, -0.4,  0.0),
    new THREE.Vector3( 0.4, -0.2, -0.7),
    new THREE.Vector3( 0.9,  0.6, -0.5),
    new THREE.Vector3( 1.0,  1.0, -0.4),
  ]), []);

  const pts = curve.getPoints(80);
  const n = Math.max(2, Math.floor(progress * pts.length));
  const vis = pts.slice(0, n);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const visCurve = React.useMemo(() => new THREE.CatmullRomCurve3(vis), [n]);

  if (vis.length < 2) return null;
  return (
    <mesh>
      <tubeGeometry args={[visCurve, 60, 0.044 + tension * 0.018, 10, false]} />
      <meshStandardMaterial color={LEASH_ORG} roughness={0.52}
        emissive={LEASH_ORG} emissiveIntensity={0.28 + tension * 1.1} />
    </mesh>
  );
};

// ─── Ground ───────────────────────────────────────────────────────────────────
const Ground3D: React.FC<{ scrollZ?: number }> = ({ scrollZ = 0 }) => (
  <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color={GROUND_G} roughness={1} />
    </mesh>
    {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map(i => (
      <React.Fragment key={i}>
        <mesh position={[i * 1.4, -0.01, (scrollZ % 1.4) - 8]}>
          <boxGeometry args={[0.014, 0.008, 28]} />
          <meshStandardMaterial color={GRID_C} />
        </mesh>
        <mesh position={[0, -0.01, (i * 1.4 + scrollZ) % 15.4 - 7.7]}>
          <boxGeometry args={[28, 0.008, 0.014]} />
          <meshStandardMaterial color={GRID_C} />
        </mesh>
      </React.Fragment>
    ))}
  </>
);

// ─── Lights ───────────────────────────────────────────────────────────────────
const LightsMain: React.FC<{ accent?: string }> = ({ accent = GOLD }) => (
  <>
    <ambientLight intensity={0.62} color="#ccd8ff" />
    <directionalLight position={[3, 7, 8]} intensity={2.6} color="#fff8e8" />
    <pointLight position={[-4, 3, 5]} intensity={1.3} color="#b8d0ff" />
    <pointLight position={[-1, 4, -8]} intensity={3.2} color="#e8f0ff" />
    <pointLight position={[ 2, 4, -8]} intensity={2.4} color="#ffe8d0" />
    <pointLight position={[ 4, 0,  3]} intensity={0.9} color={accent} />
    <pointLight position={[ 0,-2,  4]} intensity={0.55} color="#8890cc" />
  </>
);

const LightsProd: React.FC = () => (
  <>
    <ambientLight intensity={0.75} color="#e0e8ff" />
    <directionalLight position={[3, 6, 8]} intensity={3.8} color="#ffffff" />
    <pointLight position={[-3, 2, 5]} intensity={1.7} color={GOLD} />
    <pointLight position={[ 3, 2, 5]} intensity={1.5} color="#ffffff" />
    <pointLight position={[-4, 4,-2]} intensity={1.0} color="#c0d0ff" />
    <pointLight position={[ 4, 4,-2]} intensity={1.0} color="#ffe0c0" />
    <pointLight position={[ 0,-2, 5]} intensity={0.9} color={CYAN} />
  </>
);

const LightsClose: React.FC = () => (
  <>
    <ambientLight intensity={0.5} color="#c8d8ff" />
    <directionalLight position={[2, 5, 6]} intensity={4.0} color="#ffffff" />
    <pointLight position={[-2, 1, 4]} intensity={1.8} color={GOLD} />
    <pointLight position={[ 2, 1, 4]} intensity={1.4} color="#ffffff" />
    <pointLight position={[ 0,-1, 5]} intensity={0.8} color="#aaccff" />
    <spotLight position={[0, 3, 2]} intensity={8} angle={0.45}
      penumbra={0.5} target-position={[0, 0, 0]} color="#fff5e0" />
  </>
);

// ─── Gradient BG ──────────────────────────────────────────────────────────────
const GradBG: React.FC = () => (
  <AbsoluteFill style={{ background: `linear-gradient(175deg, ${SKY_T} 0%, ${SKY_B} 55%, #0a0e18 100%)` }} />
);

// ─── Overlay Components ───────────────────────────────────────────────────────
const StepOverlay: React.FC<{
  frame: number; fps: number;
  num: number; title: string; body: string;
  color?: string; topNote?: string;
}> = ({ frame, fps, num, title, body, color = GOLD, topNote }) => {
  const p = spr(frame, fps, 0, 200);
  return (
    <>
      {topNote && (
        <div style={{
          position: "absolute", top: 92, left: 50, right: 50,
          opacity: cl(frame, [50, 80], [0, 1]),
          background: "rgba(0,0,0,0.72)", border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: 16, padding: "14px 24px", textAlign: "center",
          fontFamily: "Arial,sans-serif", fontSize: 22,
          color: "rgba(255,255,255,0.82)", lineHeight: 1.5,
        }}>{topNote}</div>
      )}
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        alignItems: "center", padding: "0 64px 100px", gap: 14, pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 520,
          background: "linear-gradient(to top,rgba(0,0,0,0.96) 0%,rgba(0,0,0,0.55) 50%,transparent 100%)",
        }} />
        <div style={{
          position: "relative",
          opacity: p, transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        }}>
          <div style={{
            background: color, borderRadius: 50, padding: "7px 32px",
            fontFamily: "'Arial Black',Arial,sans-serif",
            fontSize: 22, fontWeight: 900, color: BG_DARK, letterSpacing: 3,
            boxShadow: `0 0 28px ${color}99`,
          }}>STEP {num}</div>
          <div style={{
            fontFamily: "'Arial Black',Arial,sans-serif",
            fontSize: 62, fontWeight: 900, color: WHITE, textAlign: "center",
            lineHeight: 1.05, textShadow: `0 0 45px ${color}77`,
          }}>{title}</div>
          <div style={{
            fontFamily: "Arial,sans-serif", fontSize: 30,
            color: "rgba(255,255,255,0.82)", textAlign: "center",
            lineHeight: 1.5, maxWidth: 860,
          }}>{body}</div>
        </div>
      </AbsoluteFill>
    </>
  );
};

const ProgressBar: React.FC<{ step: number }> = ({ step }) => (
  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, display: "flex" }}>
    {[GOLD, AMBER, CYAN, GREEN_LT].map((c, i) => (
      <div key={i} style={{
        flex: 1, height: "100%",
        background: i < step ? c : "rgba(255,255,255,0.08)",
        borderRight: "1px solid rgba(0,0,0,0.3)",
        boxShadow: i === step - 1 ? `0 0 10px ${c}` : "none",
      }} />
    ))}
  </div>
);

// ─── SCENE: CSS Intro ─────────────────────────────────────────────────────────
const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p1 = spr(frame, fps, 5, 220);
  const p2 = spr(frame, fps, 18, 220);
  const p3 = spr(frame, fps, 32, 220);
  return (
    <AbsoluteFill style={{ background: BG_DARK, alignItems: "center", justifyContent: "center" }}>
      <div style={{
        position: "absolute", width: 800, height: 800, borderRadius: "50%",
        background: `radial-gradient(circle, ${GREEN}1e 0%, transparent 70%)`, opacity: p1,
      }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        <div style={{
          opacity: p1, transform: `translateY(${interpolate(p1, [0, 1], [28, 0])}px)`,
          fontFamily: "Arial,sans-serif", fontSize: 30, color: "rgba(255,255,255,0.6)",
          letterSpacing: 8, textTransform: "uppercase",
        }}>Introducing</div>
        <div style={{
          opacity: p2, transform: `scale(${interpolate(p2, [0, 1], [0.87, 1])})`,
          background: WHITE, borderRadius: 16, padding: "26px 54px",
          display: "flex", alignItems: "center", gap: 22,
          boxShadow: `0 0 90px rgba(46,125,50,0.4), 0 10px 50px rgba(0,0,0,0.6)`,
          minWidth: 680,
        }}>
          <span style={{ fontSize: 82 }}>🐾</span>
          <div>
            <div style={{ fontFamily: "'Arial Black',Arial,sans-serif", fontSize: 82, fontWeight: 900, color: "#1a1a1a", lineHeight: 1 }}>Miracle</div>
            <div style={{ fontFamily: "'Arial Black',Arial,sans-serif", fontSize: 82, fontWeight: 900, color: GREEN, lineHeight: 1 }}>Leash</div>
          </div>
        </div>
        <div style={{
          opacity: p2,
          background: "#1a1a1a", padding: "9px 34px", borderRadius: 6,
          fontFamily: "'Arial Black',Arial,sans-serif",
          fontSize: 26, fontWeight: 900, color: WHITE,
          letterSpacing: 4, textTransform: "uppercase",
          transform: `scale(${interpolate(p2, [0, 1], [0.92, 1])})`,
        }}>Take Back Control</div>
        <div style={{
          opacity: p3, transform: `translateY(${interpolate(p3, [0, 1], [16, 0])}px)`,
          fontFamily: "Arial,sans-serif", fontSize: 28,
          color: "rgba(255,255,255,0.6)", textAlign: "center",
        }}>Stops pulling — no harsh corrections needed</div>
      </div>
    </AbsoluteFill>
  );
};

// ─── SCENE: 3D Product Showcase ───────────────────────────────────────────────
const PROD_KFS: number[][] = [
  [  0,  0.0, 0.3, 3.6,  0.0, 0.0, 0],
  [ 50,  2.2, 0.6, 3.0,  0.0, 0.0, 0],
  [100, -2.2, 0.2, 3.2,  0.0, 0.0, 0],
  [150,  0.0, 0.9, 2.8,  0.0, 0.0, 0],
];

const SceneProduct: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const rotY = frame * 0.019;
  const p = spr(frame, fps, 0, 200);
  return (
    <AbsoluteFill>
      <GradBG />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <LightsProd />
        <Sequence layout="none">
          <Cam frame={frame} kfs={PROD_KFS} />
          <group rotation={[0.22, rotY, 0.04]} scale={[1.32, 1.32, 1.32]}>
            <MiracleLeashProduct3D />
          </group>
        </Sequence>
      </ThreeCanvas>
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        alignItems: "center", padding: "0 64px 110px", gap: 14, pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 500,
          background: "linear-gradient(to top,rgba(7,9,15,0.96) 0%,transparent 100%)",
        }} />
        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{
            opacity: p, transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
            fontFamily: "'Arial Black',Arial,sans-serif",
            fontSize: 64, fontWeight: 900, color: WHITE,
            textShadow: `0 0 50px ${GOLD}88`,
          }}>The <span style={{ color: GOLD }}>Miracle Leash</span></div>
          <div style={{
            opacity: spr(frame, fps, 22, 200),
            transform: `translateY(${interpolate(spr(frame, fps, 22, 200), [0, 1], [18, 0])}px)`,
            fontFamily: "Arial,sans-serif", fontSize: 30,
            color: "rgba(255,255,255,0.72)", marginTop: 12,
          }}>Snap Hook · Nylon Strap · D-Ring Carabiner</div>
          <div style={{
            display: "flex", gap: 20, justifyContent: "center", marginTop: 18,
            opacity: spr(frame, fps, 40, 200),
          }}>
            {[["BOLT SNAP", GOLD, "Clips to collar D-ring"],
              ["STRAP", WHITE, "Nylon · Tough · Branded"],
              ["CARABINER", CYAN, "Clips to leash / hand"]].map(([l, c, s]) => (
              <div key={l} style={{
                background: "rgba(255,255,255,0.06)", border: `1px solid ${c}44`,
                borderRadius: 12, padding: "10px 20px", textAlign: "center",
              }}>
                <div style={{ fontFamily: "'Arial Black',Arial,sans-serif", fontSize: 20, fontWeight: 900, color: c as string }}>{l}</div>
                <div style={{ fontFamily: "Arial,sans-serif", fontSize: 16, color: "rgba(255,255,255,0.5)" }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── SCENE: Attachment Close-Up ───────────────────────────────────────────────
// 180 frames (6 s). Isolated: bolt-snap flies toward collar D-ring.
//  0- 20  set-up — D-ring visible, snap approaches from above
// 20- 55  snap descends toward D-ring, gate stays closed
// 55- 75  gate OPENS
// 75- 95  D-ring slides through opening (snap moves last 10%)
// 95-110  gate SNAPS SHUT — gold flash
//110-150  pull back, product shown attached
//150-180  "SECURED" badge + pull-back wide

const ATT_CAM_KFS: number[][] = [
  [  0,  0.0,  0.35, 1.8,   0.0,  0.0, 0],  // tight close-up on D-ring
  [ 55,  0.0,  0.15, 1.55,  0.0,  0.0, 0],  // hold close as snap descends
  [110,  0.15, 0.18, 1.4,   0.0,  0.0, 0],  // snap closes
  [150, -0.5,  0.5,  2.8,   0.0,  0.1, 0],  // pull back — show product attached
  [180,  0.0,  0.6,  3.4,   0.0,  0.0, 0],
];

const SceneAttach: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Snap hook approach (Y from above down toward D-ring)
  const approachP = cl(frame, [10, 90], [0, 1]);
  const snapY = interpolate(approachP, [0, 1], [0.82, -0.02],
    { easing: Easing.inOut(Easing.quad) });
  const snapX = interpolate(approachP, [0, 1], [0.12, 0.0]);

  // Gate: opens then snaps shut
  const gateOpen = interpolate(frame, [55, 75, 95, 110], [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Flash on snap
  const snapFlash = interpolate(frame, [107, 112, 128], [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Product pull-back (full product appears after snap)
  const prodP = cl(frame, [110, 155], [0, 1]);
  const prodScale = prodP * 0.32;

  // "SECURED" badge
  const securedP = cl(frame, [115, 148], [0, 1]);

  // Label arrows
  const labelP = cl(frame, [5, 30], [0, 1]);

  return (
    <AbsoluteFill>
      <GradBG />
      {snapFlash > 0 && (
        <AbsoluteFill style={{
          background: `radial-gradient(circle at 50% 52%, rgba(245,200,66,${snapFlash * 0.55}) 0%, transparent 65%)`,
          pointerEvents: "none",
        }} />
      )}
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <LightsClose />
        <Sequence layout="none">
          <Cam frame={frame} kfs={ATT_CAM_KFS} />

          {/* ── COLLAR D-RING (what the snap attaches TO) ── */}
          {/* Red collar section */}
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI * 0.5]}>
            <torusGeometry args={[0.22, 0.05, 10, 40, Math.PI * 1.4]} />
            <meshStandardMaterial color={COLLAR_R} roughness={0.42} emissive={COLLAR_R} emissiveIntensity={0.18} />
          </mesh>
          {/* D-ring silver ring */}
          <mesh position={[0, -0.02, 0]} rotation={[Math.PI * 0.5, 0, 0]}>
            <torusGeometry args={[0.145, 0.026, 12, 36]} />
            <meshStandardMaterial color={METAL_SLV} metalness={0.96} roughness={0.08}
              emissive={snapFlash > 0 ? GOLD : "#000"} emissiveIntensity={snapFlash * 3} />
          </mesh>

          {/* ── BOLT SNAP HOOK approaching ── */}
          {/* At scale 1: snap is ~0.65 high, 0.25 wide — good for close-up */}
          <group position={[snapX, snapY, 0.05]} rotation={[Math.PI, 0, 0]} scale={[0.78, 0.78, 0.78]}>
            <BoltSnap3D
              gateOpen={gateOpen}
              glowColor={GOLD}
              glowInt={cl(frame, [55, 110], [0, 0.5]) + snapFlash * 3}
            />
          </group>

          {/* Success sphere burst */}
          {snapFlash > 0 && (
            <mesh position={[0, 0, 0.1]}>
              <sphereGeometry args={[snapFlash * 0.32, 10, 8]} />
              <meshStandardMaterial color={GOLD} emissive={GOLD}
                emissiveIntensity={6} transparent opacity={snapFlash * 0.72} />
            </mesh>
          )}

          {/* Full product shown after snap (pull-back view) */}
          {prodScale > 0 && (
            <group position={[0, -0.38, 0]}>
              <MiracleLeashProduct3D
                position={[0, 0, 0]} scale={prodScale}
                glowSnap={cl(frame, [110, 160], [1, 0])}
              />
            </group>
          )}
        </Sequence>
      </ThreeCanvas>

      {/* ── CSS LABELS ── */}
      {/* D-ring label */}
      <div style={{
        position: "absolute", left: "10%", top: "38%",
        opacity: labelP, transform: `translateX(${interpolate(labelP, [0, 1], [-30, 0])}px)`,
        display: "flex", alignItems: "center", gap: 12,
        pointerEvents: "none",
      }}>
        <div style={{
          background: "rgba(196,204,214,0.12)", border: `1px solid ${METAL_SLV}55`,
          borderRadius: 10, padding: "8px 18px",
          fontFamily: "'Arial Black',Arial,sans-serif", fontSize: 22,
          fontWeight: 900, color: METAL_SLV, letterSpacing: 1,
        }}>COLLAR D-RING</div>
        <div style={{ width: 60, height: 2, background: `linear-gradient(90deg, ${METAL_SLV}, transparent)` }} />
      </div>

      {/* Bolt snap label */}
      <div style={{
        position: "absolute", right: "10%", top: "18%",
        opacity: cl(frame, [15, 45], [0, 1]),
        transform: `translateX(${interpolate(cl(frame, [15, 45], [0, 1]), [0, 1], [30, 0])}px)`,
        display: "flex", alignItems: "center", gap: 12, flexDirection: "row-reverse",
        pointerEvents: "none",
      }}>
        <div style={{
          background: `rgba(245,200,66,0.10)`, border: `1px solid ${GOLD}55`,
          borderRadius: 10, padding: "8px 18px",
          fontFamily: "'Arial Black',Arial,sans-serif", fontSize: 22,
          fontWeight: 900, color: GOLD, letterSpacing: 1,
        }}>BOLT SNAP</div>
        <div style={{ width: 60, height: 2, background: `linear-gradient(270deg, ${GOLD}, transparent)` }} />
      </div>

      {/* Gate open label */}
      {gateOpen > 0.1 && gateOpen < 0.99 && (
        <div style={{
          position: "absolute", right: "8%", top: "52%",
          opacity: Math.min(1, gateOpen * 4) * (gateOpen < 0.95 ? 1 : (1 - gateOpen) * 20),
          fontFamily: "Arial,sans-serif", fontSize: 20,
          color: `rgba(255,255,200,0.9)`, letterSpacing: 1,
          pointerEvents: "none",
        }}>← gate opens</div>
      )}

      {/* SECURED badge */}
      {securedP > 0 && (
        <div style={{
          position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)",
          opacity: securedP, pointerEvents: "none",
        }}>
          <div style={{
            background: `rgba(46,125,50,0.22)`, border: `2px solid ${GREEN_LT}`,
            borderRadius: 50, padding: "14px 44px",
            fontFamily: "'Arial Black',Arial,sans-serif", fontSize: 36,
            fontWeight: 900, color: GREEN_LT, letterSpacing: 3,
            boxShadow: `0 0 40px ${GREEN}55`,
          }}>✓ SECURED</div>
        </div>
      )}

      {/* Bottom instruction */}
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        alignItems: "center", padding: "0 64px 90px", pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 380,
          background: "linear-gradient(to top,rgba(0,0,0,0.94) 0%,transparent 100%)",
        }} />
        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{
            opacity: cl(frame, [0, 25], [0, 1]),
            fontFamily: "'Arial Black',Arial,sans-serif",
            fontSize: 52, fontWeight: 900, color: WHITE,
            textShadow: `0 0 40px ${GOLD}66`,
          }}>How It <span style={{ color: GOLD }}>Attaches</span></div>
          <div style={{
            opacity: cl(frame, [20, 50], [0, 1]),
            fontFamily: "Arial,sans-serif", fontSize: 28,
            color: "rgba(255,255,255,0.75)", marginTop: 10,
          }}>
            {frame < 115
              ? "Press the bolt snap over your dog's collar D-ring"
              : "Spring gate snaps shut — fully secured in 1 second"}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── SCENE: Step 1 — With Dog ─────────────────────────────────────────────────
const DOG_SCALE = 0.018;

const S1_KFS: number[][] = [
  [  0,  2.2, 1.5, 3.5,  0.0, 0.8, 0],
  [ 50,  1.5, 1.2, 3.0,  0.0, 0.8, 0],
  [100,  0.5, 1.0, 2.2,  0.0, 0.85, 0],
  [120,  1.8, 1.3, 3.5,  0.0, 0.8, 0],
];

const SceneStep1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const flyP = cl(frame, [15, 78], [0, 1]);
  const px = interpolate(flyP, [0, 1], [2.2,  0.0]);
  const py = interpolate(flyP, [0, 1], [2.8,  0.95]);
  const pz = interpolate(flyP, [0, 1], [-1.5, 1.1]);
  const ps = interpolate(flyP, [0, 0.2, 1], [0.28, 0.34, 0.34]);
  const snapFlash = interpolate(frame, [80, 85, 100], [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const collarG = cl(frame, [80, 140], [0, 1]);

  return (
    <AbsoluteFill>
      <GradBG />
      {snapFlash > 0 && <AbsoluteFill style={{ background: `rgba(245,200,66,${snapFlash * 0.28})`, pointerEvents: "none" }} />}
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <LightsMain accent={GOLD} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={S1_KFS} />
          <group position={[0, DOG_SCALE * 20, 0]}>
            <DogModel scale={DOG_SCALE} collarGlowVal={collarG} tailWag={frame * 0.012} />
          </group>
          <Ground3D />
          <MiracleLeashProduct3D position={[px, py, pz]} scale={ps}
            glowSnap={cl(frame, [65, 88], [0, 1])} />
          {snapFlash > 0 && (
            <mesh position={[0, 0.99, 1.1]}>
              <sphereGeometry args={[snapFlash * 0.28, 10, 8]} />
              <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={5}
                transparent opacity={snapFlash * 0.75} />
            </mesh>
          )}
        </Sequence>
      </ThreeCanvas>
      <ProgressBar step={1} />
      <StepOverlay frame={frame} fps={fps} num={1}
        title="Clip to Collar"
        body="Press the bolt snap onto your dog's collar D-ring — it clicks in 1 second"
        color={GOLD} />
    </AbsoluteFill>
  );
};

// ─── SCENE: Step 2 — Carabiner clips to leash ────────────────────────────────
const S2_KFS: number[][] = [
  [  0,  2.8, 0.8, 4.5,  0.0, 0.5, 0],
  [ 60,  1.5, 0.6, 5.5,  0.0, 0.3, 0],
  [120,  0.0, 1.5, 6.0,  0.0, 0.2, 0],
  [150, -2.0, 0.9, 5.0,  0.0, 0.3, 0],
];

const SceneStep2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const wrapP = cl(frame, [18, 125], [0, 1]);
  const tension = cl(frame, [128, 150], [0, 0.3]);
  const carabFlash = interpolate(frame, [125, 130, 148], [0, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GradBG />
      {carabFlash > 0 && <AbsoluteFill style={{ background: `rgba(79,195,247,${carabFlash * 0.24})`, pointerEvents: "none" }} />}
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <LightsMain accent={AMBER} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={S2_KFS} />
          <group position={[0, DOG_SCALE * 20, 0]}>
            <DogModel scale={DOG_SCALE} chestGlowVal={tension} tailWag={frame * 0.012} />
            <MiracleLeashProduct3D position={[0, 0.95, 1.1]} scale={0.35}
              glowCarab={cl(frame, [110, 130], [0, 1])} />
          </group>
          <LeashTube progress={wrapP} tension={tension} />
          <Ground3D />
        </Sequence>
      </ThreeCanvas>
      <ProgressBar step={2} />
      <StepOverlay frame={frame} fps={fps} num={2}
        title="Clip to Leash"
        body="Snap the D-ring carabiner onto your existing leash — done!"
        color={AMBER}
        topNote="💡 Works with any standard leash you already own" />
    </AbsoluteFill>
  );
};

// ─── SCENE: Walk Demo ─────────────────────────────────────────────────────────
const WALK_KFS: number[][] = [
  [  0,  2.5, 0.8, 5.5,  0.0, 0.4, 0],
  [ 35,  3.8, 0.7, 4.5,  0.0, 0.4, 0],
  [ 75,  0.5, 0.6, 6.5,  0.0, 0.3, 0],
  [125, -3.0, 0.8, 5.0,  0.0, 0.4, 0],
  [160,  1.5, 1.0, 5.5,  0.0, 0.4, 0],
  [180,  2.0, 0.7, 5.8,  0.0, 0.4, 0],
];

const SceneWalk: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const walkPhase = frame * 0.048;
  const pullP  = cl(frame, [30, 72], [0, 1]);
  const calmP  = cl(frame, [82, 115], [0, 1]);
  const chestG = Math.max(0, pullP * (1 - calmP));
  const tension = chestG * 0.6;
  const drift  = cl(frame, [30, 75], [0, 0.5]) - cl(frame, [82, 115], [0, 0.5]);
  const shakeX = chestG * Math.sin(frame * 19.7) * 0.042;
  const shakeY = chestG * Math.sin(frame * 13.1) * 0.026;

  return (
    <AbsoluteFill>
      <GradBG />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <LightsMain accent={chestG > 0 ? AMBER : GREEN_LT} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={WALK_KFS} sx={shakeX} sy={shakeY} />
          <group position={[drift, 0, 0]}>
            <group position={[0, DOG_SCALE * 20, 0]}>
              <DogModel scale={DOG_SCALE}
                walkPhase={walkPhase}
                tailWag={walkPhase * 0.6}
                chestGlowVal={chestG}
                pullLean={chestG}
                jawOpen={Math.abs(Math.sin(walkPhase * Math.PI)) * 0.5}
              />
              <MiracleLeashProduct3D position={[0, 0.95, 1.1]} scale={0.35} />
            </group>
            <LeashTube progress={1} tension={tension} />
          </group>
          <Ground3D scrollZ={-walkPhase * 0.85} />
        </Sequence>
      </ThreeCanvas>

      {/* Pull → Control transition labels */}
      <div style={{
        position: "absolute", top: "14%", left: "50%", transform: "translateX(-50%)",
        opacity: cl(frame, [28, 58], [0, 1]) * cl(frame, [80, 112], [1, 0]),
        pointerEvents: "none",
      }}>
        <div style={{
          background: "rgba(255,82,82,0.15)", border: "1px solid rgba(255,82,82,0.5)",
          borderRadius: 12, padding: "12px 32px",
          fontFamily: "'Arial Black',Arial,sans-serif", fontSize: 28,
          fontWeight: 900, color: "#ff5252", letterSpacing: 2,
        }}>PULLING…</div>
      </div>
      <div style={{
        position: "absolute", top: "14%", left: "50%", transform: "translateX(-50%)",
        opacity: cl(frame, [115, 145], [0, 1]),
        pointerEvents: "none",
      }}>
        <div style={{
          background: `rgba(46,125,50,0.15)`, border: `1px solid ${GREEN_LT}77`,
          borderRadius: 12, padding: "12px 32px",
          fontFamily: "'Arial Black',Arial,sans-serif", fontSize: 28,
          fontWeight: 900, color: GREEN_LT, letterSpacing: 2,
          boxShadow: `0 0 28px ${GREEN}44`,
        }}>IN CONTROL ✓</div>
      </div>

      <ProgressBar step={4} />
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        alignItems: "center", padding: "0 64px 100px", pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 460,
          background: "linear-gradient(to top,rgba(0,0,0,0.94) 0%,transparent 100%)",
        }} />
        <div style={{ position: "relative", textAlign: "center" }}>
          <div style={{
            opacity: spr(frame, fps, 0, 200),
            fontFamily: "'Arial Black',Arial,sans-serif",
            fontSize: 58, fontWeight: 900, color: WHITE,
            textShadow: `0 0 40px ${GREEN}88`,
          }}>Walk in <span style={{ color: GREEN_LT }}>Control</span></div>
          <div style={{
            opacity: spr(frame, fps, 20, 200),
            fontFamily: "Arial,sans-serif", fontSize: 28,
            color: "rgba(255,255,255,0.75)", marginTop: 10,
          }}>The Miracle Leash stops pulling — no corrections needed</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── SCENE: CSS Outro ─────────────────────────────────────────────────────────
const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = T.OUTRO_E - T.OUTRO_S;
  const fadeOut = cl(frame, [len - 50, len - 5], [1, 0]);
  const p1 = spr(frame, fps, 5, 220);
  const p2 = spr(frame, fps, 20, 220);
  const p3 = spr(frame, fps, 40, 220);
  return (
    <AbsoluteFill style={{ background: BG_DARK, alignItems: "center", justifyContent: "center", opacity: fadeOut }}>
      <div style={{
        position: "absolute", width: 900, height: 900, borderRadius: "50%",
        background: `radial-gradient(circle, ${GREEN}28 0%, transparent 70%)`, opacity: p1,
      }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <div style={{
          opacity: p1, transform: `scale(${interpolate(p1, [0, 1], [0.86, 1])})`,
          background: WHITE, borderRadius: 16, padding: "24px 52px",
          display: "flex", alignItems: "center", gap: 22,
          boxShadow: `0 0 100px rgba(46,125,50,0.45), 0 12px 60px rgba(0,0,0,0.65)`,
        }}>
          <span style={{ fontSize: 74 }}>🐾</span>
          <div>
            <div style={{ fontFamily: "'Arial Black',Arial,sans-serif", fontSize: 74, fontWeight: 900, color: "#1a1a1a", lineHeight: 1 }}>Miracle</div>
            <div style={{ fontFamily: "'Arial Black',Arial,sans-serif", fontSize: 74, fontWeight: 900, color: GREEN, lineHeight: 1 }}>Leash</div>
          </div>
        </div>
        <div style={{
          opacity: p2,
          display: "flex", gap: 32, justifyContent: "center",
        }}>
          {["✓ Stops Pulling", "✓ Easy Clip-On", "✓ Any Leash"].map((t) => (
            <div key={t} style={{
              fontFamily: "Arial,sans-serif", fontSize: 26, color: GREEN_LT, fontWeight: 700,
            }}>{t}</div>
          ))}
        </div>
        <div style={{
          opacity: p3, transform: `translateY(${interpolate(p3, [0, 1], [18, 0])}px)`,
          background: GREEN, borderRadius: 60, padding: "16px 64px",
          fontFamily: "'Arial Black',Arial,sans-serif",
          fontSize: 32, fontWeight: 900, color: WHITE,
          letterSpacing: 3, textTransform: "uppercase",
          boxShadow: `0 0 60px ${GREEN}88`,
        }}>miracleleash.com</div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Root Composition ─────────────────────────────────────────────────────────
export const MiracleLeashV3: React.FC = () => (
  <AbsoluteFill>
    <Sequence from={T.INTRO_S}  durationInFrames={T.INTRO_E  - T.INTRO_S}>  <SceneIntro   /> </Sequence>
    <Sequence from={T.PROD_S}   durationInFrames={T.PROD_E   - T.PROD_S}>   <SceneProduct /> </Sequence>
    <Sequence from={T.ATT_S}    durationInFrames={T.ATT_E    - T.ATT_S}>    <SceneAttach  /> </Sequence>
    <Sequence from={T.S1_S}     durationInFrames={T.S1_E     - T.S1_S}>     <SceneStep1   /> </Sequence>
    <Sequence from={T.S2_S}     durationInFrames={T.S2_E     - T.S2_S}>     <SceneStep2   /> </Sequence>
    <Sequence from={T.WALK_S}   durationInFrames={T.WALK_E   - T.WALK_S}>   <SceneWalk    /> </Sequence>
    <Sequence from={T.OUTRO_S}  durationInFrames={T.OUTRO_E  - T.OUTRO_S}>  <SceneOutro   /> </Sequence>
  </AbsoluteFill>
);
