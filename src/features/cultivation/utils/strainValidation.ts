export const STRAIN_ABBREVIATION_REGEX = /^[A-Z]{3}$/;

export function isValidStrainAbbreviation(abbreviation: string | null | undefined): boolean {
  return !!abbreviation && STRAIN_ABBREVIATION_REGEX.test(abbreviation);
}
