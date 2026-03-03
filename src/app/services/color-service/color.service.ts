import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ColorService {
  private readonly palette = ['#636EFA', '#EF553B', '#00CC96', '#AB63FA', '#FFA15A', '#19D3F3', '#FF6692', '#B6E880', '#FF97FF', '#FECB52'];

  private hexToRgb(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
  }

  public getColor(classIndex: number): string {
    return this.palette[classIndex % this.palette.length];
  }

  public buildColorscale(classes: number[]) {
    return this.buildDiscreteColorscale(classes).colorscale;
  }

  public buildDiscreteColorscale(classes: number[]) {
    const uniqueClasses = Array.from(new Set(classes));
    if (uniqueClasses.length === 0) {
      return { colorscale: [[0, '#000000'], [1, '#000000']], zmin: 0, zmax: 1, tickvals: [], ticktext: [] };
    }

    const classToColor = new Map<number, string>();
    uniqueClasses.forEach((cls, i) => classToColor.set(cls, this.getColor(i)));

    const sorted = [...uniqueClasses].sort((a, b) => a - b);
    const zmin = sorted[0];
    const zmax = sorted[sorted.length - 1];

    if (zmin === zmax) {
      const color = classToColor.get(zmin) ?? this.getColor(0);
      return {
        colorscale: [[0, color], [1, color]],
        zmin,
        zmax,
        tickvals: [zmin],
        ticktext: [`Klasse ${zmin}`]
      };
    }

    const colorscale: [number, string][] = [];
    const eps = 1e-6;
    sorted.forEach((cls, i) => {
      const pos = (cls - zmin) / (zmax - zmin);
      const color = classToColor.get(cls) ?? this.getColor(i);
      if (i > 0) {
        const prevCls = sorted[i - 1];
        const prevPos = (prevCls - zmin) / (zmax - zmin);
        const prevColor = classToColor.get(prevCls) ?? this.getColor(i - 1);
        colorscale.push([Math.min(1, prevPos + eps), prevColor]);
      }
      colorscale.push([pos, color]);
    });

    return {
      colorscale,
      zmin,
      zmax,
      tickvals: sorted,
      ticktext: sorted.map((cls) => `Klasse ${cls}`)
    };
  }
}
