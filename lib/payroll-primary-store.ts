/**
 * Premier magasin distinct selon l’ordre des lignes passées (typiquement `assignedAt` desc = affectation la plus récente).
 * (Plusieurs lignes StoreUserRole peuvent exister pour le même magasin — rôles différents.)
 */
export function getPrimaryStoreForPayroll<
  T extends { storeId: string; store: S },
  S,
>(storeUserRoles: T[] | undefined | null): S | null {
  if (!storeUserRoles?.length) return null
  const seen = new Set<string>()
  for (const row of storeUserRoles) {
    if (seen.has(row.storeId)) continue
    seen.add(row.storeId)
    return row.store
  }
  return null
}

/** Image d’en-tête bulletin : logo magasin, sinon bannière, sinon logo société (paramètres paie). */
export function getPayrollBulletinHeaderImageUrl(
  store: { logo?: string | null; coverImage?: string | null } | null | undefined,
  companyLogo: string | null | undefined,
): string {
  const fromStore = (store?.logo?.trim() || store?.coverImage?.trim() || "").trim()
  if (fromStore) return fromStore
  return (companyLogo?.trim() || "").trim()
}

function pickEmployerText(
  fromStore: string | null | undefined,
  fromSettings: string | null | undefined,
  emptyLabel: string,
): string {
  const a = (fromStore ?? "").trim()
  if (a) return a
  const b = (fromSettings ?? "").trim()
  if (b) return b
  return emptyLabel
}

function pickEmployerTextOptional(
  fromStore: string | null | undefined,
  fromSettings: string | null | undefined,
): string {
  const a = (fromStore ?? "").trim()
  if (a) return a
  return (fromSettings ?? "").trim()
}

export type BulletinEmployerStoreFields = {
  name?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  rccm?: string | null
  nif?: string | null
  cnssEmployeur?: string | null
  logo?: string | null
  coverImage?: string | null
}

export type BulletinEmployerSettingsFields = {
  companyName?: string | null
  companyAddress?: string | null
  companyCity?: string | null
  companyPostalCode?: string | null
  companyCountry?: string | null
  companyPhone?: string | null
  companyEmail?: string | null
  rccmNumber?: string | null
  nifNumber?: string | null
  cnssEmployerNumber?: string | null
  companyLogo?: string | null
}

/** En-tête employeur bulletin : données du magasin de l’employé en priorité, paramètres paie en repli (multi-magasins). */
export function getBulletinEmployerDisplay(
  store: BulletinEmployerStoreFields | null | undefined,
  companySettings: BulletinEmployerSettingsFields | null | undefined,
) {
  const st = store ?? undefined
  const set = companySettings ?? undefined
  return {
    companyName: pickEmployerText(st?.name, set?.companyName, "Non défini"),
    companyAddress: pickEmployerText(st?.address, set?.companyAddress, "Adresse non définie"),
    companyCity: (set?.companyCity ?? "").trim(),
    companyPostalCode: (set?.companyPostalCode ?? "").trim(),
    companyCountry: (set?.companyCountry ?? "").trim(),
    companyPhone: pickEmployerTextOptional(st?.phone, set?.companyPhone),
    companyEmail: pickEmployerTextOptional(st?.email, set?.companyEmail),
    rccmNumber: pickEmployerTextOptional(st?.rccm, set?.rccmNumber),
    nifNumber: pickEmployerTextOptional(st?.nif, set?.nifNumber),
    cnssEmployerNumber: pickEmployerTextOptional(st?.cnssEmployeur, set?.cnssEmployerNumber),
    companyLogo: getPayrollBulletinHeaderImageUrl(st, set?.companyLogo),
  }
}
