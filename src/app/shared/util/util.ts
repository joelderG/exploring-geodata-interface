export function scale(number: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}
  
  
/**
   * @brief This function is used to smooth jittered sensor readings.
   * 
   * @param raw_value the jittered sensor reading
   * @param weight the amount of smoothing [0.0 – 1.0], where lower values result in
   * smoother values
   * @param filtered_value the previously smoothed value
   * 
   * @return smoothed sensor reading
   */
export function apply1DFilter(rawValue: number, weight: number, filteredValue: number): number {
  return ((1.0 - weight) * filteredValue) + (weight * rawValue);
}
  
export function hexToRgb(hex: string) : RGBColor {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(shorthandRegex, function(m, r, g, b) {
    return r + r + g + g + b + b;
  });
  
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : {
    r: 1,
    g: 1,
    b: 1
  };
}

export interface RGBColor {
    r: number,
    g: number,
    b: number
  }