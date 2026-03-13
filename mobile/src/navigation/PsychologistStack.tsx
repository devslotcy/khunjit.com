import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { PsychologistStackParamList } from './types';

// Tab Navigator
import { PsychologistTabs } from './PsychologistTabs';

// Stack Screens
import { PsychologistChatScreen } from '../screens/psychologist/ChatScreen';
import { TimeSlotsScreen } from '../screens/psychologist/TimeSlotsScreen';

const Stack = createNativeStackNavigator<PsychologistStackParamList>();

export function PsychologistStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="PsychologistTabs" component={PsychologistTabs} />
      <Stack.Screen
        name="Chat"
        component={PsychologistChatScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="TimeSlots"
        component={TimeSlotsScreen}
        options={{
          presentation: 'card',
          animation: 'slide_from_right',
        }}
      />
    </Stack.Navigator>
  );
}
