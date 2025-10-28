export const parseAcceptanceCriteria = (input?: string | null): string[] => {
  if (!input) return [];
  return input
    .split(/\n|\r|\d+\.|\-/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};
