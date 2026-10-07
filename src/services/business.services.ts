import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { http } from '@/lib/httpClient';

/** The workspace's business details, as /business-settings stores them. */
export interface BusinessSettings {
  name_bn?: string | null;
  name_en?: string | null;
  /** Both phones in one column, "01xxx, 01yyy" - the website's convention. */
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  website?: string | null;
  logo_url?: string | null;
}

/** The form's shape: the two phones split out, the name in one field. */
export interface BusinessInfo {
  name: string;
  phone1: string;
  phone2: string;
  email: string;
  address: string;
  website: string;
  logoUrl: string;
}

export function toBusinessInfo(s: BusinessSettings | null | undefined): BusinessInfo {
  const phones = String(s?.phone || '').split(',').map((p) => p.trim());
  return {
    name: String(s?.name_en || s?.name_bn || '').trim(),
    phone1: phones[0] || '',
    phone2: phones.slice(1).join(', '),
    email: String(s?.email || '').trim(),
    address: String(s?.address || '').trim(),
    website: String(s?.website || '').trim(),
    logoUrl: String(s?.logo_url || '').trim(),
  };
}

/**
 * Back to the stored shape. The name goes into both columns and the phones
 * are joined, exactly as the website's Business Info form saves them, so either
 * app can edit what the other wrote.
 */
export function fromBusinessInfo(info: BusinessInfo): BusinessSettings {
  return {
    name_bn: info.name.trim(),
    name_en: info.name.trim(),
    phone: [info.phone1.trim(), info.phone2.trim()].filter(Boolean).join(', '),
    email: info.email.trim(),
    address: info.address.trim(),
    website: info.website.trim(),
    logo_url: info.logoUrl.trim(),
  };
}

export const getBusinessSettings = () => http.get<BusinessSettings | null>('/business-settings');

export const saveBusinessSettings = (settings: BusinessSettings) =>
  http.put<BusinessSettings>('/business-settings', settings);

export const BUSINESS_KEY = ['business-settings'] as const;

export function useBusinessSettings() {
  return useQuery({ queryKey: BUSINESS_KEY, queryFn: getBusinessSettings });
}

/** Saves and refreshes every screen showing the business details. */
export function useSaveBusinessSettings() {
  const queryClient = useQueryClient();
  return useCallback(
    async (info: BusinessInfo) => {
      const saved = await saveBusinessSettings(fromBusinessInfo(info));
      queryClient.setQueryData(BUSINESS_KEY, saved);
      return saved;
    },
    [queryClient],
  );
}
