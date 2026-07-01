import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';

import StudentDashboard from '../screens/student/StudentDashboard';
import BrowseClubs from '../screens/student/BrowseClubs';
import StudentClubCategories from '../screens/student/StudentClubCategories';
import MyClubs from '../screens/student/MyClubs';
import StudentProfile from '../screens/student/StudentProfile';
import ClubActivities from '../screens/student/ClubActivities';
import ClubMembers from '../screens/student/ClubMembers';
import StudentAnnouncements from '../screens/student/StudentAnnouncements';
import SelectClub from '../screens/student/SelectClub';
import DashboardHub from '../screens/student/DashboardHub';
import BrowseClubsFull from '../screens/student/BrowseClubsFull';
import MyClubsFull from '../screens/student/MyClubsFull';
import ClubDetailScreen from '../screens/student/ClubDetailScreen';

const Tab = createBottomTabNavigator();
const DashStack = createStackNavigator();

const Dash = (p) => <StudentDashboard {...p} />;
const Browse = (p) => <BrowseClubs {...p} />;
const MyCl = (p) => <MyClubs {...p} />;
const Prof = (p) => <StudentProfile {...p} />;

const DashStackScreen = () => (
  <DashStack.Navigator screenOptions={{ headerShown: false }}>
    <DashStack.Screen name="StudentDashboard" component={Dash} />
    <DashStack.Screen name="StudentAnnouncements" component={StudentAnnouncements} />
    <DashStack.Screen name="DashboardHub" component={DashboardHub} />
    <DashStack.Screen name="ClubActivities" component={ClubActivities} />
    <DashStack.Screen name="ClubMembers" component={ClubMembers} />
    <DashStack.Screen name="BrowseClubsFull" component={BrowseClubsFull} />
    <DashStack.Screen name="MyClubsFull" component={MyClubsFull} />
    <DashStack.Screen name="StudentClubCategories" component={StudentClubCategories} />
    <DashStack.Screen name="SelectClub" component={SelectClub} />
    <DashStack.Screen name="ClubDetailScreen" component={ClubDetailScreen} />
  </DashStack.Navigator>
);

const StudentTabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ color, size }) => {
        const icons = { DashTab: 'dashboard', BrowseTab: 'search', MyClubsTab: 'groups', ProfileTab: 'person' };
        return <MaterialIcons name={icons[route.name]} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#2E7D32',
      tabBarInactiveTintColor: '#999',
      tabBarStyle: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingBottom: 16, height: 70 },
      tabBarLabelStyle: { fontSize: 11, fontFamily: 'Roboto_500Medium' },
    })}
  >
    <Tab.Screen name="DashTab" component={DashStackScreen} options={{ tabBarLabel: 'Dashboard' }} />
    <Tab.Screen name="BrowseTab" component={Browse} options={{ tabBarLabel: 'Browse' }} />
    <Tab.Screen name="MyClubsTab" component={MyCl} options={{ tabBarLabel: 'My Clubs' }} />
    <Tab.Screen name="ProfileTab" component={Prof} options={{ tabBarLabel: 'Profile' }} />
  </Tab.Navigator>
);

export default StudentTabNavigator;
