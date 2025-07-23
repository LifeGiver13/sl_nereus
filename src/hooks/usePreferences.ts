import { useState, useEffect } from 'react';
import { ViewType } from '../types/job';

interface CalendarPreferences {
  viewType: ViewType;
  currentDate: string;
  selectedDepartmentId: number | null;
}

interface Preferences {
  calendar: CalendarPreferences;
}

const DEFAULT_PREFERENCES: Preferences = {
  calendar: {
    viewType: 'weekly',
    currentDate: new Date().toISOString(),
    selectedDepartmentId: null
  }
};

const STORAGE_KEY = 'user-preferences';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    // Load preferences from localStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } catch (error) {
        console.error('Failed to parse preferences from localStorage:', error);
        // Use defaults if parsing fails
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
      }
    } else {
      // Save defaults if no preferences exist
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
    }
  }, []);

  const updatePreferences = (updates: Partial<Preferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
  };

  const updateCalendarPreferences = (updates: Partial<CalendarPreferences>) => {
    updatePreferences({
      calendar: { ...preferences.calendar, ...updates }
    });
  };

  return {
    preferences,
    updatePreferences,
    updateCalendarPreferences
  };
};