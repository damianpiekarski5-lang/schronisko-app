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
    const [, year, month, day, hours, minutes, seconds = "00"] =
      isoWithTimezoneMatch;
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
