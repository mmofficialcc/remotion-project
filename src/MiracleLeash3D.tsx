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
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

// ─── Colour palette ───────────────────────────────────────────────────────────
const GOLD = "#F5C842";
const WHITE = "#FFFFFF";
const DARK = "#0a0a0f";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const useSpr = (frame: number, fps: number, delay = 0, damping = 200) =>
  spring({ frame: frame - delay, fps, config: { damping } });

// ─── 3-D pieces ───────────────────────────────────────────────────────────────

/** Spinning torus — the core "loop" metaphor for the leash attachment */
const LeashLoop: React.FC<{ frame: number; fps: number }> = ({
  frame,
  fps,
}) => {
  const enter = useSpr(frame, fps, 0, 80);
  const rotY = interpolate(frame, [0, 300], [0, Math.PI * 4]);
  const rotX = interpolate(frame, [0, 300], [0, Math.PI]);
  const scale = interpolate(enter, [0, 1], [0.01, 1.4]);

  return (
    <mesh rotation={[rotX, rotY, 0.4]} scale={[scale, scale, scale]}>
      <torusGeometry args={[1.2, 0.28, 32, 100]} />
      <meshStandardMaterial
        color={GOLD}
        metalness={0.9}
        roughness={0.1}
        envMapIntensity={1}
      />
    </mesh>
  );
};

/** Small orbiting ring that encircles the main torus */
const OrbitRing: React.FC<{
  frame: number;
  fps: number;
  offset?: number;
  color?: string;
}> = ({ frame, fps, offset = 0, color = "#ffffff" }) => {
  const enter = useSpr(frame, fps, offset, 120);
  const angle = interpolate(frame, [0, 240], [0, Math.PI * 2]) + offset;
  const x = Math.sin(angle) * 2.6;
  const z = Math.cos(angle) * 2.6;
  const scale = interpolate(enter, [0, 1], [0, 0.55]);

  return (
    <mesh position={[x, 0, z]} scale={[scale, scale, scale]}>
      <torusGeometry args={[0.55, 0.1, 16, 60]} />
      <meshStandardMaterial color={color} metalness={0.7} roughness={0.2} />
    </mesh>
  );
};

/** Floating particle cloud */
const Particles: React.FC<{ frame: number; count?: number }> = ({
  frame,
  count = 60,
}) => {
  const positions = React.useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const theta = (i / count) * Math.PI * 2;
      const r = 3 + Math.sin(i * 0.7) * 1.5;
      arr.push([
        Math.cos(theta) * r,
        (Math.random() - 0.5) * 4,
        Math.sin(theta) * r,
      ]);
    }
    return arr;
  }, [count]);

  return (
    <>
      {positions.map(([x, y, z], i) => {
        const drift = Math.sin(frame * 0.04 + i) * 0.12;
        return (
          <mesh key={i} position={[x, y + drift, z]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial
              color={i % 3 === 0 ? GOLD : WHITE}
              emissive={i % 3 === 0 ? GOLD : "#aaaaaa"}
              emissiveIntensity={0.6}
            />
          </mesh>
        );
      })}
    </>
  );
};

/** Animated paw-print hex grid (abstract) */
const HexGrid: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const enter = useSpr(frame, fps, 0, 200);
  const opacity = interpolate(enter, [0, 1], [0, 0.18]);

  const hexes = React.useMemo(() => {
    const arr: [number, number][] = [];
    for (let row = -3; row <= 3; row++) {
      for (let col = -4; col <= 4; col++) {
        arr.push([col * 1.1 + (row % 2) * 0.55, row * 0.95]);
      }
    }
    return arr;
  }, []);

  return (
    <>
      {hexes.map(([x, y], i) => (
        <mesh key={i} position={[x, y, -3]} rotation={[0, 0, Math.PI / 6]}>
          <cylinderGeometry args={[0.45, 0.45, 0.04, 6]} />
          <meshStandardMaterial
            color={GOLD}
            opacity={opacity}
            transparent
            metalness={0.5}
          />
        </mesh>
      ))}
    </>
  );
};

// ─── Overlay text helpers ─────────────────────────────────────────────────────

const AnimText: React.FC<{
  children: React.ReactNode;
  frame: number;
  fps: number;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, frame, fps, delay = 0, style }) => {
  const p = useSpr(frame, fps, delay, 200);
  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ─── Scene definitions ────────────────────────────────────────────────────────

const SCENE_DURATION = 5 * 30; // 5 s × 30 fps
const TRANSITION_FRAMES = 18;

interface SceneProps {
  emoji?: string;
  eyebrow?: string;
  headline: string;
  body: string;
  accentColor?: string;
}

const ProductScene3D: React.FC<SceneProps> = ({
  emoji,
  eyebrow,
  headline,
  body,
  accentColor = GOLD,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: DARK }}>
      {/* 3-D canvas */}
      <ThreeCanvas width={width} height={height}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} color="#fff8e0" />
        <pointLight position={[-4, -3, 4]} intensity={0.6} color={accentColor} />
        <pointLight position={[4, 3, -4]} intensity={0.4} color="#4FC3F7" />

        <Sequence layout="none">
          <HexGrid frame={frame} fps={fps} />
          <LeashLoop frame={frame} fps={fps} />
          <OrbitRing frame={frame} fps={fps} offset={0} color={accentColor} />
          <OrbitRing
            frame={frame}
            fps={fps}
            offset={Math.PI * 0.66}
            color="#4FC3F7"
          />
          <OrbitRing
            frame={frame}
            fps={fps}
            offset={Math.PI * 1.33}
            color="#81C784"
          />
          <Particles frame={frame} count={50} />
        </Sequence>
      </ThreeCanvas>

      {/* Dark gradient vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.75) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Bottom gradient for text */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 45%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Text overlay */}
      <AbsoluteFill
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          padding: "0 60px 90px",
          gap: 16,
        }}
      >
        {emoji && (
          <AnimText frame={frame} fps={fps} delay={0}>
            <div style={{ fontSize: 80, lineHeight: 1 }}>{emoji}</div>
          </AnimText>
        )}

        {eyebrow && (
          <AnimText frame={frame} fps={fps} delay={5}>
            <div
              style={{
                fontFamily: "'Arial Black', Arial, sans-serif",
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: 5,
                color: accentColor,
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              {eyebrow}
            </div>
          </AnimText>
        )}

        <AnimText frame={frame} fps={fps} delay={10}>
          <div
            style={{
              fontFamily: "'Arial Black', Arial, sans-serif",
              fontSize: 76,
              fontWeight: 900,
              color: WHITE,
              textAlign: "center",
              lineHeight: 1.08,
              textShadow: `0 0 40px ${accentColor}55, 0 4px 20px rgba(0,0,0,0.8)`,
            }}
          >
            {headline}
          </div>
        </AnimText>

        <AnimText frame={frame} fps={fps} delay={16}>
          <div
            style={{
              fontFamily: "Arial, sans-serif",
              fontSize: 34,
              color: "rgba(255,255,255,0.85)",
              textAlign: "center",
              lineHeight: 1.55,
              maxWidth: 820,
              textShadow: "0 2px 10px rgba(0,0,0,0.7)",
            }}
          >
            {body}
          </div>
        </AnimText>

        {/* Accent line */}
        <AnimText frame={frame} fps={fps} delay={22}>
          <div
            style={{
              width: 70,
              height: 4,
              background: accentColor,
              borderRadius: 2,
              marginTop: 8,
              boxShadow: `0 0 16px ${accentColor}`,
            }}
          />
        </AnimText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Scenes data ──────────────────────────────────────────────────────────────

const SCENES: SceneProps[] = [
  {
    eyebrow: "Introducing",
    headline: "Miracle Leash",
    body: "The attachment that transforms any leash into a smarter, smoother walking system.",
    accentColor: GOLD,
  },
  {
    emoji: "🔧",
    eyebrow: "Automatic Adjustable",
    headline: "Lead Enhancer",
    body: "The built-in loop responds to your dog's movement — tightens gently on pull, loosens instantly on relax.",
    accentColor: "#4FC3F7",
  },
  {
    emoji: "🐕",
    eyebrow: "Gentle Loop-Control",
    headline: "Better Walks",
    body: "No harsh corrections. Just natural feedback that guides your dog toward calmer, steadier habits.",
    accentColor: "#81C784",
  },
  {
    emoji: "🔗",
    eyebrow: "Universal Fit",
    headline: "Any Leash. Any Dog.",
    body: "Works with most collars, harnesses, and leash styles — small, medium, and large dogs.",
    accentColor: "#FFB74D",
  },
  {
    emoji: "🚶",
    eyebrow: "Built For Every Day",
    headline: "Lightweight & Durable",
    body: "Reinforced strap construction. Comfortable in hand. Ready for every neighborhood walk.",
    accentColor: "#CE93D8",
  },
  {
    emoji: "🐾",
    eyebrow: "Get Yours Today",
    headline: "miracleleash.com",
    body: "Smarter walks. Happier dogs. No leash replacement needed.",
    accentColor: GOLD,
  },
];

// ─── Root composition ─────────────────────────────────────────────────────────

export const MiracleLeash3D: React.FC = () => {
  return (
    <AbsoluteFill>
      <TransitionSeries>
        {SCENES.map((scene, i) => (
          <React.Fragment key={i}>
            <TransitionSeries.Sequence durationInFrames={SCENE_DURATION}>
              <ProductScene3D {...scene} />
            </TransitionSeries.Sequence>
            {i < SCENES.length - 1 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>
    </AbsoluteFill>
  );
};

// ─── Total duration helper (used in Root.tsx) ─────────────────────────────────
export const MIRACLE_3D_DURATION =
  SCENES.length * SCENE_DURATION - (SCENES.length - 1) * TRANSITION_FRAMES;
