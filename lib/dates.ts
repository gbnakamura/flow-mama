const londonFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function partsAt(date: Date) {
  const parts = Object.fromEntries(londonFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
}

export function londonLocalToIso(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute, 0);
  let result = new Date(desired);

  for (let pass = 0; pass < 2; pass += 1) {
    result = new Date(result.getTime() + desired - partsAt(result));
  }

  return result.toISOString();
}

export function datesForWeekday(startDate: string, endDate: string, weekday: number) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);

  while (cursor.getUTCDay() !== weekday && cursor <= end) cursor.setUTCDate(cursor.getUTCDate() + 1);
  while (cursor <= end && dates.length < 60) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return dates;
}
