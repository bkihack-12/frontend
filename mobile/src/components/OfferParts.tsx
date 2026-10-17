import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Chip, InlineNotice, MetaRow, Sheet, TextField } from './ui';
import { KIND_META, OFFER_CATEGORY_LABEL } from '../data/offers';
import { formatLongDate } from '../lib/format';
import type { CityOffer, ResidentBenefit } from '../types';
import { useAppData } from '../state/AppDataContext';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { colors, font, radius, shadow, spacing } from '../theme';

export interface TaxpayerDeclaration {
  fullName: string;
  taxOffice: string;
  address: string;
  confirmed: boolean;
}

const TAX_OFFICES = [
  'Pierwszy Urząd Skarbowy w Toruniu',
  'Drugi Urząd Skarbowy w Toruniu',
];

/** Logotyp firmy / przedsiębiorstwa partnerskiego (monogram + ikona branży w barwach marki). */
export function CompanyLogo({
  offer,
  size = 'sm',
}: {
  offer: Pick<CityOffer, 'business' | 'logoText' | 'logoColor' | 'logoBg' | 'logoIcon'>;
  size?: 'sm' | 'lg';
}) {
  const bg = offer.logoBg ?? colors.cream;
  const fg = offer.logoColor ?? colors.ink;
  const monogram =
    offer.logoText ??
    offer.business
      .split(' ')
      .map((w) => w.replace(/[^A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/g, '')[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  const isLg = size === 'lg';

  return (
    <View
      style={[
        styles.logoBox,
        isLg && styles.logoBoxLg,
        { backgroundColor: bg, borderColor: `${fg}30` },
      ]}
    >
      {offer.logoIcon ? (
        <Ionicons name={offer.logoIcon as never} size={isLg ? 16 : 12} color={fg} />
      ) : null}
      <Text style={[styles.logoMonogram, isLg && styles.logoMonogramLg, { color: fg }]}>
        {monogram}
      </Text>
    </View>
  );
}

/** Kompaktowy baner informujący, że do zniżek mają prawo wyłącznie osoby płacące podatki w Toruniu. */
export function TaxpayerBanner({
  declaration,
  onOpenForm,
}: {
  declaration: TaxpayerDeclaration | null;
  onOpenForm: () => void;
}) {
  const verified = Boolean(declaration?.confirmed);
  return (
    <View style={[styles.taxBanner, verified && styles.taxBannerVerified]}>
      <View style={styles.taxBannerTop}>
        <View style={[styles.taxIconWrap, verified && { backgroundColor: colors.successSoft }]}>
          <Ionicons
            name={verified ? 'shield-checkmark' : 'receipt-outline'}
            size={20}
            color={verified ? colors.success : colors.brick}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.taxBannerTitle}>
            {verified
              ? 'Uprawnienia aktywne — Podatnik w Toruniu'
              : 'Zniżki tylko dla płacących podatki w Toruniu'}
          </Text>
          <Text style={styles.taxBannerSub}>
            {verified
              ? `${declaration?.fullName} · ${declaration?.taxOffice}`
              : 'Prawo do ulg miejskich i ofert firm partnerskich mają wyłącznie osoby rozliczające PIT w Toruniu.'}
          </Text>
        </View>
      </View>
      <Button
        label={verified ? 'Twoja deklaracja PIT' : 'Potwierdź rozliczanie podatków w Toruniu'}
        icon={verified ? 'create-outline' : 'document-text-outline'}
        variant={verified ? 'secondary' : 'primary'}
        small
        onPress={onOpenForm}
        style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}
      />
    </View>
  );
}

/** Formularz oświadczenia o rozliczaniu podatku dochodowego (PIT) w Toruniu. */
export function TaxpayerFormSheet({
  visible,
  onClose,
  initial,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  initial: TaxpayerDeclaration | null;
  onSave: (decl: TaxpayerDeclaration) => void;
}) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(initial?.fullName || user?.name || '');
  const [taxOffice, setTaxOffice] = useState(initial?.taxOffice || TAX_OFFICES[0]);
  const [address, setAddress] = useState(initial?.address || '');
  const [confirmed, setConfirmed] = useState(initial?.confirmed ?? false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (visible) {
      setFullName(initial?.fullName || user?.name || '');
      setTaxOffice(initial?.taxOffice || TAX_OFFICES[0]);
      setAddress(initial?.address || '');
      setConfirmed(initial?.confirmed ?? false);
      setErrors({});
    }
  }, [visible, initial, user]);

  const submit = () => {
    const e: Record<string, string> = {};
    if (fullName.trim().length < 3) e.fullName = 'Podaj imię i nazwisko.';
    if (address.trim().length < 4) e.address = 'Podaj adres zamieszkania w Toruniu.';
    if (!confirmed) e.confirmed = 'Wymagane jest potwierdzenie rozliczania podatków w Toruniu.';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    onSave({
      fullName: fullName.trim(),
      taxOffice,
      address: address.trim(),
      confirmed: true,
    });
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Weryfikacja podatnika w Toruniu"
      footer={<Button label="Zapisz i aktywuj uprawnienia" icon="checkmark-circle-outline" onPress={submit} />}
    >
      <InlineNotice
        kind="info"
        text="Ze zniżek miejskich oraz rabatów w firmach partnerskich mogą korzystać wyłącznie osoby, które rozliczają podatek dochodowy (PIT) w Toruniu."
      />

      <View style={{ height: spacing.md }} />
      <TextField
        label="Imię i nazwisko"
        icon="person-outline"
        value={fullName}
        onChangeText={setFullName}
        placeholder="np. Jan Kowalski"
        error={errors.fullName}
      />

      <TextField
        label="Adres zamieszkania w Toruniu"
        icon="home-outline"
        value={address}
        onChangeText={setAddress}
        placeholder="np. ul. Szeroka 12/4, 87-100 Toruń"
        error={errors.address}
      />

      <Text style={styles.fieldLabel}>Urząd Skarbowy właściwy dla rozliczenia PIT</Text>
      <View style={styles.officeWrap}>
        {TAX_OFFICES.map((office) => (
          <Chip
            key={office}
            label={office}
            icon="business-outline"
            selected={taxOffice === office}
            onPress={() => setTaxOffice(office)}
          />
        ))}
      </View>

      <Pressable
        onPress={() => {
          setConfirmed((v) => !v);
          setErrors((prev) => ({ ...prev, confirmed: '' }));
        }}
        style={styles.checkboxRow}
      >
        <Ionicons
          name={confirmed ? 'checkbox' : 'square-outline'}
          size={22}
          color={confirmed ? colors.brick : colors.muted}
        />
        <Text style={styles.checkboxText}>
          Oświadczam, że płacę podatki w Toruniu (rozliczam deklarację PIT w toruńskim Urzędzie Skarbowym).
        </Text>
      </Pressable>
      {errors.confirmed ? <Text style={styles.errorText}>{errors.confirmed}</Text> : null}
    </Sheet>
  );
}

/** Siatka (grid) głównych pakietów zniżek dla mieszkańców — na kafelku tylko duża zniżka i czego dotyczy. */
export function ResidentBenefitsGrid({
  benefits,
  onSelectBenefit,
}: {
  benefits: ResidentBenefit[];
  onSelectBenefit: (b: ResidentBenefit) => void;
}) {
  return (
    <View style={styles.sectionBlock}>
      <Text style={styles.gridHeading}>Pakiety miejskie (PIT w Toruniu)</Text>
      <View style={styles.grid}>
        {benefits.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => onSelectBenefit(b)}
            style={({ pressed }) => [styles.gridTile, pressed && { opacity: 0.9 }]}
          >
            <View style={styles.tileTop}>
              <View style={styles.discountHeroRiver}>
                <Text style={styles.discountHeroTextRiver}>{b.discount}</Text>
              </View>
              <Ionicons name={b.icon as never} size={18} color={colors.river} />
            </View>
            <Text style={styles.tileTitle} numberOfLines={2}>
              {b.title}
            </Text>
            <Text style={styles.tileSub} numberOfLines={1}>
              {b.place}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Kafelek oferty firmy/przedsiębiorstwa z logotypem w siatce 2-kolumnowej. */
export function OfferGridTile({
  offer,
  onOpen,
}: {
  offer: CityOffer;
  onOpen: () => void;
}) {
  const { savedOffers } = useAppData();
  const saved = savedOffers.includes(offer.id);
  const discountLabel =
    offer.benefitTag ??
    (offer.kind === 'sponsored' ? 'Promocja' : OFFER_CATEGORY_LABEL[offer.category]);

  return (
    <Pressable
      onPress={onOpen}
      accessibilityLabel={`${offer.business}: ${offer.title}`}
      style={({ pressed }) => [styles.gridTile, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.tileTop}>
        <CompanyLogo offer={offer} size="sm" />
        <View
          style={[
            styles.discountHeroBrick,
            !offer.tkm && { backgroundColor: colors.warningSoft },
          ]}
        >
          <Text
            style={[
              styles.discountHeroTextBrick,
              !offer.tkm && { color: colors.warning },
            ]}
            numberOfLines={1}
          >
            {discountLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.tileTitle} numberOfLines={2}>
        {offer.title}
      </Text>

      <View style={styles.partnerFooter}>
        <Text style={styles.partnerName} numberOfLines={1}>
          {offer.business}
        </Text>
        <View style={styles.partnerTypeRow}>
          <Text style={styles.partnerTypeBadge}>
            {offer.isPrivatePartner !== false ? 'Firma partnerska' : 'Instytucja miejska'}
          </Text>
          {saved ? <Ionicons name="bookmark" size={13} color={colors.brick} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

/** Okienko ze szczegółami pakietu miejskiego po kliknięciu w kafelek. */
export function BenefitDetailSheet({
  benefit,
  onClose,
  taxVerified,
  onOpenTaxForm,
}: {
  benefit: ResidentBenefit | null;
  onClose: () => void;
  taxVerified: boolean;
  onOpenTaxForm: () => void;
}) {
  if (!benefit) return null;
  return (
    <Sheet
      visible
      onClose={onClose}
      title={benefit.title}
      footer={
        taxVerified ? (
          <Button label="Zamknij" variant="secondary" onPress={onClose} />
        ) : (
          <Button
            label="Potwierdź PIT w Toruniu, aby korzystać"
            icon="document-text-outline"
            onPress={() => {
              onClose();
              setTimeout(onOpenTaxForm, 220);
            }}
          />
        )
      }
    >
      <View style={styles.detailHeroRow}>
        <View style={styles.detailDiscountPill}>
          <Text style={styles.detailDiscountText}>{benefit.discount}</Text>
        </View>
        <Badge
          label="Tylko dla podatników w Toruniu"
          color={colors.river}
          bg={colors.riverSoft}
          icon="id-card-outline"
        />
      </View>

      <Text style={styles.body}>{benefit.description}</Text>

      <View style={styles.info}>
        <MetaRow icon="location-outline" text={`Gdzie obowiązuje: ${benefit.place}`} />
        <MetaRow
          icon="receipt-outline"
          text="Wymóg: rozliczanie podatku dochodowego (PIT) w Toruniu oraz aktywna Toruńska Karta Miejska."
        />
      </View>
    </Sheet>
  );
}

/** Okienko ze szczegółami oferty partnerskiej po kliknięciu w kafelek. */
export function OfferDetailSheet({
  offer,
  onClose,
  taxVerified,
  onOpenTaxForm,
}: {
  offer: CityOffer | null;
  onClose: () => void;
  taxVerified?: boolean;
  onOpenTaxForm?: () => void;
}) {
  const { savedOffers, toggleSavedOffer } = useAppData();
  const { showToast } = useToast();
  const [revealed, setRevealed] = useState<string | null>(null);

  if (!offer) return null;
  const kind = KIND_META[offer.kind];
  const saved = savedOffers.includes(offer.id);
  const showCode = revealed === offer.id;

  return (
    <Sheet
      visible
      onClose={() => {
        setRevealed(null);
        onClose();
      }}
      title={offer.title}
      footer={
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            label={saved ? 'Zapisano' : 'Zapisz'}
            icon={saved ? 'bookmark' : 'bookmark-outline'}
            variant="secondary"
            onPress={() => {
              const now = toggleSavedOffer(offer.id);
              showToast(now ? 'Zapisano ofertę' : 'Usunięto z zapisanych', now ? 'success' : 'info');
            }}
            style={{ flex: 1 }}
          />
          {offer.code && !showCode ? (
            offer.tkm && !taxVerified && onOpenTaxForm ? (
              <Button
                label="Potwierdź PIT, by odkryć kod"
                icon="lock-closed-outline"
                onPress={() => {
                  onClose();
                  setTimeout(onOpenTaxForm, 220);
                }}
                style={{ flex: 2 }}
              />
            ) : (
              <Button
                label="Pokaż kod zniżkowy"
                icon="pricetag-outline"
                onPress={() => setRevealed(offer.id)}
                style={{ flex: 2 }}
              />
            )
          ) : null}
        </View>
      }
    >
      <View style={styles.companyHeader}>
        <CompanyLogo offer={offer} size="lg" />
        <View style={{ flex: 1 }}>
          <Text style={styles.companyNameLg}>{offer.business}</Text>
          <Text style={styles.companyTypeSub}>
            {offer.isPrivatePartner !== false
              ? 'Przedsiębiorstwo prywatne · Partner Karty Mieszkańca'
              : 'Miejska instytucja partnerska'}
          </Text>
        </View>
      </View>

      <View style={styles.detailHeroRow}>
        {offer.benefitTag ? (
          <View style={styles.detailDiscountPillBrick}>
            <Text style={styles.detailDiscountTextBrick}>{offer.benefitTag}</Text>
          </View>
        ) : null}
        <Badge label={kind.label} color={kind.color} bg={kind.bg} />
        {offer.tkm ? (
          <Badge
            label="Wymagany PIT w Toruniu"
            color={colors.river}
            bg={colors.riverSoft}
            icon="id-card-outline"
          />
        ) : null}
      </View>

      <Text style={styles.body}>{offer.description}</Text>

      {showCode && offer.code ? (
        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Kod rabatowy w lokalu / kasie</Text>
          <Text style={styles.code}>{offer.code}</Text>
        </View>
      ) : null}

      <View style={styles.info}>
        <MetaRow icon="location-outline" text={offer.address} />
        {offer.hours ? <MetaRow icon="time-outline" text={offer.hours} /> : null}
        <MetaRow
          icon="calendar-outline"
          text={offer.expiresAt ? `Ważne do ${formatLongDate(offer.expiresAt)}` : 'Oferta stała'}
        />
        <MetaRow icon="information-circle-outline" text={offer.conditions} />
        {offer.tkm ? (
          <MetaRow
            icon="receipt-outline"
            text="Uprawnienie przysługuje wyłącznie osobom płacącym podatki w Toruniu."
          />
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  logoBox: {
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  logoBoxLg: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 6,
  },
  logoMonogram: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  logoMonogramLg: {
    fontSize: 14,
  },
  companyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
  },
  companyNameLg: {
    ...font.bodyBold,
    color: colors.ink,
  },
  companyTypeSub: {
    ...font.tiny,
    color: colors.muted,
    marginTop: 1,
  },
  taxBanner: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5BFB8',
    marginBottom: spacing.md,
    ...shadow.card,
  },
  taxBannerVerified: {
    borderColor: '#B7E0C7',
    backgroundColor: '#F9FCFA',
  },
  taxBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  taxIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brickSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taxBannerTitle: { ...font.bodyBold, color: colors.ink },
  taxBannerSub: { ...font.small, color: colors.inkSoft, marginTop: 2 },
  fieldLabel: {
    ...font.small,
    fontWeight: '600',
    color: colors.inkSoft,
    marginBottom: 6,
  },
  officeWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: colors.line,
  },
  checkboxText: { ...font.small, color: colors.ink, flex: 1 },
  errorText: { ...font.small, color: colors.danger, marginTop: 4 },
  sectionBlock: { marginBottom: spacing.md },
  gridHeading: {
    ...font.h3,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridTile: {
    flexBasis: '47%',
    flexGrow: 1,
    minWidth: 145,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'space-between',
    gap: 8,
    ...shadow.card,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  discountHeroRiver: {
    backgroundColor: colors.riverSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  discountHeroTextRiver: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.river,
  },
  discountHeroBrick: {
    backgroundColor: colors.brickSoft,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.md,
    flexShrink: 1,
  },
  discountHeroTextBrick: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brickDark,
  },
  tileTitle: {
    ...font.bodyBold,
    color: colors.ink,
    lineHeight: 19,
  },
  tileSub: {
    ...font.tiny,
    color: colors.muted,
  },
  partnerFooter: {
    gap: 2,
  },
  partnerName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.inkSoft,
  },
  partnerTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partnerTypeBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.muted,
  },
  detailHeroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  detailDiscountPill: {
    backgroundColor: colors.riverSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  detailDiscountText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.river,
  },
  detailDiscountPillBrick: {
    backgroundColor: colors.brickSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  detailDiscountTextBrick: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.brickDark,
  },
  body: { ...font.body, color: colors.inkSoft, marginTop: 6, marginBottom: spacing.md },
  info: {
    gap: 6,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  codeBox: {
    alignItems: 'center',
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.brickSoft,
    marginBottom: spacing.md,
  },
  codeLabel: { ...font.small, color: colors.brickDark },
  code: { fontSize: 20, fontWeight: '700', letterSpacing: 2, color: colors.brickDark, marginTop: 2 },
});
