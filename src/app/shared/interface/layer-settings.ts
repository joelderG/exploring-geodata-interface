import { InteractionMetaphor } from "../enum/interaction-metaphor";

export interface LayerSettings {
    interpolateColor: boolean;
    interaction: InteractionMetaphor;
    showLenseUI: boolean;
    showLayerUI: boolean;
    applyCalibration: boolean;
    defaultLensMaskIdx: number;
    lensBorderColor: string;
    lensSize: number;
    lensOffsetX: number;
    lensOffsetY: number;
    maxNumLenses: number;
}
