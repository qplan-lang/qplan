export const STEP_ID_PATTERN = /^[\p{L}_][\p{L}\p{N}_]*$/u;

export function isValidStepId(id: string): boolean {
  if (!id) return false;
  return STEP_ID_PATTERN.test(id);
}
