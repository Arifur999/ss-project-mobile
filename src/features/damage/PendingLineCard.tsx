import { FiguresCard } from '@/components/FiguresCard';
import { useAmountShield } from '@/context/AmountShieldContext';
import { useCopy, useLang } from '@/context/LanguageContext';
import { DAMAGE_COPY } from '@/features/damage/copy';
import type { PendingLine } from '@/features/damage/ReceiveSheet';
import { dateLabel } from '@/lib/dates';
import { formatNumber } from '@/lib/money';

/**
 * A damaged line still out: the product, which entry sent it and when, what
 * for, and how many went, came back and are still to come - with what each
 * cost. Tappable only for whoever may receive it.
 */
export function PendingLineCard({ line, onPress }: { line: PendingLine; onPress?: () => void }) {
  const t = useCopy(DAMAGE_COPY);
  const { lang } = useLang();
  const { money } = useAmountShield();
  const num = (n: unknown) => formatNumber(n, lang);
  return (
    <FiguresCard
      title={line.item.product_name}
      meta={[line.item.product_code, line.entry.doc_no, t.sent(dateLabel(String(line.entry.date || ''), lang))].filter(Boolean).join(' · ')}
      sub={[t.actions[line.entry.action]?.label, line.entry.supplier_name].filter(Boolean).join(' · ')}
      figures={[
        { label: t.out, value: num(line.item.qty) },
        { label: t.backLabel, value: num(line.item.received_qty) },
        { label: t.still, value: num(line.outstanding), strong: true },
        { label: t.unitCostLabel, value: money(line.item.unit_cost) },
      ]}
      onPress={onPress}
    />
  );
}
