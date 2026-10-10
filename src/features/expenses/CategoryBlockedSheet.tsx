import { StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DesignIcon } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { Amber, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy } from '@/context/LanguageContext';
import { EXPENSE_COPY } from '@/features/expenses/copy';

/**
 * Why a category with expenses cannot be deleted - the server refuses it, as
 * the website's guard does - with a way to its transactions for a member who
 * may open them.
 */
export function CategoryBlockedSheet({
  open,
  name,
  spent,
  onClose,
  onTransactions,
}: {
  open: boolean;
  name: string;
  spent: number;
  onClose: () => void;
  onTransactions?: () => void;
}) {
  const t = useCopy(EXPENSE_COPY);
  const { money } = useAmountShield();
  return (
    <BottomSheet open={open} onClose={onClose} closeLabel={t.close}>
      <View style={styles.badge}>
        <DesignIcon name="circleAlert" size={26} color={Amber[700]} />
      </View>
      <Txt accessibilityRole="header" style={styles.title}>
        {t.blockedTitle(name)}
      </Txt>
      <Txt style={styles.text}>{t.blockedText(money(spent))}</Txt>
      <View style={styles.row}>
        {onTransactions ? <Button title={t.viewTransactions} variant="pillOutline" onPress={onTransactions} style={styles.grow} /> : null}
        <Button title={t.ok} variant="pill" onPress={onClose} style={styles.grow} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'center', width: 56, height: 56, borderRadius: 999, backgroundColor: Amber[100], alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900], textAlign: 'center' },
  text: { fontSize: 14, color: Zinc[600], textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
});
