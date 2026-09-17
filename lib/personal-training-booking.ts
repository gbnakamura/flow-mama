export const PERSONAL_TRAINING_CUTOFF_HOURS = 72;

export function isBeforePersonalTrainingCutoff(startsAt: string, now = new Date()) {
  const cutoff = new Date(startsAt).getTime() - PERSONAL_TRAINING_CUTOFF_HOURS * 60 * 60 * 1000;
  return now.getTime() < cutoff;
}
