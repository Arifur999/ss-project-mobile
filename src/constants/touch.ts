/** The smallest a touch target may be, in points - Apple's 44pt; Android asks 48dp of a control drawn 40 or more. */
export const MIN_TOUCH = 44;

/**
 * Touch area above and below a control drawn shorter than MIN_TOUCH, so it is
 * hit at the size the platform guidelines ask while keeping the design's look.
 * Vertical only, so a row of chips or buttons never overlaps.
 */
export function slopFor(height: number) {
  const pad = Math.max(0, Math.ceil((MIN_TOUCH - height) / 2));
  return { top: pad, bottom: pad };
}
