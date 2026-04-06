import "./index.css";
import { Composition } from "remotion";
import { MiracleLeash } from "./MiracleLeash";
import { MiracleLeash3D, MIRACLE_3D_DURATION } from "./MiracleLeash3D";
import { MiracleLeashGuide, GUIDE_DURATION } from "./MiracleLeashGuide";
import { MiracleLeashGuide2, GUIDE2_DURATION } from "./MiracleLeashGuide2";
import { MiracleLeashFinal, FINAL_DURATION } from "./MiracleLeashFinal";
import { MiracleLeashV2, V2_DURATION } from "./MiracleLeashV2";

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
      {/* Advanced 3D guide – multi-angle, product video intro/outro */}
      <Composition
        id="MiracleLeashGuide2"
        component={MiracleLeashGuide2}
        durationInFrames={GUIDE2_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* Final cinematic video – accurate product model, hand attach, full story */}
      <Composition
        id="MiracleLeashFinal"
        component={MiracleLeashFinal}
        durationInFrames={FINAL_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />

      {/* V2 – accurate 2D explainer based on real product demo video */}
      <Composition
        id="MiracleLeashV2"
        component={MiracleLeashV2}
        durationInFrames={V2_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
