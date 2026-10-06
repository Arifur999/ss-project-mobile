import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { White, Zinc } from '@/constants/theme';
import { useLang } from '@/context/LanguageContext';
import { dateLabel, fromISODate, toISODate } from '@/lib/dates';

/**
 * The design's date input: a 50-tall zinc field. Android opens the system date
 * dialog; iOS shows its compact picker in place, which opens the same calendar.
 */
export function DateField({ label, value, onChange }: { label: string; value: string; onChange: (iso: string) => void }) {
  const { lang } = useLang();
  const date = fromISODate(value) ?? new Date();

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.wrap}>
        <Txt style={styles.label}>{label}</Txt>
        <View style={[styles.field, styles.iosField]}>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            onChange={(_, picked) => picked && onChange(toISODate(picked))}
            accessibilityLabel={label}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Txt style={styles.label}>{label}</Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${dateLabel(value, lang)}`}
        onPress={() =>
          DateTimePickerAndroid.open({
            value: date,
            mode: 'date',
            onChange: (event, picked) => {
              if (event.type === 'set' && picked) onChange(toISODate(picked));
            },
          })
        }
        style={styles.field}>
        <Txt style={styles.value} numberOfLines={1}>
          {dateLabel(value, lang)}
        </Txt>
        <DesignIcon name="calendar" size={18} color={Zinc[600]} />
      </Pressable>
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
  iosField: { justifyContent: 'flex-start' },
  value: { flex: 1, fontSize: 16, color: Zinc[900] },
});
