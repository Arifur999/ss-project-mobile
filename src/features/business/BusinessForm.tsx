import { StyleSheet, View } from 'react-native';

import { TextField } from '@/components/TextField';
import { useCopy } from '@/context/LanguageContext';
import { BUSINESS_COPY } from '@/features/business/copy';
import { isBdPhone, isEmail } from '@/lib/validation';
import type { BusinessInfo } from '@/services/business.services';

export type BusinessField = 'name' | 'phone1' | 'phone2' | 'email' | 'address';

/** The design's rules: name, phone 1 and address required; the rest checked only if filled. */
export function businessErrors(d: BusinessInfo, t: (typeof BUSINESS_COPY)['en']): Partial<Record<BusinessField, string>> {
  const e: Partial<Record<BusinessField, string>> = {};
  if (!d.name.trim()) e.name = t.errName;
  if (!isBdPhone(d.phone1)) e.phone1 = t.errPhone;
  if (d.phone2.trim() && !isBdPhone(d.phone2)) e.phone2 = t.errPhone;
  if (d.email.trim() && !isEmail(d.email)) e.email = t.errEmail;
  if (!d.address.trim()) e.address = t.errAddress;
  return e;
}

/** The edit form: name, the two phones side by side, email, address, website, logo URL. */
export function BusinessForm({
  draft,
  onChange,
  onBlur,
  errors,
}: {
  draft: BusinessInfo;
  onChange: (field: keyof BusinessInfo, value: string) => void;
  onBlur: (field: BusinessField) => void;
  errors: Partial<Record<BusinessField, string>>;
}) {
  const t = useCopy(BUSINESS_COPY);
  return (
    <View style={styles.form}>
      <TextField
        tone="zinc"
        label={`${t.businessName} *`}
        value={draft.name}
        onChangeText={(v) => onChange('name', v)}
        onBlur={() => onBlur('name')}
        error={errors.name}
        textContentType="organizationName"
      />
      <View style={styles.pair}>
        <View style={styles.half}>
          <TextField
            tone="zinc"
            label={`${t.phone1} *`}
            value={draft.phone1}
            onChangeText={(v) => onChange('phone1', v)}
            onBlur={() => onBlur('phone1')}
            error={errors.phone1}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
          />
        </View>
        <View style={styles.half}>
          <TextField
            tone="zinc"
            label={t.phone2}
            placeholder={t.optional}
            value={draft.phone2}
            onChangeText={(v) => onChange('phone2', v)}
            onBlur={() => onBlur('phone2')}
            error={errors.phone2}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
          />
        </View>
      </View>
      <TextField
        tone="zinc"
        label={t.email}
        placeholder={t.emailPh}
        value={draft.email}
        onChangeText={(v) => onChange('email', v)}
        onBlur={() => onBlur('email')}
        error={errors.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField
        tone="zinc"
        label={`${t.address} *`}
        value={draft.address}
        onChangeText={(v) => onChange('address', v)}
        onBlur={() => onBlur('address')}
        error={errors.address}
        minHeight={96}
      />
      <TextField
        tone="zinc"
        label={t.website}
        placeholder={t.websitePh}
        value={draft.website}
        onChangeText={(v) => onChange('website', v)}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextField
        tone="zinc"
        label={t.logoUrl}
        placeholder={t.logoUrlPh}
        value={draft.logoUrl.startsWith('data:') ? '' : draft.logoUrl}
        onChangeText={(v) => onChange('logoUrl', v)}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  half: { flex: 1, minWidth: 0 },
});
