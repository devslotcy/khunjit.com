// Navigation types for the mobile app

export type RootStackParamList = {
  // Auth screens
  Splash: undefined;
  Onboarding: undefined;
  Welcome: undefined;
  Login: undefined;
  RoleSelect: undefined;
  Register: { role: 'patient' | 'psychologist' };

  // Main app - Tab navigators
  PatientTabs: undefined;
  PsychologistTabs: undefined;

  // Shared screens (modals / stack screens)
  PsychologistDetail: { id: string };
  Booking: { psychologistId: string };
  AppointmentDetail: { id: string };
  VideoCall: { appointmentId: string };
  Payment: { appointmentId: string };
  Settings: undefined;
  EditProfile: undefined;
};

export type PatientTabParamList = {
  PatientDashboard: undefined;
  Psychologists: undefined;
  PatientAppointments: undefined;
  PatientMessages: undefined;
  PatientProfile: undefined;
};

export type PsychologistTabParamList = {
  PsychologistDashboard: undefined;
  PsychologistAppointments: undefined;
  PsychologistMessages: undefined;
  Availability: undefined;
  PsychologistProfile: undefined;
};

// Stack navigators that wrap tab navigators
export type PatientStackParamList = {
  PatientTabs: undefined;
  Chat: {
    conversationId: string;
    psychologistName: string;
    psychologistInitials?: string;
  };
};

export type PsychologistStackParamList = {
  PsychologistTabs: undefined;
  Chat: {
    conversationId: string;
    patientName: string;
    patientInitials?: string;
  };
  TimeSlots: undefined;
};

// Helper type for navigation
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
