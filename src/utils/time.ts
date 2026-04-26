export function nowIso(): string {
  return new Date().toISOString();
}

export function todayBucket(): string {
  return new Date().toISOString().slice(0, 10);
}

export function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString();
}

export function addSecondsIso(seconds: number, from: Date = new Date()): string {
  return new Date(from.getTime() + seconds * 1000).toISOString();
}

export function addHoursIso(hours: number, from: Date = new Date()): string {
  return new Date(from.getTime() + hours * 3_600_000).toISOString();
}

export function isoToDate(iso: string): Date {
  return new Date(iso);
}

export function diffSeconds(aIso: string, bIso: string): number {
  return (new Date(aIso).getTime() - new Date(bIso).getTime()) / 1000;
}
