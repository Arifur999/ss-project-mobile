import { api, type ApiEnvelope } from '@/lib/httpClient';

/** A file on the phone, ready to send: where it is, what to call it, what it is. */
export type LocalImage = { uri: string; name: string; mimeType: string };

/**
 * Uploads an image (a product photo, the business logo) and returns its hosted
 * URL - POST /uploads/image, the same endpoint the website uses. The server
 * takes one JPEG, PNG, WebP or GIF of up to 5 MB, under the field name "image".
 */
export async function uploadImage(image: LocalImage): Promise<string> {
  const form = new FormData();
  // React Native's FormData takes a { uri, name, type } file descriptor.
  form.append('image', { uri: image.uri, name: image.name, type: image.mimeType } as unknown as Blob);
  const res = await api.post<ApiEnvelope<{ url: string }>>('/uploads/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return res.data.data.url;
}
