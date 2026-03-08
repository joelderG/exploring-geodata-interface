export interface TouchPoint {
    Position: {
        X: number;
        Y: number;
        Z: number;
        IsFiltered: boolean;
        IsValid: boolean;
    };
    ExtremumDescription: {
        Type: number; 
        NumFittingPoints: number;
        PercentageFittingPoints: number;
    };
    TouchId: number;
    Time: bigint;
    Confidence: number;
    Type: number;
}
