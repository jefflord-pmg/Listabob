import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface Settings {
  useTriStateSort: boolean;
  unknownSortPosition: 'top' | 'bottom';
  confirmDelete: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  refreshSettings: () => Promise<void>;
}

const defaultSettings: Settings = {
  useTriStateSort: true,
  unknownSortPosition: 'bottom',
  confirmDelete: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/system/config');
      if (response.ok) {
        const data = await response.json();
        setSettings({
          useTriStateSort: data.use_tristate_sort ?? true,
          unknownSortPosition: data.unknown_sort_position ?? 'bottom',
          confirmDelete: data.confirm_delete ?? false,
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const refreshSettings = async () => {
    await fetchSettings();
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
