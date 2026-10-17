import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, EmptyState, LoadingState } from './ui';
import { EventCard, eventDiscountTag } from './EventCard';
import { formatDateTime } from '../lib/format';
import type { EventWithDistance } from '../lib/eventFilters';
import { colors, font, radius, shadow, spacing } from '../theme';

export const PEEK_EMPTY = 76;
export const PEEK_SELECTED = 156;

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
  canDeleteEvent?: (e: EventWithDistance) => boolean;
  onlyMyEvents?: boolean;
  myEventsTotal?: number;
  onToggleOnlyMyEvents?: () => void;
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
  canDeleteEvent,
  onlyMyEvents = false,
  myEventsTotal = 0,
  onToggleOnlyMyEvents,
}: Props) {
  const peekH = selected ? PEEK_SELECTED : PEEK_EMPTY;
  const openH = Math.max(PEEK_SELECTED + 60, mapHeight * 0.74);
  const target = open ? openH : peekH;
  const height = useRef(new Animated.Value(target)).current;
  const stateRef = useRef({ open, peekH, openH, onOpenChange });
  stateRef.current = { open, peekH, openH, onOpenChange };

  useEffect(() => {
    Animated.timing(height, { toValue: target, duration: 220, useNativeDriver: false }).start();
  }, [target, height]);

  const handlePan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, gs) => Math.abs(gs.dy) > 6,
        onMoveShouldSetPanResponderCapture: (_e, gs) =>
          Math.abs(gs.dy) > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
        onPanResponderMove: (_e, gs) => {
          const { open: isOpen, peekH: pH, openH: oH } = stateRef.current;
          const base = isOpen ? oH : pH;
          const next = Math.max(pH, Math.min(oH, base - gs.dy));
          height.setValue(next);
        },
        onPanResponderRelease: (_e, gs) => {
          const { open: isOpen, peekH: pH, openH: oH, onOpenChange: setOpen } = stateRef.current;
          if (gs.dy < -18) setOpen(true);
          else if (gs.dy > 18) setOpen(false);
          else if (Math.abs(gs.dy) < 6) setOpen(!isOpen);
          else {
            const base = isOpen ? oH : pH;
            const finalH = base - gs.dy;
            setOpen(finalH > (pH + oH) / 2);
          }
        },
      }),
    [height],
  );

  const previewSwipePan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_e, gs) =>
          Math.abs(gs.dy) > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
        onPanResponderMove: (_e, gs) => {
          const { open: isOpen, peekH: pH, openH: oH } = stateRef.current;
          const base = isOpen ? oH : pH;
          const next = Math.max(pH, Math.min(oH, base - gs.dy));
          height.setValue(next);
        },
        onPanResponderRelease: (_e, gs) => {
          const { onOpenChange: setOpen } = stateRef.current;
          if (gs.dy < -16) setOpen(true);
          else if (gs.dy > 16) setOpen(false);
        },
      }),
    [height],
  );

  const ticketedEvents = useMemo(
    () => (onlyMyEvents ? events.filter((e) => !e.isFree) : []),
    [events, onlyMyEvents],
  );
  const freeEvents = useMemo(
    () => (onlyMyEvents ? events.filter((e) => e.isFree) : []),
    [events, onlyMyEvents],
  );

  const renderCard = (item: EventWithDistance) => {
    const allowDelete = canDeleteEvent ? canDeleteEvent(item) : false;
    return (
      <EventCard
        key={item.id}
        event={item}
        highlight={item.id === selected?.id}
        onOpen={() => onOpenEvent(item)}
        onShowOnMap={() => onShowOnMap(item)}
        onDelete={allowDelete && onDeleteEvent ? () => onDeleteEvent(item) : undefined}
      />
    );
  };

  return (
    <Animated.View style={[styles.panel, { height }]}>
      <View
        {...handlePan.panHandlers}
        style={styles.handleArea}
        accessibilityLabel={open ? 'Zwiń listę' : 'Rozwiń listę wydarzeń'}
      >
        <View style={styles.handle} />
        <View style={styles.headRow}>
          <Text style={styles.headTitle}>
            {onlyMyEvents ? 'Moje wydarzenia' : 'Wydarzenia'} ({loading ? '…' : events.length})
          </Text>
          <View style={{ flex: 1 }} />
          {onToggleOnlyMyEvents ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onToggleOnlyMyEvents();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Pokaż moje wydarzenia"
              style={[styles.interestedPill, onlyMyEvents && styles.interestedPillActive]}
            >
              <Ionicons
                name={onlyMyEvents ? 'ticket' : 'ticket-outline'}
                size={14}
                color={onlyMyEvents ? '#FFFFFF' : colors.brick}
              />
              <Text
                style={[
                  styles.interestedPillText,
                  onlyMyEvents && { color: '#FFFFFF' },
                ]}
              >
                Moje wydarzenia{myEventsTotal > 0 ? ` (${myEventsTotal})` : ''}
              </Text>
            </Pressable>
          ) : null}
          <Ionicons name={open ? 'chevron-down' : 'chevron-up'} size={18} color={colors.inkSoft} />
        </View>
      </View>

      {open ? (
        loading ? (
          <LoadingState />
        ) : events.length === 0 ? (
          <EmptyState
            icon={onlyMyEvents ? 'ticket-outline' : 'calendar-outline'}
            title={onlyMyEvents ? 'Brak moich wydarzeń' : 'Brak wydarzeń'}
            message={
              onlyMyEvents
                ? 'Kup bilet na wydarzenie biletowane lub kliknij „Interesuje mnie” przy wydarzeniu z wolnym wstępem.'
                : 'Zmień kryteria lub wyczyść filtry.'
            }
            actionLabel={
              onlyMyEvents
                ? 'Pokaż wszystkie'
                : hasFilters
                  ? 'Wyczyść filtry'
                  : undefined
            }
            onAction={
              onlyMyEvents
                ? onToggleOnlyMyEvents
                : hasFilters
                  ? onClearFilters
                  : undefined
            }
          />
        ) : onlyMyEvents ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Sekcja 1: Biletowane */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBadge, { backgroundColor: colors.brickSoft }]}>
                  <Ionicons name="ticket-outline" size={14} color={colors.brick} />
                </View>
                <Text style={styles.sectionTitle}>Biletowane</Text>
                <View style={styles.sectionCountPill}>
                  <Text style={styles.sectionCountText}>{ticketedEvents.length}</Text>
                </View>
              </View>
              {ticketedEvents.length > 0 ? (
                <View style={styles.grid}>{ticketedEvents.map(renderCard)}</View>
              ) : (
                <Text style={styles.sectionEmptyText}>
                  Brak kupionych biletów na wydarzenia biletowane.
                </Text>
              )}
            </View>

            {/* Sekcja 2: Wstęp wolny */}
            <View style={[styles.sectionBlock, { marginTop: spacing.md }]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.sectionIconBadge, { backgroundColor: colors.successSoft }]}>
                  <Ionicons name="walk-outline" size={14} color={colors.success} />
                </View>
                <Text style={styles.sectionTitle}>Wstęp wolny</Text>
                <View style={styles.sectionCountPill}>
                  <Text style={styles.sectionCountText}>{freeEvents.length}</Text>
                </View>
              </View>
              {freeEvents.length > 0 ? (
                <View style={styles.grid}>{freeEvents.map(renderCard)}</View>
              ) : (
                <Text style={styles.sectionEmptyText}>
                  Brak wybranych wydarzeń z wolnym wstępem.
                </Text>
              )}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grid}>{events.map(renderCard)}</View>
          </ScrollView>
        )
      ) : selected ? (
        <View {...previewSwipePan.panHandlers} style={styles.preview}>
          <Pressable onPress={() => onOpenEvent(selected)} style={{ flex: 1 }}>
            <Text style={styles.previewTitle} numberOfLines={1}>
              {selected.title}
            </Text>
            <Text style={styles.previewMeta} numberOfLines={1}>
              {selected.venue} · {formatDateTime(selected.startsAt)}
            </Text>
          </Pressable>
          <Button label="Więcej" small onPress={() => onOpenEvent(selected)} />
          {onDeleteEvent && (!canDeleteEvent || canDeleteEvent(selected)) ? (
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
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Zamknij podgląd"
            style={{ padding: 6 }}
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
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    overflow: 'hidden',
    ...shadow.float,
  },
  handleArea: { paddingTop: 10, paddingHorizontal: spacing.lg, paddingBottom: 12 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  headTitle: { ...font.bodyBold, color: colors.ink },
  interestedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.brickSoft,
    borderWidth: 1,
    borderColor: '#E5BFB8',
  },
  interestedPillActive: {
    backgroundColor: colors.brick,
    borderColor: colors.brick,
  },
  interestedPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brickDark,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: 52,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionBlock: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 4,
  },
  sectionIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  sectionCountPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.inkSoft,
  },
  sectionEmptyText: {
    ...font.small,
    color: colors.muted,
    backgroundColor: colors.cream,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
  },
  previewTitle: { ...font.bodyBold, color: colors.ink },
  previewMeta: { ...font.small, color: colors.muted, marginTop: 2 },
});
