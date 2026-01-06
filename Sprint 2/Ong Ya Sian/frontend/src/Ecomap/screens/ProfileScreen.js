import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ProfileScreen = () => {
  const user = {
    name: 'UTM Student',
    id: 'STU001',
    email: 'student@utm.my',
    points: 1250,
    level: 'Gold Recycler',
  };

  const menuItems = [
    { id: 1, icon: 'history', title: 'Report History', color: '#2196F3' },
    { id: 2, icon: 'trophy', title: 'Achievements', color: '#FF9800' },
    { id: 3, icon: 'cog', title: 'Settings', color: '#795548' },
    { id: 4, icon: 'help-circle', title: 'Help & Support', color: '#9C27B0' },
    { id: 5, icon: 'information', title: 'About EcoMap', color: '#4CAF50' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Icon name="account" size={60} color="#FFFFFF" />
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userId}>ID: {user.id}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
      </View>

      {/* Points Card */}
      <View style={styles.pointsCard}>
        <View style={styles.pointsInfo}>
          <Icon name="star" size={24} color="#FFD700" />
          <View style={styles.pointsTextContainer}>
            <Text style={styles.pointsLabel}>Recycling Points</Text>
            <Text style={styles.pointsValue}>{user.points.toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.levelBadge}>
          <Icon name="crown" size={16} color="#FFFFFF" />
          <Text style={styles.levelText}>{user.level}</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.id} style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
              <Icon name={item.icon} size={24} color="#FFFFFF" />
            </View>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Icon name="chevron-right" size={24} color="#CCCCCC" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Section */}
      <View style={styles.statsSection}>
        <Text style={styles.statsTitle}>Monthly Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Icon name="recycle" size={32} color="#4CAF50" />
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Items Recycled</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="map-marker" size={32} color="#2196F3" />
            <Text style={styles.statValue}>8</Text>
            <Text style={styles.statLabel}>Bins Used</Text>
          </View>
          <View style={styles.statCard}>
            <Icon name="alert-circle" size={32} color="#FF9800" />
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Issues Reported</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          EcoMap v1.0 • UTM Sustainability Initiative
        </Text>
        <Text style={styles.footerSubtext}>
          Helping UTM achieve zero-waste campus
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 32,
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userId: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  pointsCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pointsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsTextContainer: {
    marginLeft: 16,
  },
  pointsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  pointsValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  levelText: {
    color: '#333',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  menuContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  statsSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    padding: 24,
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: '#999',
  },
});

export default ProfileScreen;