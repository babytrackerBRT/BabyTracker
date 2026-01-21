export type AgeBucket = "0-2" | "2-4" | "4-6" | "6-9" | "9-12" | "12+";

export function getAgeBucket(birthDate: Date): AgeBucket {
  const now = new Date();
  const months = (now.getFullYear() - birthDate.getFullYear()) * 12 + (now.getMonth() - birthDate.getMonth());
  if (months < 2) return "0-2";
  if (months < 4) return "2-4";
  if (months < 6) return "4-6";
  if (months < 9) return "6-9";
  if (months < 12) return "9-12";
  return "12+";
}

export function recommendedIntervalMinutes(bucket: AgeBucket): number {
  switch (bucket) {
    case "0-2": return 180; // 3h
    case "2-4": return 210; // 3.5h
    case "4-6": return 240; // 4h
    case "6-9": return 270; // 4.5h
    case "9-12": return 300; // 5h
    default: return 300;
  }
}

export function prepareLeadMinutes(intervalMinutes: number) {
  // Prepare = interval - 15min (so 3h => 2h45m)
  return Math.max(0, intervalMinutes - 15);
}
