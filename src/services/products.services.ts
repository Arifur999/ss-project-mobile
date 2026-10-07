import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { http } from '@/lib/httpClient';
import { fetchList } from '@/services/list.services';
import { getPage, PAGE_SIZE, usePagedQuery, type Page } from '@/services/paged.services';

export type Supplier = { id: string; name: string; company_name?: string | null; is_active?: boolean | null };

/** A product as /products returns it: prices arrive as decimal strings, the supplier joined in. */
export type Product = {
  id: string;
  product_code: string;
  name: string;
  image_url?: string | null;
  category?: string | null;
  supplier_id?: string | null;
  /** DP rate, before its discount. */
  cost_price?: number | string | null;
  /** MRP, before its discount. */
  selling_price?: number | string | null;
  /** Percentages, 0-100. */
  dp_discount?: number | string | null;
  mrp_discount?: number | string | null;
  opening_qty?: number | null;
  size?: string | null;
  weight?: string | null;
  created_at?: string | null;
  suppliers?: Supplier | null;
};

/** How the website names a supplier: the company, else the person. */
export const supplierName = (supplier: Supplier | null | undefined) =>
  String(supplier?.company_name || supplier?.name || '').trim();

export const PRODUCTS_KEY = ['products'] as const;

/** The catalogue, newest first, searched on the server by code or name. */
export function useProducts(search: string) {
  return usePagedQuery<Page<Product>>([...PRODUCTS_KEY, 'list', search], async (page) => {
    const { data, total } = await getPage('/products', { page, limit: PAGE_SIZE, search: search || undefined });
    return { rows: Array.isArray(data) ? (data as Product[]) : [], total };
  });
}

/** Every category in use, for the form's suggestions. */
export function useProductCategories() {
  return useQuery({
    queryKey: [...PRODUCTS_KEY, 'categories'],
    queryFn: () => http.get<string[]>('/products/categories'),
    staleTime: 5 * 60 * 1000,
  });
}

/** Active suppliers by name, as the website's product form offers them. */
export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () =>
      ((await fetchList('/suppliers')) as Supplier[])
        .filter((s) => s.is_active !== false)
        .sort((a, b) => supplierName(a).localeCompare(supplierName(b))),
    staleTime: 5 * 60 * 1000,
  });
}

/** The form's payload. Empty prices go as null; the server keeps its default of 0. */
export type ProductInput = {
  product_code: string;
  name: string;
  image_url: string | null;
  category: string | null;
  supplier_id: string;
  cost_price: number | null;
  selling_price: number | null;
  dp_discount: number | null;
  mrp_discount: number | null;
  opening_qty: number;
  size: string | null;
  weight: string | null;
};

export const createProduct = (input: ProductInput) => http.post<Product>('/products', { ...input, is_active: true });
export const updateProduct = (id: string, input: ProductInput) => http.patch<Product>(`/products/${id}`, input);
export const deleteProduct = (id: string) => http.delete(`/products/${id}`);

/** How many sale and purchase lines use a product; one that is used is not deleted. */
export const getProductUsage = (id: string) => http.get<{ sales: number; purchases: number }>(`/products/${id}/usage`);

/**
 * Runs a write, then refetches the catalogue and the stock list, which shows
 * every product with its opening quantity and prices.
 */
export function useProductWrite() {
  const queryClient = useQueryClient();
  return useCallback(
    async <T,>(write: () => Promise<T>) => {
      const result = await write();
      await Promise.all([PRODUCTS_KEY, ['inventory']].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      return result;
    },
    [queryClient],
  );
}
