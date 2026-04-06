import React from "react";
import {
  AbsoluteFill,
  interpolate,
  Series,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Video } from "@remotion/media";
import { staticFile } from "remotion";

// ── Slide data ────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    emoji: null,
    eyebrow: null,
    headline: "Miracle Leash",
    sub: "Take back control of your walks.",
    accent: "#F5C842",
  },
  {
    emoji: "🐾",
    eyebrow: "TRANSFORMS ANY LEASH",
    headline: "Into a Miracle",
    sub: "Instantly upgrades your existing leash into a smoother, more responsive walking system.",
    accent: "#F5C842",
  },
  {
    emoji: "🔧",
    eyebrow: "AUTOMATIC ADJUSTABLE",
    headline: "Lead Enhancer",
    sub: "Responds naturally to your dog's movement — tightens gently when they pull, loosens when they relax.",
    accent: "#4FC3F7",
  },
  {
    emoji: "🐕",
    eyebrow: "GENTLE LOOP‑CONTROL",
    headline: "Better Walks",
    sub: "Guides your dog's attention without harsh corrections. Steady pace, calmer habits.",
    accent: "#81C784",
  },
  {
    emoji: "🔗",
    eyebrow: "NO REPLACEMENT NEEDED",
    headline: "Works With Any Leash",
    sub: "Connects easily to most collars, harnesses, and leash styles — instant upgrade, zero hassle.",
    accent: "#FFB74D",
  },
  {
    emoji: "🚶",
    eyebrow: "BUILT FOR DAILY USE",
    headline: "Lightweight & Durable",
    sub: "Reinforced strap construction. Comfortable in hand. Perfect for small, medium & large dogs.",
    accent: "#CE93D8",
  },
  {
    emoji: null,
    eyebrow: "GET YOURS TODAY",
    headline: "miracleleash.com",
    sub: "Smarter walks. Happier dogs.",
    accent: "#F5C842",
  },
];

const SLIDE_DURATION_S = 4; // seconds per slide

// ── Reusable animated text ───────────────────────────────────────────────────

const SlideUp: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200 },
    durationInFrames: 20,
  });

  const translateY = interpolate(progress, [0, 1], [40, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        transform: `translateY(${translateY}px)`,
        opacity,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ── Single slide ─────────────────────────────────────────────────────────────

const Slide: React.FC<(typeof SLIDES)[number]> = ({
  emoji,
  eyebrow,
  headline,
  sub,
  accent,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade out near end
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 10, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 50px",
        opacity: fadeOut,
      }}
    >
      {/* Emoji */}
      {emoji && (
        <SlideUp delay={0}>
          <div style={{ fontSize: 100, lineHeight: 1, marginBottom: 24 }}>
            {emoji}
          </div>
        </SlideUp>
      )}

      {/* Eyebrow */}
      {eyebrow && (
        <SlideUp delay={4}>
          <div
            style={{
              fontFamily: "'Arial Black', Arial, sans-serif",
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 4,
              color: accent,
              textTransform: "uppercase",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            {eyebrow}
          </div>
        </SlideUp>
      )}

      {/* Headline */}
      <SlideUp delay={8}>
        <div
          style={{
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontSize: emoji ? 72 : 88,
            fontWeight: 900,
            color: "#FFFFFF",
            textAlign: "center",
            lineHeight: 1.1,
            marginBottom: 28,
            textShadow: "0 4px 24px rgba(0,0,0,0.6)",
          }}
        >
          {headline}
        </div>
      </SlideUp>

      {/* Sub text */}
      <SlideUp delay={14}>
        <div
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: 34,
            fontWeight: 400,
            color: "rgba(255,255,255,0.88)",
            textAlign: "center",
            lineHeight: 1.5,
            maxWidth: 800,
            textShadow: "0 2px 12px rgba(0,0,0,0.5)",
          }}
        >
          {sub}
        </div>
      </SlideUp>

      {/* Accent line */}
      <SlideUp delay={20}>
        <div
          style={{
            width: 80,
            height: 5,
            backgroundColor: accent,
            borderRadius: 3,
            marginTop: 40,
          }}
        />
      </SlideUp>
    </AbsoluteFill>
  );
};

// ── Main composition ──────────────────────────────────────────────────────────

export const MiracleLeash: React.FC = () => {
  const { fps } = useVideoConfig();
  const slideDuration = SLIDE_DURATION_S * fps;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Background video — looped, muted, full cover */}
      <Video
        src={staticFile("miracle-leash.mp4")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        muted
        loop
      />

      {/* Dark overlay for readability */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.75) 100%)",
        }}
      />

      {/* Slides */}
      <Series>
        {SLIDES.map((slide, i) => (
          <Series.Sequence
            key={i}
            durationInFrames={slideDuration}
            premountFor={fps}
          >
            <Slide {...slide} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
