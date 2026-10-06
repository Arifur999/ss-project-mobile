// The geometry behind the two dashboard charts, as the design computes it.

/**
 * A smooth line through the points: each segment a cubic whose handles sit a
 * third of the way along, level with its end points - the design's curve(),
 * which never overshoots below zero the way a Catmull-Rom spline would.
 */
export function smoothPath(xs: number[], ys: number[]): string {
  if (xs.length === 0) return '';
  let d = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 1; i < xs.length; i++) {
    const dx = xs[i] - xs[i - 1];
    d +=
      ` C${(xs[i - 1] + dx / 3).toFixed(1)},${ys[i - 1].toFixed(1)}` +
      ` ${(xs[i] - dx / 3).toFixed(1)},${ys[i].toFixed(1)}` +
      ` ${xs[i].toFixed(1)},${ys[i].toFixed(1)}`;
  }
  return d;
}

const TOPS = [1, 1.2, 1.6, 2, 2.4, 3, 4, 5, 6, 8, 10];

/**
 * The cashflow axis top: the smallest round figure at or above the peak whose
 * half is round too - 15,200 tops out at 16k with 8k between, as drawn.
 */
export function cashflowTop(peak: number): number {
  if (!(peak > 0)) return 1000;
  const power = 10 ** Math.floor(Math.log10(peak));
  const step = TOPS.find((c) => c * power >= peak) ?? 10;
  return step * power;
}

const STEPS = [1, 2, 4, 5];

/**
 * The bar chart's ticks: the smallest 1/2/4/5 step that covers the peak in at
 * most three intervals - sales of 1.06M give 0/400k/800k/1.2M, expenses of
 * 131k give 0/50k/100k/150k, exactly the design's axes.
 */
export function barTicks(peak: number): { max: number; ticks: number[] } {
  if (!(peak > 0)) return { max: 1000, ticks: [1000, 500, 0] };
  let power = 10 ** Math.floor(Math.log10(peak) - 1);
  for (;;) {
    for (const s of STEPS) {
      const step = s * power;
      const intervals = Math.ceil(peak / step);
      if (intervals <= 3) {
        const max = intervals * step;
        return { max, ticks: Array.from({ length: intervals + 1 }, (_, i) => max - i * step) };
      }
    }
    power *= 10;
  }
}
