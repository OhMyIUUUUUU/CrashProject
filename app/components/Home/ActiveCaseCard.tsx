import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { styles } from '../../screens/styles';
import { formatPhilippineDateTime } from '../../utils/philippineTime';

interface ActiveCase {
    report_id: string;
    status: string;
    category: string;
    created_at: string;
    office_name?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
}

interface ActiveCaseCardProps {
    activeCase: ActiveCase | null;
    isMinimized: boolean;
    onToggleMinimize: () => void;
    onCancelReport: () => void;
    cancelling: boolean;
    cancelCountdown: number;
}

const ActiveCaseCard: React.FC<ActiveCaseCardProps> = ({
    activeCase,
    isMinimized,
    onToggleMinimize,
    onCancelReport,
    cancelling,
    cancelCountdown,
}) => {
    if (!activeCase) {
        return (
            <View style={styles.noActiveCaseContainer}>
                <Ionicons name="checkmark-circle" size={48} color="#34C759" />
                <Text style={styles.noActiveCaseText}>No Active Case</Text>
                <Text style={styles.noActiveCaseSubtext}>You can send an SOS or submit a report</Text>
            </View>
        );
    }

    return (
        <View style={[
            styles.activeCaseContainer,
            !isMinimized && styles.activeCaseContainerExpanded
        ]}>
            <View style={styles.activeCaseHeader}>
                <View style={styles.activeCaseTitleRow}>
                    <Ionicons name="alert-circle" size={24} color="#FF6B6B" />
                    <Text style={styles.activeCaseTitle}>Active Case</Text>
                    <View style={[styles.statusBadge, {
                        backgroundColor: activeCase.status === 'Pending' ? '#FF9500' :
                            activeCase.status === 'Acknowledged' ? '#FFCC00' :
                                activeCase.status === 'En Route' ? '#007AFF' :
                                    activeCase.status === 'On Scene' ? '#34C759' :
                                        '#007AFF'
                    }]}>
                        <Text style={styles.statusText}>{activeCase.status.toUpperCase()}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    onPress={onToggleMinimize}
                    style={styles.minimizeButton}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isMinimized ? "chevron-down" : "chevron-up"}
                        size={20}
                        color="#666"
                    />
                </TouchableOpacity>
            </View>

            {!isMinimized && (
                <ScrollView
                    style={styles.caseDetailsContainer}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={true}
                >
                    <View style={styles.caseDetailRow}>
                        <Ionicons name="folder" size={16} color="#666" />
                        <Text style={styles.caseDetailLabel}>Category:</Text>
                        <Text style={styles.caseDetailValue}>{activeCase.category}</Text>
                    </View>

                    <View style={styles.caseDetailRow}>
                        <Ionicons name="time" size={16} color="#666" />
                        <Text style={styles.caseDetailLabel}>Created:</Text>
                        <Text style={styles.caseDetailValue}>
                            {formatPhilippineDateTime(activeCase.created_at)}
                        </Text>
                    </View>

                    {!!activeCase.office_name && (
                        <View style={styles.caseDetailRow}>
                            <Ionicons name="business" size={16} color="#666" />
                            <Text style={styles.caseDetailLabel}>Assigned Office:</Text>
                            <Text style={styles.caseDetailValue}>{activeCase.office_name}</Text>
                        </View>
                    )}

                    {!!activeCase.description && (
                        <View style={styles.caseDescriptionContainer}>
                            <Text style={styles.caseDescriptionLabel}>Description:</Text>
                            <Text style={styles.caseDescriptionText} numberOfLines={3}>
                                {activeCase.description}
                            </Text>
                        </View>
                    )}

                    {activeCase.latitude !== undefined && activeCase.longitude !== undefined && (
                        <View style={styles.caseDetailRow}>
                            <Ionicons name="location" size={16} color="#666" />
                            <Text style={styles.caseDetailLabel}>Location:</Text>
                            <Text style={styles.caseDetailValue}>
                                {Number(activeCase.latitude).toFixed(4)}, {Number(activeCase.longitude).toFixed(4)}
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}

            <TouchableOpacity
                style={styles.cancelReportButton}
                onPress={onCancelReport}
                disabled={cancelling || cancelCountdown > 0}
            >
                <Ionicons name="close-circle" size={20} color="#FF3B30" />
                <Text style={styles.cancelReportButtonText}>
                    {cancelCountdown > 0 ? `Cancelling in ${cancelCountdown}s...` : cancelling ? 'Cancelling...' : 'Cancel Report'}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default ActiveCaseCard;
