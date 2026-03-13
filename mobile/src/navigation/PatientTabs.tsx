import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { PatientTabParamList } from './types';

// Tab screens
import { PatientDashboardScreen } from '../screens/patient/DashboardScreen';
import { PsychologistsScreen } from '../screens/patient/PsychologistsScreen';
import { PatientAppointmentsScreen } from '../screens/patient/AppointmentsScreen';
import { PatientMessagesScreen } from '../screens/patient/MessagesScreen';
import { PatientProfileScreen } from '../screens/patient/ProfileScreen';

const Tab = createBottomTabNavigator<PatientTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;

// Tab icon component with Ionicons
function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Ionicons
        name={name}
        size={22}
        color={focused ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

export function PatientTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          height: 60 + insets.bottom, // Dynamic height based on safe area
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8, // Use safe area or default
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500' as const,
        },
      }}
    >
      <Tab.Screen
        name="PatientDashboard"
        component={PatientDashboardScreen}
        options={{
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Psychologists"
        component={PsychologistsScreen}
        options={{
          tabBarLabel: 'Psikologlar',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'search' : 'search-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="PatientAppointments"
        component={PatientAppointmentsScreen}
        options={{
          tabBarLabel: 'Randevular',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="PatientMessages"
        component={PatientMessagesScreen}
        options={{
          tabBarLabel: 'Mesajlar',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'chatbubble' : 'chatbubble-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="PatientProfile"
        component={PatientProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  iconContainerActive: {
    backgroundColor: `${colors.primary}15`,
  },
});
