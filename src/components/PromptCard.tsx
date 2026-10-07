import { StyleSheet, View } from 'react-native';

import { DesignIcon, type IconName } from '@/components/DesignIcon';
import { Txt } from '@/components/Txt';
import { Zinc } from '@/constants/theme';

/** The dashed box that stands in for a statement or ledger until someone is chosen: an icon in a grey disc and what to do. */
export function PromptCard({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.box}>
      <View style={styles.icon}>
        <DesignIcon name={icon} size={26} color={Zinc[600]} />
      </View>
      <Txt style={styles.text}>{text}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Zinc[300],
  },
  icon: { width: 56, height: 56, borderRadius: 999, backgroundColor: Zinc[100], alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 15, color: Zinc[600], textAlign: 'center' },
});
