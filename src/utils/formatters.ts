import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  parse,
} from 'date-fns';

/**
 * Formats a number as a PKR currency string.
 * Example: 1500 → 'PKR 1,500'
 */
export function formatPKR(amount: number): string {
  return 'PKR ' + amount.toLocaleString('en-PK');
}

/**
 * Formats a Firestore Timestamp, JS Date, or date string to 'Mar 1, 2026'.
 */
export function formatDate(timestamp: any): string {
  try {
    let date: Date;
    if (timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      return 'Invalid date';
    }
    return format(date, 'MMM d, yyyy');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Formats a Firestore Timestamp, JS Date, or date string to '8:30 AM'.
 */
export function formatTime(timestamp: any): string {
  try {
    let date: Date;
    if (timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      return 'Invalid time';
    }
    return format(date, 'h:mm a');
  } catch {
    return 'Invalid time';
  }
}

/**
 * Returns a relative time string like 'Today at 8:30 AM', 'Tomorrow at 8:30 AM', etc.
 */
export function formatRelativeTime(timestamp: any): string {
  try {
    let date: Date;
    if (timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      return 'Invalid date';
    }

    const timeStr = format(date, 'h:mm a');
    if (isToday(date)) return `Today at ${timeStr}`;
    if (isTomorrow(date)) return `Tomorrow at ${timeStr}`;
    if (isYesterday(date)) return `Yesterday at ${timeStr}`;
    return `${format(date, 'MMM d')} at ${timeStr}`;
  } catch {
    return 'Invalid date';
  }
}

/**
 * Returns the initials of a name.
 * Example: 'Ahmad Khan' → 'AK', 'Ahmad' → 'AH'
 */
export function getInitials(name: string): string {
  if (!name || name.trim().length === 0) return 'U';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  const first = parts[0][0] || '';
  const last = parts[parts.length - 1][0] || '';
  return (first + last).toUpperCase();
}

/**
 * Converts a number to Pakistani rupee words using Lakh system.
 * Example: 1500 → 'One Thousand Five Hundred Rupees Only'
 */
export function amountInWords(amount: number): string {
  if (amount === 0) return 'Zero Rupees Only';

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertThreeDigit = (n: number): string => {
    let result = '';
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
      if (n > 0) result += ones[n] + ' ';
    } else if (n > 0) {
      result += ones[n] + ' ';
    }
    return result;
  };

  let words = '';
  let remaining = amount;

  if (remaining >= 100000) {
    words += convertThreeDigit(Math.floor(remaining / 100000)) + 'Lakh ';
    remaining %= 100000;
  }
  if (remaining >= 1000) {
    words += convertThreeDigit(Math.floor(remaining / 1000)) + 'Thousand ';
    remaining %= 1000;
  }
  words += convertThreeDigit(remaining);

  return words.trim() + ' Rupees Only';
}

/**
 * Converts 'YYYY-MM' to 'March 2026'.
 */
export function formatMonth(monthString: string): string {
  try {
    const date = parse(monthString, 'yyyy-MM', new Date());
    return format(date, 'MMMM yyyy');
  } catch {
    return monthString;
  }
}

/**
 * Returns tomorrow's date as 'YYYY-MM-DD'.
 */
export function getTomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

/**
 * Returns today's date as 'YYYY-MM-DD'.
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Returns the current month as 'YYYY-MM'.
 */
export function getMonthString(): string {
  return format(new Date(), 'yyyy-MM');
}
