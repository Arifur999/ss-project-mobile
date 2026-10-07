import { useQuery } from '@tanstack/react-query';

import { buildContacts, type Contact } from '@/lib/marketingContacts';
import { fetchListOrDenied } from '@/services/list.services';

/** Everyone an SMS can go to, from the six lists the website reads; a list the user may not read is simply absent. */
export async function loadContacts(): Promise<Contact[]> {
  const [customers, suppliers, employees, lenders, custom, leads] = await Promise.all(
    ['/customers', '/suppliers', '/employees', '/loan-lenders', '/marketing-contacts', '/leads'].map((endpoint) => fetchListOrDenied(endpoint)),
  );
  return buildContacts({
    customers: customers.rows,
    suppliers: suppliers.rows,
    employees: employees.rows,
    lenders: lenders.rows,
    custom: custom.rows,
    leads: leads.rows,
  });
}

export function useContacts(enabled: boolean) {
  return useQuery({ queryKey: ['marketing-contacts'], queryFn: loadContacts, enabled });
}
