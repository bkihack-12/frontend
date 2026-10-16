import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const TAB_ORDER = ['ruch', 'spolecznosc', 'miasto', 'transport'] as const;
export type TabKey = (typeof TAB_ORDER)[number];

export const TAB_META: Record<TabKey, { label: string; icon: IconName; iconActive: IconName; href: `/${TabKey}` }> = {
  ruch: { label: 'Ruch', icon: 'car-outline', iconActive: 'car', href: '/ruch' },
  spolecznosc: { label: 'Społeczność', icon: 'compass-outline', iconActive: 'compass', href: '/spolecznosc' },
  miasto: { label: 'Miasto', icon: 'sparkles-outline', iconActive: 'sparkles', href: '/miasto' },
  transport: { label: 'Transport', icon: 'bus-outline', iconActive: 'bus', href: '/transport' },
};

export function TabBar(_props?: unknown) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();

  const currentTab: TabKey =
    TAB_ORDER.find((key) => pathname === `/${key}` || pathname.startsWith(`/${key}/`)) ?? 'spolecznosc';

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]} accessibilityRole="tablist">
      {TAB_ORDER.map((key) => {
        const meta = TAB_META[key];
        const focused = currentTab === key;
        return (
          <Pressable
            key={key}
            onPress={() => {
              if (!focused) router.navigate(meta.href);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta.label}
            style={styles.item}
          >
            <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
              <Ionicons
                name={focused ? meta.iconActive : meta.icon}
                size={20}
                color={focused ? colors.brick : colors.muted}
              />
            </View>
            <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 6,
  },
  item: { flex: 1, alignItems: 'center', minHeight: 50, justifyContent: 'center', gap: 2 },
  iconWrap: {
    width: 44,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.brickSoft },
  label: { fontSize: 11, fontWeight: '500', color: colors.muted },
  labelActive: { fontSize: 11, fontWeight: '700', color: colors.brick },
});
