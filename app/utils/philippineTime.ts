/**
 * Philippine Time Utility Functions
 * 
 * All timestamps are converted to Philippine Standard Time (PHT)
 * Timezone: Asia/Manila (UTC+8)
 */

/**
 * Formats a date to Philippine time string
 * @param date - Date object or ISO string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in Philippine time
 */
export const formatPhilippineTime = (
  date: Date | string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Manila',
    ...options,
  };

  return new Intl.DateTimeFormat('en-PH', defaultOptions).format(dateObj);
};

/**
 * Formats a date to Philippine time string (short format: MM/DD/YYYY HH:MM)
 */
export const formatPhilippineDateTime = (date: Date | string | null | undefined): string => {
  return formatPhilippineTime(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  });
};

/**
 * Formats a date to Philippine time only (HH:MM)
 */
export const formatPhilippineTimeOnly = (date: Date | string | null | undefined): string => {
  return formatPhilippineTime(date, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  });
};

/**
 * Formats a date to Philippine date string (MMM DD, YYYY)
 */
export const formatPhilippineDate = (date: Date | string | null | undefined): string => {
  return formatPhilippineTime(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  });
};

/**
 * Gets current Philippine time as ISO string
 * Note: This is for display purposes only. Database should handle timestamps.
 */
export const getCurrentPhilippineTime = (): string => {
  const now = new Date();
  const phTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  return phTime.toISOString();
};

/**
 * Formats a date to Philippine time with custom format
 * Example: "Dec 15, 2025 5:20 PM"
 */
export const formatPhilippineDateTimeLong = (date: Date | string | null | undefined): string => {
  return formatPhilippineTime(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Manila',
  });
};


