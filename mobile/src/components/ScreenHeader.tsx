import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { useAuth } from '../state/AuthContext';
import { useAppData } from '../state/AppDataContext';

export function AccountButton() {
  const { user, openAuth } = useAuth();
  const { unreadNotificationCount, taxVerified } = useAppData();

  return (
    <View style={styles.rightRow}>
      <Pressable
        onPress={() => openAuth('account')}
        accessibilityRole="button"
        accessibilityLabel={`Powiadomienia (${unreadNotificationCount})`}
        style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.78 }]}
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

      <Pressable
        onPress={() => openAuth(user ? 'account' : 'login')}
        accessibilityRole="button"
        accessibilityLabel={user ? `Profil: ${user.name}` : 'Profil i logowanie'}
        style={({ pressed }) => [
          styles.iconBtn,
          (user || taxVerified) && styles.iconBtnActive,
          pressed && { opacity: 0.8 },
        ]}
      >
        <Ionicons
          name={user ? 'person' : 'person-outline'}
          size={18}
          color={user || taxVerified ? colors.brick : colors.ink}
        />
      </Pressable>
    </View>
  );
}

export const APP_NAME = 'NaszToruń';

export function ScreenHeader({
  title = APP_NAME,
}: {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.brandDot} />
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title || APP_NAME}
      </Text>
      <AccountButton />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  brandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brick,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: colors.ink,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: {
    backgroundColor: colors.brickSoft,
    borderColor: '#EAD2CE',
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
});
