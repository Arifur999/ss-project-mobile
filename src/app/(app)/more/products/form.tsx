import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AlertBanner } from '@/components/AlertBanner';
import { Button } from '@/components/Button';
import { FormFooter } from '@/components/FormFooter';
import { KeyboardScreen } from '@/components/KeyboardScreen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SelectField } from '@/components/SelectField';
import { SuggestionChips } from '@/components/SuggestionChips';
import { TextField } from '@/components/TextField';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useCopy } from '@/context/LanguageContext';
import { useToast } from '@/context/ToastContext';
import { PRODUCT_COPY } from '@/features/products/copy';
import { PhotoField } from '@/features/products/PhotoField';
import { PriceFields } from '@/features/products/PriceFields';
import { formFromProduct, productFormErrors, productInput, type ProductForm, type ProductFormField } from '@/features/products/productForm';
import { useLeaveGuard } from '@/hooks/useLeaveGuard';
import { usePickImage } from '@/hooks/usePickImage';
import { errorMessage } from '@/lib/httpClient';
import {
  cachedProduct,
  createProduct,
  supplierName,
  updateProduct,
  useProductCategories,
  useProductWrite,
  useSuppliers,
} from '@/services/products.services';
import { uploadImage, type LocalImage } from '@/services/upload.services';

/** A product code the workspace already has - the server's unique (owner, code) rule. */
const isDuplicateCode = (error: unknown) =>
  (isAxiosError(error) && error.response?.status === 409) || /already exists|unique|duplicate/i.test(errorMessage(error, ''));

/**
 * New product, or an edit of one opened from the list (?id=). Everything is
 * checked before the photo is uploaded, the photo is uploaded only on Save,
 * and leaving with unsaved changes - the back arrow or the phone's back
 * button - asks first.
 */
export default function ProductFormScreen() {
  const t = useCopy(PRODUCT_COPY);
  const toast = useToast();
  const queryClient = useQueryClient();
  const write = useProductWrite();
  const suppliers = useSuppliers();
  const categories = useProductCategories();
  const choosePhoto = usePickImage({ square: true, fallbackName: 'product.jpg' });

  const { id } = useLocalSearchParams<{ id?: string }>();
  const [original] = useState(() => (id ? cachedProduct(queryClient, id) : null));
  const [start] = useState(() => formFromProduct(original));
  const [form, setForm] = useState<ProductForm>(start);
  const [photo, setPhoto] = useState<LocalImage | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [codeTaken, setCodeTaken] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = photo !== null || photoRemoved || (Object.keys(start) as ProductFormField[]).some((k) => form[k] !== start[k]);
  const guard = useLeaveGuard(dirty);

  const set = (patch: Partial<ProductForm>) => setForm((f) => ({ ...f, ...patch }));
  const photoUri = photo?.uri ?? (photoRemoved ? null : original?.image_url ?? null);

  const errors = productFormErrors(form);
  const message = (field: ProductFormField) => {
    if (!submitted) return undefined;
    if (field === 'product_code' && codeTaken === form.product_code.trim()) return t.errDuplicate;
    const kind = errors[field];
    if (!kind) return undefined;
    if (kind === 'required') return field === 'product_code' ? t.errCode : field === 'name' ? t.errName : t.errSupplier;
    return kind === 'amount' ? t.errAmount : kind === 'percent' ? t.errPercent : t.errQty;
  };

  const pickPhoto = async () => {
    const picked = await choosePhoto();
    if (!picked) return;
    if ('error' in picked) {
      setPhotoError(picked.error);
      return;
    }
    setPhotoError(null);
    setPhoto(picked.image);
    setPhotoRemoved(false);
  };

  const save = async () => {
    if (saving) return;
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    setError(null);
    try {
      const imageUrl = photo ? await uploadImage(photo) : photoRemoved ? null : original?.image_url ?? null;
      const input = productInput(form, imageUrl);
      await write(() => (original ? updateProduct(original.id, input) : createProduct(input)));
      toast.show(original ? t.productUpdated(input.name) : t.productAdded(input.name));
      guard.finish();
    } catch (e) {
      if (isDuplicateCode(e)) setCodeTaken(form.product_code.trim());
      else setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const title = id ? t.editProduct : t.newProduct;

  // An edit opened without its row in memory (the app was restored straight onto this screen).
  if (id && !original) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title={title} onBack={() => router.back()} backLabel={t.back} />
        <View style={styles.missing}>
          <AlertBanner tone="error">{t.loadError}</AlertBanner>
          <Button title={t.back} variant="pillOutline" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title={title} onBack={() => router.back()} backLabel={t.back} />
      <KeyboardScreen style={styles.flex}>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <PhotoField
            uri={photoUri}
            onPick={pickPhoto}
            onRemove={() => {
              setPhoto(null);
              setPhotoRemoved(true);
              setPhotoError(null);
            }}
            error={photoError}
            disabled={saving}
          />
          <TextField
            tone="zinc"
            label={t.codeField}
            placeholder={t.codePlaceholder}
            value={form.product_code}
            onChangeText={(product_code) => set({ product_code })}
            error={message('product_code')}
            plainError
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextField
            tone="zinc"
            label={t.nameField}
            placeholder={t.namePlaceholder}
            value={form.name}
            onChangeText={(name) => set({ name })}
            error={message('name')}
            plainError
          />
          <View style={styles.field}>
            <SelectField
              label={t.supplierField}
              placeholder={t.chooseSupplier}
              closeLabel={t.close}
              value={form.supplier_id}
              options={(suppliers.data ?? []).map((s) => ({ key: s.id, label: supplierName(s) }))}
              onChange={(supplier_id) => set({ supplier_id })}
              error={message('supplier_id')}
              searchPlaceholder={t.searchSuppliers}
              emptyText={t.noSuppliers}
            />
            {suppliers.isSuccess && suppliers.data.length === 0 ? <Txt style={styles.hint}>{t.noSuppliers}</Txt> : null}
          </View>
          <View style={styles.field}>
            <TextField
              tone="zinc"
              label={t.categoryField}
              placeholder={t.categoryPlaceholder}
              value={form.category}
              onChangeText={(category) => set({ category })}
            />
            <SuggestionChips suggestions={categories.data ?? []} value={form.category} onPick={(category) => set({ category })} />
          </View>

          <Txt accessibilityRole="header" style={styles.section}>
            {t.prices}
          </Txt>
          <PriceFields
            label={t.dpRateField}
            finalLabel={t.finalDp}
            price={form.cost_price}
            discount={form.dp_discount}
            onPrice={(cost_price) => set({ cost_price })}
            onDiscount={(dp_discount) => set({ dp_discount })}
            priceError={message('cost_price')}
            discountError={message('dp_discount')}
          />
          <PriceFields
            label={t.mrpField}
            finalLabel={t.finalMrp}
            price={form.selling_price}
            discount={form.mrp_discount}
            onPrice={(selling_price) => set({ selling_price })}
            onDiscount={(mrp_discount) => set({ mrp_discount })}
            priceError={message('selling_price')}
            discountError={message('mrp_discount')}
          />

          <TextField
            tone="zinc"
            label={t.openingQtyField}
            placeholder="0"
            value={form.opening_qty}
            onChangeText={(opening_qty) => set({ opening_qty })}
            error={message('opening_qty')}
            plainError
            hint={t.openingHint}
            keyboardType="number-pad"
          />
          <View style={styles.pair}>
            <View style={styles.grow}>
              <TextField tone="zinc" label={t.sizeField} placeholder={t.sizePlaceholder} value={form.size} onChangeText={(size) => set({ size })} />
            </View>
            <View style={styles.grow}>
              <TextField tone="zinc" label={t.weightField} placeholder={t.weightPlaceholder} value={form.weight} onChangeText={(weight) => set({ weight })} />
            </View>
          </View>

          <AlertBanner tone="error">{error}</AlertBanner>
        </ScrollView>
        <FormFooter cancelLabel={t.cancel} onCancel={() => router.back()} saveLabel={saving ? t.saving : t.save} onSave={save} saving={saving} />
      </KeyboardScreen>

      {guard.sheet}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: White },
  flex: { flex: 1 },
  body: { padding: 20, gap: 16 },
  field: { gap: 8 },
  section: { marginTop: 4, fontSize: 16, fontWeight: '600', color: Zinc[900] },
  pair: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
  hint: { fontSize: 13, color: Zinc[500] },
  missing: { padding: 20, gap: 12 },
});
