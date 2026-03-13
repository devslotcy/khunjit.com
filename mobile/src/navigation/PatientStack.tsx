import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { PatientStackParamList } from './types';

// Tab Navigator
import { PatientTabs } from './PatientTabs';

// Stack Screens
import { PatientChatScreen } from '../screens/patient/ChatScreen';

const Stack = createNativeStackNavigator<PatientStackParamList>();

export function PatientStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="PatientTabs" component={PatientTabs} />
      <Stack.Screen
        name="Chat"
        component={PatientChatScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
}
