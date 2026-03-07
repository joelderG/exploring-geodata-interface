import { PixelFormat } from "three";
import { TextureResourceType } from "../enum/texture-resource-type";
import { TextureLayer } from "./texture-layer";
import { LayerSettings } from "./layer-settings";

export interface TextureResource {
    id: number;
    name: string;
    folder: string;
    type: TextureResourceType;
    layers: Array<TextureLayer>;
    idleLayers?: Array<TextureLayer>;
    numLayers: number;
    resX: number;
    resY: number;
    pixelFormat: PixelFormat;
    isActive: boolean;
    config: LayerSettings | undefined;
}
