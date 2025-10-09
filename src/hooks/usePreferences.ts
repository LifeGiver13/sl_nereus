import { useState, useEffect } from 'react';
import { ViewType } from '../types/job';

interface CalendarPreferences {
  viewType: ViewType;
  currentDate: string;
  selectedDepartmentId: number | null;
}

interface TablePreferences {
  pageSize: number;
}

interface Preferences {
  calendar: CalendarPreferences;
  table: TablePreferences;
}

const DEFAULT_PREFERENCES: Preferences = {
  calendar: {
    viewType: 'weekly',
    currentDate: new Date().toISOString(),
    selectedDepartmentId: null
  },
  table: {
    pageSize: 10
  }
};

const STORAGE_KEY = 'user-preferences';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    // Load preferences from localStorage on mount
    const loadPreferences = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        } catch (error) {
          console.error('Failed to parse preferences from localStorage:', error);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
        }
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PREFERENCES));
      }
    };

    loadPreferences();

    // Listen for preference changes from other components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        } catch (error) {
          console.error('Failed to parse preferences from storage event:', error);
        }
      }
    };

    // Custom event for same-window updates
    const handlePreferencesUpdate = () => {
      loadPreferences();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('preferences-updated', handlePreferencesUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('preferences-updated', handlePreferencesUpdate);
    };
  }, []);

  const updatePreferences = (updates: Partial<Preferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('preferences-updated'));
  };

  const updateCalendarPreferences = (updates: Partial<CalendarPreferences>) => {
    updatePreferences({
      calendar: { ...preferences.calendar, ...updates }
    });
  };

  const updateTablePreferences = (updates: Partial<TablePreferences>) => {
    updatePreferences({
      table: { ...preferences.table, ...updates }
    });
  };

  return {
    preferences,
    updatePreferences,
    updateCalendarPreferences,
    updateTablePreferences
  };
};