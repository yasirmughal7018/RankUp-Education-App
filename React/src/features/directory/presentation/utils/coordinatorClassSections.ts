import type { CoordinatorClassSection } from "@/features/directory/domain/directoryTypes";

/** Display label for a coordinator class (whole grade). */
export function formatCoordinatorClassSection(
  item: CoordinatorClassSection,
): string {
  return `Grade ${item.grade}`;
}

export function formatCoordinatorClassSections(
  sections: CoordinatorClassSection[] | null | undefined,
): string {
  if (!sections?.length) {
    return "—";
  }
  return sections.map(formatCoordinatorClassSection).join(", ");
}
