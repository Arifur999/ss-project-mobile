import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Whether the phone asks for less motion - Android's Remove animations, iOS's
 * Reduce Motion - kept current while the screen is up. Native screen changes
 * follow the setting by themselves; animations the app drives itself ask here.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (alive) setReduced(on);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
