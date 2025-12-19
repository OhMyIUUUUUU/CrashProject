import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ActiveCase } from '../../hooks/useActiveCase';
import { styles } from '../../screens/styles';
import { formatPhilippineDateTime } from '../../utils/philippineTime';

interface NotificationListModalProps {
    visible: boolean;
    notifications: ActiveCase[];
    onClose: () => void;
    onSelect: (notification: ActiveCase) => void;
}

const NotificationListModal: React.FC<NotificationListModalProps> = ({
    visible,
    notifications,
    onClose,
    onSelect,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.notificationModalOverlay}>
                <View style={styles.notificationModalContainer}>
                    <View style={styles.notificationModalHeader}>
                        <Text style={styles.notificationModalTitle}>Notifications</Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.notificationModalCloseButton}
                        >
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.notificationModalContent}>
                        {notifications.length === 0 ? (
                            <View style={styles.noNotificationsContainer}>
                                <Ionicons name="notifications-off" size={48} color="#CCC" />
                                <Text style={styles.noNotificationsText}>No notifications</Text>
                                <Text style={styles.noNotificationsSubtext}>Case status updates will appear here</Text>
                            </View>
                        ) : (
                            notifications.map((notification) => (
                                <TouchableOpacity
                                    key={notification.report_id}
                                    style={styles.notificationItem}
                                    activeOpacity={0.7}
                                    onPress={() => onSelect(notification)}
                                >
                                    <View style={[
                                        styles.notificationStatusIndicator,
                                        {
                                            backgroundColor:
                                                notification.status === 'Resolved' ? '#34C759' :
                                                    notification.status === 'Canceled' ? '#FF3B30' :
                                                        notification.status === 'Acknowledged' ? '#FFCC00' :
                                                            notification.status === 'En Route' ? '#007AFF' :
                                                                notification.status === 'On Scene' ? '#34C759' :
                                                                    '#FF9500' // Pending - orange
                                        }
                                    ]} />
                                    <View style={styles.notificationItemContent}>
                                        <Text style={styles.notificationItemTitle}>
                                            {notification.status === 'Resolved' ? 'Case Resolved' :
                                                notification.status === 'Canceled' ? 'Case Canceled' :
                                                    notification.status === 'Acknowledged' ? 'Case Acknowledged' :
                                                        notification.status === 'En Route' ? 'Help En Route' :
                                                            notification.status === 'On Scene' ? 'Officers On Scene' :
                                                                'Case Pending'}
                                        </Text>
                                        <Text style={styles.notificationItemCategory}>{notification.category}</Text>
                                        <Text style={styles.notificationItemTime}>
                                            {formatPhilippineDateTime(notification.updated_at)}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name={
                                            notification.status === 'Resolved' ? 'checkmark-circle' :
                                                notification.status === 'Canceled' ? 'close-circle' :
                                                    notification.status === 'Acknowledged' ? 'person-circle' :
                                                        notification.status === 'En Route' ? 'car' :
                                                            notification.status === 'On Scene' ? 'location' :
                                                                'time'
                                        }
                                        size={24}
                                        color={
                                            notification.status === 'Resolved' ? '#34C759' :
                                                notification.status === 'Canceled' ? '#FF3B30' :
                                                    notification.status === 'Acknowledged' ? '#FFCC00' :
                                                        notification.status === 'En Route' ? '#007AFF' :
                                                            notification.status === 'On Scene' ? '#34C759' :
                                                                '#FF9500'
                                        }
                                    />
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default NotificationListModal;
