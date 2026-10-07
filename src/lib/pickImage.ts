import * as ImagePicker from 'expo-image-picker';

import type { LocalImage } from '@/services/upload.services';

// Choosing a photo from the phone, checked against what the upload endpoint
// accepts (hatim_Backend config/multer.config.ts) before anything is sent: one
// JPEG, PNG, WebP or GIF of at most 5 MB. Catching it here says why at once,
// instead of a wait for the upload and a refusal at the end of it.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const TYPE_BY_EXTENSION: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

export type PickResult =
  | { status: 'picked'; image: LocalImage }
  | { status: 'cancelled' }
  | { status: 'denied' }
  | { status: 'tooLarge' }
  | { status: 'unsupported' };

function typeOf(asset: ImagePicker.ImagePickerAsset, name: string) {
  if (asset.mimeType) return asset.mimeType.toLowerCase();
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  return TYPE_BY_EXTENSION[extension] ?? '';
}

/**
 * Opens the photo library. `square` lets the user crop to 1:1 first - what a
 * product photo is shown as everywhere - which also keeps the file small.
 */
export async function pickImage({ square = false, fallbackName = 'image.jpg' } = {}): Promise<PickResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: 'denied' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return { status: 'cancelled' };

  const name = asset.fileName || fallbackName;
  const mimeType = typeOf(asset, name);
  if (!ALLOWED_TYPES.has(mimeType)) return { status: 'unsupported' };
  if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) return { status: 'tooLarge' };
  return { status: 'picked', image: { uri: asset.uri, name, mimeType } };
}
