import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, EmptyState, LoadingState } from './ui';
import { EventCard, eventDiscountTag } from './EventCard';
import { formatDateTime } from '../lib/format';
import type { EventWithDistance } from '../lib/eventFilters';
import { colors, font, radius, shadow, spacing } from '../theme';

export const PEEK_EMPTY = 64;
export const PEEK_SELECTED = 136;

interface Props {
  events: EventWithDistance[];
  loading: boolean;
  selected: EventWithDistance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapHeight: number;
  hasFilters: boolean;
  onClearFilters: () => void;
  onOpenEvent: (e: EventWithDistance) => void;
  onShowOnMap: (e: EventWithDistance) => void;
  onClearSelection: () => void;
  onDeleteEvent?: (e: EventWithDistance) => void;
}

export function NearbyPanel({
  events,
  loading,
  selected,
  open,
  onOpenChange,
  mapHeight,
  hasFilters,
  onClearFilters,
  onOpenEvent,
  onShowOnMap,
  onClearSelection,
  onDeleteEvent,
}: Props) {
  const peekH = selected ? PEEK_SELECTED : PEEK_EMPTY;
  const openH = Math.max(PEEK_SELECTED + 40, mapHeight * 0.72);
  const target = open ? openH : peekH;
  const height = useRef(new Animated.Value(target)).current;

  useEffect(() => {
    Animated.timing(height, { toValue: target, duration: 220, useNativeDriver: false }).start();
  }, [target, height]);

  const handlePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderRelease: (_e, gs) => {
          if (gs.dy < -20) onOpenChange(true);
          else if (gs.dy > 20) onOpenChange(false);
          else onOpenChange(!open);
        },
      }),
    [open, onOpenChange],
  );

  return (
    <Animated.View style={[styles.panel, { height }]}>
      <View
        {...handlePan.panHandlers}
        style={styles.handleArea}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Zwiń listę' : 'Rozwiń listę wydarzeń'}
      >
        <View style={styles.handle} />
        <View style={styles.headRow}>
          <Text style={styles.headTitle}>
            Wydarzenia ({loading ? '…' : events.length})
          </Text>
          <View style={{ flex: 1 }} />
          <Ionicons name={open ? 'chevron-down' : 'chevron-up'} size={18} color={colors.inkSoft} />
        </View>
      </View>

      {open ? (
        loading ? (
          <LoadingState />
        ) : events.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Brak wydarzeń"
            message="Zmień kryteria lub wyczyść filtry."
            actionLabel={hasFilters ? 'Wyczyść filtry' : undefined}
            onAction={hasFilters ? onClearFilters : undefined}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grid}>
              {events.map((item) => (
                <EventCard
                  key={item.id}
                  event={item}
                  highlight={item.id === selected?.id}
                  onOpen={() => onOpenEvent(item)}
                  onShowOnMap={() => onShowOnMap(item)}
                  onDelete={onDeleteEvent ? () => onDeleteEvent(item) : undefined}
                />
              ))}
            </View>
          </ScrollView>
        )
      ) : selected ? (
        <View style={styles.preview}>
          <Pressable onPress={() => onOpenEvent(selected)} style={{ flex: 1 }}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {selected.title}
            </Text>
            <Text style={styles.previewMeta} numberOfLines={1}>
              {selected.venue} · {formatDateTime(selected.startsAt)}
            </Text>
          </Pressable>
          <Button label="Więcej" small onPress={() => onOpenEvent(selected)} />
          {onDeleteEvent ? (
            <Pressable
              onPress={() => onDeleteEvent(selected)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Usuń wydarzenie"
              style={{ padding: 6 }}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onClearSelection}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Zamknij podgląd"
            style={{ padding: 4 }}
          >
            <Ionicons name="close" size={18} color={colors.muted} />
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    overflow: 'hidden',
    ...shadow.float,
  },
  handleArea: { paddingTop: 8, paddingHorizontal: spacing.lg, paddingBottom: 8 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: colors.line },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  headTitle: { ...font.bodyBold, color: colors.ink },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    padding: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
  },
  previewTitle: { ...font.bodyBold, color: colors.ink },
  previewMeta: { ...font.small, color: colors.muted, marginTop: 2 },
});
