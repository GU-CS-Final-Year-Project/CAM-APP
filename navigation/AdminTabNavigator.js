import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';

import AdminDashboard from '../screens/admin/AdminDashboard';
import ManageClubs from '../screens/admin/ManageClubs';
import ManageActivities from '../screens/admin/ManageActivities';
import ManageAnnouncements from '../screens/admin/ManageAnnouncements';
import ManageClubCategories from '../screens/admin/ManageClubCategories';
import ManageClubMembers from '../screens/admin/ManageClubMembers';
import ManageUserProfiles from '../screens/admin/ManageUserProfiles';
import ManageSportsCategories from '../screens/admin/ManageSportsCategories';
import ManageSportsTeams from '../screens/admin/ManageSportsTeams';
import ManageMatches from '../screens/admin/ManageMatches';
import ManageActivityParticipants from '../screens/admin/ManageActivityParticipants';
import ManageMatchParticipants from '../screens/admin/ManageMatchParticipants';
import ManageTeamMembers from '../screens/admin/ManageTeamMembers';
import ManageTeachers from '../screens/admin/ManageTeachers';
import ManageStudents from '../screens/admin/ManageStudents';
import AdminClubDetail from '../screens/admin/AdminClubDetail';
import ManageRequests from '../screens/admin/ManageRequests';
import ManageLeftMembers from '../screens/admin/ManageLeftMembers';

const Tab = createBottomTabNavigator();
const DashStack = createStackNavigator();
const ActStack = createStackNavigator();

const Dash = (p) => <AdminDashboard {...p} />;
const Clubs = (p) => <ManageClubs {...p} />;
const Acts = (p) => <ManageActivities {...p} />;

const DashStackScreen = () => (
  <DashStack.Navigator screenOptions={{ headerShown: false }}>
    <DashStack.Screen name="AdminDashboard" component={Dash} />
    <DashStack.Screen name="AdminClubDetail" component={AdminClubDetail} />
    <DashStack.Screen name="ManageAnnouncements" component={ManageAnnouncements} />
    <DashStack.Screen name="ManageRequests" component={ManageRequests} />
    <DashStack.Screen name="ManageLeftMembers" component={ManageLeftMembers} />
    <DashStack.Screen name="ManageUserProfiles" component={ManageUserProfiles} />
    <DashStack.Screen name="ManageSportsCategories" component={ManageSportsCategories} />
    <DashStack.Screen name="ManageSportsTeams" component={ManageSportsTeams} />
    <DashStack.Screen name="ManageMatches" component={ManageMatches} />
    <DashStack.Screen name="ManageMatchParticipants" component={ManageMatchParticipants} />
    <DashStack.Screen name="ManageTeamMembers" component={ManageTeamMembers} />
    <DashStack.Screen name="ManageClubCategories" component={ManageClubCategories} />
    <DashStack.Screen name="ManageClubMembers" component={ManageClubMembers} />
    <DashStack.Screen name="ManageTeachers" component={ManageTeachers} />
    <DashStack.Screen name="ManageStudents" component={ManageStudents} />
  </DashStack.Navigator>
);

const ActStackScreen = () => (
  <ActStack.Navigator screenOptions={{ headerShown: false }}>
    <ActStack.Screen name="ManageActivities" component={Acts} />
    <ActStack.Screen name="ManageActivityParticipants" component={ManageActivityParticipants} />
  </ActStack.Navigator>
);

const AdminTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ color, size }) => {
        const icons = { DashTab: 'dashboard', ClubsTab: 'groups', ActsTab: 'event' };
        return <MaterialIcons name={icons[route.name]} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#2E7D32',
      tabBarInactiveTintColor: '#999',
      tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingBottom: 16, height: 70 },
      tabBarLabelStyle: { fontSize: 11, fontFamily: 'Roboto_500Medium' },
    })}
  >
    <Tab.Screen name="DashTab" component={DashStackScreen} options={{ tabBarLabel: 'Dashboard' }} />
    <Tab.Screen name="ClubsTab" component={Clubs} options={{ tabBarLabel: 'Clubs' }} />
    <Tab.Screen name="ActsTab" component={ActStackScreen} options={{ tabBarLabel: 'Activities' }} />
  </Tab.Navigator>
);

export default AdminTabNavigator;
