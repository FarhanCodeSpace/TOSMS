import { format } from 'date-fns';

export const getPakistanTodayString = (): string => {
  const now = new Date();
  const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  return pakistanTime.toISOString().split('T')[0];
};

export const getPakistanTomorrowString = (): string => {
  const now = new Date();
  const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
  pakistanTime.setDate(pakistanTime.getDate() + 1);
  return pakistanTime.toISOString().split('T')[0];
};

export const formatPakistanDate = (dateString: string): string => {
  try {
    const [year, month, day] = dateString.substring(0, 10).split('-');
    if (!year || !month || !day) return dateString;

    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
    return format(date, 'EEEE, MMMM d, yyyy');
  } catch (error) {
    return dateString; // Fallback in case of an unexpected parsing error
  }
};
