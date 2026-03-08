import { LayerSettings } from "./layer-settings";

export interface AppSettings {
  defaultResourceId: number;
  showDepthImage: boolean;
  hideSettingsPanel: boolean;
  doOverrideDepth: boolean;
  depthOverrideValue: number;
  minDepth: number;
  maxDepth: number;
  streamNativeDepthImage: boolean;
  lensMasks: string[];
  enableIdleMode: boolean;
  useLogo: boolean;
  idleLogoImage: string;
  defaultLayerSettings: LayerSettings;
}
