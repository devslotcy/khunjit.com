import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import type { PsychologistTabParamList } from './types';

// Tab screens
import { PsychologistDashboardScreen } from '../screens/psychologist/DashboardScreen';
import { PsychologistAppointmentsScreen } from '../screens/psychologist/AppointmentsScreen';
import { PsychologistMessagesScreen } from '../screens/psychologist/MessagesScreen';
import { AvailabilityScreen } from '../screens/psychologist/AvailabilityScreen';
import { PsychologistProfileScreen } from '../screens/psychologist/ProfileScreen';

const Tab = createBottomTabNavigator<PsychologistTabParamList>();

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

export function PsychologistTabs() {
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
        name="PsychologistDashboard"
        component={PsychologistDashboardScreen}
        options={{
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="PsychologistAppointments"
        component={PsychologistAppointmentsScreen}
        options={{
          tabBarLabel: 'Randevular',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="PsychologistMessages"
        component={PsychologistMessagesScreen}
        options={{
          tabBarLabel: 'Mesajlar',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'chatbubble' : 'chatbubble-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Availability"
        component={AvailabilityScreen}
        options={{
          tabBarLabel: 'Müsaitlik',
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'time' : 'time-outline'} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="PsychologistProfile"
        component={PsychologistProfileScreen}
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
