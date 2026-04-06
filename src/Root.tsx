import "./index.css";
import { Composition } from "remotion";
import { MiracleLeash } from "./MiracleLeash";
import { MiracleLeash3D, MIRACLE_3D_DURATION } from "./MiracleLeash3D";
import { MiracleLeashGuide, GUIDE_DURATION } from "./MiracleLeashGuide";

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Original 2D ad with background video */}
      <Composition
        id="MiracleLeash"
        component={MiracleLeash}
        durationInFrames={7 * 4 * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* 3D abstract product ad */}
      <Composition
        id="MiracleLeash3D"
        component={MiracleLeash3D}
        durationInFrames={MIRACLE_3D_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* 3D dog step-by-step how-to guide */}
      <Composition
        id="MiracleLeashGuide"
        component={MiracleLeashGuide}
        durationInFrames={GUIDE_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
