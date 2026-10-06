import { StyleSheet, TextInput, View, type ViewStyle } from 'react-native';

import { DesignIcon } from '@/components/DesignIcon';
import { fontFamily } from '@/constants/fonts';
import { White, Zinc } from '@/constants/theme';
import { useLang } from '@/context/LanguageContext';

/**
 * The design's search box: a magnifier inside the left edge of a zinc input.
 * The loan overview draws it 44 tall beside a sort picker; the expense list
 * 50 tall on its own row.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  label,
  height = 44,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  label: string;
  height?: 44 | 50;
  style?: ViewStyle;
}) {
  const { lang } = useLang();
  const tall = height === 50;
  return (
    <View style={style}>
      <View pointerEvents="none" style={[styles.icon, { left: tall ? 14 : 12, top: tall ? 16 : 13 }]}>
        <DesignIcon name="search" size={18} color={Zinc[500]} strokeWidth={2} />
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Zinc[500]}
        accessibilityLabel={label}
        accessibilityRole="search"
        returnKeyType="search"
        autoCorrect={false}
        style={[
          styles.input,
          { height, paddingLeft: tall ? 42 : 38, paddingRight: tall ? 14 : 12, fontFamily: fontFamily(lang, 400) },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { position: 'absolute', zIndex: 1 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: Zinc[300],
    borderRadius: 12,
    backgroundColor: White,
    fontSize: 16,
    color: Zinc[900],
  },
});
