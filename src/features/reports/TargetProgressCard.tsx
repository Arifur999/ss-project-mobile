import { StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/ProgressBar';
import { Txt } from '@/components/Txt';
import { Green, White, Zinc } from '@/constants/theme';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { REPORT_COPY } from '@/features/reports/copy';
import { formatNumber } from '@/lib/money';

/** A figure against its target - sales, gross profit: the amount, a bar to the target, and how far along it is. */
export function TargetProgressCard({ label, value, target, dark = false }: { label: string; value: number; target: number; dark?: boolean }) {
  const t = useCopy(REPORT_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const percent = target > 0 ? (value / target) * 100 : 0;
  const ink = dark ? White : Zinc[900];
  const sub = dark ? 'rgba(255, 255, 255, 0.75)' : Zinc[600];
  return (
    <View style={[styles.card, dark ? styles.dark : styles.light]}>
      <Txt style={[styles.label, { color: sub }]}>{label}</Txt>
      <Txt style={[styles.value, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit>
        {money(value)}
      </Txt>
      {target > 0 ? (
        <>
          <ProgressBar
            percent={Math.min(100, percent)}
            color={percent >= 100 ? Green[500] : dark ? White : Zinc[900]}
            track={dark ? 'rgba(255, 255, 255, 0.18)' : Zinc[200]}
            height={8}
            label={label}
          />
          <Txt style={[styles.caption, { color: sub }]}>{t.ofTarget(formatNumber(Math.round(percent * 10) / 10, lang), money(target))}</Txt>
        </>
      ) : (
        <Txt style={[styles.caption, { color: sub }]}>{t.noTarget}</Txt>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 16, borderRadius: 18 },
  dark: { backgroundColor: Zinc[900] },
  light: { backgroundColor: White, borderWidth: 1, borderColor: Zinc[200] },
  label: { fontSize: 13, fontWeight: '600' },
  value: { fontSize: 26, fontWeight: '700' },
  caption: { fontSize: 13 },
});
