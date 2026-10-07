import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useLang } from '@/context/LanguageContext';
import { timeLabel } from '@/lib/dates';

const pad = (n: number) => String(n).padStart(2, '0');
const toHHMM = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fromHHMM = (value: string) => {
  const d = new Date();
  const [h, m] = value.split(':').map(Number);
  d.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
};

/**
 * DateField's twin for a time of day, stored as "09:30": the system clock on
 * Android, the compact picker on iOS. It may be left empty - `placeholder`
 * says so - and a set time can be cleared again.
 */
export function TimeField({
  label,
  value,
  onChange,
  placeholder,
  clearLabel,
}: {
  label: string;
  value: string;
  onChange: (hhmm: string) => void;
  placeholder: string;
  clearLabel: string;
}) {
  const { lang } = useLang();
  const open = () =>
    DateTimePickerAndroid.open({
      value: fromHHMM(value),
      mode: 'time',
      onChange: (event, picked) => {
        if (event.type === 'set' && picked) onChange(toHHMM(picked));
      },
    });
  const clear = value ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`${clearLabel} ${label}`} onPress={() => onChange('')} hitSlop={8}>
      <DesignIcon name="close" size={18} color={Zinc[500]} />
    </Pressable>
  ) : null;

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.wrap}>
        <Txt style={styles.label}>{label}</Txt>
        <View style={styles.field}>
          {value ? (
            <View style={styles.grow}>
              <DateTimePicker value={fromHHMM(value)} mode="time" display="compact" onChange={(_, picked) => picked && onChange(toHHMM(picked))} />
            </View>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => onChange(toHHMM(new Date()))} style={styles.grow}>
              <Txt style={styles.placeholder}>{placeholder}</Txt>
            </Pressable>
          )}
          {clear}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Txt style={styles.label}>{label}</Txt>
      <View style={styles.field}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${timeLabel(value, lang) || placeholder}`} onPress={open} style={styles.grow}>
          <Txt style={value ? styles.value : styles.placeholder} numberOfLines={1}>
            {timeLabel(value, lang) || placeholder}
          </Txt>
        </Pressable>
        {clear ?? <DesignIcon name="history" size={18} color={Zinc[600]} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: Zinc[900] },
  field: {
    height: 50,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Zinc[300],
    borderRadius: 12,
    backgroundColor: White,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  grow: { flex: 1, minWidth: 0, justifyContent: 'center', alignSelf: 'stretch' },
  value: { fontSize: 16, color: Zinc[900] },
  placeholder: { fontSize: 16, color: Zinc[400] },
});
