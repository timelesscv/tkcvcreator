/**
 * Ethiopian Passport Issue Date Auto-Calculation Utility
 * 
 * Official standard:
 * - Standard validity: 5 years
 *   Issue Date = Expiry Date - 5 years + 1 day (-5y + 1d)
 * - 10-year validity (if 5-year calculation results in a date in the future):
 *   Issue Date = Expiry Date - 10 years + 1 day (-10y + 1d)
 */

export const calculateEthiopianIssueDate = (expiryDateStr: string, referenceDate: Date = new Date()): string => {
  if (!expiryDateStr || typeof expiryDateStr !== 'string') return '';
  
  // Normalize string format (handles YYYY-MM-DD, YYYY/MM/DD, DD-MM-YYYY)
  const cleanStr = expiryDateStr.trim();
  let year: number, month: number, day: number;

  const ymdMatch = cleanStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  const dmyMatch = cleanStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);

  if (ymdMatch) {
    year = parseInt(ymdMatch[1], 10);
    month = parseInt(ymdMatch[2], 10);
    day = parseInt(ymdMatch[3], 10);
  } else if (dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
  } else {
    const parsed = new Date(cleanStr);
    if (isNaN(parsed.getTime())) return '';
    year = parsed.getFullYear();
    month = parsed.getMonth() + 1;
    day = parsed.getDate();
  }

  if (isNaN(year) || isNaN(month) || isNaN(day) || year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return '';
  }

  // 1. Calculate Standard: Expiry - 5 years + 1 day
  let targetYear = year - 5;
  let targetDate = new Date(targetYear, month - 1, day + 1);

  // If the standard 5-year calculation results in a date in the future,
  // it indicates a 10-year passport validity
  if (targetDate.getTime() > referenceDate.getTime()) {
    targetYear = year - 10;
    targetDate = new Date(targetYear, month - 1, day + 1);
  }

  const resY = targetDate.getFullYear();
  const resM = (targetDate.getMonth() + 1).toString().padStart(2, '0');
  const resD = targetDate.getDate().toString().padStart(2, '0');

  return `${resY}-${resM}-${resD}`;
};
