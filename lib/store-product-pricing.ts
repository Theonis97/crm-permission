/**
 * À la création d’un lien magasin ↔ produit, on copie les prix catalogue sur la ligne
 * `store_products`. Chaque magasin a ainsi son propre tarif : une modification du prix
 * à l’entrepôt ne répercute pas les magasins déjà pourvus (tant qu’ils n’effacent pas
 * leur prix local — non prévu par l’UI actuelle).
 */
export function catalogPricesSnapshot(product: {
  prixVente: number
  prixAchat: number
}): { prixVente: number; prixAchat: number } {
  return {
    prixVente: Number(product.prixVente),
    prixAchat: Number(product.prixAchat),
  }
}

/**
 * Prix unitaire côté livreur / app mobile : si le magasin a un `prixVente` sur `store_products`,
 * il prime sur le catalogue (produit / variante).
 */
export function effectivePrixVenteForStoreDisplay(args: {
  storePrixVente: number | null | undefined
  productPrixVente: number | null | undefined
  variantPrixVente?: number | null | undefined
}): number {
  const sp = args.storePrixVente
  if (sp != null && !Number.isNaN(Number(sp))) {
    return Number(sp)
  }
  const v = args.variantPrixVente
  if (v != null && !Number.isNaN(Number(v))) {
    return Number(v)
  }
  const p = args.productPrixVente
  return p != null && !Number.isNaN(Number(p)) ? Number(p) : 0
}
