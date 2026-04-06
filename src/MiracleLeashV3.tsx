/**
 * MiracleLeashV3 — Professional 3D Animated Explainer (Complete Rebuild)
 *
 * Problems fixed from previous version:
 *  • Dog was floating blobs — rebuilt with proper anatomy + proportions
 *  • Leash was black on black — now bright orange, thick, glowing
 *  • Pitch-black environment — warm gradient BG + lit ground plane
 *  • Camera was looking down — now at eye-level, close to action
 *  • Product too small/dark — larger, fully lit, dramatic spin
 *  • Legs were sticks — 3-joint legs (hip→upper→knee→lower→paw)
 *
 * Structure:
 *  CSS Intro → 3D Product Spin → Step1 → Step2 → Step3 → Walk Demo → CSS Outro
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
  INTRO_S:   0,  INTRO_E:  75,   // 0–2.5s
  PROD_S:   75,  PROD_E:  210,   // 2.5–7s
  S1_S:    210,  S1_E:    360,   // 7–12s
  S2_S:    360,  S2_E:    510,   // 12–17s
  S3_S:    510,  S3_E:    630,   // 17–21s
  WALK_S:  630,  WALK_E:  780,   // 21–26s
  OUTRO_S: 780,  OUTRO_E: 960,   // 26–32s
};

// ─── Palette ─────────────────────────────────────────────────────────────────
const FUR       = "#D4A254";   // warm golden
const FUR_MID   = "#B8831E";   // medium gold
const FUR_DK    = "#7A5010";   // dark gold / shadows
const FUR_NOSE  = "#1a0e04";
const EYE_CLR   = "#1a1208";
const COLLAR_R  = "#e03030";
const LEASH_ORG = "#FF6B00";   // bright orange — clearly visible
const METAL_SLV = "#c8cfd8";
const LABEL_W   = "#f2f2f2";
const BRAND_GN  = "#2e7d32";
const BG_DARK   = "#07090f";
const GROUND_G  = "#0e1626";
const GRID_C    = "#1a2540";
const GOLD      = "#F5C842";
const WHITE     = "#ffffff";
const CYAN      = "#4FC3F7";
const AMBER     = "#FFA726";
const GREEN     = "#2e7d32";
const GREEN_LT  = "#66bb6a";
const SKY_T     = "#0e1830";   // top of BG gradient
const SKY_B     = "#1a2540";   // bottom of BG gradient

// ─── Helpers ─────────────────────────────────────────────────────────────────
const spr = (f: number, fps: number, delay = 0, damp = 180) =>
  spring({ frame: f - delay, fps, config: { damping: damp } });

const cl = (f: number, i: [number,number], o: [number,number], ease?: (t: number) => number) =>
  interpolate(f, i, o, {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
    easing: ease ?? Easing.inOut(Easing.cubic),
  });

// ─── Camera helper ────────────────────────────────────────────────────────────
const camAt = (kfs: number[][], frame: number) => {
  let a = kfs[0], b = kfs[kfs.length - 1];
  for (let i = 0; i < kfs.length - 1; i++) {
    if (frame >= kfs[i][0] && frame <= kfs[i+1][0]) { a = kfs[i]; b = kfs[i+1]; break; }
  }
  const t = a[0] === b[0] ? 1 : Easing.inOut(Easing.quad)(
    Math.min(1, Math.max(0, (frame - a[0]) / (b[0] - a[0])))
  );
  const lp = (ai: number) => a[ai] + (b[ai] - a[ai]) * t;
  return { pos:[lp(1),lp(2),lp(3)] as [number,number,number], look:[lp(4),lp(5),lp(6)] as [number,number,number] };
};

const Cam: React.FC<{ frame: number; kfs: number[][]; sx?: number; sy?: number }> = ({ frame, kfs, sx=0, sy=0 }) => {
  const { camera } = useThree();
  const { pos, look } = camAt(kfs, frame);
  camera.position.set(pos[0]+sx, pos[1]+sy, pos[2]);
  camera.lookAt(...look);
  return null;
};

// ─── 3D: Full Dog ─────────────────────────────────────────────────────────────
interface DogProps {
  walkPhase?: number;
  pullStretch?: number;
  chestGlow?: number;
  collarPulse?: number;
  tailWag?: number;
}

const Dog3D: React.FC<DogProps> = ({
  walkPhase = 0, pullStretch = 0, chestGlow = 0, collarPulse = 0, tailWag = 0,
}) => {
  // Lift entire dog so paws sit on ground (ground at y=-1.68)
  const DOG_Y = 0.35;
  // Leg swing angles
  const sw = (i: number) => Math.sin(walkPhase * Math.PI * 2 + i * Math.PI * 0.5) * 0.42;
  // Tail wag
  const tw = Math.sin(tailWag * Math.PI * 2) * 0.55;

  const mFur = <meshStandardMaterial color={FUR} roughness={0.88} metalness={0} />;
  const mFurMid = <meshStandardMaterial color={FUR_MID} roughness={0.9} metalness={0} />;
  const mFurDk = <meshStandardMaterial color={FUR_DK} roughness={0.92} metalness={0} />;

  // A helper for a 3-joint leg
  const Leg: React.FC<{
    hip: [number,number,number];
    sw: number;
    sz?: number;  // z-offset (left vs right)
  }> = ({ hip, sw: swing, sz = 0 }) => (
    <group position={hip} rotation={[swing, 0, 0]}>
      {/* upper leg */}
      <mesh position={[0, -0.28, 0]}>
        <cylinderGeometry args={[0.17, 0.14, 0.56, 14]} />
        {mFur}
      </mesh>
      {/* knee joint */}
      <mesh position={[0, -0.58, 0]}>
        <sphereGeometry args={[0.155, 12, 10]} />
        {mFurMid}
      </mesh>
      {/* lower leg */}
      <group position={[0, -0.58, 0]} rotation={[swing * -0.5, 0, 0]}>
        <mesh position={[0, -0.24, 0]}>
          <cylinderGeometry args={[0.14, 0.11, 0.48, 12]} />
          {mFurMid}
        </mesh>
        {/* paw */}
        <mesh position={[0.06, -0.52, 0]}>
          <sphereGeometry args={[0.16, 12, 10]} />
          <meshStandardMaterial color={FUR_DK} roughness={0.95} />
        </mesh>
        {/* paw pad toe bumps */}
        {[-0.08, 0, 0.08].map((tz, pi) => (
          <mesh key={pi} position={[0.14, -0.52, tz]}>
            <sphereGeometry args={[0.06, 8, 6]} />
            <meshStandardMaterial color={FUR_DK} roughness={0.95} />
          </mesh>
        ))}
      </group>
    </group>
  );

  return (
    <group position={[0, DOG_Y, 0]}>
      {/* ── Main body ── */}
      <group scale={[1 + pullStretch * 0.1, 1 - pullStretch * 0.03, 1]}>
        {/* torso */}
        <mesh position={[0, 0, 0]} scale={[1.45, 1.0, 1.05]}>
          <sphereGeometry args={[1, 28, 20]} />
          {mFur}
        </mesh>
        {/* chest bump (front) */}
        <mesh position={[0.7, -0.2, 0]} scale={[0.95, 0.82, 0.9]}>
          <sphereGeometry args={[0.82, 22, 16]} />
          {mFur}
        </mesh>
        {/* rump bump (back) */}
        <mesh position={[-0.72, 0.05, 0]} scale={[0.88, 0.82, 0.92]}>
          <sphereGeometry args={[0.82, 20, 15]} />
          {mFur}
        </mesh>
        {/* belly underside */}
        <mesh position={[0, -0.72, 0]} scale={[0.85, 0.5, 0.82]}>
          <sphereGeometry args={[0.82, 18, 14]} />
          {mFurMid}
        </mesh>
      </group>

      {/* ── Chest glow (pull moment) ── */}
      {chestGlow > 0 && (
        <mesh position={[0.5, -0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.85, 0.07, 12, 48]} />
          <meshStandardMaterial
            color={AMBER} emissive={AMBER}
            emissiveIntensity={chestGlow * 4}
            transparent opacity={chestGlow * 0.85}
          />
        </mesh>
      )}

      {/* ── Neck ── */}
      <mesh position={[1.0, 0.28, 0]} rotation={[0, 0, -0.55]}>
        <cylinderGeometry args={[0.4, 0.5, 0.65, 16]} />
        {mFur}
      </mesh>
      <mesh position={[1.32, 0.58, 0]} rotation={[0, 0, -0.32]}>
        <cylinderGeometry args={[0.34, 0.42, 0.52, 14]} />
        {mFur}
      </mesh>

      {/* ── Head ── */}
      {/* main skull */}
      <mesh position={[1.72, 1.0, 0]} scale={[0.75, 0.7, 0.68]}>
        <sphereGeometry args={[1, 24, 18]} />
        {mFur}
      </mesh>
      {/* forehead dome */}
      <mesh position={[1.62, 1.26, 0]} scale={[0.62, 0.48, 0.56]}>
        <sphereGeometry args={[1, 18, 14]} />
        {mFur}
      </mesh>
      {/* cheeks */}
      <mesh position={[1.88, 0.94, 0.44]} scale={[0.38, 0.33, 0.3]}>
        <sphereGeometry args={[1, 14, 10]} />
        {mFur}
      </mesh>
      <mesh position={[1.88, 0.94, -0.44]} scale={[0.38, 0.33, 0.3]}>
        <sphereGeometry args={[1, 14, 10]} />
        {mFur}
      </mesh>
      {/* muzzle */}
      <mesh position={[2.22, 0.88, 0]} scale={[0.52, 0.4, 0.44]}>
        <sphereGeometry args={[1, 16, 12]} />
        {mFurMid}
      </mesh>
      {/* lower jaw */}
      <mesh position={[2.16, 0.74, 0]} scale={[0.45, 0.3, 0.4]}>
        <sphereGeometry args={[1, 14, 10]} />
        {mFurDk}
      </mesh>
      {/* nose */}
      <mesh position={[2.48, 0.93, 0]} scale={[0.13, 0.1, 0.13]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color={FUR_NOSE} roughness={0.5} />
      </mesh>

      {/* Eyes — large + expressive */}
      {[1, -1].map((side, ei) => (
        <group key={ei} position={[2.1, 1.08, side * 0.36]}>
          {/* whites/dark iris */}
          <mesh>
            <sphereGeometry args={[0.135, 14, 10]} />
            <meshStandardMaterial color={EYE_CLR} roughness={0.3} metalness={0.2} />
          </mesh>
          {/* pupil */}
          <mesh position={[0.085, 0, 0]}>
            <sphereGeometry args={[0.075, 10, 8]} />
            <meshStandardMaterial color="#050302" roughness={0.2} metalness={0.4} />
          </mesh>
          {/* catchlight */}
          <mesh position={[0.12, 0.05, 0.04]}>
            <sphereGeometry args={[0.03, 6, 5]} />
            <meshStandardMaterial color={WHITE} roughness={0.1} />
          </mesh>
        </group>
      ))}

      {/* Brows (darker fur ridge) */}
      {[0.38, -0.38].map((bz, bi) => (
        <mesh key={bi} position={[2.08, 1.2, bz]} rotation={[0.1, 0, bi === 0 ? 0.2 : -0.2]}>
          <boxGeometry args={[0.22, 0.06, 0.14]} />
          {mFurDk}
        </mesh>
      ))}

      {/* Ears — drooping, 4 spheres each side */}
      {[1, -1].map((side, si) => (
        <group key={si} position={[1.6, 1.18, side * 0.52]}>
          <mesh scale={[0.28, 0.24, 0.18]}>
            <sphereGeometry args={[1, 12, 10]} />
            {mFurDk}
          </mesh>
          <mesh position={[0, -0.22, side * 0.06]} scale={[0.22, 0.28, 0.16]}>
            <sphereGeometry args={[1, 10, 8]} />
            {mFurDk}
          </mesh>
          <mesh position={[-0.02, -0.46, side * 0.08]} scale={[0.18, 0.26, 0.14]}>
            <sphereGeometry args={[1, 10, 8]} />
            {mFurDk}
          </mesh>
          <mesh position={[-0.04, -0.68, side * 0.06]} scale={[0.14, 0.2, 0.12]}>
            <sphereGeometry args={[1, 8, 6]} />
            {mFurDk}
          </mesh>
        </group>
      ))}

      {/* ── Collar ── */}
      <group position={[1.18, 0.3, 0]} rotation={[0, 0, 0.52]}>
        <mesh>
          <torusGeometry args={[0.5, 0.08, 14, 48]} />
          <meshStandardMaterial
            color={collarPulse > 0 ? "#ff5252" : COLLAR_R}
            roughness={0.5}
            emissive={COLLAR_R}
            emissiveIntensity={0.15 + collarPulse * 1.5}
          />
        </mesh>
        {/* D-ring */}
        <mesh position={[0, -0.52, 0]}>
          <torusGeometry args={[0.13, 0.03, 10, 28]} />
          <meshStandardMaterial color={METAL_SLV} metalness={0.95} roughness={0.1} />
        </mesh>
      </group>

      {/* ── Legs — 4 articulated ── */}
      {/* Front right */}
      <Leg hip={[0.72, -0.88, 0.42]} sw={sw(0)} />
      {/* Front left */}
      <Leg hip={[0.72, -0.88, -0.42]} sw={sw(2)} />
      {/* Back right */}
      <Leg hip={[-0.72, -0.88, 0.42]} sw={sw(1)} />
      {/* Back left */}
      <Leg hip={[-0.72, -0.88, -0.42]} sw={sw(3)} />

      {/* ── Tail — 4 segments ── */}
      <group position={[-1.1, 0.18, 0]} rotation={[0, 0, tw + 0.5]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.14, 0.18, 0.6, 12]} />
          {mFurDk}
        </mesh>
        <group position={[0, 0.62, 0]} rotation={[0, 0, tw * 0.4 + 0.4]}>
          <mesh position={[0, 0.25, 0]}>
            <cylinderGeometry args={[0.1, 0.13, 0.5, 10]} />
            {mFurDk}
          </mesh>
          <group position={[0, 0.52, 0]} rotation={[0, 0, 0.3]}>
            <mesh position={[0, 0.18, 0]}>
              <cylinderGeometry args={[0.07, 0.1, 0.36, 8]} />
              {mFurMid}
            </mesh>
            <mesh position={[0, 0.38, 0]}>
              <sphereGeometry args={[0.09, 8, 6]} />
              {mFurMid}
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};

// ─── 3D: Product ─────────────────────────────────────────────────────────────
interface ProdProps {
  position?: [number,number,number];
  rotation?: [number,number,number];
  scale?: number;
  glowSnap?: number;
  glowCarab?: number;
}

const Product3D: React.FC<ProdProps> = ({
  position=[0,0,0], rotation=[0,0,0], scale=1,
  glowSnap=0, glowCarab=0,
}) => (
  <group position={position} rotation={rotation} scale={[scale,scale,scale]}>
    {/* ── Nylon strap ── */}
    <mesh>
      <boxGeometry args={[2.6, 0.16, 0.48]} />
      <meshStandardMaterial color="#2a2a2a" roughness={0.75} />
    </mesh>
    {/* nylon weave ridges */}
    {Array.from({length: 10}, (_,i) => i*0.26 - 1.17).map((x,i) => (
      <mesh key={i} position={[x, 0, 0]}>
        <boxGeometry args={[0.05, 0.17, 0.5]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.8} />
      </mesh>
    ))}

    {/* ── White label (center) ── */}
    <mesh position={[0, 0.09, 0]}>
      <boxGeometry args={[1.0, 0.05, 0.44]} />
      <meshStandardMaterial color={LABEL_W} roughness={0.65} />
    </mesh>
    {/* paw icon */}
    <mesh position={[-0.28, 0.125, 0]}>
      <sphereGeometry args={[0.1, 8, 6]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
    </mesh>
    {[-0.38,-0.24,-0.1].map((pz,i) => (
      <mesh key={i} position={[-0.2, 0.125, pz - 0.04]}>
        <sphereGeometry args={[0.055, 6, 5]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
    ))}
    {/* "Miracle" bar */}
    <mesh position={[0.12, 0.125, 0.06]}>
      <boxGeometry args={[0.44, 0.04, 0.12]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
    </mesh>
    {/* "Leash" bar — green */}
    <mesh position={[0.12, 0.125, -0.1]}>
      <boxGeometry args={[0.38, 0.04, 0.1]} />
      <meshStandardMaterial color={BRAND_GN} roughness={0.7} />
    </mesh>

    {/* ── Snap Hook (left) ── */}
    <group position={[-1.52, 0, 0]}>
      {/* body */}
      <mesh>
        <boxGeometry args={[0.26, 0.38, 0.3]} />
        <meshStandardMaterial
          color={METAL_SLV} metalness={0.92} roughness={0.08}
          emissive={glowSnap > 0 ? GOLD : "#000"}
          emissiveIntensity={glowSnap * 2.5}
        />
      </mesh>
      {/* ring arch */}
      <mesh position={[0, 0.32, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.18, 0.048, 10, 24, Math.PI]} />
        <meshStandardMaterial color={METAL_SLV} metalness={0.92} roughness={0.08} />
      </mesh>
      {/* spring lever */}
      <mesh position={[-0.16, 0, 0]}>
        <boxGeometry args={[0.06, 0.34, 0.08]} />
        <meshStandardMaterial color="#aab0b8" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* shine stripe */}
      <mesh position={[0.08, 0, 0]}>
        <boxGeometry args={[0.04, 0.32, 0.08]} />
        <meshStandardMaterial color="rgba(255,255,255,0.3)" metalness={0.9} roughness={0} transparent opacity={0.35} />
      </mesh>
    </group>

    {/* ── D-ring Carabiner (right) ── */}
    <group position={[1.52, 0, 0]}>
      {/* outer arch */}
      <mesh rotation={[0, 0, -Math.PI * 0.12]}>
        <torusGeometry args={[0.25, 0.065, 10, 36, Math.PI * 1.76]} />
        <meshStandardMaterial
          color="#1e1e1e" metalness={0.55} roughness={0.28}
          emissive={glowCarab > 0 ? CYAN : "#000"}
          emissiveIntensity={glowCarab * 2}
        />
      </mesh>
      {/* bottom bar */}
      <mesh position={[0, -0.24, 0]}>
        <boxGeometry args={[0.5, 0.11, 0.11]} />
        <meshStandardMaterial color="#181818" metalness={0.55} roughness={0.28} />
      </mesh>
      {/* gate */}
      <mesh position={[0.27, 0.04, 0]}>
        <boxGeometry args={[0.11, 0.46, 0.09]} />
        <meshStandardMaterial
          color={glowCarab > 0 ? CYAN : METAL_SLV}
          metalness={0.85} roughness={0.12}
          emissive={glowCarab > 0 ? CYAN : "#000"}
          emissiveIntensity={glowCarab * 1.8}
        />
      </mesh>
    </group>
  </group>
);

// ─── 3D: Leash Tube (bright orange, clearly visible) ─────────────────────────
const LeashTube: React.FC<{ progress: number; tension?: number }> = ({ progress, tension=0 }) => {
  // Positions adjusted for dog lifted by 0.35 units
  const curve = React.useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3( 3.0,  5.5,  0.0),  // owner hand — top right
    new THREE.Vector3( 2.6,  3.2,  0.2),
    new THREE.Vector3( 1.9,  1.5,  0.0),  // near neck
    new THREE.Vector3( 1.5,  0.35, 0.9),  // down right chest
    new THREE.Vector3( 0.6, -1.1,  1.1),  // under belly right
    new THREE.Vector3(-0.2, -1.3,  0.0),  // under belly center
    new THREE.Vector3( 0.6, -1.1, -1.1),  // under belly left
    new THREE.Vector3( 1.5,  0.35,-0.9),  // up left chest
    new THREE.Vector3( 1.6,  0.8, -0.6),  // toward carabiner
  ]), []);

  const allPts = curve.getPoints(80);
  const count = Math.max(2, Math.floor(progress * allPts.length));
  const visPts = allPts.slice(0, count);

  const visCurve = React.useMemo(
    () => new THREE.CatmullRomCurve3(visPts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count]
  );

  if (visPts.length < 2) return null;

  return (
    <mesh>
      <tubeGeometry args={[visCurve, 50, 0.07 + tension * 0.025, 10, false]} />
      <meshStandardMaterial
        color={LEASH_ORG}
        roughness={0.6}
        emissive={LEASH_ORG}
        emissiveIntensity={0.25 + tension * 0.8}
      />
    </mesh>
  );
};

// ─── 3D: Ground + Grid ───────────────────────────────────────────────────────
const Ground3D: React.FC<{ scrollZ?: number }> = ({ scrollZ=0 }) => (
  <>
    {/* floor plane */}
    <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -1.68, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color={GROUND_G} roughness={1} metalness={0} />
    </mesh>
    {/* grid lines */}
    {[-5,-4,-3,-2,-1,0,1,2,3,4,5].map(i => (
      <React.Fragment key={i}>
        <mesh position={[i * 1.5, -1.67, (scrollZ % 1.5) - 9]}>
          <boxGeometry args={[0.016, 0.01, 30]} />
          <meshStandardMaterial color={GRID_C} />
        </mesh>
        <mesh position={[0, -1.67, (i * 1.5 + scrollZ) % 16.5 - 8]}>
          <boxGeometry args={[30, 0.01, 0.016]} />
          <meshStandardMaterial color={GRID_C} />
        </mesh>
      </React.Fragment>
    ))}
  </>
);

// ─── Lighting setups ─────────────────────────────────────────────────────────
const LightsProduct: React.FC = () => (
  <>
    <ambientLight intensity={0.6} color="#e0e8ff" />
    <directionalLight position={[3, 6, 8]} intensity={3.0} color="#ffffff" />
    <pointLight position={[-3, 2, 5]} intensity={1.4} color={GOLD} />
    <pointLight position={[3, 1, 5]} intensity={1.2} color="#ffffff" />   {/* front fill */}
    <pointLight position={[0, -2, 6]} intensity={0.8} color={CYAN} />
    <pointLight position={[-4, 4, -2]} intensity={0.8} color="#b0c0ff" /> {/* rim left */}
    <pointLight position={[4, 4, -2]} intensity={0.8} color="#ffeecc" />  {/* rim right */}
  </>
);

const LightsDog: React.FC<{ accent?: string }> = ({ accent = "#ffffff" }) => (
  <>
    <ambientLight intensity={0.55} color="#c8d8ff" />
    {/* Key light — front top */}
    <directionalLight position={[3, 6, 8]} intensity={2.2} color="#fff8e0" />
    {/* Fill — left */}
    <pointLight position={[-5, 2, 4]} intensity={0.8} color="#c0d8ff" />
    {/* Strong rim — behind dog, separates golden fur from dark BG */}
    <pointLight position={[-2, 3, -7]} intensity={2.0} color="#e8f4ff" />
    <pointLight position={[2, 3, -7]} intensity={1.5} color="#ffe8d0" />
    {/* Accent */}
    <pointLight position={[4, 0, 3]} intensity={0.8} color={accent} />
    {/* Under-fill so legs aren't pitch black */}
    <pointLight position={[0, -3, 4]} intensity={0.5} color="#8888ff" />
  </>
);

// ─── BG gradient component ────────────────────────────────────────────────────
const GradBG: React.FC = () => (
  <AbsoluteFill style={{
    background: `linear-gradient(170deg, ${SKY_T} 0%, ${SKY_B} 100%)`,
  }} />
);

// ─── Step overlay ─────────────────────────────────────────────────────────────
const StepOverlay: React.FC<{
  frame: number; fps: number;
  num: number; title: string; body: string;
  color?: string; topNote?: string;
}> = ({ frame, fps, num, title, body, color=GOLD, topNote }) => {
  const p = spr(frame, fps, 0, 200);
  return (
    <>
      {topNote && (
        <div style={{
          position: "absolute", top: 90, left: 50, right: 50,
          opacity: cl(frame, [50, 80], [0, 1]),
          background: "rgba(0,0,0,0.72)", border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 16, padding: "14px 24px", textAlign: "center",
          fontFamily: "Arial, sans-serif", fontSize: 22,
          color: "rgba(255,255,255,0.82)", lineHeight: 1.5,
        }}>
          {topNote}
        </div>
      )}
      <AbsoluteFill style={{
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        alignItems: "center", padding: "0 64px 100px", gap: 14, pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 500,
          background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 50%, transparent 100%)",
        }} />
        <div style={{
          position: "relative",
          opacity: p, transform: `translateY(${interpolate(p,[0,1],[40,0])}px)`,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
        }}>
          <div style={{
            background: color, borderRadius: 50, padding: "7px 32px",
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 22, fontWeight: 900, color: BG_DARK, letterSpacing: 3,
            boxShadow: `0 0 28px ${color}99`,
          }}>STEP {num}</div>
          <div style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: 62, fontWeight: 900, color: WHITE, textAlign: "center",
            lineHeight: 1.05, textShadow: `0 0 45px ${color}77`,
          }}>{title}</div>
          <div style={{
            fontFamily: "Arial, sans-serif", fontSize: 30,
            color: "rgba(255,255,255,0.82)", textAlign: "center",
            lineHeight: 1.5, maxWidth: 860,
          }}>{body}</div>
        </div>
      </AbsoluteFill>
    </>
  );
};

// ─── Progress bar ─────────────────────────────────────────────────────────────
const ProgressBar: React.FC<{ step: number }> = ({ step }) => (
  <div style={{
    position: "absolute", top: 0, left: 0, right: 0, height: 5,
    display: "flex",
  }}>
    {[1,2,3,4].map(s => (
      <div key={s} style={{
        flex: 1, height: "100%",
        background: s <= step
          ? [GOLD, AMBER, CYAN, GREEN_LT][s-1]
          : "rgba(255,255,255,0.08)",
        borderRight: "1px solid rgba(0,0,0,0.3)",
        boxShadow: s === step ? `0 0 10px ${[GOLD, AMBER, CYAN, GREEN_LT][s-1]}` : "none",
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
    <AbsoluteFill style={{ background: BG_DARK, alignItems:"center", justifyContent:"center" }}>
      <div style={{
        position:"absolute", width:800, height:800, borderRadius:"50%",
        background:`radial-gradient(circle, ${GREEN}1e 0%, transparent 70%)`, opacity:p1,
      }} />
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:22 }}>
        <div style={{
          opacity:p1, transform:`translateY(${interpolate(p1,[0,1],[28,0])}px)`,
          fontFamily:"Arial, sans-serif", fontSize:30, color:"rgba(255,255,255,0.62)",
          letterSpacing:8, textTransform:"uppercase",
        }}>Introducing</div>

        <div style={{
          opacity:p2, transform:`scale(${interpolate(p2,[0,1],[0.87,1])})`,
          background:WHITE, borderRadius:16, padding:"26px 54px",
          display:"flex", alignItems:"center", gap:22,
          boxShadow:`0 0 90px rgba(46,125,50,0.4), 0 10px 50px rgba(0,0,0,0.6)`,
          minWidth:680,
        }}>
          <span style={{fontSize:82}}>🐾</span>
          <div>
            <div style={{
              fontFamily:"'Arial Black', Arial, sans-serif",
              fontSize:82, fontWeight:900, color:"#1a1a1a", lineHeight:1,
            }}>Miracle</div>
            <div style={{
              fontFamily:"'Arial Black', Arial, sans-serif",
              fontSize:82, fontWeight:900, color:GREEN, lineHeight:1,
            }}>Leash</div>
          </div>
        </div>

        <div style={{
          opacity:p2,
          background:"#1a1a1a", padding:"9px 34px", borderRadius:6,
          fontFamily:"'Arial Black', Arial, sans-serif",
          fontSize:26, fontWeight:900, color:WHITE,
          letterSpacing:4, textTransform:"uppercase",
          transform:`scale(${interpolate(p2,[0,1],[0.92,1])})`,
        }}>Take Back Control</div>

        <div style={{
          opacity:p3, transform:`translateY(${interpolate(p3,[0,1],[16,0])}px)`,
          fontFamily:"Arial, sans-serif", fontSize:28,
          color:"rgba(255,255,255,0.62)", textAlign:"center",
        }}>Stops pulling — no harsh corrections needed</div>
      </div>
    </AbsoluteFill>
  );
};

// ─── SCENE: 3D Product Showcase ───────────────────────────────────────────────
const PROD_KFS: number[][] = [
  [  0,  0.0, 0.2, 3.4,   0.0, 0.0, 0],
  [ 50,  2.0, 0.5, 2.8,   0.0, 0.0, 0],
  [100, -2.0, 0.2, 3.0,   0.0, 0.0, 0],
  [135,  0.0, 0.8, 2.6,   0.0, 0.0, 0],
];

const SceneProduct: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const rotY = frame * 0.018;
  const p = spr(frame, fps, 0, 200);

  return (
    <AbsoluteFill>
      <GradBG />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <LightsProduct />
        <Sequence layout="none">
          <Cam frame={frame} kfs={PROD_KFS} />
          <group rotation={[0.22, rotY, 0.05]} scale={[1.25, 1.25, 1.25]}>
            <Product3D />
          </group>
        </Sequence>
      </ThreeCanvas>

      <AbsoluteFill style={{
        display:"flex", flexDirection:"column",
        justifyContent:"flex-end", alignItems:"center",
        padding:"0 64px 110px", gap:14, pointerEvents:"none",
      }}>
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:500,
          background:"linear-gradient(to top, rgba(7,9,15,0.95) 0%, transparent 100%)",
        }} />
        <div style={{ position:"relative", textAlign:"center" }}>
          <div style={{
            opacity:p, transform:`translateY(${interpolate(p,[0,1],[30,0])}px)`,
            fontFamily:"'Arial Black', Arial, sans-serif",
            fontSize:64, fontWeight:900, color:WHITE,
            textShadow:`0 0 50px ${GOLD}88`,
          }}>
            The <span style={{color:GOLD}}>Miracle Leash</span>
          </div>
          <div style={{
            opacity:spr(frame,fps,22,200),
            transform:`translateY(${interpolate(spr(frame,fps,22,200),[0,1],[18,0])}px)`,
            fontFamily:"Arial, sans-serif", fontSize:30,
            color:"rgba(255,255,255,0.72)", marginTop:12,
          }}>Snap Hook · Nylon Strap · D-Ring Carabiner</div>
          <div style={{
            display:"flex", gap:20, justifyContent:"center", marginTop:18,
            opacity:spr(frame,fps,40,200),
          }}>
            {[["SNAP HOOK",GOLD,"Clips to collar"],["STRAP",WHITE,"Nylon · Durable"],["D-RING",CYAN,"Clips to leash"]].map(([l,c,s])=>(
              <div key={l} style={{
                background:"rgba(255,255,255,0.06)", border:`1px solid ${c}44`,
                borderRadius:12, padding:"10px 20px", textAlign:"center",
              }}>
                <div style={{fontFamily:"'Arial Black',Arial,sans-serif",fontSize:20,fontWeight:900,color:c as string}}>{l}</div>
                <div style={{fontFamily:"Arial,sans-serif",fontSize:16,color:"rgba(255,255,255,0.5)"}}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── SCENE: Step 1 — Snap hook clips to collar ────────────────────────────────
// Eye-level angles: Y≈1.0 (dog eye height), looking at collar area
const S1_KFS: number[][] = [
  [  0,  5.0, 1.2, 5.0,   1.5, 0.7,  0],   // front-right wide
  [ 40,  3.0, 1.0, 4.5,   1.5, 0.7,  0],   // approach
  [ 80,  1.5, 1.1, 3.5,   1.3, 0.65, 0],   // medium close
  [120,  0.6, 1.2, 2.8,   1.3, 0.65, 0],   // close-up collar
  [150,  2.0, 1.0, 4.0,   1.3, 0.7,  0],   // pull back
];

const SceneStep1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Product arcs in from top-right and snaps to collar position
  const flyP = cl(frame, [15, 80], [0, 1]);
  const px = interpolate(flyP, [0,1], [3.8, 1.15]);
  const py = interpolate(flyP, [0,1], [3.5, 0.12]);
  const pz = interpolate(flyP, [0,1], [2.5, 0.0]);
  const pscale = interpolate(flyP, [0,0.2,1], [0.35, 0.4, 0.4]);
  const pRotX = interpolate(flyP, [0,1], [0.5, -Math.PI/2 + 0.12]);
  const snapFlash = interpolate(frame, [82,87,102], [0,1,0], {extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  const collarP = cl(frame, [82, 140], [0, 1]);
  // bounce overshoot at snap moment
  const snapBounce = spr(frame, fps, 82, 60) - spr(frame, fps, 82, 200);

  return (
    <AbsoluteFill>
      <GradBG />
      {snapFlash > 0 && (
        <AbsoluteFill style={{background:`rgba(245,200,66,${snapFlash*0.32})`,pointerEvents:"none"}} />
      )}
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <LightsDog accent={GOLD} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={S1_KFS} />
          <Dog3D collarPulse={collarP} />
          <Ground3D />
          {/* Flying product */}
          <Product3D
            position={[px + snapBounce * 0.08, py, pz]}
            rotation={[pRotX, 0, 0]}
            scale={pscale}
            glowSnap={cl(frame,[70,90],[0,1])}
          />
          {/* Snap flash burst */}
          {snapFlash > 0 && (
            <mesh position={[1.18, 0.15, 0]}>
              <sphereGeometry args={[snapFlash * 0.35, 10, 8]} />
              <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={5} transparent opacity={snapFlash*0.7} />
            </mesh>
          )}
        </Sequence>
      </ThreeCanvas>
      <ProgressBar step={1} />
      <StepOverlay frame={frame} fps={fps} num={1}
        title="Clip to Collar"
        body="Attach the snap hook to your dog's collar D-ring"
        color={GOLD} />
    </AbsoluteFill>
  );
};

// ─── SCENE: Step 2 — Leash wraps around chest ────────────────────────────────
// Camera shows side-left angle to see the chest wrap path clearly
// Step 2: Camera in FRONT of dog to see the chest wrap clearly
const S2_KFS: number[][] = [
  [  0,  5.5, 0.8, 6.0,   0.5, 0.2,  0],   // front-right, low, see chest
  [ 50,  4.0, 0.5, 5.5,   0.5, 0.0,  0],
  [100,  2.5, 0.4, 7.0,   0.3,-0.1,  0],   // slightly wider to see wrap
  [150,  0.0, 2.0, 8.5,   0.3, 0.0,  0],   // wide final view
];

const SceneStep2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const wrapP = cl(frame, [20, 125], [0, 1]);
  const tension = cl(frame, [128, 150], [0, 0.3]);
  // Leash from hand (straight) before wrapping

  return (
    <AbsoluteFill>
      <GradBG />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <LightsDog accent={AMBER} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={S2_KFS} />
          <Dog3D chestGlow={tension} />
          {/* Product attached at collar */}
          <Product3D position={[1.15, 0.12, 0]} rotation={[-Math.PI/2+0.12,0,0]} scale={0.4} />
          {/* Leash wrapping */}
          <LeashTube progress={wrapP} tension={tension} />
          <Ground3D />
        </Sequence>
      </ThreeCanvas>
      <ProgressBar step={2} />
      <StepOverlay frame={frame} fps={fps} num={2}
        title="Wrap the Leash"
        body="Thread your leash under and around your dog's chest"
        color={AMBER}
        topNote="💡 Dogs respond better to chest pressure than neck pressure"
      />
    </AbsoluteFill>
  );
};

// ─── SCENE: Step 3 — Carabiner clips to leash ────────────────────────────────
const S3_KFS: number[][] = [
  [  0,  4.0, 0.9, 5.5,   1.0, 0.4,  0],   // front-right eye level
  [ 50,  3.5, 0.8, 5.0,   1.2, 0.3, -0.5],
  [100,  2.0, 0.7, 4.5,   1.2, 0.2, -0.6],
];

const SceneStep3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const carabP = cl(frame, [18, 85], [0, 1]);
  const snapFlash = interpolate(frame, [85,90,108], [0,1,0], {extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  // Carabiner travels from off-frame to leash clip point
  const cx = interpolate(carabP, [0,1], [3.5, 1.6]);
  const cy = interpolate(carabP, [0,1], [3.2, 0.8]);
  const cz = interpolate(carabP, [0,1], [-2.5, -0.6]);

  return (
    <AbsoluteFill>
      <GradBG />
      {snapFlash > 0 && (
        <AbsoluteFill style={{background:`rgba(79,195,247,${snapFlash*0.28})`,pointerEvents:"none"}} />
      )}
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <LightsDog accent={CYAN} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={S3_KFS} />
          <Dog3D />
          <Product3D position={[1.15, 0.12, 0]} rotation={[-Math.PI/2+0.12,0,0]} scale={0.4} />
          <LeashTube progress={1} tension={0} />
          {/* Carabiner moving to clip point */}
          <group position={[cx, cy, cz]}>
            <mesh rotation={[0,0,-Math.PI*0.12]}>
              <torusGeometry args={[0.25, 0.065, 10, 36, Math.PI*1.76]} />
              <meshStandardMaterial
                color="#1e1e1e" metalness={0.55} roughness={0.28}
                emissive={CYAN} emissiveIntensity={carabP * 2.5}
              />
            </mesh>
            <mesh position={[0,-0.24,0]}>
              <boxGeometry args={[0.5,0.11,0.11]} />
              <meshStandardMaterial color="#181818" metalness={0.55} roughness={0.28} />
            </mesh>
            <mesh position={[0.27,0.04,0]}>
              <boxGeometry args={[0.11,0.46,0.09]} />
              <meshStandardMaterial color={CYAN} metalness={0.85} roughness={0.12} emissive={CYAN} emissiveIntensity={carabP*2} />
            </mesh>
          </group>
          {snapFlash > 0 && (
            <mesh position={[1.5, 0.5, -0.6]}>
              <sphereGeometry args={[snapFlash*0.3, 10, 8]} />
              <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={5} transparent opacity={snapFlash*0.8} />
            </mesh>
          )}
          <Ground3D />
        </Sequence>
      </ThreeCanvas>

      {/* Callout */}
      <div style={{
        position:"absolute", top:100, right:50,
        opacity: cl(frame,[95,125],[0,1]),
        background:"rgba(79,195,247,0.1)", border:`1px solid ${CYAN}55`,
        borderRadius:14, padding:"14px 22px", maxWidth:340,
      }}>
        <div style={{fontFamily:"'Arial Black',Arial,sans-serif",fontSize:20,fontWeight:900,color:CYAN,marginBottom:4}}>
          LOCKS THE CHEST LOOP
        </div>
        <div style={{fontFamily:"Arial,sans-serif",fontSize:18,color:"rgba(255,255,255,0.72)",lineHeight:1.45}}>
          The carabiner holds the leash wrap in place — setup is now complete
        </div>
      </div>

      <ProgressBar step={3} />
      <StepOverlay frame={frame} fps={fps} num={3}
        title="Clip to Leash"
        body="Fasten the D-ring carabiner onto your leash — done!"
        color={CYAN} />
    </AbsoluteFill>
  );
};

// ─── SCENE: Walk Demo ─────────────────────────────────────────────────────────
const WALK_KFS: number[][] = [
  [  0,  2.5, 0.6, 8.5,   0.0, 0.2,  0],  // side low view
  [ 35,  4.5, 0.5, 7.0,   0.0, 0.2,  0],  // pull — tracking from right
  [ 75,  0.5, 0.4, 9.5,   0.0, 0.1,  0],  // wide, low relaxed
  [120, -4.0, 0.7, 7.0,   0.0, 0.2,  0],  // other side
  [160,  1.5, 0.8, 8.0,   0.0, 0.3,  0],  // settle
];

const SceneWalk: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const walkPhase = frame * 0.048;
  const pullP = cl(frame, [30, 72], [0, 1]);
  const calmP = cl(frame, [82, 115], [0, 1]);
  const chestGlow = Math.max(0, pullP * (1 - calmP));
  const tension = chestGlow * 0.65;
  const stretch = chestGlow * 0.12;
  const dogDrift = cl(frame, [30, 75], [0, 0.7]) - cl(frame, [82, 115], [0, 0.7]);
  const shakeX = chestGlow * Math.sin(frame * 19.7) * 0.045;
  const shakeY = chestGlow * Math.sin(frame * 13.1) * 0.028;

  return (
    <AbsoluteFill>
      <GradBG />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <LightsDog accent={chestGlow > 0 ? AMBER : GREEN_LT} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={WALK_KFS} sx={shakeX} sy={shakeY} />
          <group position={[dogDrift, 0, 0]}>
            <Dog3D
              walkPhase={walkPhase} tailWag={walkPhase * 0.6}
              chestGlow={chestGlow} pullStretch={stretch}
            />
            <Product3D position={[1.15, 0.12, 0]} rotation={[-Math.PI/2+0.12,0,0]} scale={0.4} />
            <LeashTube progress={1} tension={tension} />
          </group>
          <Ground3D scrollZ={-walkPhase * 0.9} />
        </Sequence>
      </ThreeCanvas>

      {/* Pull moment badges */}
      {pullP > 0.3 && calmP < 0.5 && (
        <div style={{
          position:"absolute", top:140, left:60,
          opacity: pullP * (1 - calmP),
          background:"rgba(255,87,34,0.18)", border:"1px solid #ff572299",
          borderRadius:14, padding:"12px 26px",
          fontFamily:"'Arial Black',Arial,sans-serif",
          fontSize:28, fontWeight:900, color:"#ff7043",
        }}>🐕 Dog pulls forward...</div>
      )}
      {chestGlow > 0.3 && (
        <div style={{
          position:"absolute", top:210, left:60,
          opacity: Math.min(1, chestGlow * 2) * (1 - calmP * 0.7),
          background:"rgba(255,167,38,0.16)", border:`1px solid ${AMBER}99`,
          borderRadius:14, padding:"12px 26px",
          fontFamily:"'Arial Black',Arial,sans-serif",
          fontSize:26, fontWeight:900, color:AMBER,
        }}>✓ Chest pressure → gentle redirect</div>
      )}
      {calmP > 0.6 && (
        <div style={{
          position:"absolute", top:140, left:50, right:50,
          opacity: cl(calmP,[0.6,1],[0,1]),
          transform:`scale(${interpolate(calmP,[0.6,1],[0.9,1])})`,
          background:"rgba(46,125,50,0.18)", border:`2px solid ${GREEN}`,
          borderRadius:18, padding:"16px 28px", textAlign:"center",
        }}>
          <div style={{fontFamily:"'Arial Black',Arial,sans-serif",fontSize:36,fontWeight:900,color:GREEN_LT}}>
            No harsh corrections needed
          </div>
          <div style={{fontFamily:"Arial,sans-serif",fontSize:24,color:"rgba(255,255,255,0.72)",marginTop:6}}>
            Natural feedback = calmer walks 🐾
          </div>
        </div>
      )}

      <ProgressBar step={4} />
      <AbsoluteFill style={{
        display:"flex", flexDirection:"column", justifyContent:"flex-end",
        alignItems:"center", padding:"0 64px 100px", gap:14, pointerEvents:"none",
      }}>
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:400,
          background:"linear-gradient(to top, rgba(0,0,0,0.92) 0%, transparent 100%)",
        }} />
        <div style={{
          position:"relative",
          opacity:spr(frame,fps,0,200),
          transform:`translateY(${interpolate(spr(frame,fps,0,200),[0,1],[30,0])}px)`,
          textAlign:"center",
        }}>
          <div style={{
            background:GREEN, borderRadius:50, padding:"6px 30px",
            fontFamily:"'Arial Black',Arial,sans-serif",
            fontSize:22, fontWeight:900, color:WHITE, letterSpacing:3,
            display:"inline-block", marginBottom:12,
            boxShadow:`0 0 24px ${GREEN}88`,
          }}>STEP 4</div>
          <div style={{
            fontFamily:"'Arial Black',Arial,sans-serif",
            fontSize:64, fontWeight:900, color:WHITE,
            lineHeight:1.05, textShadow:`0 0 50px ${GREEN}77`,
          }}>Have a great walk! 🐾</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── SCENE: CSS Outro ─────────────────────────────────────────────────────────
const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p1 = spr(frame,fps,0,200), p2=spr(frame,fps,14,200);
  const p3=spr(frame,fps,28,200), p4=spr(frame,fps,42,200), p5=spr(frame,fps,56,200);

  return (
    <AbsoluteFill style={{
      background:`radial-gradient(ellipse at center, #0e1a28 0%, ${BG_DARK} 100%)`,
      alignItems:"center", justifyContent:"center",
    }}>
      <div style={{
        position:"absolute", width:750, height:750, borderRadius:"50%",
        background:`radial-gradient(circle, ${GREEN}24 0%, transparent 70%)`, opacity:p1,
      }} />
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:22,padding:"0 64px"}}>
        <div style={{
          opacity:p1, transform:`scale(${interpolate(p1,[0,1],[0.86,1])})`,
          background:WHITE, borderRadius:16, padding:"26px 56px",
          display:"flex", alignItems:"center", gap:26,
          boxShadow:`0 0 100px rgba(46,125,50,0.55), 0 12px 60px rgba(0,0,0,0.6)`,
        }}>
          <span style={{fontSize:78}}>🐾</span>
          <div>
            <div style={{fontFamily:"'Arial Black',Arial,sans-serif",fontSize:80,fontWeight:900,color:"#1a1a1a",lineHeight:1}}>Miracle</div>
            <div style={{fontFamily:"'Arial Black',Arial,sans-serif",fontSize:80,fontWeight:900,color:GREEN,lineHeight:1}}>Leash</div>
          </div>
        </div>

        <div style={{
          opacity:p2, transform:`translateY(${interpolate(p2,[0,1],[18,0])}px)`,
          fontFamily:"'Arial Black',Arial,sans-serif",
          fontSize:36, fontWeight:900, color:WHITE, textAlign:"center",
          letterSpacing:3, textTransform:"uppercase",
        }}>Take Back Control</div>

        <div style={{
          opacity:p3, display:"flex", gap:10,
          transform:`translateY(${interpolate(p3,[0,1],[16,0])}px)`,
        }}>
          {[0,1,2,3,4].map(i=>(
            <span key={i} style={{fontSize:46,color:GOLD,filter:`drop-shadow(0 0 10px ${GOLD}bb)`}}>★</span>
          ))}
        </div>
        <div style={{opacity:p3,fontFamily:"Arial,sans-serif",fontSize:24,color:"rgba(255,255,255,0.58)",marginTop:-12}}>
          Thousands of happy dog owners
        </div>

        <div style={{
          opacity:p4, transform:`translateY(${interpolate(p4,[0,1],[14,0])}px)`,
          background:`linear-gradient(135deg,${GREEN}30,${GREEN}55)`,
          border:`2px solid ${GREEN}`,
          borderRadius:60, padding:"18px 68px",
          boxShadow:`0 0 40px ${GREEN}66`,
        }}>
          <div style={{fontFamily:"'Arial Black',Arial,sans-serif",fontSize:44,fontWeight:900,color:WHITE,letterSpacing:1}}>
            miracleleash.com
          </div>
        </div>

        <div style={{
          opacity:p5, transform:`translateY(${interpolate(p5,[0,1],[14,0])}px)`,
          display:"flex", alignItems:"center", gap:18,
          background:"rgba(255,153,0,0.15)", border:"2px solid #FF9900",
          borderRadius:50, padding:"12px 42px",
        }}>
          <span style={{fontSize:32}}>🛒</span>
          <div style={{fontFamily:"'Arial Black',Arial,sans-serif",fontSize:28,fontWeight:900,color:"#FF9900"}}>
            Available on Amazon
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export const MiracleLeashV3: React.FC = () => (
  <AbsoluteFill style={{ background: BG_DARK }}>
    <Sequence from={T.INTRO_S} durationInFrames={T.INTRO_E - T.INTRO_S}><SceneIntro /></Sequence>
    <Sequence from={T.PROD_S}  durationInFrames={T.PROD_E  - T.PROD_S }><SceneProduct /></Sequence>
    <Sequence from={T.S1_S}    durationInFrames={T.S1_E    - T.S1_S   }><SceneStep1 /></Sequence>
    <Sequence from={T.S2_S}    durationInFrames={T.S2_E    - T.S2_S   }><SceneStep2 /></Sequence>
    <Sequence from={T.S3_S}    durationInFrames={T.S3_E    - T.S3_S   }><SceneStep3 /></Sequence>
    <Sequence from={T.WALK_S}  durationInFrames={T.WALK_E  - T.WALK_S }><SceneWalk /></Sequence>
    <Sequence from={T.OUTRO_S} durationInFrames={T.OUTRO_E - T.OUTRO_S}><SceneOutro /></Sequence>
  </AbsoluteFill>
);
