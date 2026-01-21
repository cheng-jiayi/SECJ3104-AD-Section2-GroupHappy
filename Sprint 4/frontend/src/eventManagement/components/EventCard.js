import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function EventCard({ event }) {
    return (
        <View style={styles.card}>
            <Text style={styles.title}>{event.eventTitle}</Text>
            <Text style={styles.description}>{event.eventDescription}</Text>
            <Text style={styles.detail}>Date: {event.eventDate} Time: {event.eventTime}</Text>
            <Text style={styles.detail}>Location: {event.eventLocation}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card:{ 
        borderWidth: 1, 
        borderColor: '#4CAF50',
        padding: 15, 
        marginBottom: 10, 
        borderRadius: 8,
        backgroundColor: 'white'
    },
    title:{ 
        fontWeight: 'bold', 
        fontSize: 16,
        color: '#2E7D32',
        marginBottom: 5
    },
    description: {
        marginBottom: 8,
        color: '#666'
    },
    detail: {
        fontSize: 14,
        color: '#333'
    }
});