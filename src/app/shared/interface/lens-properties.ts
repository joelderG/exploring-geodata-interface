export interface LensProperties {
    CanvasOffset: {
        X: number,
        Y: number
    },
    Description: string,
    LayerBackground: string,
    LensImage: string,
    LensOffset: {
        X: number,
        Y: number
    },
    TouchPosition: {
        X: number,
        Y: number
    }
}

export const DefaultLensProperties: LensProperties = {
    CanvasOffset: {
        X: 0,
        Y: 0
    },
    Description: "",
    LayerBackground: "",
    LensImage: "",
    LensOffset: {
        X: 0,
        Y: 0
    },
    TouchPosition: {
        X: 0,
        Y: 0
    }
}