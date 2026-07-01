import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';

import ClubLeaderDashboard from '../screens/ClubLeader/ClubLeaderDashboard';
import ClubManagement from '../screens/ClubLeader/ClubManagement';
import ClubMemberships from '../screens/ClubLeader/ClubMemberships';
import ClubLeaderActivities from '../screens/ClubLeader/ClubLeaderActivities';
import ClubLeaderProfile from '../screens/ClubLeader/ClubLeaderProfile';
import ClubLeaderAnnouncements from '../screens/ClubLeader/ClubLeaderAnnouncements';
import PendingRequestsScreen from '../screens/ClubLeader/PendingRequestsScreen';
import ClubLeaderLeftMembers from '../screens/ClubLeader/ClubLeaderLeftMembers';
import ClubLeaderActivityParticipants from '../screens/ClubLeader/ClubLeaderActivityParticipants';
import ClubLeaderSportsTeams from '../screens/ClubLeader/ClubLeaderSportsTeams';
import ClubLeaderMatches from '../screens/ClubLeader/ClubLeaderMatches';
import SelectClubForMembers from '../screens/ClubLeader/SelectClubForMembers';
import StudentClubMemberships from '../screens/ClubLeader/StudentClubMemberships';
import StudentActivityHistory from '../screens/ClubLeader/StudentActivityHistory';
import StudentManagement from '../screens/ClubLeader/StudentManagement';

const Tab = createBottomTabNavigator();
const DashStack = createStackNavigator();
const ClubStack = createStackNavigator();
const ActStack = createStackNavigator();

const Dash = (p) => <ClubLeaderDashboard {...p} />;
const ClubM = (p) => <ClubManagement {...p} />;
const Acts = (p) => <ClubLeaderActivities {...p} />;
const Prof = (p) => <ClubLeaderProfile {...p} />;

const DashStackScreen = () => (
  <DashStack.Navigator screenOptions={{ headerShown: false }}>
    <DashStack.Screen name="ClubLeaderDashboard" component={Dash} />
    <DashStack.Screen name="ClubLeaderAnnouncements" component={ClubLeaderAnnouncements} />
    <DashStack.Screen name="ClubLeaderSportsTeams" component={ClubLeaderSportsTeams} />
    <DashStack.Screen name="ClubLeaderMatches" component={ClubLeaderMatches} />
    <DashStack.Screen name="SelectClubForMembers" component={SelectClubForMembers} />
    <DashStack.Screen name="StudentClubMemberships" component={StudentClubMemberships} />
    <DashStack.Screen name="StudentActivityHistory" component={StudentActivityHistory} />
    <DashStack.Screen name="StudentManagement" component={StudentManagement} />
    <DashStack.Screen name="ClubMemberships" component={ClubMemberships} />
    <DashStack.Screen name="PendingRequestsScreen" component={PendingRequestsScreen} />
    <DashStack.Screen name="ClubLeaderLeftMembers" component={ClubLeaderLeftMembers} />
  </DashStack.Navigator>
);

const ClubStackScreen = () => (
  <ClubStack.Navigator screenOptions={{ headerShown: false }}>
    <ClubStack.Screen name="ClubManagement" component={ClubM} />
    <ClubStack.Screen name="ClubMemberships" component={ClubMemberships} />
  </ClubStack.Navigator>
);

const ActStackScreen = () => (
  <ActStack.Navigator screenOptions={{ headerShown: false }}>
    <ActStack.Screen name="ClubLeaderActivities" component={Acts} />
    <ActStack.Screen name="ClubLeaderActivityParticipants" component={ClubLeaderActivityParticipants} />
  </ActStack.Navigator>
);

const ClubLeaderTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ color, size }) => {
        const icons = { DashTab: 'dashboard', ClubTab: 'groups', ActsTab: 'event', ProfileTab: 'person' };
        return <MaterialIcons name={icons[route.name]} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#2E7D32',
      tabBarInactiveTintColor: '#999',
      tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingBottom: 16, height: 70 },
      tabBarLabelStyle: { fontSize: 11, fontFamily: 'Roboto_500Medium' },
    })}
  >
    <Tab.Screen name="DashTab" component={DashStackScreen} options={{ tabBarLabel: 'Dashboard' }} />
    <Tab.Screen name="ClubTab" component={ClubStackScreen} options={{ tabBarLabel: 'Clubs' }} />
    <Tab.Screen name="ActsTab" component={ActStackScreen} options={{ tabBarLabel: 'Activities' }} />
    <Tab.Screen name="ProfileTab" component={Prof} options={{ tabBarLabel: 'Profile' }} />
  </Tab.Navigator>
);

export default ClubLeaderTabNavigator;
