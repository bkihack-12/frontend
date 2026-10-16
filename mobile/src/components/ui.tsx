import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, shadow, spacing, TOUCH } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'river';
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  loading,
  disabled,
  small,
  style,
  accessibilityHint,
}: ButtonProps) {
  const palette = {
    primary: { bg: colors.brick, fg: '#fff', border: colors.brick },
    river: { bg: colors.river, fg: '#fff', border: colors.river },
    secondary: { bg: colors.surface, fg: colors.ink, border: colors.line },
    ghost: { bg: 'transparent', fg: colors.inkSoft, border: 'transparent' },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: palette.bg, borderColor: palette.border },
        inactive && { opacity: 0.5 },
        pressed && !inactive && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 15 : 17} color={palette.fg} /> : null}
          <Text style={[styles.btnText, small && { fontSize: 13 }, { color: palette.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
  count?: number;
}

export function Chip({ label, selected, onPress, icon, count }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && { opacity: 0.8 },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={selected ? colors.brick : colors.inkSoft} />
      ) : null}
      <Text style={[styles.chipText, selected && { color: colors.brickDark, fontWeight: '600' }]}>{label}</Text>
      {count !== undefined ? (
        <Text style={[styles.chipCountText, selected && { color: colors.brickDark }]}>{count}</Text>
      ) : null}
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Badge({
  label,
  color,
  bg,
  icon,
}: {
  label: string;
  color: string;
  bg: string;
  icon?: IconName;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={11} color={color} /> : null}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function Card({
  children,
  onPress,
  style,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.94 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  icon?: IconName;
}

export function TextField({ label, error, hint, icon, style, secureTextEntry, ...rest }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secureTextEntry);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          focused && { borderColor: colors.river },
          !!error && { borderColor: colors.danger },
        ]}
      >
        {icon ? <Ionicons name={icon} size={18} color={colors.muted} /> : null}
        <TextInput
          {...rest}
          secureTextEntry={hidden}
          accessibilityLabel={label}
          placeholderTextColor={colors.muted}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, rest.multiline && { minHeight: 80, textAlignVertical: 'top' }, style]}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Pokaż hasło' : 'Ukryj hasło'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.fieldError} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.fieldHint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function InlineNotice({
  kind = 'info',
  text,
  icon,
}: {
  kind?: 'info' | 'warning' | 'success' | 'error';
  text: string;
  icon?: IconName;
}) {
  const p = {
    info: { bg: colors.infoSoft, fg: colors.info, icon: 'information-circle-outline' as IconName },
    warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'alert-circle-outline' as IconName },
    success: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle-outline' as IconName },
    error: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle-outline' as IconName },
  }[kind];
  return (
    <View style={[styles.notice, { backgroundColor: p.bg }]}>
      <Ionicons name={icon ?? p.icon} size={16} color={p.fg} style={{ marginTop: 1 }} />
      <Text style={[styles.noticeText, { color: p.fg }]}>{text}</Text>
    </View>
  );
}

export function EmptyState({
  icon = 'search-outline',
  title,
  message,
  actionLabel,
  onAction,
}: {
  icon?: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.state}>
      <View style={styles.stateIcon}>
        <Ionicons name={icon} size={24} color={colors.inkSoft} />
      </View>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateMsg}>{message}</Text>
      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} variant="secondary" small style={{ marginTop: spacing.md }} />
      ) : null}
    </View>
  );
}

export function LoadingState({ label = 'Wczytywanie…' }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator size="small" color={colors.brick} />
      <Text style={[styles.stateMsg, { marginTop: spacing.sm }]}>{label}</Text>
    </View>
  );
}

export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  fullHeight,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  fullHeight?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <KeyboardAvoidingView
        style={styles.sheetRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Zamknij"
          accessibilityRole="button"
        />
        <View
          style={[
            styles.sheet,
            fullHeight && { height: '90%' },
            { paddingBottom: Math.max(insets.bottom, spacing.lg) },
          ]}
        >
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle} numberOfLines={2}>
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Zamknij"
              hitSlop={6}
            >
              <Ionicons name="close" size={18} color={colors.inkSoft} />
            </Pressable>
          </View>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: spacing.md }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function MetaRow({ icon, text, color }: { icon: IconName; text: string; color?: string }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={15} color={color ?? colors.muted} style={{ marginTop: 2 }} />
      <Text style={[styles.metaText, color ? { color } : null]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: TOUCH,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnSmall: { minHeight: 34, paddingHorizontal: 12, borderRadius: radius.sm },
  btnText: { fontSize: 14, fontWeight: '600' },
  chip: {
    height: 32,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chipSelected: { backgroundColor: colors.brickSoft, borderColor: '#E5BFB8' },
  chipText: { fontSize: 13, fontWeight: '500', color: colors.inkSoft },
  chipCountText: { fontSize: 11, fontWeight: '600', color: colors.muted },
  chipRow: { paddingHorizontal: spacing.lg, gap: 6, paddingVertical: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeText: { ...font.tiny },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  fieldLabel: { ...font.small, fontWeight: '600', color: colors.inkSoft, marginBottom: 5 },
  inputWrap: {
    minHeight: TOUCH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 8,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null),
  },
  fieldError: { ...font.small, color: colors.danger, marginTop: 4 },
  fieldHint: { ...font.small, color: colors.muted, marginTop: 4 },
  notice: {
    flexDirection: 'row',
    gap: 8,
    padding: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'flex-start',
  },
  noticeText: { ...font.small, flex: 1 },
  state: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg },
  stateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  stateTitle: { ...font.h3, color: colors.ink, textAlign: 'center' },
  stateMsg: { ...font.small, color: colors.muted, textAlign: 'center', marginTop: 4 },
  sheetRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.overlay, alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginBottom: spacing.sm,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  sheetTitle: { ...font.h2, color: colors.ink, flex: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetFooter: { paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.line },
  metaRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  metaText: { ...font.small, color: colors.inkSoft, flex: 1 },
});
