import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Screens
import {
  SplashScreen,
  OnboardingScreen,
  WelcomeScreen,
  LoginScreen,
  RoleSelectScreen,
  RegisterScreen,
} from './src/screens';

// Stack Navigators (contain tabs + chat screens)
import { PatientStack } from './src/navigation/PatientStack';
import { PsychologistStack } from './src/navigation/PsychologistStack';

// Store & API
import { useAuthStore } from './src/store/authStore';
import { setOnUnauthorized } from './src/services/api';
import { colors } from './src/theme/colors';

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

// Loading Screen Component
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Yukleniyor...</Text>
    </View>
  );
}

// Simple Auth Flow without React Navigation
type AuthScreen = 'welcome' | 'login' | 'roleSelect' | 'register';

function AuthFlow() {
  const [currentScreen, setCurrentScreen] = useState<AuthScreen>('welcome');
  const [selectedRole, setSelectedRole] = useState<'patient' | 'psychologist'>('patient');
  const { login, register } = useAuthStore();

  if (currentScreen === 'welcome') {
    return (
      <WelcomeScreen
        onLogin={() => setCurrentScreen('login')}
        onRegister={() => setCurrentScreen('roleSelect')}
      />
    );
  }

  if (currentScreen === 'login') {
    return (
      <LoginScreen
        onBack={() => setCurrentScreen('welcome')}
        onLogin={async (email, password) => {
          await login({ email, password });
        }}
        onNavigateToRegister={() => setCurrentScreen('roleSelect')}
      />
    );
  }

  if (currentScreen === 'roleSelect') {
    return (
      <RoleSelectScreen
        onBack={() => setCurrentScreen('welcome')}
        onSelectRole={(role) => {
          setSelectedRole(role);
          setCurrentScreen('register');
        }}
      />
    );
  }

  if (currentScreen === 'register') {
    return (
      <RegisterScreen
        role={selectedRole}
        onBack={() => setCurrentScreen('roleSelect')}
        onRegister={async (data) => {
          const registerData = {
            ...data,
            role: selectedRole,
            yearsOfExperience: data.yearsOfExperience
              ? parseInt(data.yearsOfExperience, 10)
              : undefined,
            pricePerSession: data.pricePerSession
              ? parseInt(data.pricePerSession, 10)
              : undefined,
          };
          await register(registerData);
        }}
        onNavigateToLogin={() => setCurrentScreen('login')}
      />
    );
  }

  return <WelcomeScreen onLogin={() => setCurrentScreen('login')} onRegister={() => setCurrentScreen('roleSelect')} />;
}

// Root Navigator
function RootNavigator() {
  const { isAuthenticated, isLoading, isHydrated, profile, logout, checkAuth } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });
  }, [logout]);

  useEffect(() => {
    checkAuth();
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!isHydrated || isLoading) {
    return <LoadingScreen />;
  }

  if (showOnboarding && !isAuthenticated) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  if (!isAuthenticated) {
    return <AuthFlow />;
  }

  const role = profile?.role;

  // Stack navigators (with tabs + chat) need NavigationContainer
  if (role === 'psychologist') {
    return (
      <NavigationContainer>
        <PsychologistStack />
      </NavigationContainer>
    );
  }

  if (role === 'patient') {
    return (
      <NavigationContainer>
        <PatientStack />
      </NavigationContainer>
    );
  }

  logout();
  return <LoadingScreen />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textMuted,
  },
});
