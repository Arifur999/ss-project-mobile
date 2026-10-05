// Strings only the app needs. en.json and bn.json beside this file are verbatim
// copies of Hatim/src/locales - keep them that way so they can be re-copied when
// the website adds keys, and put anything app-specific here instead.

export const mobileEn: Record<string, string> = {
  otp_title: 'Enter verification code',
  otp_sentTo: 'We sent a 6-digit code to',
  otp_placeholder: '6-digit code',
  otp_verify: 'Verify',
  otp_verifying: 'Verifying...',
  otp_resend: 'Resend code',
  otp_resendIn: 'Resend in {s}s',
  otp_resent: 'A new code has been sent',
  otp_back: 'Use a different account',
  login_signingIn: 'Signing in...',
  login_fillAll: 'Enter your email and password',
  login_serverTooOld: 'The server does not support the mobile app yet. Please update the backend.',
  boot_offline: 'Could not reach the server.',
  boot_retry: 'Try again',
  locked_title: 'Subscription inactive',
  locked_body: 'Your plan is not active. Please renew from the Furnify website, then sign in again.',
  settings_language: 'Language',
  settings_signedInAs: 'Signed in as',
  home_welcome: 'Welcome',
  home_comingSoon: 'Dashboard figures will appear here.',
};

export const mobileBn: Record<string, string> = {
  otp_title: 'ভেরিফিকেশন কোড দিন',
  otp_sentTo: '৬ সংখ্যার কোড পাঠানো হয়েছে',
  otp_placeholder: '৬ সংখ্যার কোড',
  otp_verify: 'যাচাই করুন',
  otp_verifying: 'যাচাই হচ্ছে...',
  otp_resend: 'আবার কোড পাঠান',
  otp_resendIn: '{s} সেকেন্ড পরে আবার পাঠানো যাবে',
  otp_resent: 'নতুন কোড পাঠানো হয়েছে',
  otp_back: 'অন্য অ্যাকাউন্ট ব্যবহার করুন',
  login_signingIn: 'সাইন ইন হচ্ছে...',
  login_fillAll: 'ইমেইল ও পাসওয়ার্ড দিন',
  login_serverTooOld: 'সার্ভার এখনো মোবাইল অ্যাপ সাপোর্ট করে না। ব্যাকএন্ড আপডেট করুন।',
  boot_offline: 'সার্ভারের সাথে সংযোগ করা যায়নি।',
  boot_retry: 'আবার চেষ্টা করুন',
  locked_title: 'সাবস্ক্রিপশন সক্রিয় নেই',
  locked_body: 'আপনার প্ল্যান সক্রিয় নেই। Furnify ওয়েবসাইট থেকে রিনিউ করে আবার সাইন ইন করুন।',
  settings_language: 'ভাষা',
  settings_signedInAs: 'সাইন ইন করা আছে',
  home_welcome: 'স্বাগতম',
  home_comingSoon: 'ড্যাশবোর্ডের হিসাব এখানে দেখা যাবে।',
};
