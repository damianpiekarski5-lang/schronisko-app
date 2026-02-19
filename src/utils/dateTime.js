const SPREADSHEET_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;

const ISO_DATE_TIME_WITH_TIMEZONE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/i;

export const parseSpreadsheetDate = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return null;

  const spreadsheetMatch = text.match(SPREADSHEET_DATE_TIME_PATTERN);
  if (spreadsheetMatch) {
    const [, year, month, day, hours = "00", minutes = "00", seconds = "00"] =
      spreadsheetMatch;
    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hours),
      Number(minutes),
      Number(seconds)
    );
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const isoWithTimezoneMatch = text.match(ISO_DATE_TIME_WITH_TIMEZONE_PATTERN);
  if (isoWithTimezoneMatch) {
    const normalizedIso = text.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
    const parsed = new Date(normalizedIso);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const normalized = text.includes("T") ? text : text.replace(" ", "T");
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDateTime = (value) => {
  const parsed = parseSpreadsheetDate(value);
  if (!parsed) return null;

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");

  return `${day}.${month}.${year}, ${hours}:${minutes}`;
};

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const getCalendarDayDiff = (value, now = new Date()) => {
  const parsed = parseSpreadsheetDate(value);
  if (!parsed) return null;

  const walkDay = startOfDay(parsed);
  const today = startOfDay(now);
  return Math.floor((today - walkDay) / (1000 * 60 * 60 * 24));
};

export const getLastWalkPresentation = (value) => {
  const text = String(value ?? "").trim();
  if (!text || text === "Brak spacerów" || text === "#REF!") {
    return { label: "Brak danych", daysSince: null, color: "#6b7280" };
  }

  const daysSince = getCalendarDayDiff(text);
  if (daysSince === null || daysSince < 0) {
    return { label: text || "Brak danych", daysSince: null, color: "#6b7280" };
  }

  if (daysSince === 0) {
    return { label: "Dzisiaj", daysSince, color: "#16a34a" };
  }

  if (daysSince === 1) {
    return { label: "Wczoraj", daysSince, color: "#f97316" };
  }

  return { label: `${daysSince} dni temu`, daysSince, color: "#dc2626" };
};
