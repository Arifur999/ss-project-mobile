import { MapPin, Phone, User } from 'lucide-react-native';

import type { TextFieldProps } from '@/components/TextField';
import { isBdPhone } from '@/lib/validation';

// The owner's name, phone and address as registration and the free-trial
// screen both ask for them: one set of words, field settings and checks, so a
// fix to either reaches the other.

export const OWNER_DETAILS_COPY = {
  en: {
    fullName: 'Full Name',
    fullNamePh: 'Full name',
    phone: 'Phone Number',
    phonePh: '01XXXXXXXXX',
    address: 'Address',
    addressPh: 'Enter your business address',
    errName: 'Enter your full name',
    errPhone: 'Enter a valid phone number, e.g. 01712345678',
    errAddress: 'Enter your business address',
  },
  bn: {
    fullName: 'পূর্ণ নাম',
    fullNamePh: 'আপনার পূর্ণ নাম',
    phone: 'মোবাইল নম্বর',
    phonePh: '01XXXXXXXXX',
    address: 'ঠিকানা',
    addressPh: 'ব্যবসার ঠিকানা লিখুন',
    errName: 'পূর্ণ নাম দিন',
    errPhone: 'সঠিক মোবাইল নম্বর দিন, যেমন 01712345678',
    errAddress: 'ব্যবসার ঠিকানা দিন',
  },
};

export type OwnerDetail = 'name' | 'phone' | 'address';
type OwnerDetailsCopy = (typeof OWNER_DETAILS_COPY)['en'];

const SETTINGS = {
  name: { icon: User, autoComplete: 'name', textContentType: 'name' },
  phone: { icon: Phone, keyboardType: 'phone-pad', autoComplete: 'tel', textContentType: 'telephoneNumber' },
  address: { icon: MapPin, minHeight: 104, autoComplete: 'street-address', textContentType: 'fullStreetAddress' },
} as const satisfies Record<OwnerDetail, Partial<TextFieldProps>>;

const WORDS = {
  name: ['fullName', 'fullNamePh'],
  phone: ['phone', 'phonePh'],
  address: ['address', 'addressPh'],
} as const satisfies Record<OwnerDetail, readonly [keyof OwnerDetailsCopy, keyof OwnerDetailsCopy]>;

/** One field's label, placeholder, icon, keyboard and autofill - the address a taller box. `required` marks the label as registration does. */
export function ownerDetailField(key: OwnerDetail, t: OwnerDetailsCopy, required = false) {
  const [label, placeholder] = WORDS[key];
  return { ...SETTINGS[key], label: required ? `${t[label]} *` : t[label], placeholder: t[placeholder] };
}

/** What is wrong with each of the three: a name and an address given, a Bangladeshi mobile number. */
export function ownerDetailErrors(values: Record<OwnerDetail, string>, t: OwnerDetailsCopy): Partial<Record<OwnerDetail, string>> {
  const errors: Partial<Record<OwnerDetail, string>> = {};
  if (!values.name.trim()) errors.name = t.errName;
  if (!isBdPhone(values.phone)) errors.phone = t.errPhone;
  if (!values.address.trim()) errors.address = t.errAddress;
  return errors;
}
