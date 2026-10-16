import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, spacing } from '../theme';
import { useAuth } from '../state/AuthContext';

export function AccountButton() {
  const { user, openAuth } = useAuth();
  if (!user) {
    return (
      <Pressable
        onPress={() => openAuth('login')}
        accessibilityRole="button"
        accessibilityLabel="Zaloguj się lub załóż konto"
        style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.75 }]}
      >
        <Ionicons name="person-outline" size={16} color={colors.inkSoft} />
        <Text style={styles.loginText}>Konto</Text>
      </Pressable>
    );
  }
  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <Pressable
      onPress={() => openAuth('account')}
      accessibilityRole="button"
      accessibilityLabel={`Konto: ${user.name}`}
      style={({ pressed }) => [styles.avatarPill, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <Text style={styles.userName} numberOfLines={1}>
        {user.name.split(' ')[0]}
      </Text>
    </Pressable>
  );
}

export function ScreenHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.brandDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <AccountButton />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brick,
  },
  title: { ...font.h2, color: colors.ink },
  subtitle: { ...font.small, color: colors.muted, marginTop: 1 },
  loginBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  loginText: { color: colors.inkSoft, fontWeight: '600', fontSize: 13 },
  avatarPill: {
    height: 34,
    paddingLeft: 4,
    paddingRight: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.brickSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brick,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 11 },
  userName: { color: colors.brickDark, fontWeight: '600', fontSize: 13, maxWidth: 90 },
});
