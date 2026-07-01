import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet, Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black } from '@expo-google-fonts/roboto';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

const alertConfig = {
  success: { icon: 'check-circle', color: COLORS.primary },
  error: { icon: 'error', color: COLORS.error },
  warning: { icon: 'warning', color: COLORS.warning },
  info: { icon: 'info', color: COLORS.info },
  confirm: { icon: 'help', color: COLORS.warning },
};

export const AlertProvider = ({ children }) => {
  const [fontsLoaded] = useFonts({ Roboto_400Regular, Roboto_500Medium, Roboto_700Bold, Roboto_900Black });
  const [visible, setVisible] = useState(false);
  const [alertProps, setAlertProps] = useState({
    type: 'info',
    title: '',
    message: '',
    buttons: [],
    loading: false,
  });

  const showAlert = useCallback(({ type = 'info', title, message, buttons = [], loading = false }) => {
    setAlertProps({ type, title, message, buttons, loading });
    setVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setVisible(false);
  }, []);

  const config = alertConfig[alertProps.type] || alertConfig.info;

  if (!fontsLoaded) {
    return (
      <AlertContext.Provider value={{ showAlert, hideAlert }}>
        {children}
      </AlertContext.Provider>
    );
  }

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <Modal
        animationType="fade"
        transparent={true}
        visible={visible}
        onRequestClose={hideAlert}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <View style={styles.alertBox}>
            <TouchableOpacity style={styles.closeButton} onPress={hideAlert} activeOpacity={0.7}>
              <MaterialIcons name="close" size={22} color="#999" />
            </TouchableOpacity>
            <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
              {alertProps.loading ? (
                <ActivityIndicator size="large" color={config.color} />
              ) : (
                <MaterialIcons name={config.icon} size={40} color={config.color} />
              )}
            </View>
            <Text style={styles.title}>{alertProps.title}</Text>
            {alertProps.message ? (
              <Text style={styles.message}>{alertProps.message}</Text>
            ) : null}
            <View style={styles.buttonRow}>
              {alertProps.buttons.map((btn, index) => {
                const isPrimary = btn.style === 'destructive' || btn.style === 'default' || (alertProps.buttons.length === 1);
                const isSecondary = btn.style === 'cancel';
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      isPrimary && styles.primaryButton,
                      isSecondary && styles.secondaryButton,
                      btn.style === 'destructive' && styles.destructiveButton,
                      index < alertProps.buttons.length - 1 && { marginRight: 8 },
                    ]}
                    onPress={() => {
                      if (btn.onPress) btn.onPress();
                      hideAlert();
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.buttonText,
                      isPrimary && styles.primaryButtonText,
                      isSecondary && styles.secondaryButtonText,
                      btn.style === 'destructive' && styles.destructiveButtonText,
                    ]}>
                      {btn.text || 'OK'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusXl,
    padding: 28,
    alignItems: 'center',
    ...SHADOWS.large,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
  },
  secondaryButton: {
    backgroundColor: COLORS.lightGrey,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  destructiveButton: {
    backgroundColor: COLORS.error,
  },
  buttonText: {
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  primaryButtonText: {
    color: COLORS.white,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
  },
  destructiveButtonText: {
    color: COLORS.white,
  },
});

export default AlertProvider;
