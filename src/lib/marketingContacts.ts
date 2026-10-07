import { matches } from './search';

// Who an SMS can go to, gathered as Hatim/src/pages/Marketing.tsx gathers
// them: active customers, active suppliers (by company), active employees who
// have not resigned, the loan lenders and hand-typed numbers as one "contact
// list", and leads (by organization).

type Row = Record<string, any>;

export type ContactType = 'customer' | 'supplier' | 'employee' | 'contact' | 'lead';
export const CONTACT_TYPES: ContactType[] = ['customer', 'supplier', 'employee', 'contact', 'lead'];

export type Contact = { id: string; type: ContactType; name: string; phone: string; subtitle: string };

export function buildContacts(src: { customers: Row[]; suppliers: Row[]; employees: Row[]; lenders: Row[]; custom: Row[]; leads: Row[] }): Contact[] {
  const active = (rows: Row[]) => rows.filter((r) => r.is_active !== false);
  return [
    ...active(src.customers).map((c) => ({ id: `customer:${c.id}`, type: 'customer' as const, name: c.name || '', phone: c.phone || '', subtitle: c.address || '' })),
    ...active(src.suppliers).map((s) => ({
      id: `supplier:${s.id}`,
      type: 'supplier' as const,
      name: s.company_name || s.name || '',
      phone: s.phone || '',
      subtitle: s.name || '',
    })),
    ...active(src.employees)
      .filter((e) => !e.resign_date)
      .map((e) => ({ id: `employee:${e.id}`, type: 'employee' as const, name: e.name || '', phone: e.phone || '', subtitle: e.designation || e.address || '' })),
    ...active(src.lenders).map((l) => ({ id: `contact:${l.id}`, type: 'contact' as const, name: l.name || '', phone: l.phone || '', subtitle: l.lender_type || l.address || '' })),
    ...src.custom.map((c) => ({ id: `contact:${c.id}`, type: 'contact' as const, name: c.name || '', phone: c.phone || '', subtitle: c.note || '' })),
    ...src.leads.map((l) => ({
      id: `lead:${l.id}`,
      type: 'lead' as const,
      name: l.organization || l.name || '',
      phone: l.phone || '',
      subtitle: [l.name, l.designation].filter(Boolean).join(' - '),
    })),
  ];
}

/** The contacts of the chosen kinds that match the search. */
export const filterContacts = (contacts: Contact[], types: ContactType[], search: string) =>
  contacts.filter((c) => types.includes(c.type) && matches(search, c.name, c.phone, c.subtitle));
