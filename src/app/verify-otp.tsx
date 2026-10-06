import { router, useLocalSearchParams } from 'expo-router';

import { VerifyCodeView } from '@/components/VerifyCodeView';
import { useAuth } from '@/context/AuthContext';

/**
 * Step two of sign-in. A correct code signs in; the root layout's guard then
 * swaps this stack for the "Welcome back!" screen on its own.
 */
export default function VerifyOtpScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const { verifyOtp, resendOtp } = useAuth();

  const backToForm = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  return (
    <VerifyCodeView
      email={email}
      onVerify={(code) => verifyOtp(email, code)}
      onResend={() => resendOtp(email)}
      onBack={backToForm}
      onDifferent={backToForm}
    />
  );
}
