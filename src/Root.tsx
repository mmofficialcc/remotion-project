import "./index.css";
import { Composition } from "remotion";
import { MiracleLeash } from "./MiracleLeash";
import { MiracleLeash3D, MIRACLE_3D_DURATION } from "./MiracleLeash3D";

const SLIDES = 7;
const SLIDE_DURATION_S = 4;
const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MiracleLeash"
        component={MiracleLeash}
        durationInFrames={SLIDES * SLIDE_DURATION_S * FPS}
        fps={FPS}
        width={1080}
        height={1920}
      />
      <Composition
        id="MiracleLeash3D"
        component={MiracleLeash3D}
        durationInFrames={MIRACLE_3D_DURATION}
        fps={FPS}
        width={1080}
        height={1920}
      />
    </>
  );
};
