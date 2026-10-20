import * as Notifications from 'expo-notifications';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { auth, db } from '../firebaseConfig';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type Screen =
  | 'splash'
  | 'login'
  | 'signup'
  | 'role'
  | 'patient'
  | 'caregiver'
  | 'patientAI'
  | 'caregiverAI'
  | 'prescription'
  | 'album'
  | 'routine'
  | 'reminders'
  | 'documents'
  | 'settings'
  | 'connect'
  | 'personDetails'
  | 'language'
  | 'games'
  | 'gamePlay';

type Role = 'patient' | 'caregiver';

type Reminder = {
  id: number;
  title: string;
  time: string;
  category: string;
  status: 'Upcoming' | 'Completed' | 'Missed';
  repeat: 'Once' | 'Daily';
};

const C = {
  background: '#F7F8F4',
  green: '#176B59',
  deep: '#263B37',
  muted: '#7A8984',
  white: '#FFFFFF',
  border: '#DFE7E2',
  paleGreen: '#E8F2ED',
  mint: '#D9EDE4',
  purple: '#EDE7FA',
  blue: '#E4EFFB',
  warm: '#FBF0DD',
  red: '#D65B65',
};

 const Card = ({
    children,
    style,
    onPress,
  }: {
    children: React.ReactNode;
    style?: object;
    onPress?: () => void;
  }) => (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.card, style]}
    >
      {children}
    </TouchableOpacity>
  );
  
const Field = ({
    label,
    placeholder,
    value,
    onChangeText,
    secureTextEntry = false,
    keyboardType,
  }: {
    label: string;
    placeholder: string;
    value: string;
    onChangeText: (text: string) => void;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address' | 'numeric';
  }) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#A0AAA5"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        autoCorrect={false}
        blurOnSubmit={false}
        returnKeyType="next"
        textContentType={label.toLowerCase().includes('password') ? 'password' : label.toLowerCase().includes('email') ? 'emailAddress' : 'name'}
      />
    </View>
  );

export default function Index() {
  const [screen, setScreen] = useState<Screen>('splash');
  const [role, setRole] = useState<Role>('patient');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [assistantMessage, setAssistantMessage] = useState('');
  const [assistantReplies, setAssistantReplies] = useState<string[]>([]);
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(true);
  const [connectionRequestStatus, setConnectionRequestStatus] = useState<'None' | 'Pending' | 'Accepted' | 'Declined'>('None');
  const [roleChosenForSignup, setRoleChosenForSignup] = useState(false);

  const [reminders, setReminders] = useState<Reminder[]>([
    {
      id: 1,
      title: 'Morning medicine',
      time: '10:00 PM',
      category: 'Medicine',
      status: 'Upcoming',
      repeat: 'Daily',
    },
    {
      id: 2,
      title: 'Doctor appointment',
      time: '11:00 AM',
      category: 'Appointment',
      status: 'Upcoming',
      repeat: 'Once',
    },
    {
      id: 3,
      title: 'Call family',
      time: '5:00 PM',
      category: 'Task',
      status: 'Upcoming',
      repeat: 'Once',
    },
  ]);

  const remindersRef = useRef(reminders);

remindersRef.current = reminders;
useEffect(() => {
  const loadReminders = async () => {
    try {
      const response = await fetch(
        'http://10.215.244.89:8000/reminders?patient_id=test-patient-1'
      );

      if (!response.ok) {
        throw new Error('Failed to load reminders');
      }

      const savedReminders = await response.json();

      setReminders((previous) => {
        const demoReminders = previous.filter(
          (item) => item.id <= 3
        );

        const databaseReminders = savedReminders.map((item: any) => ({
          id: item.id + 1000,
          title: item.title,
          time: item.time,
          category: item.category,
          status: item.status,
          repeat: item.repeat,
        }));

        return [...demoReminders, ...databaseReminders];
      });
    } catch (error) {
      console.error('Could not load saved reminders:', error);
    }
  };

  loadReminders();
}, []);

  const [reminderFilter, setReminderFilter] = useState<
    'Upcoming' | 'Completed' | 'Missed'
  >('Upcoming');

  const [routineFilter, setRoutineFilter] = useState<
    'Today' | 'This Week' | 'All'
  >('Today');

  const [completedRoutine, setCompletedRoutine] = useState<number[]>([]);

  const [albumTab, setAlbumTab] = useState('Photos');
  const [documentTab, setDocumentTab] = useState('All');
  const [language, setLanguage] = useState<'English' | 'Kannada' | 'Hindi'>('English');
  const [activityPeriod, setActivityPeriod] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const [selectedGame, setSelectedGame] = useState('Memory Match');
  const [gameRound, setGameRound] = useState(0);
  const [gameFeedback, setGameFeedback] = useState('');
  const [albumItems, setAlbumItems] = useState([
    { id: 1, tab: 'Photos', title: 'A special day', detail: 'A happy moment with family.', emoji: '🌷' },
    { id: 2, tab: 'Places', title: 'Favorite place', detail: 'A place that feels familiar and peaceful.', emoji: '🌳' },
    { id: 3, tab: 'Memories', title: 'Family moments', detail: 'A special memory to share with loved ones.', emoji: '♡' },
  ]);
  const [caregiverAlerts, setCaregiverAlerts] = useState<string[]>([]);

  const [activities, setActivities] = useState([
    { id: 1, title: 'Morning walk', time: '7:00 AM' },
    { id: 2, title: 'Breakfast', time: '8:00 AM' },
    { id: 3, title: 'Take medicine', time: '8:30 AM' },
    { id: 4, title: 'Call family', time: '5:00 PM' },
  ]);

  const [personEmail, setPersonEmail] = useState('');
  const [connected, setConnected] = useState(false);

  const [selectedPermissions, setSelectedPermissions] = useState([
    'Reminders and tasks',
    'Daily progress',
  ]);

  const [selectedMedicines, setSelectedMedicines] = useState<number[]>([
    1, 2, 3,
  ]);

  const [prescriptionConfirmed, setPrescriptionConfirmed] = useState(false);

  const [documentNames, setDocumentNames] = useState([
    'Prescription_12Oct2025.pdf',
    'Lab_Report.pdf',
    'Scan_5Oct2025.jpg',
  ]);

  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminderName, setNewReminderName] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const [newReminderCategory, setNewReminderCategory] = useState('Medicine');

  const [showAddActivity, setShowAddActivity] = useState(false);
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityTime, setNewActivityTime] = useState('');
useEffect(() => {
  const checkMissedReminders = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    console.log('Missed reminder checker running at:', now.toLocaleTimeString());

    setReminders((previous) => {
  remindersRef.current = previous;
      let changed = false;

      const updated = previous.map((reminder) => {
        if (
          reminder.category !== 'Medicine' ||
          reminder.status !== 'Upcoming'
        ) {
          return reminder;
        }

        const match = reminder.time.match(
          /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
        );

        if (!match) return reminder;

        let hours = Number(match[1]);
        const minutes = Number(match[2]);
        const period = match[3].toUpperCase();

        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;

        const reminderMinutes = hours * 60 + minutes;

        if (
  currentMinutes > reminderMinutes &&
  currentMinutes - reminderMinutes >= 15
) {
  changed = true;

  const alertMessage =
  `${reminder.title} at ${reminder.time} has not been confirmed.`;

setCaregiverAlerts((previousAlerts) =>
  previousAlerts.includes(alertMessage)
    ? previousAlerts
    : [alertMessage, ...previousAlerts]
);

void Notifications.scheduleNotificationAsync({
  content: {
    title: '⚠️ Medicine Reminder Missed',
    body: `${reminder.title} was scheduled for ${reminder.time}. Please check whether the medicine was taken.`,
    sound: 'default',
    data: {
      reminderId: reminder.id,
      type: 'missed-medicine',
    },
  },
  trigger: null,
}).catch((error) => {
  console.error('Could not show missed-reminder notification:', error);
});

  return { ...reminder, status: 'Missed' as const };
}

        return reminder;
      });

      return changed ? updated : previous;
    });
  };

  checkMissedReminders();
  const timer = setInterval(checkMissedReminders, 60_000);

  return () => clearInterval(timer);
}, []);

  const goBack = () => {
    const previous: Partial<Record<Screen, Screen>> = {
      login: 'splash',
      signup: 'login',
      role: 'signup',
      patient: 'role',
      caregiver: 'role',
      patientAI: 'patient',
      caregiverAI: 'caregiver',
      prescription: 'caregiverAI',
      album: 'patient',
      routine: 'patient',
      reminders: 'patient',
      documents: 'settings',
      settings: role === 'patient' ? 'patient' : 'caregiver',
      connect: 'settings',
      personDetails: 'settings',
      language: 'settings',
      games: role === 'patient' ? 'patient' : 'caregiver',
      gamePlay: 'games',
    };

    setScreen(previous[screen] || 'splash');
  };

  const getFirebaseErrorMessage = (error: unknown) => {
    const code = (error as { code?: string })?.code || '';
    switch (code) {
      case 'auth/email-already-in-use': return 'This email is already registered. Please log in instead.';
      case 'auth/invalid-email': return 'Please enter a valid email address.';
      case 'auth/weak-password': return 'Please choose a password with at least 6 characters.';
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found': return 'Email or password is incorrect. Please try again.';
      case 'auth/network-request-failed': return 'Network error. Check your internet connection and try again.';
      case 'permission-denied': return 'Firebase access was blocked by your Firestore rules. Check the database rules.';
      default: return (error as { message?: string })?.message || 'Something went wrong. Please try again.';
    }
  };

  const logout = () => {
    Alert.alert('Log out', 'Would you like to log out of Cogniva?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut(auth);
            setPassword('');
            setConfirmPassword('');
            setScreen('login');
          } catch (error: any) {
  console.log('SIGNUP ERROR CODE:', error?.code);
  console.log('SIGNUP ERROR MESSAGE:', error?.message);

  Alert.alert(
    'Could not create account',
    `${error?.code || 'unknown-error'}: ${error?.message || 'Please try again.'}`
  );
}
        },
      },
    ]);
  };

  const login = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }
    try {
      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const profileSnapshot = await getDoc(doc(db, 'users', credential.user.uid));
      if (!profileSnapshot.exists()) {
        await signOut(auth);
        Alert.alert('Profile not found', 'Your account exists, but its Cogniva profile is missing. Please sign up again or contact support.');
        return;
      }
      const profile = profileSnapshot.data();
      if (profile.role !== 'patient' && profile.role !== 'caregiver') {
        await signOut(auth);
        Alert.alert('Profile setup incomplete', 'Your account role is missing. Please contact support.');
        return;
      }
      setRole(profile.role as Role);
      setName(typeof profile.name === 'string' ? profile.name : '');
      setEmail(normalizedEmail);
      setScreen(profile.role === 'patient' ? 'patient' : 'caregiver');
    } catch (error) {
      Alert.alert('Login failed', getFirebaseErrorMessage(error));
    }
  };

  const signup = () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing details', 'Please complete all required fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Password too short', 'Use at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please check your passwords.');
      return;
    }
    setRoleChosenForSignup(true);
    setScreen('role');
  };

  const finishRoleSelection = async () => {
    if (!roleChosenForSignup) {
      Alert.alert('Choose your account type', 'To create a new account, please start from Sign Up.');
      return;
    }
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        name: name.trim(),
        email: normalizedEmail,
        role,
        createdAt: serverTimestamp(),
      });
      setRoleChosenForSignup(false);
      setPassword('');
      setConfirmPassword('');
      setScreen(role === 'patient' ? 'patient' : 'caregiver');
    } catch (error) {
      Alert.alert('Could not create account', getFirebaseErrorMessage(error));
    }
  };

  const resetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert('Enter your email', 'Type your email address first, then tap Forgot password.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      Alert.alert('Check your email', 'Firebase has sent a password reset link if this email is registered.');
    } catch (error) {
      Alert.alert('Could not send reset email', getFirebaseErrorMessage(error));
    }
  };

  const sendAssistantMessage = () => {
    if (!assistantMessage.trim()) return;

    const message = assistantMessage.trim();

    setAssistantReplies((previous) => [
      ...previous,
      `You: ${message}`,
      'Cogniva: I am here to help. Let us take this one step at a time. You can also ask your caregiver for support whenever you need it.',
    ]);

    setAssistantMessage('');
  };

  
const addReminder = async () => {
  if (!newReminderName.trim() || !newReminderTime.trim()) {
    Alert.alert(
      'Add reminder',
      'Please enter a reminder name and time.',
    );
    return;
  }

  try {
    const response = await fetch(
      'http://10.215.244.89:8000/reminders',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newReminderName.trim(),
          category: newReminderCategory,
          time: newReminderTime.trim(),
          repeat: 'Once',
          patient_id: 'test-patient-1',
        }),
      },
    );

    if (!response.ok) {
      throw new Error('Could not save reminder to the backend.');
    }

    const savedReminder = await response.json();

    setReminders((previous) => [
      ...previous,
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        title: savedReminder.title,
        time: savedReminder.time,
        category: savedReminder.category,
        status: savedReminder.status,
        repeat: savedReminder.repeat,
      },
    ]);

    setNewReminderName('');
    setNewReminderTime('');
    setShowAddReminder(false);

    Alert.alert(
      'Reminder added',
      'Your reminder was saved successfully.',
    );
  } catch (error) {
    Alert.alert(
      'Connection error',
      'Could not save the reminder. Check that the Cogniva backend is running and your phone is connected.',
    );
  }
};

  
const deleteReminder = (id: number) => {
  Alert.alert(
    'Delete Reminder',
    'Are you sure you want to delete this reminder?',
    [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const reminder = remindersRef.current.find(
              (item) => item.id === id
            );

            if (!reminder) return;

            // Keep demo reminders local.
            if (id <= 3) {
              setReminders((previous) =>
                previous.filter((item) => item.id !== id)
              );
              return;
            }

            const databaseId = id - 1000;

            const response = await fetch(
              `http://10.215.244.89:8000/reminders/${databaseId}`,
              { method: 'DELETE' }
            );

            if (!response.ok) {
              throw new Error('Failed to delete reminder');
            }

            setReminders((previous) =>
              previous.filter((item) => item.id !== id)
            );

            Alert.alert('Success', 'Reminder deleted successfully.');
          } catch (error) {
            Alert.alert(
              'Error',
              'Could not delete the reminder from the database.'
            );
          }
        },
      },
    ]
  );
};

  const addActivity = () => {
    if (!newActivityName.trim() || !newActivityTime.trim()) {
      Alert.alert(
        'Add activity',
        'Please enter an activity name and time.',
      );
      return;
    }

    setActivities((previous) => [
      ...previous,
      {
        id: Date.now(),
        title: newActivityName.trim(),
        time: newActivityTime.trim(),
      },
    ]);

    setNewActivityName('');
    setNewActivityTime('');
    setShowAddActivity(false);
  };

  
const changeReminderStatus = async (
  id: number,
  status: 'Upcoming' | 'Completed' | 'Missed',
) => {
  const target = remindersRef.current.find(
    (reminder) => reminder.id === id
  );

  if (!target) return;

  // Save status to SQLite for database reminders.
  if (id > 3) {
    try {
      const databaseId = id - 1000;

      const response = await fetch(
        `http://10.215.244.89:8000/reminders/${databaseId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update reminder status');
      }
    } catch (error) {
      Alert.alert(
        'Connection error',
        'Could not save the reminder status. Check that the Cogniva backend is running.'
      );
      return;
    }
  }

  // Update the app after the database update succeeds.
  setReminders((previous) =>
    previous.map((reminder) =>
      reminder.id === id
        ? { ...reminder, status }
        : reminder
    )
  );

  // Keep the existing caregiver alert feature.
  if (status === 'Missed') {
    const alertMessage =
      `${target.title} at ${target.time} has not been confirmed.`;

    setCaregiverAlerts((previous) =>
      previous.includes(alertMessage)
        ? previous
        : [alertMessage, ...previous]
    );

    Alert.alert(
      'Caregiver alert prepared',
      `${alertMessage} This alert is currently recorded locally.`
    );
  }
};


  const requestNotificationPermission = async () => {
  const { status } = await Notifications.getPermissionsAsync();

  if (status !== 'granted') {
    const { status: newStatus } =
      await Notifications.requestPermissionsAsync();

    if (newStatus !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow notifications in your phone settings.',
      );
      return false;
    }
  }

  return true;
};

  const togglePermission = (permission: string) => {
    setSelectedPermissions((previous) =>
      previous.includes(permission)
        ? previous.filter((item) => item !== permission)
        : [...previous, permission],
    );
  };

  const addDemoDocument = () => {
    const documentName = `New_Document_${documentNames.length + 1}.pdf`;

    setDocumentNames((previous) => [...previous, documentName]);

    Alert.alert(
      'Demo document added',
      'A sample document has been added. Actual file selection will be connected later.',
    );
  };

  const activityRows = activities.map((activity, index) => ({
    ...activity,
    dayOffset: index === 0 || index === 1 ? 0 : index === 2 ? 1 : 3,
  }));
  const visibleActivities = routineFilter === 'Today'
    ? activityRows.filter((item) => item.dayOffset === 0)
    : routineFilter === 'This Week'
      ? activityRows.filter((item) => item.dayOffset <= 6)
      : activityRows;
  const completedVisible = visibleActivities.filter((item) => completedRoutine.includes(item.id)).length;
  const languageLabels = {
    English: { settings: 'Language & Region', choose: 'Choose Your Language', save: 'Save Language', languageSubtitle: 'Choose your preferred language' },
    Kannada: { settings: 'ಭಾಷೆ ಮತ್ತು ಪ್ರದೇಶ', choose: 'ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ', save: 'ಭಾಷೆಯನ್ನು ಉಳಿಸಿ', languageSubtitle: 'ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ' },
    Hindi: { settings: 'भाषा और क्षेत्र', choose: 'अपनी भाषा चुनें', save: 'भाषा सहेजें', languageSubtitle: 'अपनी पसंदीदा भाषा चुनें' },
  };
  const tr = languageLabels[language];

  const Header = ({
    title,
    subtitle,
    right,
  }: {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
  }) => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={goBack}
        accessibilityLabel="Go back"
      >
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>

      <View style={styles.headerTextContainer}>
        <Text style={styles.headerTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>

      {right || <View style={{ width: 38 }} />}
    </View>
  );

  const Button = ({
    title,
    onPress,
    secondary = false,
  }: {
    title: string;
    onPress: () => void;
    secondary?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.button, secondary && styles.secondaryButton]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && styles.secondaryButtonText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const SmallButton = ({
    title,
    onPress,
  }: {
    title: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity style={styles.smallButton} onPress={onPress}>
      <Text style={styles.smallButtonText}>{title}</Text>
    </TouchableOpacity>
  );

  const SectionTitle = ({
    title,
    action,
    onAction,
  }: {
    title: string;
    action?: string;
    onAction?: () => void;
  }) => (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );


  const BottomNav = ({ active }: { active: string }) => (
    <View style={styles.bottomNav}>
      {[
        { label: 'Home', icon: '⌂', target: role === 'patient' ? 'patient' : 'caregiver' },
        { label: 'Assistant', icon: '✧', target: role === 'patient' ? 'patientAI' : 'caregiverAI' },
        { label: 'Memories', icon: '♡', target: 'album' },
        { label: 'Profile', icon: '○', target: 'settings' },
      ].map((item) => (
        <TouchableOpacity
          key={item.label}
          style={styles.navItem}
          onPress={() => setScreen(item.target as Screen)}
        >
          <Text
            style={[
              styles.navIcon,
              active === item.label && styles.navActive,
            ]}
          >
            {item.icon}
          </Text>
          <Text
            style={[
              styles.navLabel,
              active === item.label && styles.navActive,
            ]}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

   const ReminderRow = ({ item }: { item: Reminder }) => (
  <Card style={styles.listCard}>
    <View style={styles.listIcon}>
      <Text style={styles.listIconText}>
        {item.category === 'Medicine'
          ? '✚'
          : item.category === 'Appointment'
            ? '♡'
            : '✓'}
      </Text>
    </View>

    <View style={styles.listMain}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.cardSubtitle}>
        {item.time} · {item.category}
      </Text>

      <Text
        style={[
          styles.statusText,
          item.status === 'Completed' && { color: C.green },
          item.status === 'Missed' && { color: C.red },
        ]}
      >
        {item.status}
      </Text>
    </View>

    {item.status === 'Upcoming' ? (
      <TouchableOpacity
        style={styles.checkButton}
        onPress={() => changeReminderStatus(item.id, 'Completed')}
      >
        <Text style={styles.checkButtonText}>✓</Text>
      </TouchableOpacity>
    ) : (
      <Text style={styles.checkButtonText}>
        {item.status === 'Completed' ? '✓' : '!'}
      </Text>
    )}

    <TouchableOpacity
  onPress={() => deleteReminder(item.id)}
  style={{
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  }}
  accessibilityLabel="Delete reminder"
  accessibilityRole="button"
>
  <Ionicons name="trash-outline" size={20} color="#DC2626" />
</TouchableOpacity>
  </Card>
);

  const RoutineRow = ({
    item,
  }: {
    item: { id: number; title: string; time: string };
  }) => {
    const done = completedRoutine.includes(item.id);

    return (
      <TouchableOpacity
        style={styles.routineRow}
        onPress={() =>
          setCompletedRoutine((previous) =>
            done
              ? previous.filter((id) => id !== item.id)
              : [...previous, item.id],
          )
        }
      >
        <View style={[styles.routineCheck, done && styles.routineCheckDone]}>
          <Text style={styles.routineCheckText}>{done ? '✓' : ''}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.cardTitle,
              done && { textDecorationLine: 'line-through' },
            ]}
          >
            {item.title}
          </Text>
          <Text style={styles.cardSubtitle}>{item.time}</Text>
        </View>

        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  const ScreenContent = () => {
    switch (screen) {
      // 1. SPLASH SCREEN
      case 'splash':
        return (
          <View style={styles.splash}>


            <View style={styles.logoCircle}>
              <Text style={styles.logoIcon}>♡</Text>
              <Text style={styles.logoLeaf}>❧</Text>
            </View>

            <Text style={styles.brandName}>Cogniva</Text>
            <Text style={styles.brandSubtitle}>
              AI powered memory assistance{'\n'}and cognitive support
            </Text>

            <View style={styles.illustrationCircle}>
              <Text style={styles.brainIllustration}>🧠</Text>
              <View style={styles.heartBadge}>
                <Text style={styles.heartBadgeText}>♡</Text>
              </View>
            </View>

            <Text style={styles.splashTagline}>
              Simple  •  Supportive  •  Personalized
            </Text>
            <Text style={styles.splashMemoryTitle}>Every memory matters.</Text>
            <Text style={styles.splashMemorySubtitle}>A simple and supportive assistant for memory reminders and daily activities.</Text>

            <View style={styles.dots}>
              <View style={styles.dotActive} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>

            <View style={styles.splashActions}>
              <Button
                title="Get Started"
                onPress={() => setScreen('login')}
              />
              <Button
                title="I already have an account"
                secondary
                onPress={() => setScreen('login')}
              />
              <TouchableOpacity onPress={() => setScreen('signup')}>
                <Text style={styles.bottomLink}>
                  New to Cogniva? <Text style={styles.link}>Create account</Text>
                </Text>
              </TouchableOpacity>
            </View>


          </View>
        );

      // 2. LOGIN SCREEN
      case 'login':
        return (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView contentContainerStyle={styles.page}>
              <Header title="Welcome back" subtitle="Your caring companion is here." />

              <View style={styles.authLogo}>
                <View style={styles.miniLogo}>
                  <Text style={styles.miniLogoText}>♡</Text>
                </View>
                <Text style={styles.brandNameSmall}>Cogniva</Text>
              </View>

              <Text style={styles.pageHeading}>Welcome Back</Text>
              <Text style={styles.pageSubtitle}>
                Sign in to continue your journey with Cogniva.
              </Text>

              {Field({ label: 'Email address', placeholder: 'you@example.com', value: email, onChangeText: setEmail, keyboardType: 'email-address' })}

              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#A0AAA5"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.showPassword}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.forgotButton}
                onPress={resetPassword}
              >
                <Text style={styles.link}>Forgot password?</Text>
              </TouchableOpacity>

              <Button title="Log In" onPress={login} />

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or continue with</Text>
                <View style={styles.orLine} />
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() =>
                    Alert.alert('Google sign-in', 'Google authentication will be connected later.')
                  }
                >
                  <Text style={styles.socialText}>G  Google</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() =>
                    Alert.alert('Apple sign-in', 'Apple authentication will be connected later.')
                  }
                >
                  <Text style={styles.socialText}>●  Apple</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.centerText}>
                Don't have an account?{' '}
                <Text style={styles.link} onPress={() => setScreen('signup')}>
                  Sign Up
                </Text>
              </Text>

              <Text style={styles.privacyNote}>
                Your privacy and comfort matter to us.
              </Text>
            </ScrollView>
          </KeyboardAvoidingView>
        );

      // 3. SIGN-UP SCREEN
      case 'signup':
        return (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
          <ScrollView
            contentContainerStyle={[styles.page, { flexGrow: 1 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
          >
            <Header title="Create account" subtitle="Let's get started together." />

            <View style={styles.authLogo}>
              <View style={styles.miniLogo}>
                <Text style={styles.miniLogoText}>♡</Text>
              </View>
              <Text style={styles.brandNameSmall}>Cogniva</Text>
            </View>

            <Text style={styles.pageHeading}>Join Cogniva</Text>
            <Text style={styles.pageSubtitle}>
              Create a safe and supportive space for everyday life.
            </Text>

            {Field({ label: 'Full name', placeholder: 'Enter your full name', value: name, onChangeText: setName })}

            {Field({ label: 'Email address', placeholder: 'you@example.com', value: email, onChangeText: setEmail, keyboardType: 'email-address' })}

            <Text style={styles.fieldLabel}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="At least 6 characters"
                placeholderTextColor="#A0AAA5"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.showPassword}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            {Field({ label: 'Confirm password', placeholder: 'Enter password again', value: confirmPassword, onChangeText: setConfirmPassword })}

            <Text style={styles.helperText}>
              Your information should only be shared with people you authorize.
            </Text>

            <Button title="Create Account" onPress={signup} />

            <Text style={styles.centerText}>
              Already have an account?{' '}
              <Text style={styles.link} onPress={() => setScreen('login')}>
                Log In
              </Text>
            </Text>
          </ScrollView>
          </KeyboardAvoidingView>
        );

      // 4. ROLE SELECTION
      case 'role':
        return (
          <ScrollView contentContainerStyle={styles.page}>
            <Header title="Personalize Cogniva" />

            <Text style={styles.pageHeading}>How will you use Cogniva?</Text>
            <Text style={styles.pageSubtitle}>
              Choose the experience that best suits your needs.
            </Text>

            <Card
              style={[
                styles.roleCard,
                role === 'patient' && styles.selectedCard,
              ]}
              onPress={() => setRole('patient')}
            >
              <View style={[styles.roleIcon, { backgroundColor: C.paleGreen }]}>
                <Text style={styles.bigIcon}>♡</Text>
              </View>
              <Text style={styles.roleTitle}>Person receiving support</Text>
              <Text style={styles.cardSubtitle}>
                I want help with reminders, routines and memories.
              </Text>
              <Text style={styles.radioText}>
                {role === 'patient' ? '◉ Selected' : '○ Select this option'}
              </Text>
            </Card>

            <Card
              style={[
                styles.roleCard,
                role === 'caregiver' && styles.selectedCard,
              ]}
              onPress={() => setRole('caregiver')}
            >
              <View style={[styles.roleIcon, { backgroundColor: C.purple }]}>
                <Text style={styles.bigIcon}>♧</Text>
              </View>
              <Text style={styles.roleTitle}>Caregiver</Text>
              <Text style={styles.cardSubtitle}>
                I want to support a loved one with daily activities.
              </Text>
              <Text style={styles.radioText}>
                {role === 'caregiver' ? '◉ Selected' : '○ Select this option'}
              </Text>
            </Card>

            <Card style={styles.privacyCard}>
              <Text style={styles.cardTitle}>🔒 Private & Supportive</Text>
              <Text style={styles.cardSubtitle}>
                Caregiver access should be based on the person's consent and
                approved permissions.
              </Text>
            </Card>

            <Button
              title="Continue"
              onPress={finishRoleSelection}
            />
          </ScrollView>
        );

      // 5. PATIENT DASHBOARD
      case 'patient':
        return (
          <View style={styles.flex}>
            <ScrollView contentContainerStyle={styles.dashboardPage}>
              <View style={styles.dashboardHeader}>
                <View>
                  <Text style={styles.greeting}>Hello, {name || 'Friend'} 🌿</Text>
                  <Text style={styles.cardSubtitle}>Let's make today a good day.</Text>
                </View>
                <TouchableOpacity
                  style={styles.profileCircle}
                  onPress={() => setScreen('settings')}
                >
                  <Text style={styles.profileCircleText}>
                    {(name || 'F').charAt(0).toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </View>

              <Card style={styles.welcomeCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.welcomeTitle}>You are not alone.</Text>
                  <Text style={styles.welcomeSubtitle}>
                    I'm here to help you through your day, one step at a time.
                  </Text>
                  <TouchableOpacity
                    style={styles.lightButton}
                    onPress={() => setScreen('patientAI')}
                  >
                    <Text style={styles.lightButtonText}>Ask Cogniva  →</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.welcomeEmoji}>🌿</Text>
              </Card>

              <SectionTitle
                title="Today at a glance"
                action="See all"
                onAction={() => setScreen('reminders')}
              />

              <View style={styles.statsRow}>
                <TouchableOpacity
                  style={[styles.statCard, { backgroundColor: C.paleGreen }]}
                  onPress={() => setScreen('reminders')}
                >
                  <Text style={styles.statIcon}>✚</Text>
                  <Text style={styles.statNumber}>
                    {reminders.filter((r) => r.category === 'Medicine' && r.status === 'Upcoming').length}
                  </Text>
                  <Text style={styles.statLabel}>Medicines</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statCard, { backgroundColor: C.warm }]}
                  onPress={() => setScreen('reminders')}
                >
                  <Text style={styles.statIcon}>♡</Text>
                  <Text style={styles.statNumber}>
                    {reminders.filter((r) => r.category === 'Appointment' && r.status === 'Upcoming').length}
                  </Text>
                  <Text style={styles.statLabel}>Appointments</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statCard, { backgroundColor: C.purple }]}
                  onPress={() => setScreen('routine')}
                >
                  <Text style={styles.statIcon}>✓</Text>
                  <Text style={styles.statNumber}>
                    {completedRoutine.length}/{activities.length}
                  </Text>
                  <Text style={styles.statLabel}>Activities</Text>
                </TouchableOpacity>
              </View>

              <SectionTitle title="Your daily companion" />

              <Card
                style={styles.featureCard}
                onPress={() => setScreen('patientAI')}
              >
                <View style={[styles.featureIcon, { backgroundColor: C.paleGreen }]}>
                  <Text style={styles.bigIcon}>✧</Text>
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.cardTitle}>AI Assistant</Text>
                  <Text style={styles.cardSubtitle}>
                    Ask a question or get help with your day.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Card>

              <Card
                style={styles.featureCard}
                onPress={() => setScreen('reminders')}
              >
                <View style={[styles.featureIcon, { backgroundColor: C.warm }]}>
                  <Text style={styles.bigIcon}>◷</Text>
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.cardTitle}>Reminders</Text>
                  <Text style={styles.cardSubtitle}>
                    Medicines, appointments and important tasks.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Card>

              <Card
                style={styles.featureCard}
                onPress={() => setScreen('album')}
              >
                <View style={[styles.featureIcon, { backgroundColor: C.purple }]}>
                  <Text style={styles.bigIcon}>♡</Text>
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.cardTitle}>Memory Album</Text>
                  <Text style={styles.cardSubtitle}>
                    Keep your favorite memories close.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Card>

              <Card
                style={styles.featureCard}
                onPress={() => setScreen('routine')}
              >
                <View style={[styles.featureIcon, { backgroundColor: C.blue }]}>
                  <Text style={styles.bigIcon}>☀</Text>
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.cardTitle}>My Routine</Text>
                  <Text style={styles.cardSubtitle}>
                    View today's activities and routines.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Card>

              <Card
                style={styles.cognitiveCard}
                onPress={() => setScreen('games')}
              >
                <Text style={styles.cognitiveEmoji}>🧩</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Memory & Games</Text>
                  <Text style={styles.cardSubtitle}>
                    Enjoy gentle activities at your own pace.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Card>
            </ScrollView>

            <BottomNav active="Home" />
          </View>
        );

      // 6. CAREGIVER DASHBOARD
      case 'caregiver':
        return (
          <View style={styles.flex}>
            <ScrollView contentContainerStyle={styles.dashboardPage}>
              <View style={styles.dashboardHeader}>
                <View>
                  <Text style={styles.greeting}>Hello, {name || 'Caregiver'} 🌿</Text>
                  <Text style={styles.cardSubtitle}>
                    Small acts of care make a difference.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.profileCircle}
                  onPress={() => setScreen('settings')}
                >
                  <Text style={styles.profileCircleText}>C</Text>
                </TouchableOpacity>
              </View>

              <Card style={styles.caregiverWelcome}>
                <Text style={styles.welcomeTitle}>Your care companion</Text>
                <Text style={styles.welcomeSubtitle}>
                  Organize everyday support with a little more peace of mind.
                </Text>
                <Button
                  title="Open AI Care Assistant"
                  onPress={() => setScreen('caregiverAI')}
                />
              </Card>

              <SectionTitle title="AI Care Assistant" />

              <View style={styles.actionGrid}>
                <Card
                  style={styles.actionCard}
                  onPress={() => setScreen('prescription')}
                >
                  <Text style={styles.actionIcon}>▤</Text>
                  <Text style={styles.cardTitle}>Upload Prescription</Text>
                  <Text style={styles.cardSubtitle}>Review medicine details</Text>
                </Card>

                <Card
                  style={styles.actionCard}
                  onPress={() => setScreen('reminders')}
                >
                  <Text style={styles.actionIcon}>◷</Text>
                  <Text style={styles.cardTitle}>Manage Reminders</Text>
                  <Text style={styles.cardSubtitle}>Plan daily support</Text>
                </Card>

                <Card
                  style={styles.actionCard}
                  onPress={() => setScreen('documents')}
                >
                  <Text style={styles.actionIcon}>▧</Text>
                  <Text style={styles.cardTitle}>Health Documents</Text>
                  <Text style={styles.cardSubtitle}>View saved documents</Text>
                </Card>

                <Card
                  style={styles.actionCard}
                  onPress={() =>
                    Alert.alert(
                      'Care notes',
                      'Care notes and secure storage will be connected in the backend stage.',
                    )
                  }
                >
                  <Text style={styles.actionIcon}>✎</Text>
                  <Text style={styles.cardTitle}>Care Notes</Text>
                  <Text style={styles.cardSubtitle}>Record observations</Text>
                </Card>
              </View>

              <SectionTitle title="People you support" />

              <Card
                style={styles.personCard}
                onPress={() => setScreen('personDetails')}
              >
                <View style={styles.personAvatar}>
                  <Text style={styles.personAvatarText}>♡</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>My loved one</Text>
                  <Text style={styles.cardSubtitle}>
                    {connectionRequestStatus === 'Accepted' && connected ? 'Connected with approval' : connectionRequestStatus === 'Pending' ? 'Request awaiting user approval' : 'Manage support and permissions'}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Card>

              <Button
                title="Connect with a loved one"
                secondary
                onPress={() => setScreen('connect')}
              />

              <SectionTitle
                title="Daily progress"
                action="View routine"
                onAction={() => setScreen('routine')}
              />
              <View style={styles.tabRow}>
                {(['Daily', 'Weekly', 'Monthly'] as const).map((period) => (
                  <TouchableOpacity key={period} style={[styles.tab, activityPeriod === period && styles.activeTab]} onPress={() => setActivityPeriod(period)}>
                    <Text style={[styles.tabText, activityPeriod === period && styles.activeTabText]}>{period}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Card>
                <Text style={styles.cardTitle}>{activityPeriod === 'Daily' ? "Today's activities" : activityPeriod === 'Weekly' ? "This week's activities" : "This month's activities"}</Text>
                <Text style={styles.progressNumber}>
                  {Math.min(completedRoutine.length, activityPeriod === 'Daily' ? 2 : activityPeriod === 'Weekly' ? 4 : activities.length)} of {activityPeriod === 'Daily' ? Math.min(2, activities.length) : activityPeriod === 'Weekly' ? activities.length : activities.length}
                </Text>
                <Text style={styles.cardSubtitle}>
                  Activities marked complete in this demo.
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, activities.length ? (completedRoutine.length / activities.length) * 100 : 0)}%`,
                      },
                    ]}
                  />
                </View>
              </Card>
            </ScrollView>

            <BottomNav active="Home" />
          </View>
        );

      // 7. PATIENT AI ASSISTANT
      case 'patientAI':
        return (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          >
            <View style={styles.flex}>
              <Header title="Ask Cogniva" subtitle="Your gentle everyday companion" />

              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.assistantPage}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              >
                <View style={styles.assistantWelcome}>
                  <View style={styles.assistantAvatar}>
                    <Text style={styles.assistantAvatarText}>✧</Text>
                  </View>
                  <Text style={styles.pageHeading}>How can I help you?</Text>
                  <Text style={styles.seniorSubtitle}>
                    You can ask me about your reminders or daily activities.
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.quickActionToggle}
                  onPress={() => setQuickActionsExpanded((expanded) => !expanded)}
                  accessibilityRole="button"
                  accessibilityLabel={quickActionsExpanded ? 'Collapse quick actions' : 'Show quick actions'}
                >
                  <Text style={styles.quickActionToggleText}>
                    {quickActionsExpanded ? 'Quick actions  ⌃' : 'Show quick actions  ⌄'}
                  </Text>
                </TouchableOpacity>

                {quickActionsExpanded && (
                  <View style={styles.seniorActionGrid}>
                    <TouchableOpacity style={styles.seniorActionCard} onPress={() => Alert.alert('Voice assistance', 'Voice input will be connected in a later stage.')}>
                      <Text style={styles.seniorActionIcon}>♬</Text>
                      <Text style={styles.seniorActionTitle}>Talk to me</Text>
                      <Text style={styles.seniorActionSubtitle}>Use your voice</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.seniorActionCard} onPress={() => Alert.alert('Upload document', 'File and image selection will be added in the integration stage.')}>
                      <Text style={styles.seniorActionIcon}>↑</Text>
                      <Text style={styles.seniorActionTitle}>Upload document</Text>
                      <Text style={styles.seniorActionSubtitle}>Choose a file</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.seniorActionCard} onPress={() => setScreen('reminders')}>
                      <Text style={styles.seniorActionIcon}>◷</Text>
                      <Text style={styles.seniorActionTitle}>My reminders</Text>
                      <Text style={styles.seniorActionSubtitle}>View your day</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.seniorActionCard} onPress={() => setScreen('album')}>
                      <Text style={styles.seniorActionIcon}>♡</Text>
                      <Text style={styles.seniorActionTitle}>My memories</Text>
                      <Text style={styles.seniorActionSubtitle}>Visit your album</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <SectionTitle title="Conversation" />
                <View style={styles.conversationCard}>
                  {assistantReplies.length === 0 ? (
                    <Text style={styles.seniorSubtitle}>Hello! I'm here to help. What would you like to do today?</Text>
                  ) : assistantReplies.map((reply, index) => (
                    <View key={index} style={[styles.chatBubble, reply.startsWith('You:') && styles.userChatBubble]}>
                      <Text style={styles.seniorChatText}>{reply}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.composer}>
                <TextInput
                  style={styles.composerInput}
                  placeholder="Type your message..."
                  placeholderTextColor={C.muted}
                  value={assistantMessage}
                  onChangeText={setAssistantMessage}
                  onSubmitEditing={sendAssistantMessage}
                  returnKeyType="send"
                  blurOnSubmit={false}
                  accessibilityLabel="Type your message"
                />
                <TouchableOpacity style={styles.sendButton} onPress={sendAssistantMessage} accessibilityRole="button" accessibilityLabel="Send message">
                  <Text style={styles.sendButtonText}>↑</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        );

      // 8. CAREGIVER AI ASSISTANT
      case 'caregiverAI':
        return (
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          <View style={styles.flex}>
            <Header
              title="AI Care Assistant"
              subtitle="Tools to support everyday care"
            />

            <ScrollView contentContainerStyle={styles.page}>
              <Card style={styles.aiBanner}>
                <Text style={styles.bigIcon}>✧</Text>
                <Text style={styles.cardTitle}>How can I support you?</Text>
                <Text style={styles.cardSubtitle}>
                  Organize information and daily support for your loved one.
                </Text>
              </Card>

              <SectionTitle title="Quick actions" />

              <Card
                style={styles.featureCard}
                onPress={() => setScreen('prescription')}
              >
                <View style={[styles.featureIcon, { backgroundColor: C.paleGreen }]}>
                  <Text style={styles.bigIcon}>▤</Text>
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.cardTitle}>Scan prescription</Text>
                  <Text style={styles.cardSubtitle}>
                    Review medicine information before creating reminders.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Card>

              <Card
                style={styles.featureCard}
                onPress={() =>
                  Alert.alert(
                    'Upload from gallery',
                    'Photo and gallery selection will be connected later.',
                  )
                }
              >
                <View style={[styles.featureIcon, { backgroundColor: C.blue }]}>
                  <Text style={styles.bigIcon}>▧</Text>
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.cardTitle}>Upload from gallery</Text>
                  <Text style={styles.cardSubtitle}>
                    Choose an existing image or document.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Card>

              <Card
                style={styles.featureCard}
                onPress={() =>
                  Alert.alert(
                    'Camera',
                    'Camera capture will be connected later.',
                  )
                }
              >
                <View style={[styles.featureIcon, { backgroundColor: C.warm }]}>
                  <Text style={styles.bigIcon}>◎</Text>
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.cardTitle}>Take a photo</Text>
                  <Text style={styles.cardSubtitle}>
                    Photograph a document for review.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Card>

              <Card
                style={styles.featureCard}
                onPress={() => setScreen('reminders')}
              >
                <View style={[styles.featureIcon, { backgroundColor: C.purple }]}>
                  <Text style={styles.bigIcon}>◷</Text>
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.cardTitle}>Manage reminders</Text>
                  <Text style={styles.cardSubtitle}>
                    Add and review daily reminders.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Card>

              <Card
                style={styles.featureCard}
                onPress={() => setScreen('documents')}
              >
                <View style={[styles.featureIcon, { backgroundColor: C.blue }]}>
                  <Text style={styles.bigIcon}>▧</Text>
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.cardTitle}>Health documents</Text>
                  <Text style={styles.cardSubtitle}>
                    Open the document collection.
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Card>

              <SectionTitle title="Ask Cogniva" />

              {assistantReplies.map((reply, index) => (
                <View key={index} style={styles.chatBubble}>
                  <Text style={styles.chatText}>{reply}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.composer}>
              <TextInput
                style={styles.composerInput}
                placeholder="Ask a care-related question..."
                placeholderTextColor={C.muted}
                value={assistantMessage}
                onChangeText={setAssistantMessage}
                onSubmitEditing={sendAssistantMessage}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={styles.sendButton}
                onPress={sendAssistantMessage}
              >
                <Text style={styles.sendButtonText}>↑</Text>
              </TouchableOpacity>
            </View>
          </View>
          </KeyboardAvoidingView>
        );

      // 9. PRESCRIPTION DETAILS
      case 'prescription':
        return (
          <ScrollView contentContainerStyle={styles.page}>
            <Header
              title="Prescription Details"
              subtitle="Review the extracted information"
            />

            <Card style={styles.documentPreview}>
              <Text style={styles.documentIcon}>▤</Text>
              <Text style={styles.cardTitle}>Prescription document</Text>
              <Text style={styles.cardSubtitle}>
                Demo information for layout preview only
              </Text>
            </Card>

            <View style={styles.warningCard}>
              <Text style={styles.warningTitle}>Please review carefully</Text>
              <Text style={styles.cardSubtitle}>
                The medicine details below are examples only. They are not
                extracted from a real prescription and must not be used for
                medical decisions.
              </Text>
            </View>

            <SectionTitle title="Extracted information" />

            {[
              { id: 1, medicine: 'Paracetamol 500 mg', time: '8:00 AM' },
              { id: 2, medicine: 'Vitamin D3', time: '10:00 AM' },
              { id: 3, medicine: 'Calcium', time: '9:00 PM' },
            ].map((medicine) => {
              const selected = selectedMedicines.includes(medicine.id);

              return (
                <TouchableOpacity
                  key={medicine.id}
                  style={[
                    styles.medicineCard,
                    selected && styles.selectedCard,
                  ]}
                  onPress={() =>
                    setSelectedMedicines((previous) =>
                      selected
                        ? previous.filter((id) => id !== medicine.id)
                        : [...previous, medicine.id],
                    )
                  }
                >
                  <View style={styles.medicineCheck}>
                    <Text style={styles.medicineCheckText}>
                      {selected ? '✓' : ''}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{medicine.medicine}</Text>
                    <Text style={styles.cardSubtitle}>
                      Example time: {medicine.time}
                    </Text>
                  </View>

                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.helperText}>
              Select the entries you want to review. Confirm all medicine
              names, dosages and instructions with the original prescription
              or a qualified healthcare professional.
            </Text>

            <Button
              title="Confirm selected entries"
              onPress={() =>
                Alert.alert(
                  'Review required',
                  'These are sample entries, not verified prescription data. The real prescription-reading feature must be connected and the extracted details verified before reminders are created.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Continue demo',
                      onPress: () => {
                        setPrescriptionConfirmed(true);
                        setScreen('reminders');
                      },
                    },
                  ],
                )
              }
            />

            {prescriptionConfirmed && (
              <Text style={styles.helperText}>Demo confirmation completed.</Text>
            )}
          </ScrollView>
        );

      // 10. MEMORY ALBUM
      case 'album':
        return (
          <View style={styles.flex}>
            <ScrollView contentContainerStyle={styles.page}>
              <Header
                title="Memory Album"
                subtitle="Keep your favorite memories close, always."
              />

              <View style={styles.tabRow}>
                {['Photos', 'Places', 'Memories'].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[
                      styles.tab,
                      albumTab === tab && styles.activeTab,
                    ]}
                    onPress={() => setAlbumTab(tab)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        albumTab === tab && styles.activeTabText,
                      ]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Card style={styles.albumIntro}>
                <Text style={styles.albumEmoji}>♡</Text>
                <Text style={styles.cardTitle}>A little collection of love</Text>
                <Text style={styles.cardSubtitle}>
                  Familiar faces and meaningful moments can help start a
                  conversation.
                </Text>
              </Card>

              <View style={styles.photoGrid}>
                {albumItems.filter((item) => item.tab === albumTab).map((item, index) => (
                  <TouchableOpacity key={item.id} style={[styles.photoCard, { backgroundColor: [C.warm, C.paleGreen, C.blue, C.purple][index % 4] }]} onPress={() => Alert.alert(item.title, item.detail)}>
                    <Text style={styles.photoEmoji}>{item.emoji}</Text>
                    <Text style={styles.photoLabel}>{item.title}</Text>
                    <Text style={styles.cardSubtitle}>{item.detail}</Text>
                  </TouchableOpacity>
                ))}
                {albumItems.filter((item) => item.tab === albumTab).length === 0 && <View style={styles.emptyState}><Text style={styles.emptyEmoji}>♡</Text><Text style={styles.cardTitle}>No {albumTab.toLowerCase()} yet</Text><Text style={styles.cardSubtitle}>Add a meaningful item to begin your collection.</Text></View>}
              </View>

              <Button
                title={`+ Add ${albumTab === 'Photos' ? 'Photo' : albumTab === 'Places' ? 'Place' : 'Memory'}`}
                onPress={() => Alert.alert(`Add ${albumTab === 'Photos' ? 'photo' : albumTab === 'Places' ? 'place' : 'memory'}`, 'Personal uploads and permanent storage will be connected in the backend stage. You can preview the sample entries in this frontend.')}
              />

              <Text style={styles.centerText}>
                Familiar memories, shared with care.
              </Text>
            </ScrollView>

            <BottomNav active="Memories" />
          </View>
        );

      // 11. MY ROUTINE
      case 'routine':
        return (
          <ScrollView contentContainerStyle={styles.page}>
            <Header
              title="My Routine"
              subtitle="A gentle guide for your day"
            />

            <View style={styles.dateCard}>
              <Text style={styles.dateLabel}>TODAY</Text>
              <Text style={styles.dateTitle}>
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </Text>
              <Text style={styles.cardSubtitle}>
                Every small step counts.
              </Text>
            </View>

            <View style={styles.tabRow}>
              {(['Today', 'This Week', 'All'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    routineFilter === tab && styles.activeTab,
                  ]}
                  onPress={() => setRoutineFilter(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      routineFilter === tab && styles.activeTabText,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <SectionTitle
              title={
                routineFilter === 'Today'
                  ? "Today's activities"
                  : routineFilter === 'This Week'
                    ? "This week's routine"
                    : 'All activities'
              }
            />

            <Card>
              {visibleActivities.map((activity) => (
                <View key={activity.id}>
                  {routineFilter === 'This Week' && <Text style={styles.dayHeading}>{activity.dayOffset === 0 ? 'Today' : activity.dayOffset === 1 ? 'Tomorrow' : 'Later this week'}</Text>}
                  <RoutineRow item={activity} />
                </View>
              ))}
              {visibleActivities.length === 0 && <Text style={styles.cardSubtitle}>No activities scheduled for this period.</Text>}
            </Card>

            <View style={styles.progressCard}>
              <Text style={styles.cardTitle}>Your progress</Text>
              <Text style={styles.progressNumber}>
                {completedVisible} of {visibleActivities.length} completed
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${
                        visibleActivities.length
                          ? (completedVisible / visibleActivities.length) * 100
                          : 0
                      }%`,
                    },
                  ]}
                />
              </View>
            </View>

            {showAddActivity && (
              <Card>
                <Text style={styles.cardTitle}>New activity</Text>
                {Field({ label: 'Activity name', placeholder: 'e.g. Evening walk', value: newActivityName, onChangeText: setNewActivityName })}
                {Field({ label: 'Time', placeholder: 'e.g. 6:00 PM', value: newActivityTime, onChangeText: setNewActivityTime })}
                <Button title="Save activity" onPress={addActivity} />
                <Button
                  title="Cancel"
                  secondary
                  onPress={() => setShowAddActivity(false)}
                />
              </Card>
            )}

            <Button
              title="+  Add Activity"
              onPress={() => setShowAddActivity(true)}
            />
          </ScrollView>
        );

      // 12. REMINDERS
      case 'reminders':
        return (
          <ScrollView contentContainerStyle={styles.page}>
            <Header
              title="Reminders"
              subtitle="Helpful prompts for everyday life"
            />

            <View style={styles.tabRow}>
              {(['Upcoming', 'Completed', 'Missed'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    reminderFilter === tab && styles.activeTab,
                  ]}
                  onPress={() => setReminderFilter(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      reminderFilter === tab && styles.activeTabText,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Card style={styles.reminderSummary}>
              <Text style={styles.cardTitle}>Your reminders, in one place</Text>
              <Text style={styles.cardSubtitle}>
                Mark a reminder complete when the task is done. A reminder
                alone does not confirm that a medicine was taken.
              </Text>
            </Card>

            {reminders
              .filter((item) => item.status === reminderFilter)
              .map((item) => (
                <ReminderRow key={item.id} item={item} />
              ))}

            {reminders.filter((item) => item.status === reminderFilter).length ===
              0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🌿</Text>
                <Text style={styles.cardTitle}>Nothing here yet</Text>
                <Text style={styles.cardSubtitle}>
                  Your {reminderFilter.toLowerCase()} reminders will appear here.
                </Text>
              </View>
            )}

            {showAddReminder && (
              <Card>
                <Text style={styles.cardTitle}>Create reminder</Text>
                <Text style={{ marginBottom: 8, fontWeight: '600' }}>
  Reminder category
</Text>

<View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
  {(['Medicine', 'Appointment', 'Task'] as const).map((category) => (
    <TouchableOpacity
      key={category}
      onPress={() => setNewReminderCategory(category)}
      style={{
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor:
          newReminderCategory === category ? '#2563EB' : '#E5E7EB',
      }}
    >
      <Text
        style={{
          color: newReminderCategory === category ? '#FFFFFF' : '#374151',
          fontWeight: '600',
          fontSize: 12,
        }}
      >
        {category}
      </Text>
    </TouchableOpacity>
  ))}
</View>
                {Field({ label: 'Reminder name', placeholder: 'e.g. Call the clinic', value: newReminderName, onChangeText: setNewReminderName })}
                {Field({ label: 'Time', placeholder: 'e.g. 2:00 PM', value: newReminderTime, onChangeText: setNewReminderTime })}
                <Button title="Save reminder" onPress={addReminder} />
                <Button
                  title="Cancel"
                  secondary
                  onPress={() => setShowAddReminder(false)}
                />
              </Card>
            )}

            <Button
  title="+  Add Reminder"
  onPress={async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setShowAddReminder(true);
    }
  }}
/>

            {reminders.some((item) => item.status === 'Upcoming') && (
              <Button
                title="View health documents"
                secondary
                onPress={() => setScreen('documents')}
              />
            )}
          </ScrollView>
        );

      // 13. HEALTH DOCUMENTS
      case 'documents':
        return (
          <ScrollView contentContainerStyle={styles.page}>
            <Header
              title="Health Documents"
              subtitle="Keep important documents organized"
            />

            <View style={styles.tabRow}>
              {['All', 'Prescriptions', 'Reports'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    documentTab === tab && styles.activeTab,
                  ]}
                  onPress={() => setDocumentTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      documentTab === tab && styles.activeTabText,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Card style={styles.documentsBanner}>
              <Text style={styles.bigIcon}>▤</Text>
              <Text style={styles.cardTitle}>Your documents, organized</Text>
              <Text style={styles.cardSubtitle}>
                Sample filenames are shown for the frontend preview. They do
                not represent uploaded medical records.
              </Text>
            </Card>

            {documentNames
              .filter((documentName) => {
                if (documentTab === 'Prescriptions') {
                  return documentName.toLowerCase().includes('prescription');
                }

                if (documentTab === 'Reports') {
                  return (
                    documentName.toLowerCase().includes('report') ||
                    documentName.toLowerCase().includes('scan')
                  );
                }

                return true;
              })
              .map((documentName, index) => (
                <Card key={`${documentName}-${index}`} style={styles.documentRow}>
                  <View style={styles.documentFileIcon}>
                    <Text style={styles.documentFileIconText}>PDF</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{documentName}</Text>
                    <Text style={styles.cardSubtitle}>Demo file · Not uploaded</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert(
                        'Document preview',
                        'Real document viewing will be connected after secure file storage is implemented.',
                      )
                    }
                  >
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                </Card>
              ))}

            <Button title="↑  Upload Document" onPress={addDemoDocument} />

            <Text style={styles.helperText}>
              Medical documents are sensitive. Real uploads must use secure
              storage and access permissions.
            </Text>
          </ScrollView>
        );

      // 14. SETTINGS
      case 'settings':
        return (
          <ScrollView contentContainerStyle={styles.page}>
            <Header title="Settings" subtitle="Make Cogniva feel right for you" />

            <View style={styles.profileSummary}>
              <View style={styles.profileCircleLarge}>
                <Text style={styles.profileCircleLargeText}>
                  {(name || 'M').charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.profileName}>{name || 'Cogniva User'}</Text>
              <Text style={styles.cardSubtitle}>{email || 'No email entered'}</Text>
              <Text style={styles.roleBadge}>
                {role === 'patient' ? 'Person receiving support' : 'Caregiver'}
              </Text>
            </View>

            <SectionTitle title="Account & preferences" />

            {[
              {
                icon: '○',
                title: 'Account & Profile',
                subtitle: 'Manage your personal information',
                action: () =>
                  Alert.alert(
                    'Account & Profile',
                    'Profile editing will be connected to your account.',
                  ),
              },
              {
                icon: '♧',
                title: 'Notifications',
                subtitle: 'Manage reminder notifications',
                action: () =>
                  Alert.alert(
                    'Notifications',
                    'Notification scheduling will be configured later.',
                  ),
              },
              {
                icon: '🌐',
                title: tr.settings,
                subtitle: `${tr.languageSubtitle} · ${language}`,
                action: () => setScreen('language'),
              },
              {
                icon: '🔒',
                title: 'Privacy & Security',
                subtitle: 'Control your information and access',
                action: () =>
                  Alert.alert(
                    'Privacy & Security',
                    'Real account security and permissions will be configured with the backend.',
                  ),
              },
              {
                icon: '♡',
                title: 'Connected Caregivers',
                subtitle: 'Manage your trusted connections',
                action: () => setScreen('connect'),
              },
              {
                icon: '?',
                title: 'Help & Support',
                subtitle: 'Get help using Cogniva',
                action: () =>
                  Alert.alert(
                    'Help & Support',
                    'Support information will be added to the completed app.',
                  ),
              },
              {
                icon: '▤',
                title: 'Health Documents',
                subtitle: 'View your document collection',
                action: () => setScreen('documents'),
              },
            ].map((item) => (
              <Card
                key={item.title}
                style={styles.settingsRow}
                onPress={item.action}
              >
                <View style={styles.settingsIcon}>
                  <Text style={styles.settingsIconText}>{item.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Card>
            ))}

            {role === 'caregiver' && caregiverAlerts.length > 0 && <Card><Text style={styles.cardTitle}>Missed reminder alerts</Text>{caregiverAlerts.map((alert, index) => <Text key={`${alert}-${index}`} style={styles.cardSubtitle}>⚠ {alert}</Text>)}</Card>}
            <Button title="Log Out" secondary onPress={logout} />

            <Text style={styles.centerText}>
              Cogniva · Simple, Supportive, Personalized
            </Text>
          </ScrollView>
        );

      // LANGUAGE SETTINGS
      case 'language':
        return (
          <ScrollView contentContainerStyle={styles.page}>
            <Header title={tr.choose} subtitle={tr.languageSubtitle} />
            {(['English', 'Kannada', 'Hindi'] as const).map((item) => (
              <TouchableOpacity key={item} style={[styles.permissionRow, language === item && styles.selectedCard]} onPress={() => setLanguage(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item === 'Kannada' ? 'ಕನ್ನಡ (Kannada)' : item === 'Hindi' ? 'हिन्दी (Hindi)' : 'English'}</Text>
                </View>
                <Text style={styles.cardTitle}>{language === item ? '●' : '○'}</Text>
              </TouchableOpacity>
            ))}
            <Button title={tr.save} onPress={() => { Alert.alert('Language saved', `Cogniva language preference set to ${language}. The selector is ready; complete app-wide translation is being added in stages.`); setScreen('settings'); }} />
          </ScrollView>
        );

      // COGNITIVE GAMES
      case 'games':
        return (
          <ScrollView contentContainerStyle={styles.page}>
            <Header title="Cognitive Activities" subtitle="Gentle games to enjoy at your own pace" />
            {[
              { title: 'Memory Match', desc: 'Find matching pairs of symbols.', emoji: '🃏' },
              { title: 'Picture Recall', desc: 'Look at pictures and remember what you saw.', emoji: '🖼️' },
              { title: 'Number Sequence', desc: 'Choose the next number in a simple sequence.', emoji: '🔢' },
              { title: 'Everyday Object Matching', desc: 'Match familiar objects with their use.', emoji: '☕' },
              { title: 'Daily Routine Ordering', desc: 'Put everyday activities in a sensible order.', emoji: '☀️' },
              { title: 'Personal Memory Quiz', desc: 'Talk about familiar people and moments.', emoji: '💚' },
            ].map((game) => <Card key={game.title} style={styles.featureCard} onPress={() => { setSelectedGame(game.title); setGameRound(0); setGameFeedback(''); setScreen('gamePlay'); }}><Text style={styles.bigIcon}>{game.emoji}</Text><View style={styles.featureContent}><Text style={styles.cardTitle}>{game.title}</Text><Text style={styles.cardSubtitle}>{game.desc}</Text></View><Text style={styles.chevron}>›</Text></Card>)}
          </ScrollView>
        );

      case 'gamePlay':
        return (
          <ScrollView contentContainerStyle={styles.page}>
            <Header title={selectedGame} subtitle="There is no pressure—take your time." />
            <Card style={styles.gamePromptCard}>
              <Text style={styles.pageHeading}>{selectedGame === 'Memory Match' ? 'Which symbols match?' : selectedGame === 'Picture Recall' ? 'Remember these items' : selectedGame === 'Number Sequence' ? 'What comes next?' : selectedGame === 'Everyday Object Matching' ? 'Which object is used for drinking?' : selectedGame === 'Daily Routine Ordering' ? 'What usually comes first in the morning?' : 'Choose a warm memory prompt'}</Text>
              <Text style={styles.gamePrompt}>{selectedGame === 'Memory Match' ? '🌷   🌳   🌷' : selectedGame === 'Picture Recall' ? '🍎   🏡   🌻' : selectedGame === 'Number Sequence' ? '2   4   6   ?' : selectedGame === 'Everyday Object Matching' ? '☕   👟   🪥' : selectedGame === 'Daily Routine Ordering' ? 'Have breakfast · Wake up · Go to bed' : 'A favorite family celebration'}</Text>
              {(selectedGame === 'Memory Match' ? ['🌷', '🌳', '🌷'] : selectedGame === 'Picture Recall' ? ['Apple', 'House', 'Flower'] : selectedGame === 'Number Sequence' ? ['7', '8', '10', '12'] : selectedGame === 'Everyday Object Matching' ? ['Cup', 'Shoe', 'Toothbrush'] : selectedGame === 'Daily Routine Ordering' ? ['Wake up', 'Have breakfast', 'Go to bed'] : ['Family', 'Favorite food', 'Favorite place']).map((choice, index) => <TouchableOpacity key={`${choice}-${index}`} style={styles.gameChoice} onPress={() => { setGameRound(gameRound + 1); setGameFeedback('Well done for trying! Take your time and keep going.'); }}><Text style={styles.cardTitle}>{choice}</Text></TouchableOpacity>)}
              {!!gameFeedback && <Text style={styles.gameFeedback}>{gameFeedback}</Text>}
              <Button title="Try another round" onPress={() => { setGameRound(gameRound + 1); setGameFeedback('You are doing great. Every attempt is valuable.'); }} secondary />
            </Card>
            <Text style={styles.helperText}>These are supportive demo activities, not a medical assessment or diagnostic test.</Text>
          </ScrollView>
        );

      // 15. CONNECT A CAREGIVER
      case 'connect':
        return (
          <ScrollView contentContainerStyle={styles.page}>
            <Header
              title="Connect a Caregiver"
              subtitle="Build a circle of trusted support"
            />

            <View style={styles.connectionIllustration}>
              <View style={styles.connectionCircle}>
                <Text style={styles.connectionEmoji}>♡</Text>
              </View>
              <Text style={styles.connectionArrow}>↔</Text>
              <View
                style={[
                  styles.connectionCircle,
                  { backgroundColor: C.purple },
                ]}
              >
                <Text style={styles.connectionEmoji}>♧</Text>
              </View>
            </View>

            <Text style={styles.pageHeading}>Care is better together.</Text>
            <Text style={styles.pageSubtitle}>
              Connect with a trusted person to coordinate reminders and daily
              support. Connections should only be activated with appropriate
              consent and approval.
            </Text>

            <Card>
              <Text style={styles.cardTitle}>Invite a trusted person</Text>
              {Field({ label: 'Caregiver email address', placeholder: 'caregiver@example.com', value: personEmail, onChangeText: setPersonEmail, keyboardType: 'email-address' })}
              <Button
                title="Send invitation"
                onPress={() => {
                  if (!personEmail.trim() || !personEmail.includes('@')) {
                    Alert.alert(
                      'Check email',
                      'Please enter a valid email address.',
                    );
                    return;
                  }

                  setConnected(false);
                  setConnectionRequestStatus('Pending');
                  Alert.alert(
                    'Request sent in demo',
                    'The request is pending. The accounts are not connected unless the recipient explicitly accepts. Real cross-device notifications require backend integration.',
                  );
                }}
              />
            </Card>

            <Card>
              <Text style={styles.cardTitle}>Connection status</Text>
              <Text style={styles.cardSubtitle}>
                {connectionRequestStatus === 'Pending'
                  ? `Request sent to ${personEmail}. Waiting for the user's approval; accounts remain unconnected.`
                  : connectionRequestStatus === 'Accepted'
                    ? `The request for ${personEmail} was accepted in this local demo.`
                    : connectionRequestStatus === 'Declined'
                      ? `The request for ${personEmail} was declined. Accounts remain unconnected.`
                      : 'No connection request has been created in this demo.'}
              </Text>
            </Card>

            {connectionRequestStatus === 'Pending' && (
              <Card>
                <Text style={styles.cardTitle}>Demo request approval</Text>
                <Text style={styles.cardSubtitle}>For testing this screen, choose how the recipient would respond. This does not send a real notification or securely connect accounts.</Text>
                <Button title="Accept request (demo)" onPress={() => { setConnectionRequestStatus('Accepted'); setConnected(true); Alert.alert('Request accepted', 'Accepted in this local demo only. Backend approval and access rules are still required.'); }} />
                <View style={{ height: 8 }} />
                <Button title="Decline request" secondary onPress={() => { setConnectionRequestStatus('Declined'); setConnected(false); }} />
              </Card>
            )}

            <View style={styles.privacyCard}>
              <Text style={styles.cardTitle}>Your choice matters</Text>
              <Text style={styles.cardSubtitle}>
                A real invitation system must verify the recipient, obtain
                consent and allow access to be revoked.
              </Text>
            </View>

            <Button
              title="Manage connected person"
              secondary
              onPress={() => setScreen('personDetails')}
            />
          </ScrollView>
        );

      // 16. CONNECTED PERSON DETAILS
      case 'personDetails':
        return (
          <ScrollView contentContainerStyle={styles.page}>
            <Header
              title="Connected Person"
              subtitle="Review access and permissions"
            />

            <View style={styles.profileSummary}>
              <View style={styles.profileCircleLarge}>
                <Text style={styles.profileCircleLargeText}>♡</Text>
              </View>
              <Text style={styles.profileName}>My Loved One</Text>
              <Text style={styles.cardSubtitle}>
                {connected ? personEmail : 'Demo connection'}
              </Text>
              <Text style={styles.roleBadge}>
                {connected ? 'Invitation prepared' : 'Sample profile'}
              </Text>
            </View>

            <SectionTitle title="Access permissions" />

            <Text style={styles.pageSubtitle}>
              Choose which information would be shared in this demo. Real
              access controls will require authenticated accounts and consent.
            </Text>

            {[
              'Reminders and tasks',
              'Prescriptions',
              'Health documents',
              'Daily progress',
            ].map((permission) => {
              const enabled = selectedPermissions.includes(permission);

              return (
                <TouchableOpacity
                  key={permission}
                  style={styles.permissionRow}
                  onPress={() => togglePermission(permission)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{permission}</Text>
                    <Text style={styles.cardSubtitle}>
                      {enabled ? 'Selected for demo access' : 'Not selected'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.toggle,
                      enabled && styles.toggleOn,
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleKnob,
                        enabled && styles.toggleKnobOn,
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}

            <Button
              title="Save demo permissions"
              onPress={() =>
                Alert.alert(
                  'Preferences saved',
                  'Your selections are saved locally for this session only.',
                )
              }
            />

            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={() =>
                Alert.alert(
                  'Disconnect person',
                  'Would you like to clear the demo connection request?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Disconnect',
                      style: 'destructive',
                      onPress: () => {
                        setConnected(false);
                        setPersonEmail('');
                        setScreen('settings');
                      },
                    },
                  ],
                )
              }
            >
              <Text style={styles.disconnectText}>Disconnect person</Text>
            </TouchableOpacity>
          </ScrollView>
        );

      default:
        return (
          <View style={styles.emptyState}>
            <Text style={styles.pageHeading}>Welcome to Cogniva</Text>
            <Button
              title="Return home"
              onPress={() => setScreen('splash')}
            />
          </View>
        );
    }
  };

  const swipeBackResponder = PanResponder.create({
  onStartShouldSetPanResponder: () => false,
  onMoveShouldSetPanResponder: () => false,
});

  return (
    <View style={styles.app} {...swipeBackResponder.panHandlers}>
      <StatusBar barStyle="dark-content" backgroundColor={C.background} />
      {ScreenContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: C.background,
  },
  flex: {
    flex: 1,
  },
  page: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 36,
  },
  dashboardPage: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },

  // Splash
  splash: {
    flex: 1,
    backgroundColor: C.background,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 25,
    paddingTop: 42,
    overflow: 'hidden',
  },
  botanicalLeft: {
    position: 'absolute',
    left: -18,
    top: 50,
    transform: [{ rotate: '-25deg' }],
  },
  botanicalRight: {
    position: 'absolute',
    right: -25,
    top: 190,
    transform: [{ rotate: '25deg' }],
  },
  botanicalText: {
    fontSize: 100,
    color: '#C3D8C7',
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: C.paleGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  logoIcon: {
    fontSize: 48,
    color: C.green,
    lineHeight: 57,
  },
  logoLeaf: {
    position: 'absolute',
    right: 11,
    top: 2,
    fontSize: 26,
    color: C.green,
  },
  brandName: {
    color: C.deep,
    fontSize: 36,
    fontWeight: '700',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    color: C.muted,
    marginTop: 7,
  },
  illustrationCircle: {
    marginTop: 24,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: '#E7EFE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brainIllustration: {
    fontSize: 82,
  },
  heartBadge: {
    position: 'absolute',
    right: 25,
    bottom: 32,
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: C.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartBadgeText: {
    fontSize: 30,
    color: C.green,
  },
  leafDecoration: {
    position: 'absolute',
    left: 13,
    bottom: 16,
    fontSize: 32,
  },
  splashMemoryTitle: { marginTop: 9, fontSize: 19, fontWeight: '700', color: C.deep, textAlign: 'center' },
  splashMemorySubtitle: { marginTop: 5, marginBottom: 5, fontSize: 13, lineHeight: 19, color: C.muted, textAlign: 'center', maxWidth: 300 },
  splashTagline: {
    marginTop: 20,
    color: C.green,
    fontSize: 13,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#CAD8CE',
  },
  dotActive: {
    width: 22,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  splashActions: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: 25,
    gap: 8,
  },

  // Header and typography
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    minHeight: 56,
  },
  backButton: {
    width: 52,
    height: 52,
    minWidth: 52,
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: C.deep,
    fontSize: 38,
    lineHeight: 42,
    marginTop: -3,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: C.deep,
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: C.muted,
    fontSize: 12,
    marginTop: 3,
  },
  pageHeading: {
    fontSize: 27,
    fontWeight: '700',
    color: C.deep,
    lineHeight: 34,
    marginBottom: 7,
  },
  pageSubtitle: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 23,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.deep,
  },
  sectionAction: {
    color: C.green,
    fontWeight: '600',
    fontSize: 13,
  },

  // Cards and buttons
  card: {
    backgroundColor: C.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 12,
  },
  button: {
    width: '100%',
    minHeight: 51,
    borderRadius: 14,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginTop: 9,
  },
  buttonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.green,
  },
  secondaryButtonText: {
    color: C.green,
  },
  smallButton: {
    backgroundColor: C.paleGreen,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  smallButtonText: {
    color: C.green,
    fontWeight: '600',
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.deep,
    lineHeight: 21,
  },
  cardSubtitle: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  helperText: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 9,
    marginBottom: 12,
  },
  centerText: {
    textAlign: 'center',
    color: C.muted,
    fontSize: 13,
    marginTop: 23,
    lineHeight: 21,
  },
  bottomLink: {
    textAlign: 'center',
    fontSize: 13,
    color: C.muted,
    paddingVertical: 8,
  },
  link: {
    color: C.green,
    fontWeight: '700',
  },

  // Form fields
  authLogo: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 25,
  },
  miniLogo: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: C.paleGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLogoText: {
    fontSize: 34,
    color: C.green,
  },
  brandNameSmall: {
    fontSize: 21,
    fontWeight: '700',
    color: C.deep,
    marginTop: 7,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: C.deep,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    paddingHorizontal: 15,
    minHeight: 51,
    fontSize: 14,
    color: C.deep,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    backgroundColor: C.white,
    paddingHorizontal: 14,
    marginBottom: 9,
  },
  passwordInput: {
    flex: 1,
    minHeight: 50,
    color: C.deep,
    fontSize: 14,
  },
  showPassword: {
    color: C.green,
    fontSize: 12,
    fontWeight: '700',
    paddingLeft: 8,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    paddingVertical: 9,
    marginBottom: 10,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 23,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  orText: {
    color: C.muted,
    fontSize: 12,
    marginHorizontal: 12,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialButton: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialText: {
    fontSize: 13,
    color: C.deep,
    fontWeight: '600',
  },
  privacyNote: {
    textAlign: 'center',
    fontSize: 12,
    color: C.muted,
    marginTop: 28,
  },

  // Role selection
  roleCard: {
    padding: 19,
    marginBottom: 16,
  },
  selectedCard: {
    borderColor: C.green,
    borderWidth: 2,
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  bigIcon: {
    fontSize: 29,
    color: C.green,
  },
  roleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.deep,
  },
  radioText: {
    color: C.green,
    fontWeight: '600',
    fontSize: 12,
    marginTop: 14,
  },
  privacyCard: {
    backgroundColor: C.paleGreen,
    padding: 17,
    borderRadius: 16,
    marginVertical: 8,
  },

  // Dashboard
  dashboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 19,
  },
  greeting: {
    color: C.deep,
    fontSize: 23,
    fontWeight: '700',
    marginBottom: 4,
  },
  profileCircle: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: C.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCircleText: {
    color: C.green,
    fontWeight: '700',
    fontSize: 19,
  },
  welcomeCard: {
    backgroundColor: C.green,
    borderColor: C.green,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    minHeight: 170,
  },
  welcomeTitle: {
    color: C.white,
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 28,
  },
  welcomeSubtitle: {
    color: '#E5F1EC',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 10,
  },
  welcomeEmoji: {
    fontSize: 45,
    marginLeft: 7,
  },
  lightButton: {
    alignSelf: 'flex-start',
    backgroundColor: C.white,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 13,
    marginTop: 4,
  },
  lightButtonText: {
    color: C.green,
    fontWeight: '700',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 15,
    paddingVertical: 13,
    paddingHorizontal: 9,
    minHeight: 112,
  },
  statIcon: {
    color: C.green,
    fontSize: 22,
    marginBottom: 6,
  },
  statNumber: {
    color: C.deep,
    fontSize: 21,
    fontWeight: '700',
  },
  statLabel: {
    color: C.muted,
    fontSize: 11,
    marginTop: 3,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
  },
  featureIcon: {
    width: 51,
    height: 51,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  featureContent: {
    flex: 1,
  },
  chevron: {
    fontSize: 27,
    color: '#A1B0A9',
    marginLeft: 8,
  },
  cognitiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#F1ECFA',
  },
  cognitiveEmoji: {
    fontSize: 33,
  },
  caregiverWelcome: {
    backgroundColor: C.green,
    borderColor: C.green,
    padding: 20,
    marginBottom: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    minHeight: 150,
    padding: 14,
  },
  actionIcon: {
    fontSize: 29,
    color: C.green,
    marginBottom: 12,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personAvatar: {
    width: 47,
    height: 47,
    borderRadius: 24,
    backgroundColor: C.purple,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  personAvatarText: {
    fontSize: 29,
    color: C.green,
  },
  progressNumber: {
    color: C.green,
    fontSize: 24,
    fontWeight: '700',
    marginTop: 9,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E8EDE9',
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 12,
  },
  progressFill: {
    height: 8,
    borderRadius: 5,
    backgroundColor: C.green,
  },

  // Bottom navigation
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 23 : 11,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  navIcon: {
    fontSize: 22,
    color: C.muted,
  },
  navLabel: {
    color: C.muted,
    fontSize: 10,
    marginTop: 3,
  },
  navActive: {
    color: C.green,
    fontWeight: '700',
  },

  // AI assistant
  assistantWelcome: {
    alignItems: 'center',
    marginBottom: 14,
  },
  assistantPage: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  seniorSubtitle: {
    color: C.muted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: 6,
  },
  quickActionToggle: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    paddingHorizontal: 16,
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionToggleText: {
    color: C.green,
    fontSize: 16,
    fontWeight: '700',
  },
  seniorActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  seniorActionCard: {
    width: '48%',
    minHeight: 116,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 13,
    marginBottom: 10,
    justifyContent: 'center',
  },
  seniorActionIcon: {
    color: C.green,
    fontSize: 27,
    marginBottom: 5,
  },
  seniorActionTitle: {
    color: C.deep,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  seniorActionSubtitle: {
    color: C.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  conversationCard: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
  },
  userChatBubble: {
    backgroundColor: '#F3F0E7',
    alignSelf: 'flex-end',
  },
  seniorChatText: {
    color: C.deep,
    fontSize: 16,
    lineHeight: 24,
  },
  assistantAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.paleGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 17,
  },
  assistantAvatarText: {
    color: C.green,
    fontSize: 44,
  },
  aiBanner: {
    backgroundColor: C.paleGreen,
    alignItems: 'flex-start',
    padding: 20,
    marginBottom: 18,
  },
  chatBubble: {
    padding: 13,
    backgroundColor: C.paleGreen,
    borderRadius: 13,
    marginBottom: 9,
  },
  chatText: {
    fontSize: 13,
    color: C.deep,
    lineHeight: 20,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: C.white,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 9,
  },
  composerInput: {
    flex: 1,
    backgroundColor: C.background,
    borderRadius: 23,
    paddingHorizontal: 16,
    minHeight: 52,
    color: C.deep,
    fontSize: 16,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: C.white,
    fontSize: 27,
    fontWeight: '700',
  },

  // Prescription
  documentPreview: {
    alignItems: 'center',
    backgroundColor: C.paleGreen,
    padding: 23,
  },
  documentIcon: {
    color: C.green,
    fontSize: 44,
    marginBottom: 10,
  },
  warningCard: {
    backgroundColor: C.warm,
    padding: 16,
    borderRadius: 15,
    marginBottom: 17,
  },
  warningTitle: {
    color: '#7A5726',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: C.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 10,
  },
  medicineCheck: {
    width: 23,
    height: 23,
    borderWidth: 1,
    borderColor: C.green,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  medicineCheckText: {
    color: C.green,
    fontWeight: '700',
  },

  // Album
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#EDF0EB',
    borderRadius: 13,
    padding: 4,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  activeTab: {
    backgroundColor: C.green,
  },
  tabText: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '600',
  },
  activeTabText: {
    color: C.white,
  },
  albumIntro: {
    alignItems: 'center',
    backgroundColor: '#F0F4EC',
    padding: 20,
  },
  albumEmoji: {
    color: C.green,
    fontSize: 39,
    marginBottom: 8,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  photoCard: {
    width: '48%',
    height: 145,
    borderRadius: 17,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  photoEmoji: {
    fontSize: 46,
    marginBottom: 10,
  },
  photoLabel: {
    color: C.deep,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Routine and reminders
  dateCard: {
    backgroundColor: C.paleGreen,
    padding: 20,
    borderRadius: 17,
    marginBottom: 20,
  },
  dateLabel: {
    fontSize: 11,
    color: C.green,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  dateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.deep,
    marginVertical: 7,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF0ED',
  },
  routineCheck: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#B5C6BB',
    marginRight: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routineCheckDone: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  routineCheckText: {
    color: C.white,
    fontWeight: '700',
    fontSize: 12,
  },
  progressCard: {
    backgroundColor: C.paleGreen,
    padding: 17,
    borderRadius: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  reminderSummary: {
    backgroundColor: C.paleGreen,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
  },
  listIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: C.paleGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listIconText: {
    fontSize: 22,
    color: C.green,
  },
  listMain: {
    flex: 1,
  },
  statusText: {
    fontSize: 11,
    color: '#A57A36',
    fontWeight: '700',
    marginTop: 5,
  },
  checkButton: {
    width: 31,
    height: 31,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkButtonText: {
    color: C.green,
    fontSize: 18,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 35,
  },
  emptyEmoji: {
    fontSize: 38,
    marginBottom: 10,
  },

  // Documents
  documentsBanner: {
    backgroundColor: C.paleGreen,
    padding: 20,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  documentFileIcon: {
    width: 47,
    height: 52,
    borderRadius: 11,
    backgroundColor: C.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentFileIconText: {
    color: '#3C6495',
    fontWeight: '700',
    fontSize: 11,
  },

  // Settings
  profileSummary: {
    alignItems: 'center',
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 19,
    padding: 23,
    marginBottom: 8,
  },
  profileCircleLarge: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: C.mint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileCircleLargeText: {
    color: C.green,
    fontSize: 35,
    fontWeight: '700',
  },
  profileName: {
    color: C.deep,
    fontSize: 20,
    fontWeight: '700',
  },
  roleBadge: {
    backgroundColor: C.paleGreen,
    color: C.green,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    marginTop: 10,
  },
  dayHeading: { color: C.green, fontSize: 13, fontWeight: '700', marginTop: 10, marginBottom: 4 },
  gamePromptCard: { paddingVertical: 22 },
  gamePrompt: { textAlign: 'center', fontSize: 30, color: C.deep, marginVertical: 24 },
  gameChoice: { padding: 15, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, marginBottom: 10, alignItems: 'center' },
  gameFeedback: { color: C.green, fontSize: 15, fontWeight: '700', textAlign: 'center', marginVertical: 14 },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
  },
  settingsIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: C.paleGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingsIconText: {
    fontSize: 22,
    color: C.green,
  },

  // Connections
  connectionIllustration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    gap: 17,
  },
  connectionCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: C.paleGreen,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionEmoji: {
    fontSize: 40,
    color: C.green,
  },
  connectionArrow: {
    fontSize: 30,
    color: C.green,
  },
  permissionRow: {
    backgroundColor: C.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.border,
    padding: 15,
    marginBottom: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 15,
    backgroundColor: '#D8DFDA',
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: C.green,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.white,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  disconnectButton: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: '#F0C6C9',
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    minHeight: 49,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disconnectText: {
    color: C.red,
    fontWeight: '700',
    fontSize: 14,
  },
});