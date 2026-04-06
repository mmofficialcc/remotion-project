import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";

// ─── Palette ──────────────────────────────────────────────────────────────────
const FUR        = "#D4A855";
const FUR_DARK   = "#9A6B20";
const COLLAR_CLR = "#CC2222";
const LOOP_GOLD  = "#F5C842";
const LOOP_TIGHT = "#FF7A00";
const LEASH_CLR  = "#2255BB";
const BG_COLOR   = "#0d1117";
const GROUND_CLR = "#161b27";
const GOLD       = "#F5C842";
const WHITE      = "#ffffff";

// ─── Timeline (frames @ 30 fps) ──────────────────────────────────────────────
const T = {
  INTRO  : 0,    //  0 – 3 s   brand reveal
  DOG    : 90,   //  3 – 7 s   dog appears, idle
  STEP1  : 210,  //  7 – 12 s  attach loop to collar
  STEP2  : 360,  // 12 – 17 s  connect leash
  STEP3  : 510,  // 17 – 23 s  start walk → dog pulls → loop tightens
  STEP4  : 690,  // 23 – 29 s  dog relaxes → loop loosens
  CTA    : 870,  // 29 – 33 s  miracleleash.com
};
export const GUIDE_DURATION = 990; // 33 s

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const spr = (frame: number, fps: number, delay = 0, damping = 200) =>
  spring({ frame: frame - delay, fps, config: { damping } });

const prog = (frame: number, a: number, b: number) =>
  interpolate(frame, [a, b], [0, 1], {
    extrapolateLeft : "clamp",
    extrapolateRight: "clamp",
  });

// ─── Camera controller ────────────────────────────────────────────────────────
const CameraCtrl: React.FC<{ frame: number }> = ({ frame }) => {
  const { camera } = useThree();

  // zoom into collar at step 1, back out before step 2
  const zoomIn  = prog(frame, T.STEP1, T.STEP1 + 60);
  const zoomOut = prog(frame, T.STEP2 - 40, T.STEP2 + 20);
  const zoom    = Math.max(0, zoomIn - zoomOut);

  // pull back for wide walking shot at step 3
  const wideIn  = prog(frame, T.STEP3, T.STEP3 + 60);
  const wideOut = prog(frame, T.STEP4 + 60, T.STEP4 + 120);
  const wide    = Math.max(0, wideIn - wideOut);

  const camZ  = interpolate(zoom, [0, 1], [9, 4.0]) + interpolate(wide, [0, 1], [0, 2.8]);
  const camY  = interpolate(zoom, [0, 1], [2.6, 2.1]);
  const lookY = interpolate(zoom, [0, 1], [1.0, 1.85]);

  camera.position.set(0, camY, camZ);
  camera.lookAt(0, lookY, 0);

  return null;
};

// ─── Ground ───────────────────────────────────────────────────────────────────
const Ground: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const opacity = spr(frame, fps, T.DOG, 200);
  return (
    <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color={GROUND_CLR} roughness={0.95} opacity={opacity} transparent />
    </mesh>
  );
};

// ─── Grid lines on ground ─────────────────────────────────────────────────────
const GridLines: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const opacity = interpolate(spr(frame, fps, T.DOG, 200), [0, 1], [0, 0.22]);
  const lines: [number, number, number, number, number, number][] = [];
  for (let i = -6; i <= 6; i++) {
    lines.push([i, 0.01, 0,  0, 0, 0.5 * Math.PI]); // x-aligned
    lines.push([0, 0.01, i,  0, 0.5 * Math.PI, 0]); // z-aligned
  }
  return (
    <>
      {lines.map(([x, y, z, rx, ry, rz], idx) => (
        <mesh key={idx} position={[x, y, z]} rotation={[rx, ry, rz]}>
          <planeGeometry args={[12, 0.012]} />
          <meshStandardMaterial color={GOLD} opacity={opacity} transparent />
        </mesh>
      ))}
    </>
  );
};

// ─── Leash loop attachment ────────────────────────────────────────────────────
const LeashLoop3D: React.FC<{
  frame: number;
  fps: number;
  tight: number;       // 0 loose → 1 tight
  breathe: number;
  dogZ: number;
}> = ({ frame, fps, tight, breathe, dogZ }) => {
  // Loop appears when step 1 begins
  const appear = spr(frame, fps, T.STEP1 + 20, 120);
  const r      = interpolate(tight, [0, 1], [0.29, 0.14]);
  const glow   = interpolate(tight, [0, 1], [0.08, 1.2]);
  const color  = tight > 0.5 ? LOOP_TIGHT : LOOP_GOLD;

  return (
    <group position={[0, 1.72 + breathe, 0.9 + dogZ]} scale={[appear, appear, appear]}>
      {/* Main adjustable loop */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r, 0.042, 10, 48]} />
        <meshStandardMaterial
          color={color}
          metalness={0.95}
          roughness={0.04}
          emissive={color}
          emissiveIntensity={glow}
        />
      </mesh>
      {/* Small connection clip */}
      <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.06, 0.025, 6, 20]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
};

// ─── Leash line (appears at step 2) ──────────────────────────────────────────
const LeashLine: React.FC<{
  frame: number;
  fps: number;
  pulling: boolean;
  dogZ: number;
}> = ({ frame, fps, pulling, dogZ }) => {
  const appear = spr(frame, fps, T.STEP2 + 10, 180);

  const collarY = 1.72;
  const collarZ = 0.9 + dogZ;
  const handY   = 5.0;
  const handZ   = pulling ? 0.5 + dogZ * 0.6 : 0.5;

  const midY = (collarY + handY) / 2;
  const midZ = (collarZ + handZ) / 2;
  const dy   = handY - collarY;
  const dz   = handZ - collarZ;
  const len  = Math.sqrt(dy * dy + dz * dz);
  const rotX = -Math.atan2(dz, dy);

  return (
    <group scale={[appear, appear, appear]} position={[0, 0, 0]}>
      <mesh position={[0, midY, midZ]} rotation={[rotX, 0, 0]}>
        <cylinderGeometry args={[0.026, 0.026, len, 8]} />
        <meshStandardMaterial color={LEASH_CLR} metalness={0.2} roughness={0.65} />
      </mesh>
      {/* Handle loop at top */}
      <mesh position={[0, handY + 0.18, handZ]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.18, 0.032, 8, 28]} />
        <meshStandardMaterial color={LEASH_CLR} metalness={0.2} roughness={0.65} />
      </mesh>
    </group>
  );
};

// ─── Arrow pointing to collar (step 1) ───────────────────────────────────────
const CollarArrow: React.FC<{ frame: number; fps: number; dogZ: number }> = ({ frame, fps, dogZ }) => {
  const show = prog(frame, T.STEP1, T.STEP1 + 40);
  const hide = prog(frame, T.STEP2 - 40, T.STEP2);
  const op   = Math.max(0, show - hide);
  const bob  = Math.sin(frame * 0.14) * 0.12;

  return (
    <group position={[0, 2.75 + bob, 0.9 + dogZ]} rotation={[Math.PI, 0, 0]} scale={[op, op, op]}>
      <mesh>
        <coneGeometry args={[0.14, 0.4, 8]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={1.0} />
      </mesh>
    </group>
  );
};

// ─── 3D Dog ───────────────────────────────────────────────────────────────────
const Dog3D: React.FC<{
  frame: number;
  fps: number;
  walking: boolean;
  pulling: boolean;
  loopTight: number;
  dogZ: number;
}> = ({ frame, fps, walking, pulling, loopTight, dogZ }) => {
  const enter     = spr(frame, fps, T.DOG, 120);
  const dogScale  = interpolate(enter, [0, 1], [0.01, 1]);
  const breathe   = Math.sin(frame * 0.06) * 0.012;
  const wagSpeed  = walking && !pulling ? 0.28 : 0.1;
  const tailWag   = Math.sin(frame * wagSpeed) * (walking ? 0.55 : 0.32);
  const cycle     = frame * 0.18;
  const legFL     = walking ? Math.sin(cycle) * 0.58 : 0;
  const legFR     = walking ? Math.sin(cycle + Math.PI) * 0.58 : 0;
  const legBL     = walking ? Math.sin(cycle + Math.PI) * 0.58 : 0;
  const legBR     = walking ? Math.sin(cycle) * 0.58 : 0;
  const headPitch = pulling ? 0.24 : 0;
  const bodyLean  = pulling ? 0.09 : 0;

  const legs: [number, number, number, number][] = [
    [-0.37, 0.72, 0.58, legFL],
    [ 0.37, 0.72, 0.58, legFR],
    [-0.37, 0.70,-0.64, legBL],
    [ 0.37, 0.70,-0.64, legBR],
  ];

  return (
    <group position={[0, 0, dogZ]} scale={[dogScale, dogScale, dogScale]}>

      {/* ── Body ── */}
      <mesh position={[0, 1.18 + breathe, 0]} scale={[1.3, 0.92, 2.0]} rotation={[-bodyLean, 0, 0]}>
        <boxGeometry />
        <meshStandardMaterial color={FUR} roughness={0.84} />
      </mesh>

      {/* ── Neck ── */}
      <mesh position={[0, 1.70 + breathe, 0.83]} rotation={[0.18 + bodyLean, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.30, 0.52, 12]} />
        <meshStandardMaterial color={FUR} roughness={0.84} />
      </mesh>

      {/* ── Head group ── */}
      <group position={[0, 2.12 + breathe, 1.07]} rotation={[headPitch + bodyLean, 0, 0]}>
        {/* Skull */}
        <mesh>
          <sphereGeometry args={[0.52, 20, 20]} />
          <meshStandardMaterial color={FUR} roughness={0.84} />
        </mesh>
        {/* Forehead bump */}
        <mesh position={[0, 0.28, -0.1]}>
          <sphereGeometry args={[0.32, 12, 12]} />
          <meshStandardMaterial color={FUR} roughness={0.84} />
        </mesh>
        {/* Snout */}
        <mesh position={[0, -0.12, 0.42]}>
          <boxGeometry args={[0.35, 0.27, 0.42]} />
          <meshStandardMaterial color={FUR_DARK} roughness={0.9} />
        </mesh>
        {/* Lower jaw */}
        <mesh position={[0, -0.21, 0.38]}>
          <boxGeometry args={[0.30, 0.10, 0.36]} />
          <meshStandardMaterial color={FUR_DARK} roughness={0.9} />
        </mesh>
        {/* Nose */}
        <mesh position={[0, -0.08, 0.63]}>
          <sphereGeometry args={[0.086, 10, 10]} />
          <meshStandardMaterial color="#050505" roughness={0.25} metalness={0.4} />
        </mesh>

        {/* Eyes */}
        {([-1, 1] as const).map((side) => (
          <group key={side} position={[side * 0.20, 0.13, 0.44]}>
            <mesh>
              <sphereGeometry args={[0.074, 10, 10]} />
              <meshStandardMaterial color="#060606" roughness={0.08} metalness={0.6} />
            </mesh>
            {/* Eye shine */}
            <mesh position={[side * -0.02, 0.028, 0.062]}>
              <sphereGeometry args={[0.022, 6, 6]} />
              <meshStandardMaterial color="#ffffff" roughness={0} />
            </mesh>
          </group>
        ))}

        {/* Ears */}
        {([-1, 1] as const).map((side) => (
          <mesh key={side} position={[side * 0.44, 0.06, -0.09]} rotation={[0.10, 0, side * 0.34]}>
            <boxGeometry args={[0.20, 0.52, 0.15]} />
            <meshStandardMaterial color={FUR_DARK} roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* ── Red Collar ── */}
      <mesh position={[0, 1.74 + breathe, 0.83]} rotation={[Math.PI / 2 + 0.12, 0, 0]}>
        <torusGeometry args={[0.29, 0.07, 10, 44]} />
        <meshStandardMaterial color={COLLAR_CLR} metalness={0.25} roughness={0.65} />
      </mesh>

      {/* ── Legs ── */}
      {legs.map(([x, y, z, rot], i) => (
        <group key={i} position={[x, y, z]} rotation={[rot, 0, 0]}>
          {/* Upper leg */}
          <mesh position={[0, -0.24, 0]}>
            <cylinderGeometry args={[0.14, 0.12, 0.52, 10]} />
            <meshStandardMaterial color={FUR} roughness={0.84} />
          </mesh>
          {/* Lower leg */}
          <mesh position={[0, -0.60, 0.04]}>
            <cylinderGeometry args={[0.11, 0.09, 0.46, 10]} />
            <meshStandardMaterial color={FUR} roughness={0.84} />
          </mesh>
          {/* Paw */}
          <mesh position={[0, -0.88, 0.08]}>
            <boxGeometry args={[0.18, 0.10, 0.27]} />
            <meshStandardMaterial color={FUR_DARK} roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* ── Tail ── */}
      <group position={[0, 1.40 + breathe, -0.97]} rotation={[-0.42, 0, tailWag]}>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.072, 0.13, 0.5, 8]} />
          <meshStandardMaterial color={FUR} roughness={0.82} />
        </mesh>
        <mesh position={[0, 0.55, 0.08]} rotation={[-0.3, 0, tailWag * 0.5]}>
          <cylinderGeometry args={[0.05, 0.072, 0.36, 8]} />
          <meshStandardMaterial color={FUR} roughness={0.82} />
        </mesh>
      </group>

    </group>
  );
};

// ─── Floating step badge (3D space) ──────────────────────────────────────────
const StepRing3D: React.FC<{ frame: number; fps: number; step: number; accentColor: string }> = ({
  frame, fps, step: _step, accentColor,
}) => {
  const p = spr(frame, fps, 5, 160);
  const spin = frame * 0.015;
  return (
    <group position={[0, 4.8, 0]} rotation={[0, spin, 0]} scale={[p, p, p]}>
      <mesh>
        <torusGeometry args={[1.1, 0.06, 8, 60]} />
        <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.5} metalness={0.8} roughness={0.1} />
      </mesh>
    </group>
  );
};

// ─── HTML text helpers ────────────────────────────────────────────────────────
const SlideUp: React.FC<{
  delay?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ delay = 0, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spr(frame, fps, delay, 200);
  return (
    <div style={{
      opacity   : p,
      transform : `translateY(${interpolate(p, [0, 1], [28, 0])}px)`,
      ...style,
    }}>
      {children}
    </div>
  );
};

// ─── Overlay text for a scene ─────────────────────────────────────────────────
type OverlayProps = {
  step?: number;
  eyebrow?: string;
  headline: string;
  body?: string;
  accent?: string;
};
const Overlay: React.FC<OverlayProps> = ({
  step, eyebrow, headline, body, accent = GOLD,
}) => (
  <AbsoluteFill style={{
    display       : "flex",
    flexDirection : "column",
    justifyContent: "flex-end",
    alignItems    : "center",
    padding       : "0 52px 85px",
    background    : "linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.25) 52%, transparent 72%)",
    pointerEvents : "none",
  }}>
    {/* Step badge */}
    {step !== undefined && (
      <SlideUp delay={0} style={{ marginBottom: 10 }}>
        <div style={{
          display     : "inline-block",
          background  : accent,
          color       : "#000",
          fontFamily  : "'Arial Black', Arial, sans-serif",
          fontWeight  : 900,
          fontSize    : 23,
          padding     : "5px 22px",
          borderRadius: 30,
          letterSpacing: 2,
        }}>
          STEP {step}
        </div>
      </SlideUp>
    )}

    {/* Eyebrow */}
    {eyebrow && (
      <SlideUp delay={4} style={{ textAlign: "center", marginBottom: 10 }}>
        <div style={{
          fontFamily  : "'Arial Black', Arial, sans-serif",
          fontSize    : 26,
          fontWeight  : 900,
          letterSpacing: 4,
          color       : accent,
          textTransform: "uppercase",
        }}>
          {eyebrow}
        </div>
      </SlideUp>
    )}

    {/* Headline */}
    <SlideUp delay={10} style={{ textAlign: "center", marginBottom: 18 }}>
      <div style={{
        fontFamily : "'Arial Black', Arial, sans-serif",
        fontSize   : 70,
        fontWeight : 900,
        color      : WHITE,
        lineHeight : 1.08,
        textShadow : `0 0 40px ${accent}55, 0 4px 22px rgba(0,0,0,0.85)`,
      }}>
        {headline}
      </div>
    </SlideUp>

    {/* Body */}
    {body && (
      <SlideUp delay={18} style={{ textAlign: "center", marginBottom: 18 }}>
        <div style={{
          fontFamily: "Arial, sans-serif",
          fontSize  : 32,
          color     : "rgba(255,255,255,0.88)",
          lineHeight: 1.55,
          maxWidth  : 840,
          textShadow: "0 2px 14px rgba(0,0,0,0.7)",
        }}>
          {body}
        </div>
      </SlideUp>
    )}

    {/* Accent bar */}
    <SlideUp delay={24}>
      <div style={{
        width       : 64,
        height      : 4,
        background  : accent,
        borderRadius: 2,
        boxShadow   : `0 0 16px ${accent}`,
        marginTop   : 4,
      }} />
    </SlideUp>
  </AbsoluteFill>
);

// ─── Main composition ─────────────────────────────────────────────────────────
export const MiracleLeashGuide: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Walking & pulling phases
  const walking = frame >= T.STEP3 && frame < T.CTA;
  const pulling  = frame >= T.STEP3 + 60 && frame < T.STEP4;

  // Loop tightness: tightens when pulling, loosens when dog relaxes
  const tightIn  = prog(frame, T.STEP3 + 60, T.STEP3 + 120);
  const tightOut = prog(frame, T.STEP4,       T.STEP4 + 70);
  const loopTight = Math.max(0, tightIn - tightOut);

  // Dog Z position – lurches forward when pulling, eases back when calm
  const moveForward = prog(frame, T.STEP3, T.STEP3 + 90);
  const moveBack    = prog(frame, T.STEP4, T.STEP4 + 70);
  const dogZ = interpolate(moveForward - moveBack, [-1, 0, 1], [0.5, 0, -0.65]);

  const accentForStep = (s: number) =>
    [GOLD, "#4FC3F7", "#81C784", "#FF8C00"][s - 1] ?? GOLD;

  return (
    <AbsoluteFill style={{ background: BG_COLOR }}>

      {/* ── 3D canvas ── */}
      <ThreeCanvas width={width} height={height}>
        <CameraCtrl frame={frame} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 9, 6]}  intensity={1.15} color="#fff8e0" />
        <pointLight       position={[-3, 5, 4]} intensity={0.70} color={GOLD} />
        <pointLight       position={[3, 2, -3]} intensity={0.40} color="#4FC3F7" />
        <pointLight       position={[0, 0, 5]}  intensity={0.30} color={GOLD} />

        <Ground     frame={frame} fps={fps} />
        <GridLines  frame={frame} fps={fps} />

        <Dog3D
          frame={frame}
          fps={fps}
          walking={walking}
          pulling={pulling}
          loopTight={loopTight}
          dogZ={dogZ}
        />

        <LeashLoop3D
          frame={frame}
          fps={fps}
          tight={loopTight}
          breathe={Math.sin(frame * 0.06) * 0.012}
          dogZ={dogZ}
        />

        <LeashLine
          frame={frame}
          fps={fps}
          pulling={pulling}
          dogZ={dogZ}
        />

        <CollarArrow frame={frame} fps={fps} dogZ={dogZ} />

        {/* Spinning accent ring near top */}
        {frame >= T.INTRO && frame < T.DOG && (
          <Sequence layout="none" from={T.INTRO} durationInFrames={T.DOG - T.INTRO}>
            <StepRing3D frame={frame - T.INTRO} fps={fps} step={0} accentColor={GOLD} />
          </Sequence>
        )}
      </ThreeCanvas>

      {/* ── Vignette ── */}
      <AbsoluteFill style={{
        background   : "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.60) 100%)",
        pointerEvents: "none",
      }} />

      {/* ── Scene text overlays ── */}

      {/* Intro */}
      <Sequence from={T.INTRO} durationInFrames={T.DOG - T.INTRO} premountFor={fps}>
        <Overlay
          eyebrow="Introducing"
          headline="Miracle Leash"
          body="The smart attachment that transforms any leash into a calmer walk."
          accent={GOLD}
        />
      </Sequence>

      {/* Meet the dog */}
      <Sequence from={T.DOG} durationInFrames={T.STEP1 - T.DOG} premountFor={fps}>
        <Overlay
          eyebrow="Meet Your Dog"
          headline="Ready to Walk"
          body="Excited, curious — and sometimes a little hard to control on leash."
          accent="#81C784"
        />
      </Sequence>

      {/* Step 1 – attach loop */}
      <Sequence from={T.STEP1} durationInFrames={T.STEP2 - T.STEP1} premountFor={fps}>
        <Overlay
          step={1}
          eyebrow="Attach to Collar"
          headline="Loop It On"
          body="Slide the Miracle Leash loop over your dog's collar or harness. No tools — clicks on in seconds."
          accent={accentForStep(1)}
        />
      </Sequence>

      {/* Step 2 – connect existing leash */}
      <Sequence from={T.STEP2} durationInFrames={T.STEP3 - T.STEP2} premountFor={fps}>
        <Overlay
          step={2}
          eyebrow="Connect Your Leash"
          headline="Clip It In"
          body="Attach your existing leash to the golden loop. Works with any leash, collar or harness."
          accent={accentForStep(2)}
        />
      </Sequence>

      {/* Step 3a – calm walk */}
      <Sequence from={T.STEP3} durationInFrames={60} premountFor={fps}>
        <Overlay
          step={3}
          eyebrow="Start Your Walk"
          headline="All Is Calm"
          body="The loop hangs loose. Your dog walks comfortably by your side."
          accent={accentForStep(2)}
        />
      </Sequence>

      {/* Step 3b – dog pulls */}
      <Sequence from={T.STEP3 + 60} durationInFrames={T.STEP4 - (T.STEP3 + 60)} premountFor={fps}>
        <Overlay
          step={3}
          eyebrow="Dog Starts Pulling!"
          headline="Loop Tightens"
          body="The loop gently tightens — giving your dog instant, natural feedback without harsh yanking."
          accent={accentForStep(4)}
        />
      </Sequence>

      {/* Step 4 – relax */}
      <Sequence from={T.STEP4} durationInFrames={T.CTA - T.STEP4} premountFor={fps}>
        <Overlay
          step={4}
          eyebrow="Dog Relaxes"
          headline="Loop Loosens"
          body="The moment your dog eases up, the loop releases instantly. Calm walk restored."
          accent={GOLD}
        />
      </Sequence>

      {/* CTA */}
      <Sequence from={T.CTA} durationInFrames={GUIDE_DURATION - T.CTA} premountFor={fps}>
        <Overlay
          eyebrow="Get Yours Today"
          headline="miracleleash.com"
          body="Smarter walks. Happier dogs. Works with any leash."
          accent={GOLD}
        />
      </Sequence>

    </AbsoluteFill>
  );
};
