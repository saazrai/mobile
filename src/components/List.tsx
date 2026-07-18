import { Children, ReactNode, isValidElement } from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { useTheme, radius, spacing, hairline, listInset } from '../theme/tokens';

/**
 * iOS grouped-inset list (tokens.ts). Renders a rounded card of rows with hairline
 * separators inset to clear a leading icon, plus optional uppercase header and a
 * secondaryLabel footer — the exact pattern in the Account Settings mockup.
 *
 *   <Section header="Account" footer="Synced across your devices.">
 *     <Row label="SecureStart Account" value="you@email.com" />
 *   </Section>
 */
export function Section({ header, footer, children, style }: { header?: string; footer?: string; children: ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={[{ marginTop: spacing.xl }, style]}>
      {header && <Text variant="footnote" color="label2" style={styles.header}>{header.toUpperCase()}</Text>}
      <View style={[styles.card, { backgroundColor: t.cell, borderRadius: radius.cell, marginHorizontal: spacing.lg }]}>
        {rows.map((row, i) => {
          const hasIcon = isValidElement(row) && !!(row.props as RowProps).icon;
          return (
            <View key={i}>
              {i > 0 && <View style={[styles.sep, { backgroundColor: t.separator, marginLeft: hasIcon ? listInset.withIcon : listInset.plain }]} />}
              {row}
            </View>
          );
        })}
      </View>
      {footer && <Text variant="footnote" color="label2" style={styles.footer}>{footer}</Text>}
    </View>
  );
}

interface RowProps {
  label: string;
  value?: string;
  icon?: IconName;
  iconBg?: string;
  chevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  right?: ReactNode;
}

export function Row({ label, value, icon, iconBg, chevron = true, destructive, onPress, right }: RowProps) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: t.cellPress }}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: t.cellPress }]}
      accessibilityRole="button"
    >
      {icon && (
        <View style={[styles.iconTile, { backgroundColor: iconBg ?? t.blue }]}>
          <Icon name={icon} size={17} color="#fff" />
        </View>
      )}
      <Text variant="body" color={destructive ? 'red' : 'label'} style={styles.label} numberOfLines={1}>{label}</Text>
      <View style={styles.trail}>
        {value && <Text variant="body" color="label2" numberOfLines={1} style={styles.value}>{value}</Text>}
        {right}
        {chevron && <Icon name="chevron" size={13} color={t.label3} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { marginHorizontal: spacing.lg, marginBottom: 7, letterSpacing: 0.4 },
  footer: { marginHorizontal: spacing.lg, marginTop: spacing.sm, lineHeight: 18 },
  card: { overflow: 'hidden' },
  sep: { height: hairline },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 44 },
  iconTile: { width: 29, height: 29, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, minWidth: 0 },
  trail: { flexDirection: 'row', alignItems: 'center', gap: 7, marginLeft: 'auto' },
  value: { maxWidth: 150 },
});
