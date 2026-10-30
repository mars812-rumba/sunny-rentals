export const catalogCategoryOrder = ['sedan', 'suv', 'compact', '7s', 'bikes'] as const;

export function visibleCatalogCategories(cars: ReadonlyArray<{ class?: string; available?: boolean | null }>): string[] {
  const visible = new Set(cars.filter(car => car.available !== false).map(car => car.class));
  return catalogCategoryOrder.filter(category => visible.has(category));
}

export function reconcileCatalogCategory(selected: string, visible: readonly string[]): string {
  // Preserve the initial "choose a category" state; only replace a lost choice.
  if (!selected || visible.includes(selected)) return selected;
  return visible[0] || '';
}
