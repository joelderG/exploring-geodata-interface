// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  serverAddress: 'localhost',
  serverPort: '5000',
  enableDepthImageRoute: 'api/Tracking/SetDepthImagePreview/',
  startWebSocketsRoute: 'api/Network/StartBroadcast/',
  enablePointCloudImageRoute: 'api/Tracking/SetDepthImagePointCloudPreview',
  calibrationRoute: 'api/Calibration/GetCalibrationMatrix',
  pointCloudHub: 'pointcloudhub',
  networkingConfig: {
    'address': 'localhost',
    'endPoint': '/ReFlex',
    'port': 40001,
    'networkInterfaceType': 1
  },
  depthImageRoute: 'depthImage',
  pointCloudImageRoute: 'depthImagePointCloud',
  websocketUrl: 'ws://localhost:40001/ReFlex',
  dataRepository: 'assets/data/data.json',
  settingsFile: 'assets/data/settings.json',
  keyConfigFile: 'assets/data/keybindings.json',
  textureResourceId: 6,
  maxTexture2dCount: 15
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
