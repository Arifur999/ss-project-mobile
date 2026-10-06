import { router, useLocalSearchParams } from 'expo-router';

import { VerifyCodeView } from '@/components/VerifyCodeView';
import { useAuth } from '@/context/AuthContext';

/** Registration's emailed code. A correct one finishes with the success screen. */
export default function RegisterVerifyScreen() {
  const { email = '', name = '', business = '', phone = '' } =
    useLocalSearchParams<{ email: string; name: string; business: string; phone: string }>();
  const { verifyRegistration, resendOtp } = useAuth();

  const backToForm = () => (router.canGoBack() ? router.back() : router.replace('/register'));

  return (
    <VerifyCodeView
      email={email}
      onVerify={async (code) => {
        await verifyRegistration(email, code);
        router.replace({ pathname: '/register-success', params: { name, business, phone, email } });
      }}
      onResend={() => resendOtp(email)}
      onBack={backToForm}
      onDifferent={() => router.dismissTo('/login')}
    />
  );
}
