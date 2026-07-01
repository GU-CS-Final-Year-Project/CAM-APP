import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from '@expo-google-fonts/dm-sans';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';

const { width, height } = Dimensions.get('window');

// ── Design tokens ──────────────────────────────────────────────────────────
const G = {
  forest:    '#0A2218',
  forestMid: '#0F2E20',
  forestCard:'#153326',
  emerald:   '#2ECC71',
  emeraldSoft:'#86EFAC',
  emeraldDim: '#1A7A44',
  sage:      '#4CAF7D',
  gold:      '#F0C060',
  cream:     '#F5F0E8',
  creamDim:  'rgba(245,240,232,0.65)',
  white:     '#FFFFFF',
  textMuted: 'rgba(245,240,232,0.5)',
};

const slides = [
  {
    id: '1',
    emoji: '🏢',
    tag: '01 — ORGANIZE',
    title: 'Manage All\nYour Clubs',
    description: 'Organize and run multiple clubs and organizations from a single, elegant hub.',
    accentColor: G.emerald,
  },
  {
    id: '2',
    emoji: '📅',
    tag: '02 — SCHEDULE',
    title: 'Plan Every\nActivity',
    description: 'Built-in calendar and smart reminders keep your events perfectly on track.',
    accentColor: G.gold,
  },
  {
    id: '3',
    emoji: '👥',
    tag: '03 — CONNECT',
    title: 'Engage Your\nMembers',
    description: 'Announcements, member directories, and real-time updates — all in one place.',
    accentColor: G.sage,
  },
  {
    id: '4',
    emoji: '📊',
    tag: '04 — GROW',
    title: 'Track Club\nGrowth',
    description: 'Detailed analytics on attendance, engagement, and participation over time.',
    accentColor: G.emeraldSoft,
  },
];

// ── Single slide panel ──────────────────────────────────────────────────────
const SlidePanel = ({ slide, isActive, slideAnim }) => {
  const { emoji, tag, title, description, accentColor } = slide;

  return (
    <Animated.View
      style={[
        styles.slidePanel,
        {
          opacity: isActive ? slideAnim : 0,
          transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
      pointerEvents={isActive ? 'auto' : 'none'}
    >
      {/* Big emoji illustration */}
      <View style={[styles.emojiRing, { borderColor: accentColor + '40', backgroundColor: accentColor + '18' }]}>
        <Text style={styles.emojiText}>{emoji}</Text>
      </View>

      {/* Tag */}
      <View style={[styles.tagPill, { backgroundColor: accentColor + '22', borderColor: accentColor + '50' }]}>
        <Text style={[styles.tagText, { color: accentColor }]}>{tag}</Text>
      </View>

      {/* Title */}
      <Text style={styles.slideTitle}>{title}</Text>

      {/* Description */}
      <Text style={styles.slideDesc}>{description}</Text>
    </Animated.View>
  );
};

// ── Main component ──────────────────────────────────────────────────────────
const OnboardingScreen = ({ navigation }) => {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular, DMSans_500Medium, DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });

  const [currentSlide, setCurrentSlide] = useState(0);
  const slideAnim = useRef(new Animated.Value(1)).current;
  const autoScrollTimer = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    startProgressBar();
    startAutoScroll();
    return () => clearInterval(autoScrollTimer.current);
  }, [currentSlide]);

  const startProgressBar = () => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 4000,
      useNativeDriver: false,
    }).start();
  };

  const startAutoScroll = () => {
    clearInterval(autoScrollTimer.current);
    if (currentSlide < slides.length - 1) {
      autoScrollTimer.current = setInterval(goToNextSlide, 4000);
    }
  };

  const animateTransition = (callback) => {
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      callback();
      Animated.timing(slideAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    });
  };

  const goToNextSlide = () => {
    clearInterval(autoScrollTimer.current);
    if (currentSlide < slides.length - 1) {
      animateTransition(() => setCurrentSlide(prev => prev + 1));
    } else {
      finishOnboarding();
    }
  };

  const goToPreviousSlide = () => {
    clearInterval(autoScrollTimer.current);
    if (currentSlide > 0) {
      animateTransition(() => setCurrentSlide(prev => prev - 1));
    }
  };

  const goToSlide = (index) => {
    clearInterval(autoScrollTimer.current);
    animateTransition(() => setCurrentSlide(index));
  };

  const finishOnboarding = async () => {
    clearInterval(autoScrollTimer.current);
    try {
      await AsyncStorage.setItem('@onboarding_completed', 'true');
    } catch {}
    navigation.replace('Login');
  };

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: G.forest }} />;

  const slide = slides[currentSlide];
  const isLast = currentSlide === slides.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={G.forest} />

      {/* Decorative blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>CAM</Text>
        </View>
        {!isLast && (
          <TouchableOpacity style={styles.skipBtn} onPress={finishOnboarding}>
            <Text style={styles.skipText}>Skip</Text>
            <Ionicons name="chevron-forward" size={14} color={G.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Slide content */}
      <View style={styles.slideArea}>
        {slides.map((s, i) => (
          <SlidePanel
            key={s.id}
            slide={s}
            isActive={i === currentSlide}
            slideAnim={slideAnim}
          />
        ))}
      </View>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {slides.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goToSlide(i)} activeOpacity={0.7}>
            <View style={[
              styles.dot,
              i === currentSlide
                ? [styles.dotActive, { backgroundColor: slide.accentColor }]
                : styles.dotInactive,
            ]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Progress bar */}
      {!isLast && (
        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, {
              backgroundColor: slide.accentColor,
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
            }]}
          />
        </View>
      )}

      {/* Navigation buttons */}
      <View style={styles.navRow}>
        {currentSlide > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={goToPreviousSlide}>
            <Ionicons name="chevron-back" size={20} color={G.creamDim} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: slide.accentColor }]}
          onPress={goToNextSlide}
          activeOpacity={0.85}
        >
          <Text style={[styles.nextBtnText, { color: isLast ? G.forest : G.forest }]}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
          <View style={styles.nextBtnArrow}>
            <Ionicons name={isLast ? 'checkmark' : 'arrow-forward'} size={18} color={G.forest} />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: G.forest },

  blob1: {
    position: 'absolute', top: -80, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: G.emerald, opacity: 0.07,
  },
  blob2: {
    position: 'absolute', bottom: 100, left: -80,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: G.sage, opacity: 0.07,
  },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8,
  },
  logoMark: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1.5, borderColor: G.emerald + '60',
    backgroundColor: G.emerald + '15',
  },
  logoText: {
    fontFamily: 'DMSans_700Bold', fontSize: 14, color: G.emerald, letterSpacing: 2,
  },
  skipBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  skipText: {
    fontFamily: 'DMSans_500Medium', fontSize: 13, color: G.textMuted,
  },

  slideArea: {
    flex: 1, paddingHorizontal: 28, justifyContent: 'center',
  },
  slidePanel: {
    position: 'absolute', left: 28, right: 28,
  },
  emojiRing: {
    width: 100, height: 100, borderRadius: 30,
    borderWidth: 1.5, justifyContent: 'center', alignItems: 'center',
    marginBottom: 28, alignSelf: 'flex-start',
  },
  emojiText: { fontSize: 44 },

  tagPill: {
    alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, marginBottom: 16,
  },
  tagText: {
    fontFamily: 'DMSans_700Bold', fontSize: 10, letterSpacing: 1.5,
  },

  slideTitle: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 38, color: G.cream, lineHeight: 46, marginBottom: 16,
  },
  slideDesc: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 15, color: G.creamDim, lineHeight: 24,
  },

  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, paddingVertical: 20,
  },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 24 },
  dotInactive: { width: 6, backgroundColor: 'rgba(245,240,232,0.2)' },

  progressTrack: {
    height: 2, marginHorizontal: 24, backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1, marginBottom: 20, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 1 },

  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingBottom: 36,
  },
  backBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 12,
  },
  backBtnText: {
    fontFamily: 'DMSans_500Medium', fontSize: 15, color: G.creamDim,
  },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingLeft: 22, paddingRight: 14,
    borderRadius: 100, gap: 10,
  },
  nextBtnText: {
    fontFamily: 'DMSans_700Bold', fontSize: 15,
  },
  nextBtnArrow: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
});

export default OnboardingScreen;