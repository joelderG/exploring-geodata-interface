import { PixelFormat } from "three";
import { TextureResourceType } from "../enum/texture-resource-type";
import { TextureLayer } from "./texture-layer";
import { LayerSettings } from "./layer-settings";

export interface TextureResource {
    id: number;
    name: string;
    folder: string;
    type: TextureResourceType;
    layers: TextureLayer[];
    idleLayers?: TextureLayer[];
    numLayers: number;
    resX: number;
    resY: number;
    pixelFormat: PixelFormat;
    isActive: boolean;
    config: LayerSettings | undefined;
}
