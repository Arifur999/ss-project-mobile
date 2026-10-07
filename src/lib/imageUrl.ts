import { PixelRatio } from 'react-native';

// Product photos are Cloudinary uploads of a few megabytes each. A list of
// forty 56px thumbnails would otherwise download forty full photos, so a
// Cloudinary URL is asked for at the size it is drawn: cropped square, the
// device's pixel density, and Cloudinary's own format and quality choice.
// Any other URL (an image link typed on the website) is used as it is.

const UPLOAD_SEGMENT = '/image/upload/';

export function sizedImageUrl(url: string | null | undefined, size: number): string | null {
  const clean = String(url || '').trim();
  if (!/^https?:\/\//i.test(clean)) return null;
  const at = clean.indexOf(UPLOAD_SEGMENT);
  if (!/^https:\/\/res\.cloudinary\.com\//i.test(clean) || at < 0) return clean;
  const px = Math.round(size * Math.min(PixelRatio.get(), 3));
  const transform = `c_fill,w_${px},h_${px},q_auto,f_auto/`;
  const cut = at + UPLOAD_SEGMENT.length;
  return clean.slice(0, cut) + transform + clean.slice(cut);
}
