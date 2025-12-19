import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { ActiveCase } from '../../hooks/useActiveCase';
import { styles } from '../../screens/styles';

interface NotificationDetailModalProps {
    visible: boolean;
    notification: ActiveCase | null;
    onClose: () => void;
}

const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
    visible,
    notification,
    onClose,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            {notification && (
                <View style={styles.notificationDetailOverlay}>
                    <View style={styles.notificationDetailContainer}>
                        <View style={styles.notificationDetailHeader}>
                            <Text style={styles.notificationDetailTitle}>Notification</Text>
                            <TouchableOpacity
                                onPress={onClose}
                                style={styles.notificationDetailCloseButton}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.notificationDetailContent}>
                            <View style={styles.notificationMessageContainer}>
                                <Ionicons
                                    name={
                                        notification.status === 'Resolved' ? 'checkmark-circle' :
                                            notification.status === 'Canceled' ? 'close-circle' :
                                                notification.status === 'Acknowledged' ? 'person-circle' :
                                                    notification.status === 'En Route' ? 'car' :
                                                        notification.status === 'On Scene' ? 'location' :
                                                            'time'
                                    }
                                    size={64}
                                    color={
                                        notification.status === 'Resolved' ? '#34C759' :
                                            notification.status === 'Canceled' ? '#FF3B30' :
                                                notification.status === 'Acknowledged' ? '#FFCC00' :
                                                    notification.status === 'En Route' ? '#007AFF' :
                                                        notification.status === 'On Scene' ? '#34C759' :
                                                            '#FF9500'
                                    }
                                />
                                <Text style={styles.notificationMessageText}>
                                    {notification.status === 'Resolved' ? 'Your case is already resolved' :
                                        notification.status === 'Canceled' ? 'Your case has been cancelled' :
                                            notification.status === 'Acknowledged' ? 'Your case has been acknowledged' :
                                                notification.status === 'En Route' ? 'Help is on the way' :
                                                    notification.status === 'On Scene' ? 'Officers are on scene' :
                                                        'Your case is pending'}
                                </Text>
                                <Text style={styles.notificationMessageSubtext}>
                                    {notification.category}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}
        </Modal>
    );
};

export default NotificationDetailModal;
