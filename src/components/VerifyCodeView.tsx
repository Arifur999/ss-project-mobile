import { isAxiosError } from 'axios';
import { Check, MailOpen, RotateCcw } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthTopBar } from '@/components/AuthTopBar';
import { Button } from '@/components/Button';
import { FieldError } from '@/components/FieldError';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { OTP_LENGTH, OtpBoxes, type OtpBoxesHandle } from '@/components/OtpBoxes';
import { Txt } from '@/components/Txt';
import { Green, Slate, White } from '@/constants/theme';
import { bnDigits, useCopy } from '@/context/LanguageContext';
import { errorMessage } from '@/lib/httpClient';

// The server refuses a resend inside 60 seconds, so the button waits that long.
const RESEND_COOLDOWN_S = 60;

const COPY = {
  en: {
    back: 'Back',
    title: 'Security verification',
    sentBefore: 'A 6-digit code was sent to ',
    sentAfter: '',
    codeLabel: 'Verification code',
    verify: 'Verify',
    verifying: 'Verifying…',
    resend: 'Resend code',
    resent: 'A new code was sent',
    wrongCode: 'That code is incorrect. Please check your email and try again.',
    different: 'Use a different account',
    wait: (s: number) => `Resend available in ${s}s`,
  },
  bn: {
    back: 'ফিরে যান',
    title: 'নিরাপত্তা যাচাই',
    sentBefore: '',
    sentAfter: ' ঠিকানায় ৬ সংখ্যার একটা কোড পাঠানো হয়েছে',
    codeLabel: 'যাচাই কোড',
    verify: 'যাচাই করুন',
    verifying: 'যাচাই হচ্ছে…',
    resend: 'আবার কোড পাঠান',
    resent: 'নতুন কোড পাঠানো হয়েছে',
    wrongCode: 'কোডটা সঠিক নয়। ইমেইল দেখে আবার চেষ্টা করুন।',
    different: 'অন্য অ্যাকাউন্ট ব্যবহার করুন',
    wait: (s: number) => `${bnDigits(s)} সেকেন্ড পর আবার কোড পাঠাতে পারবেন`,
  },
};

/**
 * The verification step, shared by sign-in and registration. `onVerify` throws
 * when the code is refused; a 4xx reads as "wrong code", anything else (a
 * dropped connection, too many attempts) shows the server's own message.
 */
export function VerifyCodeView({
  email,
  onVerify,
  onResend,
  onBack,
  onDifferent,
}: {
  email: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  onDifferent: () => void;
}) {
  const t = useCopy(COPY);
  const boxes = useRef<OtpBoxesHandle>(null);
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resentNote, setResentNote] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_COOLDOWN_S);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  useEffect(() => {
    const focus = setTimeout(() => boxes.current?.focus(), 300);
    return () => clearTimeout(focus);
  }, []);

  const complete = code.length === OTP_LENGTH;

  const verify = async () => {
    if (!complete || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      await onVerify(code);
    } catch (e) {
      const status = isAxiosError(e) ? e.response?.status : undefined;
      setError(status && status >= 400 && status < 500 && status !== 429 ? t.wrongCode : errorMessage(e));
      boxes.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    if (seconds > 0) return;
    setError(null);
    try {
      await onResend();
      setCode('');
      setResentNote(true);
      setSeconds(RESEND_COOLDOWN_S);
      boxes.current?.focus();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardScreen style={styles.flex}>
        <AuthTopBar onBack={onBack} backLabel={t.back} />
        <ScrollView contentContainerStyle={styles.main} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <View style={styles.badge}>
              <MailOpen size={28} color={Slate[900]} strokeWidth={1.8} />
            </View>
            <Txt style={styles.title}>{t.title}</Txt>
            <Txt style={styles.sent}>
              {t.sentBefore}
              <Txt style={styles.email}>{email}</Txt>
              {t.sentAfter}
            </Txt>
          </View>

          <View style={styles.codeGroup}>
            <OtpBoxes
              ref={boxes}
              value={code}
              onChange={(next) => {
                setCode(next);
                setError(null);
                setResentNote(false);
              }}
              error={!!error}
              disabled={verifying}
              label={t.codeLabel}
              onSubmit={verify}
            />
            <FieldError center>{error}</FieldError>
            {resentNote && !error ? (
              <View accessibilityRole="text" style={styles.resent}>
                <Check size={16} color={Green[700]} strokeWidth={2.4} />
                <Txt style={styles.resentText}>{t.resent}</Txt>
              </View>
            ) : null}
          </View>

          <Button
            title={verifying ? t.verifying : t.verify}
            onPress={verify}
            busy={verifying}
            disabled={!complete}
          />

          <View style={styles.resendRow}>
            {seconds > 0 ? (
              <View style={styles.wait}>
                <RotateCcw size={16} color={Slate[500]} strokeWidth={2} />
                <Txt style={styles.waitText}>{t.wait(seconds)}</Txt>
              </View>
            ) : (
              <Pressable accessibilityRole="button" onPress={resend} style={styles.resendButton}>
                <RotateCcw size={16} color={Slate[900]} strokeWidth={2} />
                <Txt style={styles.resendText}>{t.resend}</Txt>
              </Pressable>
            )}
          </View>

          <Pressable accessibilityRole="button" onPress={onDifferent} style={styles.different}>
            <Txt style={styles.differentText}>{t.different}</Txt>
          </Pressable>
        </ScrollView>
      </KeyboardScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  flex: { flex: 1 },
  main: { flexGrow: 1, paddingTop: 16, paddingHorizontal: 20, paddingBottom: 28, gap: 24 },
  intro: { alignItems: 'center', gap: 12 },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: Slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: 4, fontSize: 24, fontWeight: '700', lineHeight: 31.2, letterSpacing: -0.24, color: Slate[900], textAlign: 'center' },
  sent: { maxWidth: 330, fontSize: 15, color: Slate[600], textAlign: 'center' },
  email: { fontWeight: '600', color: Slate[900] },
  codeGroup: { gap: 12 },
  resent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  resentText: { fontSize: 14, color: Green[700] },
  resendRow: { marginTop: -12, alignItems: 'center' },
  wait: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  waitText: { fontSize: 14, fontWeight: '500', color: Slate[500] },
  resendButton: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  resendText: { fontSize: 14, fontWeight: '600', color: Slate[900] },
  different: { marginTop: 'auto', alignSelf: 'center', minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  differentText: { fontSize: 15, fontWeight: '600', color: Slate[600] },
});
