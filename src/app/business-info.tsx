import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { DesignIcon } from '@/components/DesignIcon';
import { Spinner } from '@/components/Spinner';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { BusinessDetails } from '@/features/business/BusinessDetails';
import { BusinessForm, businessErrors, type BusinessField } from '@/features/business/BusinessForm';
import { BUSINESS_COPY } from '@/features/business/copy';
import { errorMessage } from '@/lib/httpClient';
import {
  toBusinessInfo,
  uploadImage,
  useBusinessSettings,
  useSaveBusinessSettings,
  type BusinessInfo,
} from '@/services/business.services';

type PickedLogo = { uri: string; name: string; mimeType: string };

/** Business Info: read it, or edit it and the logo, from the account sheet. */
export default function BusinessInfoScreen() {
  const t = useCopy(BUSINESS_COPY);
  const toast = useToast();
  const query = useBusinessSettings();
  const save = useSaveBusinessSettings();
  const info = toBusinessInfo(query.data);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<BusinessInfo>(info);
  const [touched, setTouched] = useState<Partial<Record<BusinessField, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logo, setLogo] = useState<PickedLogo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const all = businessErrors(draft, t);
  const shown: Partial<Record<BusinessField, string>> = {};
  for (const key of Object.keys(all) as BusinessField[]) {
    if (submitted || (touched[key] && draft[key])) shown[key] = all[key];
  }

  const startEdit = () => {
    setDraft(info);
    setTouched({});
    setSubmitted(false);
    setLogo(null);
    setError(null);
    setEditing(true);
  };

  const cancel = () => {
    if (saving) return;
    setEditing(false);
    setError(null);
  };

  const pickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(t.photoDenied);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setLogo({
      uri: asset.uri,
      name: asset.fileName || 'logo.jpg',
      mimeType: asset.mimeType || 'image/jpeg',
    });
  };

  const submit = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.keys(all).length > 0) return;
    setSaving(true);
    setError(null);
    try {
      // The picked file is uploaded only now, on save, so cancelling costs nothing.
      const logoUrl = logo ? await uploadImage(logo.uri, logo.mimeType, logo.name) : draft.logoUrl;
      await save({ ...draft, logoUrl });
      setEditing(false);
      toast.show(t.saved);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const logoSource = logo ? { uri: logo.uri } : (editing ? draft.logoUrl : info.logoUrl) ? { uri: editing ? draft.logoUrl : info.logoUrl } : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {editing ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t.cancelEditing} onPress={cancel} style={styles.headerButton}>
            <DesignIcon name="close" size={22} color={Zinc[900]} strokeWidth={2} />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.back}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.headerButton}>
            <DesignIcon name="arrowLeft" size={22} color={Zinc[900]} strokeWidth={2} />
          </Pressable>
        )}
        <Txt accessibilityRole="header" style={styles.title}>
          {editing ? t.editTitle : t.title}
        </Txt>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {query.isPending ? (
            <View style={styles.loading}>
              <Spinner color={Zinc[900]} size={24} />
            </View>
          ) : query.isError ? (
            <View style={styles.loading}>
              <AlertBanner tone="error">{t.loadError}</AlertBanner>
              <Button title={t.retry} variant="pillOutline" onPress={() => query.refetch()} />
            </View>
          ) : (
            <>
              <View style={styles.logoCard}>
                <View style={styles.logoBox}>
                  {logoSource ? (
                    <Image source={logoSource} resizeMode="contain" style={styles.logo} accessibilityLabel={t.logoAlt} />
                  ) : (
                    <DesignIcon name="store" size={28} color={Zinc[400]} />
                  )}
                </View>
                {editing ? (
                  <>
                    <Pressable accessibilityRole="button" onPress={pickLogo} style={styles.upload}>
                      <DesignIcon name="upload" size={18} color={Zinc[900]} />
                      <Txt style={styles.uploadText}>{logo ? t.change : t.upload}</Txt>
                    </Pressable>
                    <Txt style={styles.fileHint}>{logo ? logo.name : t.noFile}</Txt>
                  </>
                ) : (
                  <Txt style={styles.businessName}>{info.name}</Txt>
                )}
              </View>

              {editing ? (
                <BusinessForm
                  draft={draft}
                  onChange={(field, value) => setDraft((d) => ({ ...d, [field]: value }))}
                  onBlur={(field) => setTouched((v) => ({ ...v, [field]: true }))}
                  errors={shown}
                />
              ) : (
                <BusinessDetails info={info} />
              )}

              <AlertBanner tone="error">{error}</AlertBanner>
            </>
          )}
        </ScrollView>

        {query.isSuccess ? (
          <View style={styles.footer}>
            {editing ? (
              <View style={styles.footerRow}>
                <Button title={t.cancel} variant="pillOutline" onPress={cancel} disabled={saving} />
                <Button title={saving ? t.saving : t.save} variant="pill" onPress={submit} busy={saving} style={styles.grow} />
              </View>
            ) : (
              <Button title={t.edit} variant="pill" onPress={startEdit} icon="pencil" />
            )}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  flex: { flex: 1 },
  header: {
    height: 60,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: Zinc[100],
  },
  headerButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900], textAlign: 'center' },
  body: { padding: 20, gap: 20 },
  loading: { minHeight: 240, justifyContent: 'center', alignItems: 'stretch', gap: 12 },
  logoCard: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderRadius: 20,
    backgroundColor: Zinc[100],
    borderWidth: 1,
    borderColor: Zinc[200],
  },
  logoBox: {
    width: 168,
    height: 92,
    borderRadius: 14,
    backgroundColor: White,
    borderWidth: 1,
    borderColor: Zinc[200],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: { width: 140, height: 76 },
  businessName: { fontSize: 17, fontWeight: '600', lineHeight: 23.8, color: Zinc[900], textAlign: 'center' },
  upload: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Zinc[300],
    backgroundColor: White,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadText: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  fileHint: { fontSize: 13, color: Zinc[600], textAlign: 'center' },
  footer: { paddingTop: 12, paddingHorizontal: 20, paddingBottom: 20, borderTopWidth: 1, borderTopColor: Zinc[200], backgroundColor: White },
  footerRow: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
});
