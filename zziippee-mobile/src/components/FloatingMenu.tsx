import { useState, useMemo, useCallback } from 'react';
import { View, Pressable, StyleSheet, Modal, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Icon, type IconName as IconTypeName } from './Icon';
import { Text } from './Text';
import { useTheme, hairline, radius, spacing, shadow } from '../theme/tokens';

/** One row inside the floating menu. */
export interface MenuItem {
  /** Icon name from the Icon component. */
  icon: IconTypeName;
  /** Display label. */
  label: string;
  /** Called when the row is pressed. */
  onPress: () => void;
  /** Render as red destructive text. */
  destructive?: boolean;
}

interface Props {
  /** Menu items to render. */
  items: MenuItem[];
  /** Icon shown on the trigger button (default: moreHorizontal). */
  triggerIcon?: IconTypeName;
  /** Position offset from the right edge (px). */
  offsetRight?: number;
  /** Position offset from the bottom (px). */
  offsetBottom?: number;
  /** Called when the menu is dismissed (user tapped outside / cancel). */
  onDismiss?: () => void;
  /** Whether the menu is controlled externally. */
  forceOpen?: boolean;
  /** Suppress the cancel row at the bottom. */
  hideCancel?: boolean;
}

const SHEET_HEIGHT = 260;

/**
   * Instagram-style floating action menu.
   *
   * Renders a small circular FAB (three-dot) in the bottom-right corner.
   * Tapping it opens a frosted-glass menu card that slides up with a spring
   * animation — exactly the pattern seen on Instagram / iOS share sheets.
   *
   * Supports full light / dark theme via the existing token system.
   *
   * Usage:
   *   <FloatingMenu
   *     items={[
   *       { icon: 'bookmark', label: 'Save', onPress: handleSave },
   *       { icon: 'shareForward', label: 'Share', onPress: handleShare },
   *       { icon: 'trash', label: 'Delete', destructive: true, onPress: handleDelete },
   *     ]}
   *   />
   */
export function FloatingMenu({
  items,
  triggerIcon = 'moreHorizontal',
  offsetRight = 20,
  offsetBottom = 90,
  onDismiss,
  forceOpen,
  hideCancel,
}: Props) {
  const t = useTheme();
  const scheme = useColorScheme();
  const [open, setOpen] = useState(false);

  const isOpen = forceOpen ?? open;

  // Animation values
  const slideY = useSharedValue(SHEET_HEIGHT);
  const scale = useSharedValue(0.85);
  const backdropOpacity = useSharedValue(0);

  const openMenu = useCallback(() => {
    Haptics.selectionAsync();
    slideY.value = withSpring(0, { damping: 14, stiffness: 300 });
    scale.value = withSpring(1, { damping: 14, stiffness: 300 });
    backdropOpacity.value = withSpring(1, { damping: 12, stiffness: 200 });
    setOpen(true);
  }, [slideY, scale, backdropOpacity]);

  const closeMenu = useCallback(() => {
    slideY.value = withSpring(SHEET_HEIGHT, { damping: 18, stiffness: 400 });
    scale.value = withSpring(0.85, { damping: 18, stiffness: 400 });
    backdropOpacity.value = withSpring(0, { damping: 20, stiffness: 500 }, () => {
      runOnJS(setOpen)(false);
      onDismiss?.();
    });
  }, [slideY, scale, backdropOpacity, onDismiss]);

  const handleItemPress = useCallback(
    (item: MenuItem) => {
      closeMenu();
      item.onPress();
    },
    [closeMenu],
  );

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }, { scale: scale.value }],
  }));

  // Build icon row for the menu card
  const menuRows = useMemo(
    () =>
      items.map((item, i) => (
        <View key={i}>
          {i > 0 && <View style={[styles.sep, { backgroundColor: t.separator }]} />}
          <Pressable
            style={({ pressed }) => [
              styles.menuRow,
              pressed && { backgroundColor: t.cellPress },
            ]}
            onPress={() => handleItemPress(item)}
          >
            <View style={[styles.menuIconWrap, { backgroundColor: item.destructive ? t.red : t.fill }]}>
              <Icon name={item.icon} size={18} color={item.destructive ? '#fff' : t.label} />
            </View>
            <Text
              variant="body"
              color={item.destructive ? 'red' : 'label'}
              style={styles.menuLabel}
            >
              {item.label}
            </Text>
          </Pressable>
        </View>
      )),
    [items, t, handleItemPress],
  );

  return (
    <>
      {/* Floating Action Button */}
      <Pressable
        style={[
          styles.fab,
          {
            right: offsetRight,
            bottom: offsetBottom,
            backgroundColor: t.cell,
            borderColor: t.separator,
          },
        ]}
        onPress={isOpen ? closeMenu : openMenu}
        hitSlop={12}
      >
        <Icon
          name={triggerIcon}
          size={22}
          color={isOpen ? t.blue : t.label}
        />
      </Pressable>

      {/* Modal overlay */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeMenu}
      >
        <View style={styles.overlay}>
          {/* Backdrop — tap to dismiss */}
          <Pressable style={styles.backdrop} onPress={closeMenu}>
            <Animated.View style={[styles.backdropInner, backdropStyle]} />
          </Pressable>

          {/* Menu card — slides up */}
          <View style={styles.sheetContainer}>
            <Animated.View style={cardStyle}>
              <BlurView
                intensity={40}
                tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
                style={[
                  styles.sheetCard,
                  {
                    backgroundColor: t.cell,
                    borderColor: t.separator,
                    shadowColor: '#000',
                  },
                ]}
              >
                {menuRows}

                {/* Cancel row */}
                {!hideCancel && (
                  <>
                    <View style={[styles.sep, { backgroundColor: t.separator }]} />
                    <Pressable
                      style={({ pressed }) => [
                        styles.cancelRow,
                        pressed && { backgroundColor: t.cellPress },
                      ]}
                      onPress={closeMenu}
                    >
                      <Text variant="body" color="label" style={styles.cancelLabel}>
                        Cancel
                      </Text>
                    </Pressable>
                  </>
                )}
              </BlurView>
            </Animated.View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: hairline,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.floating,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  backdropInner: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 40,
    zIndex: 2,
  },
  sheetCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderTopWidth: hairline,
    ...shadow.floating,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    minHeight: 52,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuLabel: {
    flex: 1,
  },
  cancelRow: {
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 48,
  },
  cancelLabel: {
    fontWeight: '600',
  },
  sep: {
    height: hairline,
    marginLeft: spacing.lg + 40,
  },
});
