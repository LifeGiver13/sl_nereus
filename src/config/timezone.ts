// Timezone configuration
export const DEFAULT_TIMEZONE = 'Europe/London';

// Get timezone from environment variable or use default
export const getTimezone = (): string => {
  return process.env.VITE_TIMEZONE || DEFAULT_TIMEZONE;
};

// Utility to create a date at 12pm in the configured timezone
export const createDateAt12PM = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(12, 0, 0, 0);
  return newDate;
};

// Utility to format date string for consistent comparison
export const formatDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Utility to safely parse date from ISO string or Date object
export const parseDate = (dateInput: string | Date): Date => {
  if (dateInput instanceof Date) {
    return dateInput;
  }
  
  // Parse ISO string and ensure it's a valid date
  const parsed = new Date(dateInput);
  if (isNaN(parsed.getTime())) {
    console.error('Invalid date string:', dateInput);
    return new Date(); // fallback to current date
  }
  return parsed;
};