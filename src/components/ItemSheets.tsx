import { Pressable, StyleSheet, View } from 'react-native';

import { BottomSheet } from '@/components/BottomSheet';
import { Button } from '@/components/Button';
import { DesignIcon, type IconName } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { Amber, Red, White, Zinc } from '@/constants/theme';

export type ExtraAction = { label: string; icon: IconName; onPress: () => void };

/**
 * The ⋮ menu's sheet: what was tapped (with an optional amber note under it),
 * then Edit, any extra actions, Delete, then Cancel.
 */
export function ActionsSheet({
  open,
  onClose,
  title,
  subtitle,
  note,
  extra = [],
  editLabel,
  deleteLabel,
  cancelLabel,
  closeLabel,
  onEdit,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  note?: string;
  extra?: ExtraAction[];
  editLabel: string;
  deleteLabel: string;
  cancelLabel: string;
  closeLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} closeLabel={closeLabel}>
      <View style={styles.head}>
        <Txt accessibilityRole="header" style={styles.title}>
          {title}
        </Txt>
        <Txt style={styles.subtitle}>{subtitle}</Txt>
        {note ? <Txt style={styles.note}>{note}</Txt> : null}
      </View>
      <View style={styles.list}>
        <Pressable accessibilityRole="button" onPress={onEdit} style={styles.action}>
          <DesignIcon name="pencil" size={20} color={Zinc[900]} />
          <Txt style={styles.actionText}>{editLabel}</Txt>
        </Pressable>
        {extra.map((action) => (
          <Pressable key={action.label} accessibilityRole="button" onPress={action.onPress} style={[styles.action, styles.divider]}>
            <DesignIcon name={action.icon} size={20} color={Zinc[900]} />
            <Txt style={styles.actionText}>{action.label}</Txt>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" onPress={onDelete} style={[styles.action, styles.divider]}>
          <DesignIcon name="trash" size={20} color={Red[700]} />
          <Txt style={[styles.actionText, { color: Red[700] }]}>{deleteLabel}</Txt>
        </Pressable>
      </View>
      <Button title={cancelLabel} variant="pillOutline" onPress={onClose} />
    </BottomSheet>
  );
}

/** "Delete this …?" with what it will do, Cancel and a red Delete. */
export function ConfirmDeleteSheet({
  open,
  onClose,
  title,
  text,
  cancelLabel,
  deleteLabel,
  closeLabel,
  busy,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  text: string;
  cancelLabel: string;
  deleteLabel: string;
  closeLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
}) {
  return (
    <BottomSheet open={open} onClose={() => !busy && onClose()} closeLabel={closeLabel}>
      <View style={styles.warn}>
        <DesignIcon name="trash" size={26} color={Red[700]} />
      </View>
      <Txt accessibilityRole="header" style={[styles.title, styles.center]}>
        {title}
      </Txt>
      <Txt style={[styles.subtitle, styles.center]}>{text}</Txt>
      <View style={styles.row}>
        <Button title={cancelLabel} variant="pillOutline" onPress={onClose} disabled={busy} style={styles.grow} />
        <Button title={deleteLabel} variant="danger" onPress={onConfirm} busy={busy} style={styles.grow} />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: { gap: 2 },
  title: { fontSize: 18, fontWeight: '600', lineHeight: 25.2, color: Zinc[900] },
  subtitle: { fontSize: 14, color: Zinc[600] },
  note: { fontSize: 14, color: Amber[700] },
  center: { textAlign: 'center' },
  list: { borderRadius: 16, borderWidth: 1, borderColor: Zinc[200], overflow: 'hidden' },
  action: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, backgroundColor: White },
  divider: { borderTopWidth: 1, borderTopColor: Zinc[100] },
  actionText: { fontSize: 15, fontWeight: '600', color: Zinc[900] },
  warn: { alignSelf: 'center', width: 56, height: 56, borderRadius: 999, backgroundColor: Red[100], alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
});
