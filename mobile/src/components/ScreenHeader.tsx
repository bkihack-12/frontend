import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, font, radius, spacing } from '../theme';
import { useAuth } from '../state/AuthContext';
import { useAppData } from '../state/AppDataContext';

export function AccountButton() {
  const { user, openAuth } = useAuth();
  const { unreadNotificationCount } = useAppData();

  return (
    <View style={styles.rightRow}>
      <Pressable
        onPress={() => openAuth('account')}
        accessibilityRole="button"
        accessibilityLabel={`Powiadomienia (${unreadNotificationCount} nieprzeczytanych)`}
        style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.78 }]}
      >
        <Ionicons
          name={unreadNotificationCount > 0 ? 'notifications' : 'notifications-outline'}
          size={18}
          color={unreadNotificationCount > 0 ? colors.brick : colors.inkSoft}
        />
        {unreadNotificationCount > 0 ? (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText}>{unreadNotificationCount}</Text>
          </View>
        ) : null}
      </Pressable>

      {!user ? (
        <Pressable
          onPress={() => openAuth('login')}
          accessibilityRole="button"
          accessibilityLabel="Zaloguj się lub otwórz panel użytkownika"
          style={({ pressed }) => [styles.loginBtn, pressed && { opacity: 0.78 }]}
        >
          <Ionicons name="person-outline" size={15} color={colors.ink} />
          <Text style={styles.loginText}>Zaloguj</Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => openAuth('account')}
          accessibilityRole="button"
          accessibilityLabel={`Panel użytkownika: ${user.name}`}
          style={({ pressed }) => [styles.avatarPill, pressed && { opacity: 0.8 }]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName} numberOfLines={1}>
            {user.name.split(' ')[0]}
          </Text>
        </Pressable>
      )}
    </View>
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
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bellBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.brick,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
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
  loginText: { color: colors.ink, fontWeight: '600', fontSize: 13 },
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
