import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@app_theme';

const lightTheme = {
  mode: 'light',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#1A1A2E',
  textSecondary: '#666666',
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  headerBg: '#2E7D32',
  headerText: '#FFFFFF',
  border: '#E0E0E0',
  error: '#E74C3C',
  warning: '#F39C12',
  info: '#2196F3',
  statusBar: 'dark-content',
  // Login/Signup specific
  forest: '#F5F5F5',
  forestMid: '#E8E8E8',
  forestCard: '#FFFFFF',
  emerald: '#2ECC71',
  emeraldDim: '#1A7A44',
  sage: '#4CAF7D',
  cream: '#1A1A2E',
  creamDim: 'rgba(26,26,46,0.6)',
  white: '#FFFFFF',
  borderColor: 'rgba(46,204,113,0.2)',
  inputBg: 'rgba(0,0,0,0.03)',
};

const darkTheme = {
  mode: 'dark',
  background: '#0A2218',
  surface: '#153326',
  card: '#153326',
  text: '#F5F0E8',
  textSecondary: 'rgba(245,240,232,0.6)',
  primary: '#2ECC71',
  primaryLight: '#4CAF50',
  headerBg: '#0F2E20',
  headerText: '#F5F0E8',
  border: 'rgba(46,204,113,0.2)',
  error: '#F87171',
  warning: '#F39C12',
  info: '#2196F3',
  statusBar: 'light-content',
  // Login/Signup specific
  forest: '#0A2218',
  forestMid: '#0F2E20',
  forestCard: '#153326',
  emerald: '#2ECC71',
  emeraldDim: '#1A7A44',
  sage: '#4CAF7D',
  cream: '#F5F0E8',
  creamDim: 'rgba(245,240,232,0.6)',
  white: '#FFFFFF',
  borderColor: 'rgba(46,204,113,0.2)',
  inputBg: 'rgba(255,255,255,0.05)',
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const stored = await AsyncStorage.getItem(THEME_KEY);
      if (stored !== null) {
        setIsDarkMode(stored === 'dark');
      }
    } catch (e) {
      // default to dark
    } finally {
      setLoaded(true);
    }
  };

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  };

  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, theme, toggleTheme, loaded }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
