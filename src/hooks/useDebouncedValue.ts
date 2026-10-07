import { useEffect, useState } from 'react';

/**
 * The value, once it has stopped changing for `delay` ms - so a search box asks
 * the server once per pause, not once per keystroke.
 */
export function useDebouncedValue<T>(value: T, delay = 350): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}
