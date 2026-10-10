import { router } from 'expo-router';
import { Lock, Mail, MapPin, Phone, Send, Store, User } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { AuthHero } from '@/components/AuthHero';
import { Button } from '@/components/Button';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { Slate, White } from '@/constants/theme';
import { bnDigits, useCopy } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/lib/httpClient';
import { isBdPhone, isEmail, MIN_PASSWORD_LENGTH, normalizePhone, visibleErrors } from '@/lib/validation';

const PHOTO = require('@/assets/images/brand/auth-register.jpg');

const COPY = {
  en: {
    tagline: 'Grow your business, beautifully organised.',
    title: 'Business Registration',
    subtitle: 'Submit your business registration request to create your business workspace.',
    fullName: 'Full Name', fullNamePh: 'Full name',
    businessName: 'Business Name', businessNamePh: 'Business name',
    phone: 'Phone Number', phonePh: '01XXXXXXXXX',
    email: 'Email Address', emailPh: 'you@example.com',
    address: 'Address', addressPh: 'Enter your business address',
    password: 'Password', passwordPh: 'At least 8 characters',
    confirm: 'Confirm Password', confirmPh: 'Confirm your password',
    submit: 'Submit Registration Request', submitting: 'Submitting…',
    haveAccount: 'Already have an account?', signIn: 'Sign in',
    show: 'Show password', hide: 'Hide password',
    errName: 'Enter your full name',
    errBusiness: 'Enter your business name',
    errPhone: 'Enter a valid phone number, e.g. 01712345678',
    errEmail: 'Enter a valid email address',
    errAddress: 'Enter your business address',
    errPassword: 'Password must be at least 8 characters',
    errConfirm: "Passwords don't match",
    fixOne: 'Please fix the highlighted field',
    fixMany: (n: number) => `Please fix the ${n} highlighted fields`,
  },
  bn: {
    tagline: 'ব্যবসা বাড়ান, সবকিছু থাকুক সুন্দর করে গোছানো।',
    title: 'ব্যবসার রেজিস্ট্রেশন',
    subtitle: 'আপনার ব্যবসার ওয়ার্কস্পেস খুলতে রেজিস্ট্রেশনের অনুরোধ পাঠান।',
    fullName: 'পূর্ণ নাম', fullNamePh: 'আপনার পূর্ণ নাম',
    businessName: 'ব্যবসার নাম', businessNamePh: 'ব্যবসার নাম',
    phone: 'মোবাইল নম্বর', phonePh: '01XXXXXXXXX',
    email: 'ইমেইল', emailPh: 'you@example.com',
    address: 'ঠিকানা', addressPh: 'ব্যবসার ঠিকানা লিখুন',
    password: 'পাসওয়ার্ড', passwordPh: 'কমপক্ষে ৮ অক্ষর',
    confirm: 'পাসওয়ার্ড নিশ্চিত করুন', confirmPh: 'পাসওয়ার্ড আবার লিখুন',
    submit: 'রেজিস্ট্রেশনের অনুরোধ পাঠান', submitting: 'পাঠানো হচ্ছে…',
    haveAccount: 'আগে থেকেই অ্যাকাউন্ট আছে?', signIn: 'সাইন ইন করুন',
    show: 'পাসওয়ার্ড দেখুন', hide: 'পাসওয়ার্ড লুকান',
    errName: 'পূর্ণ নাম দিন',
    errBusiness: 'ব্যবসার নাম দিন',
    errPhone: 'সঠিক মোবাইল নম্বর দিন, যেমন 01712345678',
    errEmail: 'সঠিক ইমেইল দিন',
    errAddress: 'ব্যবসার ঠিকানা দিন',
    errPassword: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে',
    errConfirm: 'পাসওয়ার্ড মেলেনি',
    fixOne: 'লাল চিহ্নিত ১টা ঘর ঠিক করুন',
    fixMany: (n: number) => `লাল চিহ্নিত ${bnDigits(n)}টা ঘর ঠিক করুন`,
  },
};

type Field = 'name' | 'business' | 'phone' | 'email' | 'address' | 'password' | 'confirm';
const ORDER: Field[] = ['name', 'business', 'phone', 'email', 'address', 'password', 'confirm'];
const EMPTY: Record<Field, string> = { name: '', business: '', phone: '', email: '', address: '', password: '', confirm: '' };

export default function RegisterScreen() {
  const t = useCopy(COPY);
  const { registerOwner } = useAuth();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const all: Partial<Record<Field, string>> = {};
  if (!values.name.trim()) all.name = t.errName;
  if (!values.business.trim()) all.business = t.errBusiness;
  if (!isBdPhone(values.phone)) all.phone = t.errPhone;
  if (!isEmail(values.email)) all.email = t.errEmail;
  if (!values.address.trim()) all.address = t.errAddress;
  if (values.password.length < MIN_PASSWORD_LENGTH) all.password = t.errPassword;
  if (!values.confirm || values.confirm !== values.password) all.confirm = t.errConfirm;
  const errors = visibleErrors(all, values, touched, submitted);
  const errorCount = ORDER.filter((f) => errors[f]).length;

  const set = (field: Field) => (text: string) => {
    setValues((v) => ({ ...v, [field]: text }));
    setServerError(null);
  };
  const touch = (field: Field) => () => setTouched((v) => ({ ...v, [field]: true }));

  const submit = async () => {
    if (busy) return;
    setSubmitted(true);
    if (Object.keys(all).length > 0) {
      scroll.current?.scrollTo({ y: 240, animated: true });
      return;
    }
    setBusy(true);
    setServerError(null);
    const phone = normalizePhone(values.phone);
    try {
      const { email } = await registerOwner({
        fullName: values.name.trim(),
        businessName: values.business.trim(),
        phone,
        email: values.email.trim(),
        password: values.password,
        address: values.address.trim(),
      });
      router.push({
        pathname: '/register-verify',
        params: { email, name: values.name.trim(), business: values.business.trim(), phone },
      });
    } catch (e) {
      setServerError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const fieldProps = (field: Field) => ({
    value: values[field],
    onChangeText: set(field),
    onBlur: touch(field),
    error: errors[field],
  });

  return (
    <KeyboardScreen style={styles.flex}>
      <ScrollView ref={scroll} style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <AuthHero
          photo={PHOTO}
          height={260}
          focus={[0.3, 0.5]}
          gradient={['rgba(15, 23, 42, 0.5)', 'rgba(15, 23, 42, 0.08)', 'rgba(15, 23, 42, 0.78)']}
          stops={[0, 0.4, 1]}
          tagline={t.tagline}
        />

        <View style={[styles.sheet, { paddingBottom: 32 + insets.bottom }]}>
          <View style={styles.heading}>
            <Txt style={styles.title}>{t.title}</Txt>
            <Txt style={styles.subtitle}>{t.subtitle}</Txt>
          </View>

          <View style={styles.form}>
            <TextField label={`${t.fullName} *`} icon={User} placeholder={t.fullNamePh} autoComplete="name" textContentType="name" {...fieldProps('name')} />
            <TextField label={`${t.businessName} *`} icon={Store} placeholder={t.businessNamePh} textContentType="organizationName" {...fieldProps('business')} />
            <TextField label={`${t.phone} *`} icon={Phone} placeholder={t.phonePh} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" {...fieldProps('phone')} />
            <TextField label={`${t.email} *`} icon={Mail} placeholder={t.emailPh} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" {...fieldProps('email')} />
            <TextField label={`${t.address} *`} icon={MapPin} placeholder={t.addressPh} minHeight={104} autoComplete="street-address" textContentType="fullStreetAddress" {...fieldProps('address')} />
            <TextField label={`${t.password} *`} icon={Lock} placeholder={t.passwordPh} password={{ show: t.show, hide: t.hide }} autoComplete="new-password" textContentType="newPassword" {...fieldProps('password')} />
            <TextField label={`${t.confirm} *`} icon={Lock} placeholder={t.confirmPh} password={{ show: t.show, hide: t.hide }} autoComplete="new-password" textContentType="newPassword" {...fieldProps('confirm')} />

            <AlertBanner tone="error">
              {submitted && errorCount > 0 ? (errorCount === 1 ? t.fixOne : t.fixMany(errorCount)) : serverError}
            </AlertBanner>

            <Button
              title={busy ? t.submitting : t.submit}
              onPress={submit}
              busy={busy}
              icon={Send}
              style={styles.submit}
            />
          </View>

          <Txt style={styles.footer}>
            {t.haveAccount}{' '}
            <Txt style={styles.footerLink} accessibilityRole="link" onPress={() => router.replace('/login')}>
              {t.signIn}
            </Txt>
          </Txt>
        </View>
      </ScrollView>
    </KeyboardScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: White },
  scroll: { flexGrow: 1 },
  sheet: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: White,
    paddingTop: 28,
    paddingHorizontal: 20,
    gap: 24,
  },
  heading: { gap: 6 },
  title: { fontSize: 24, fontWeight: '700', lineHeight: 31.2, letterSpacing: -0.24, color: Slate[900] },
  subtitle: { fontSize: 15, color: Slate[600] },
  form: { gap: 16 },
  submit: { marginTop: 4 },
  footer: { textAlign: 'center', fontSize: 15, color: Slate[600] },
  footerLink: { fontWeight: '600', color: Slate[900], textDecorationLine: 'underline' },
});
