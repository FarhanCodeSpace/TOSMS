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
  const date = new Date(dateString + 'T00:00:00+05:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};
