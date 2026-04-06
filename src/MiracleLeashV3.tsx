/**
 * MiracleLeashV3 — Real 3D Dog Character Animation
 *
 * Uses wonder-unit "wonderdog.glb" with full skeleton:
 *   Head, Jaw, Ears, Neck(x4), Spine(x4),
 *   RightArm/ForeArm/Hand (front-right leg),
 *   LeftArm/ForeArm/Hand  (front-left leg),
 *   RightUpLeg/Leg/Foot/ToeBase (back-right),
 *   LeftUpLeg/Leg/Foot/ToeBase  (back-left),
 *   Tail–Tail5
 *
 * Bones are driven deterministically from useCurrentFrame()
 * (Remotion forbids useFrame — every frame is a snapshot render)
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

// ─── Preload the model ────────────────────────────────────────────────────────
useGLTF.preload(staticFile("dog.glb"));

// ─── Duration ────────────────────────────────────────────────────────────────
export const V3_DURATION = 960; // 32 s @ 30 fps

// ─── Timeline ────────────────────────────────────────────────────────────────
const T = {
  INTRO_S:   0,  INTRO_E:  75,
  PROD_S:   75,  PROD_E:  210,
  S1_S:    210,  S1_E:    360,
  S2_S:    360,  S2_E:    510,
  S3_S:    510,  S3_E:    630,
  WALK_S:  630,  WALK_E:  780,
  OUTRO_S: 780,  OUTRO_E: 960,
};

// ─── Palette ─────────────────────────────────────────────────────────────────
const COLLAR_R  = "#e03030";
const LEASH_ORG = "#FF6B00";
const METAL_SLV = "#c8cfd8";
const LABEL_W   = "#f2f2f2";
const BRAND_GN  = "#2e7d32";
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

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

// ─── Real Dog Model ───────────────────────────────────────────────────────────
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
  walkPhase = 0,
  tailWag = 0,
  headTurn = 0,
  jawOpen = 0,
  pullLean = 0,
  chestGlowVal = 0,
  collarGlowVal = 0,
  scale = 1,
}) => {
  const { scene } = useGLTF(staticFile("dog.glb")) as any;

  // Clone once so we never mutate the cached original
  const dog = React.useMemo(() => scene.clone(true), [scene]);

  // Build a bone/node map for fast access
  const B = React.useMemo(() => {
    const m: Record<string, THREE.Object3D> = {};
    dog.traverse((o: THREE.Object3D) => { if (o.name) m[o.name] = o; });
    return m;
  }, [dog]);

  // ── Animate bones (values set every render — deterministic per frame) ──────
  const sw = Math.sin(walkPhase * Math.PI * 2);         // -1 … 1  primary
  const sw2 = Math.sin(walkPhase * Math.PI * 2 + Math.PI); // phase-shifted (opposite leg)

  // Front legs (called "Arms" in humanoid rig repurposed for quadruped)
  if (B.RightArm)     (B.RightArm as THREE.Bone).rotation.x     =  sw  * 0.55;
  if (B.RightForeArm) (B.RightForeArm as THREE.Bone).rotation.x = Math.max(0,  sw) * 0.4;
  if (B.LeftArm)      (B.LeftArm as THREE.Bone).rotation.x      =  sw2 * 0.55;
  if (B.LeftForeArm)  (B.LeftForeArm as THREE.Bone).rotation.x  = Math.max(0, sw2) * 0.4;

  // Back legs
  if (B.RightUpLeg) (B.RightUpLeg as THREE.Bone).rotation.x = sw2 * 0.52;
  if (B.RightLeg)   (B.RightLeg   as THREE.Bone).rotation.x = Math.max(0, sw2) * 0.35;
  if (B.LeftUpLeg)  (B.LeftUpLeg  as THREE.Bone).rotation.x = sw  * 0.52;
  if (B.LeftLeg)    (B.LeftLeg    as THREE.Bone).rotation.x = Math.max(0,  sw) * 0.35;

  // Tail wag — multiple segments for fluffy look
  const tw = Math.sin(tailWag * Math.PI * 4);
  if (B.Tail)  (B.Tail  as THREE.Bone).rotation.z = tw * 0.55;
  if (B.Tail1) (B.Tail1 as THREE.Bone).rotation.z = tw * 0.45;
  if (B.Tail2) (B.Tail2 as THREE.Bone).rotation.z = tw * 0.35;
  if (B.Tail3) (B.Tail3 as THREE.Bone).rotation.z = tw * 0.2;

  // Head look & turn
  if (B.Head) {
    (B.Head as THREE.Bone).rotation.y = headTurn;
    (B.Head as THREE.Bone).rotation.x = pullLean * 0.12;
  }
  if (B.Neck) (B.Neck as THREE.Bone).rotation.x = -pullLean * 0.08;

  // Jaw pant
  if (B.Jaw) (B.Jaw as THREE.Bone).rotation.x = jawOpen * 0.35;

  // Ear flap (slight sway when walking)
  const earFlap = Math.sin(walkPhase * Math.PI * 2) * 0.1;
  if (B.RightEar) (B.RightEar as THREE.Bone).rotation.z =  earFlap;
  if (B.LeftEar)  (B.LeftEar  as THREE.Bone).rotation.z = -earFlap;

  // Spine slight sway
  if (B.Spine) (B.Spine as THREE.Bone).rotation.z = Math.sin(walkPhase * Math.PI * 4) * 0.04;

  // Hips bob
  if (B.Hips) {
    (B.Hips as THREE.Bone).position.y += Math.abs(sw) * 0.015;
    (B.Hips as THREE.Bone).rotation.z  = sw * 0.04 + pullLean * 0.08;
  }

  // ── Neck collar position: we'll add it at the mesh level ──────────────────
  // The neck bone world transform can't be queried without a DOM update,
  // so collar is placed via the group's approximate neck location.
  // Dog model faces -Z in rest; scale ≈ 0.018 means 1 unit ≈ 1.8cm
  // Neck is roughly at (0, 55, 60) in model space → (0, 0.99, 1.08) at scale 0.018

  return (
    <group scale={[scale, scale, scale]} rotation={[0, Math.PI, 0]}>
      <primitive object={dog} />

      {/* ── Red collar ring (at neck junction) ── */}
      <mesh position={[0, 55, 60]}>
        <torusGeometry args={[22, 4, 14, 48]} />
        <meshStandardMaterial
          color={collarGlowVal > 0 ? "#ff5252" : COLLAR_R}
          roughness={0.45}
          emissive={COLLAR_R}
          emissiveIntensity={0.1 + collarGlowVal * 2.0}
        />
      </mesh>
      {/* D-ring below collar */}
      <mesh position={[0, 36, 68]}>
        <torusGeometry args={[8, 2, 10, 28]} />
        <meshStandardMaterial color={METAL_SLV} metalness={0.95} roughness={0.1} />
      </mesh>

      {/* ── Chest glow halo (pull moment) ── */}
      {chestGlowVal > 0 && (
        <mesh position={[0, 36, 30]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[32, 3.5, 12, 48]} />
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

// ─── Product model ────────────────────────────────────────────────────────────
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
    {/* Strap */}
    <mesh>
      <boxGeometry args={[2.6, 0.15, 0.46]} />
      <meshStandardMaterial color="#252525" roughness={0.72} />
    </mesh>
    {[...Array(10)].map((_,i) => (
      <mesh key={i} position={[i*0.26 - 1.17, 0, 0]}>
        <boxGeometry args={[0.05, 0.16, 0.48]} />
        <meshStandardMaterial color="#0f0f0f" roughness={0.8} />
      </mesh>
    ))}
    {/* White label */}
    <mesh position={[0, 0.09, 0]}>
      <boxGeometry args={[0.98, 0.045, 0.43]} />
      <meshStandardMaterial color={LABEL_W} roughness={0.6} />
    </mesh>
    <mesh position={[-0.27, 0.12, 0]}>
      <sphereGeometry args={[0.1, 8, 6]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
    </mesh>
    {[-0.37,-0.23,-0.09].map((z,i) => (
      <mesh key={i} position={[-0.19, 0.12, z-0.04]}>
        <sphereGeometry args={[0.055, 6, 5]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
    ))}
    <mesh position={[0.1, 0.12, 0.06]}>
      <boxGeometry args={[0.44, 0.04, 0.12]} />
      <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
    </mesh>
    <mesh position={[0.1, 0.12, -0.1]}>
      <boxGeometry args={[0.38, 0.04, 0.1]} />
      <meshStandardMaterial color={BRAND_GN} roughness={0.7} />
    </mesh>
    {/* Snap hook */}
    <group position={[-1.5, 0, 0]}>
      <mesh>
        <boxGeometry args={[0.25, 0.36, 0.28]} />
        <meshStandardMaterial color={METAL_SLV} metalness={0.92} roughness={0.08}
          emissive={glowSnap > 0 ? GOLD : "#000"} emissiveIntensity={glowSnap * 2.5} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <torusGeometry args={[0.17, 0.045, 10, 24, Math.PI]} />
        <meshStandardMaterial color={METAL_SLV} metalness={0.92} roughness={0.08} />
      </mesh>
      <mesh position={[-0.15, 0, 0]}>
        <boxGeometry args={[0.06, 0.32, 0.08]} />
        <meshStandardMaterial color="#aab0b8" metalness={0.7} roughness={0.2} />
      </mesh>
    </group>
    {/* D-ring carabiner */}
    <group position={[1.5, 0, 0]}>
      <mesh rotation={[0, 0, -Math.PI * 0.12]}>
        <torusGeometry args={[0.24, 0.062, 10, 36, Math.PI * 1.76]} />
        <meshStandardMaterial color="#1e1e1e" metalness={0.55} roughness={0.28}
          emissive={glowCarab > 0 ? CYAN : "#000"} emissiveIntensity={glowCarab * 2} />
      </mesh>
      <mesh position={[0, -0.22, 0]}>
        <boxGeometry args={[0.48, 0.1, 0.1]} />
        <meshStandardMaterial color="#181818" metalness={0.55} roughness={0.28} />
      </mesh>
      <mesh position={[0.26, 0.04, 0]}>
        <boxGeometry args={[0.1, 0.44, 0.09]} />
        <meshStandardMaterial color={glowCarab > 0 ? CYAN : METAL_SLV}
          metalness={0.85} roughness={0.12}
          emissive={glowCarab > 0 ? CYAN : "#000"} emissiveIntensity={glowCarab * 1.8} />
      </mesh>
    </group>
  </group>
);

// ─── Leash tube (real scale — dog model units) ────────────────────────────────
// Dog model scale=0.018; neck ≈ at world (0, 0.99, 1.1)
// "owner hand" ≈ world (1.5, 2.8, 0)
const LeashTube: React.FC<{ progress: number; tension?: number }> = ({ progress, tension=0 }) => {
  const curve = React.useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3( 1.6,  2.9,  0.0),  // owner hand
    new THREE.Vector3( 1.3,  2.0,  0.1),
    new THREE.Vector3( 1.0,  1.2,  0.0),  // near neck
    new THREE.Vector3( 0.9,  0.6,  0.5),  // front chest
    new THREE.Vector3( 0.4, -0.2,  0.7),  // under belly right
    new THREE.Vector3(-0.2, -0.4,  0.0),  // under belly center
    new THREE.Vector3( 0.4, -0.2, -0.7),  // under belly left
    new THREE.Vector3( 0.9,  0.6, -0.5),  // chest left
    new THREE.Vector3( 1.0,  1.0, -0.4),  // back up
  ]), []);

  const pts = curve.getPoints(80);
  const n = Math.max(2, Math.floor(progress * pts.length));
  const vis = pts.slice(0, n);
  const visCurve = React.useMemo(() => new THREE.CatmullRomCurve3(vis), [n]); // eslint-disable-line

  if (vis.length < 2) return null;

  return (
    <mesh>
      <tubeGeometry args={[visCurve, 50, 0.045 + tension * 0.02, 10, false]} />
      <meshStandardMaterial color={LEASH_ORG} roughness={0.55}
        emissive={LEASH_ORG} emissiveIntensity={0.3 + tension * 1.0} />
    </mesh>
  );
};

// ─── Ground ───────────────────────────────────────────────────────────────────
const Ground3D: React.FC<{ scrollZ?: number }> = ({ scrollZ=0 }) => (
  <>
    <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.02, 0]}>
      <planeGeometry args={[40, 40]} />
      <meshStandardMaterial color={GROUND_G} roughness={1} />
    </mesh>
    {[-5,-4,-3,-2,-1,0,1,2,3,4,5].map(i => (
      <React.Fragment key={i}>
        <mesh position={[i*1.4, -0.01, (scrollZ % 1.4) - 8]}>
          <boxGeometry args={[0.014, 0.008, 28]} />
          <meshStandardMaterial color={GRID_C} />
        </mesh>
        <mesh position={[0, -0.01, (i*1.4 + scrollZ) % 15.4 - 7.7]}>
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
    <ambientLight intensity={0.6} color="#ccd8ff" />
    <directionalLight position={[3, 7, 8]} intensity={2.5} color="#fff8e8" />
    <pointLight position={[-4, 3, 5]} intensity={1.2} color="#b8d0ff" />
    {/* Strong rim from behind — defines dog shape against dark BG */}
    <pointLight position={[-1, 4, -8]} intensity={3.0} color="#e8f0ff" />
    <pointLight position={[ 2, 4, -8]} intensity={2.2} color="#ffe8d0" />
    <pointLight position={[ 4, 0, 3]} intensity={0.9} color={accent} />
    {/* Under fill so legs are not black */}
    <pointLight position={[0, -2, 4]} intensity={0.55} color="#8890cc" />
  </>
);

const LightsProd: React.FC = () => (
  <>
    <ambientLight intensity={0.7} color="#e0e8ff" />
    <directionalLight position={[3, 6, 8]} intensity={3.5} color="#ffffff" />
    <pointLight position={[-3, 2, 5]} intensity={1.6} color={GOLD} />
    <pointLight position={[ 3, 2, 5]} intensity={1.4} color="#ffffff" />
    <pointLight position={[-4, 4, -2]} intensity={1.0} color="#c0d0ff" />
    <pointLight position={[ 4, 4, -2]} intensity={1.0} color="#ffe0c0" />
    <pointLight position={[0, -2, 5]} intensity={0.8} color={CYAN} />
  </>
);

// ─── Gradient BG ─────────────────────────────────────────────────────────────
const GradBG: React.FC = () => (
  <AbsoluteFill style={{
    background: `linear-gradient(175deg, ${SKY_T} 0%, ${SKY_B} 55%, #0a0e18 100%)`,
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
          position:"absolute", top:92, left:50, right:50,
          opacity: cl(frame, [50,80], [0,1]),
          background:"rgba(0,0,0,0.72)", border:"1px solid rgba(255,255,255,0.13)",
          borderRadius:16, padding:"14px 24px", textAlign:"center",
          fontFamily:"Arial,sans-serif", fontSize:22,
          color:"rgba(255,255,255,0.82)", lineHeight:1.5,
        }}>{topNote}</div>
      )}
      <AbsoluteFill style={{
        display:"flex", flexDirection:"column", justifyContent:"flex-end",
        alignItems:"center", padding:"0 64px 100px", gap:14, pointerEvents:"none",
      }}>
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:520,
          background:"linear-gradient(to top,rgba(0,0,0,0.96) 0%,rgba(0,0,0,0.55) 50%,transparent 100%)",
        }} />
        <div style={{
          position:"relative",
          opacity:p, transform:`translateY(${interpolate(p,[0,1],[40,0])}px)`,
          display:"flex", flexDirection:"column", alignItems:"center", gap:12,
        }}>
          <div style={{
            background:color, borderRadius:50, padding:"7px 32px",
            fontFamily:"'Arial Black',Arial,sans-serif",
            fontSize:22, fontWeight:900, color:BG_DARK, letterSpacing:3,
            boxShadow:`0 0 28px ${color}99`,
          }}>STEP {num}</div>
          <div style={{
            fontFamily:"'Arial Black',Arial,sans-serif",
            fontSize:62, fontWeight:900, color:WHITE, textAlign:"center",
            lineHeight:1.05, textShadow:`0 0 45px ${color}77`,
          }}>{title}</div>
          <div style={{
            fontFamily:"Arial,sans-serif", fontSize:30,
            color:"rgba(255,255,255,0.82)", textAlign:"center",
            lineHeight:1.5, maxWidth:860,
          }}>{body}</div>
        </div>
      </AbsoluteFill>
    </>
  );
};

const ProgressBar: React.FC<{ step: number }> = ({ step }) => (
  <div style={{ position:"absolute", top:0, left:0, right:0, height:5, display:"flex" }}>
    {[GOLD, AMBER, CYAN, GREEN_LT].map((c, i) => (
      <div key={i} style={{
        flex:1, height:"100%",
        background: i < step ? c : "rgba(255,255,255,0.08)",
        borderRight:"1px solid rgba(0,0,0,0.3)",
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
    <AbsoluteFill style={{ background:BG_DARK, alignItems:"center", justifyContent:"center" }}>
      <div style={{
        position:"absolute", width:800, height:800, borderRadius:"50%",
        background:`radial-gradient(circle, ${GREEN}1e 0%, transparent 70%)`, opacity:p1,
      }} />
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:22 }}>
        <div style={{
          opacity:p1, transform:`translateY(${interpolate(p1,[0,1],[28,0])}px)`,
          fontFamily:"Arial,sans-serif", fontSize:30, color:"rgba(255,255,255,0.6)",
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
            <div style={{fontFamily:"'Arial Black',Arial,sans-serif",fontSize:82,fontWeight:900,color:"#1a1a1a",lineHeight:1}}>Miracle</div>
            <div style={{fontFamily:"'Arial Black',Arial,sans-serif",fontSize:82,fontWeight:900,color:GREEN,lineHeight:1}}>Leash</div>
          </div>
        </div>
        <div style={{
          opacity:p2,
          background:"#1a1a1a", padding:"9px 34px", borderRadius:6,
          fontFamily:"'Arial Black',Arial,sans-serif",
          fontSize:26, fontWeight:900, color:WHITE,
          letterSpacing:4, textTransform:"uppercase",
          transform:`scale(${interpolate(p2,[0,1],[0.92,1])})`,
        }}>Take Back Control</div>
        <div style={{
          opacity:p3, transform:`translateY(${interpolate(p3,[0,1],[16,0])}px)`,
          fontFamily:"Arial,sans-serif", fontSize:28,
          color:"rgba(255,255,255,0.6)", textAlign:"center",
        }}>Stops pulling — no harsh corrections needed</div>
      </div>
    </AbsoluteFill>
  );
};

// ─── SCENE: 3D Product Showcase ───────────────────────────────────────────────
const PROD_KFS: number[][] = [
  [  0,  0.0, 0.3, 3.4,   0.0, 0.0, 0],
  [ 50,  2.0, 0.6, 2.8,   0.0, 0.0, 0],
  [100, -2.0, 0.2, 3.0,   0.0, 0.0, 0],
  [135,  0.0, 0.9, 2.6,   0.0, 0.0, 0],
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
        <LightsProd />
        <Sequence layout="none">
          <Cam frame={frame} kfs={PROD_KFS} />
          <group rotation={[0.2, rotY, 0.04]} scale={[1.3, 1.3, 1.3]}>
            <Product3D />
          </group>
        </Sequence>
      </ThreeCanvas>
      <AbsoluteFill style={{
        display:"flex", flexDirection:"column", justifyContent:"flex-end",
        alignItems:"center", padding:"0 64px 110px", gap:14, pointerEvents:"none",
      }}>
        <div style={{
          position:"absolute", bottom:0, left:0, right:0, height:500,
          background:"linear-gradient(to top,rgba(7,9,15,0.96) 0%,transparent 100%)",
        }} />
        <div style={{ position:"relative", textAlign:"center" }}>
          <div style={{
            opacity:p, transform:`translateY(${interpolate(p,[0,1],[30,0])}px)`,
            fontFamily:"'Arial Black',Arial,sans-serif",
            fontSize:64, fontWeight:900, color:WHITE,
            textShadow:`0 0 50px ${GOLD}88`,
          }}>The <span style={{color:GOLD}}>Miracle Leash</span></div>
          <div style={{
            opacity:spr(frame,fps,22,200),
            transform:`translateY(${interpolate(spr(frame,fps,22,200),[0,1],[18,0])}px)`,
            fontFamily:"Arial,sans-serif", fontSize:30,
            color:"rgba(255,255,255,0.72)", marginTop:12,
          }}>Snap Hook · Nylon Strap · D-Ring Carabiner</div>
          <div style={{
            display:"flex", gap:20, justifyContent:"center", marginTop:18,
            opacity:spr(frame,fps,40,200),
          }}>
            {[["SNAP HOOK",GOLD,"Clips to collar"],["STRAP",WHITE,"Nylon · Durable"],["D-RING",CYAN,"Clips to leash"]].map(([l,c,s])=>(
              <div key={l} style={{
                background:"rgba(255,255,255,0.06)",border:`1px solid ${c}44`,
                borderRadius:12,padding:"10px 20px",textAlign:"center",
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

// Dog model scale for all 3D scenes — model is in cm-ish units
const DOG_SCALE = 0.018;

// ─── SCENE: Step 1 – Snap hook clips to collar ────────────────────────────────
// Camera: front-right at dog eye level. Dog faces -Z (rotated 180° in model).
// "Front" of dog is toward +Z in world space.
const S1_KFS: number[][] = [
  [  0,  2.2, 1.5, 3.5,   0.0, 0.8, 0],
  [ 50,  1.5, 1.2, 3.0,   0.0, 0.8, 0],
  [100,  0.5, 1.0, 2.2,   0.0, 0.85,0],  // tight on collar
  [150,  1.8, 1.3, 3.5,   0.0, 0.8, 0],
];

const SceneStep1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const flyP = cl(frame, [15, 78], [0, 1]);
  // Product arc toward collar (world coords based on DOG_SCALE)
  // Collar is at approx world (0, 0.99, 1.1)
  const px = interpolate(flyP, [0,1], [2.2, 0.0]);
  const py = interpolate(flyP, [0,1], [2.8, 0.95]);
  const pz = interpolate(flyP, [0,1], [-1.5, 1.1]);
  const ps = interpolate(flyP, [0,0.2,1], [0.3, 0.38, 0.38]);
  const snapFlash = interpolate(frame, [80,85,100], [0,1,0], {extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  const collarG = cl(frame, [80, 140], [0, 1]);

  return (
    <AbsoluteFill>
      <GradBG />
      {snapFlash > 0 && <AbsoluteFill style={{background:`rgba(245,200,66,${snapFlash*0.3})`,pointerEvents:"none"}} />}
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <LightsMain accent={GOLD} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={S1_KFS} />
          <DogModel scale={DOG_SCALE} collarGlowVal={collarG} tailWag={frame * 0.01} />
          <Ground3D />
          <Product3D position={[px,py,pz]} scale={ps}
            glowSnap={cl(frame,[65,88],[0,1])} />
          {snapFlash > 0 && (
            <mesh position={[0, 0.99, 1.1]}>
              <sphereGeometry args={[snapFlash*0.25, 10, 8]} />
              <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={5} transparent opacity={snapFlash*0.75} />
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

// ─── SCENE: Step 2 – Leash wraps around chest ────────────────────────────────
const S2_KFS: number[][] = [
  [  0,  2.8, 0.8, 4.5,   0.0, 0.5, 0],   // front-right, low
  [ 60,  1.5, 0.6, 5.5,   0.0, 0.3, 0],   // pull back a bit
  [120,  0.0, 1.5, 6.0,   0.0, 0.2, 0],   // wide view
  [150, -2.0, 0.9, 5.0,   0.0, 0.3, 0],   // other side to show wrap
];

const SceneStep2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const wrapP  = cl(frame, [18, 125], [0, 1]);
  const tension = cl(frame, [128, 150], [0, 0.3]);

  return (
    <AbsoluteFill>
      <GradBG />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <LightsMain accent={AMBER} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={S2_KFS} />
          <DogModel scale={DOG_SCALE} chestGlowVal={tension} tailWag={frame * 0.01} />
          {/* Product at collar */}
          <Product3D position={[0, 0.95, 1.1]} scale={0.38} />
          <LeashTube progress={wrapP} tension={tension} />
          <Ground3D />
        </Sequence>
      </ThreeCanvas>
      <ProgressBar step={2} />
      <StepOverlay frame={frame} fps={fps} num={2}
        title="Wrap the Leash"
        body="Thread your leash under and around your dog's chest"
        color={AMBER}
        topNote="💡 Chest pressure is gentler and more effective than neck tension" />
    </AbsoluteFill>
  );
};

// ─── SCENE: Step 3 – Carabiner clips to leash ────────────────────────────────
const S3_KFS: number[][] = [
  [  0,  2.5, 1.0, 4.0,   0.5, 0.5, 0],
  [ 60,  2.0, 0.8, 3.5,   0.5, 0.5,-0.4],
  [100,  1.5, 0.7, 3.8,   0.5, 0.5,-0.4],
];

const SceneStep3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const carabP = cl(frame, [18, 82], [0, 1]);
  const snapFlash = interpolate(frame, [83,88,105], [0,1,0], {extrapolateLeft:"clamp",extrapolateRight:"clamp"});
  const cx = interpolate(carabP, [0,1], [2.8, 1.0]);
  const cy = interpolate(carabP, [0,1], [2.5, 0.8]);
  const cz = interpolate(carabP, [0,1], [-2.0, -0.4]);

  return (
    <AbsoluteFill>
      <GradBG />
      {snapFlash > 0 && <AbsoluteFill style={{background:`rgba(79,195,247,${snapFlash*0.26})`,pointerEvents:"none"}} />}
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <LightsMain accent={CYAN} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={S3_KFS} />
          <DogModel scale={DOG_SCALE} tailWag={frame * 0.01} />
          <Product3D position={[0, 0.95, 1.1]} scale={0.38} />
          <LeashTube progress={1} tension={0} />
          {/* Moving carabiner */}
          <group position={[cx, cy, cz]}>
            <mesh rotation={[0,0,-Math.PI*0.12]}>
              <torusGeometry args={[0.22, 0.058, 10, 36, Math.PI*1.76]} />
              <meshStandardMaterial color="#1e1e1e" metalness={0.55} roughness={0.28}
                emissive={CYAN} emissiveIntensity={carabP * 2.8} />
            </mesh>
            <mesh position={[0,-0.22,0]}>
              <boxGeometry args={[0.46,0.1,0.1]} />
              <meshStandardMaterial color="#181818" metalness={0.55} roughness={0.28} />
            </mesh>
            <mesh position={[0.25,0.04,0]}>
              <boxGeometry args={[0.1,0.42,0.09]} />
              <meshStandardMaterial color={CYAN} metalness={0.85} roughness={0.12}
                emissive={CYAN} emissiveIntensity={carabP * 2} />
            </mesh>
          </group>
          {snapFlash > 0 && (
            <mesh position={[1.0, 0.8, -0.4]}>
              <sphereGeometry args={[snapFlash*0.22, 8, 8]} />
              <meshStandardMaterial color={CYAN} emissive={CYAN} emissiveIntensity={5}
                transparent opacity={snapFlash*0.8} />
            </mesh>
          )}
          <Ground3D />
        </Sequence>
      </ThreeCanvas>
      <div style={{
        position:"absolute", top:100, right:50,
        opacity: cl(frame,[92,120],[0,1]),
        background:"rgba(79,195,247,0.1)", border:`1px solid ${CYAN}55`,
        borderRadius:14, padding:"14px 22px", maxWidth:340,
      }}>
        <div style={{fontFamily:"'Arial Black',Arial,sans-serif",fontSize:20,fontWeight:900,color:CYAN,marginBottom:4}}>
          SETUP COMPLETE
        </div>
        <div style={{fontFamily:"Arial,sans-serif",fontSize:18,color:"rgba(255,255,255,0.72)",lineHeight:1.45}}>
          Carabiner locks the chest loop — everything stays secure during your walk
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
  [  0,  2.5, 0.8, 5.5,   0.0, 0.4, 0],
  [ 35,  3.8, 0.7, 4.5,   0.0, 0.4, 0],  // pull tracking
  [ 75,  0.5, 0.6, 6.5,   0.0, 0.3, 0],  // wide relaxed
  [125, -3.0, 0.8, 5.0,   0.0, 0.4, 0],  // other side
  [160,  1.5, 1.0, 5.5,   0.0, 0.4, 0],
];

const SceneWalk: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const walkPhase  = frame * 0.048;
  const pullP  = cl(frame, [30, 72], [0, 1]);
  const calmP  = cl(frame, [82, 115], [0, 1]);
  const chestG = Math.max(0, pullP * (1 - calmP));
  const tension = chestG * 0.6;
  const drift  = cl(frame, [30, 75], [0, 0.5]) - cl(frame, [82, 115], [0, 0.5]);
  const shakeX = chestG * Math.sin(frame * 19.7) * 0.04;
  const shakeY = chestG * Math.sin(frame * 13.1) * 0.025;

  return (
    <AbsoluteFill>
      <GradBG />
      <ThreeCanvas width={width} height={height} gl={{ alpha: true }}>
        <LightsMain accent={chestG > 0 ? AMBER : GREEN_LT} />
        <Sequence layout="none">
          <Cam frame={frame} kfs={WALK_KFS} sx={shakeX} sy={shakeY} />
          <group position={[drift, 0, 0]}>
            <DogModel scale={DOG_SCALE}
              walkPhase={walkPhase}
              tailWag={walkPhase * 0.6}
              chestGlowVal={chestG}
              pullLean={chestG}
              jawOpen={walkPhase * 0.5 % 1}
            />
            <Product3D position={[0, 0.95, 1.1]} scale={0.38} />
            <LeashTube progress={1} tension={tension} />
          </group>
          <Ground3D scrollZ={-walkPhase * 0.85} />
        </Sequence>
      </ThreeCanvas>

      {pullP > 0.3 && calmP < 0.5 && (
        <div style={{
          position:"absolute", top:130, left:60,
          opacity: pullP * (1 - calmP),
          background:"rgba(255,87,34,0.18)", border:"1px solid #ff572299",
          borderRadius:14, padding:"12px 26px",
          fontFamily:"'Arial Black',Arial,sans-serif",
          fontSize:28, fontWeight:900, color:"#ff7043",
        }}>🐕 Dog pulls forward...</div>
      )}
      {chestG > 0.3 && (
        <div style={{
          position:"absolute", top:200, left:60,
          opacity: Math.min(1, chestG*2) * (1-calmP*0.7),
          background:"rgba(255,167,38,0.16)", border:`1px solid ${AMBER}99`,
          borderRadius:14, padding:"12px 26px",
          fontFamily:"'Arial Black',Arial,sans-serif",
          fontSize:26, fontWeight:900, color:AMBER,
        }}>✓ Chest wrap redirects gently</div>
      )}
      {calmP > 0.6 && (
        <div style={{
          position:"absolute", top:130, left:50, right:50,
          opacity: cl(calmP, [0.6,1],[0,1]),
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
          background:"linear-gradient(to top,rgba(0,0,0,0.92) 0%,transparent 100%)",
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
  const p1=spr(frame,fps,0,200), p2=spr(frame,fps,14,200);
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
        <div style={{opacity:p3,display:"flex",gap:10,transform:`translateY(${interpolate(p3,[0,1],[16,0])}px)`}}>
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
          border:`2px solid ${GREEN}`, borderRadius:60, padding:"18px 68px",
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
    <Sequence from={T.INTRO_S} durationInFrames={T.INTRO_E-T.INTRO_S}><SceneIntro /></Sequence>
    <Sequence from={T.PROD_S}  durationInFrames={T.PROD_E -T.PROD_S }><SceneProduct /></Sequence>
    <Sequence from={T.S1_S}    durationInFrames={T.S1_E   -T.S1_S   }><SceneStep1 /></Sequence>
    <Sequence from={T.S2_S}    durationInFrames={T.S2_E   -T.S2_S   }><SceneStep2 /></Sequence>
    <Sequence from={T.S3_S}    durationInFrames={T.S3_E   -T.S3_S   }><SceneStep3 /></Sequence>
    <Sequence from={T.WALK_S}  durationInFrames={T.WALK_E -T.WALK_S }><SceneWalk /></Sequence>
    <Sequence from={T.OUTRO_S} durationInFrames={T.OUTRO_E-T.OUTRO_S}><SceneOutro /></Sequence>
  </AbsoluteFill>
);
