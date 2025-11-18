import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import CustomTabBar from '../../components/CustomTabBar';
import { styles } from './styles';

type ReportType = 'emergency' | 'medical' | 'fire' | 'crime' | 'accident' | 'other';

const Report: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [selectedType, setSelectedType] = useState<ReportType | null>(
    (params.type as ReportType) || null
  );
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reportTypes: { type: ReportType; label: string; icon: string; color: string }[] = [
    { type: 'emergency', label: 'Emergency', icon: 'alert-circle', color: '#FF3B30' },
    { type: 'medical', label: 'Medical', icon: 'medical', color: '#34C759' },
    { type: 'fire', label: 'Fire', icon: 'flame', color: '#FF9500' },
    { type: 'crime', label: 'Crime', icon: 'shield', color: '#AF52DE' },
    { type: 'accident', label: 'Accident', icon: 'car', color: '#FF2D55' },
    { type: 'other', label: 'Other', icon: 'ellipsis-horizontal', color: '#8E8E93' },
  ];

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select a report type');
      return;
    }

    if (description.trim().length < 20) {
      Alert.alert('Error', 'Please provide a detailed description (at least 20 characters)');
      return;
    }

    setSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(
        'Success',
        'Your report has been submitted successfully. Emergency services have been notified.',
        [
          {
            text: 'OK',
            onPress: () => {
              setDescription('');
              setSelectedType(null);
              router.push('/screens/Home/Home');
            },
          },
        ]
      );
    }, 1500);
  };

  return (
    <LinearGradient
      colors={['#FF6B6B', '#FF8787', '#FFA8A8']}
      style={styles.gradientContainer}
    >
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>Submit Report</Text>
            <Text style={styles.reportSubtitle}>
              Select the type of incident and provide details
            </Text>
          </View>

          {/* Report Type Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Report Type</Text>
            <View style={styles.reportTypesGrid}>
              {reportTypes.map((item) => (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.reportTypeCard,
                    selectedType === item.type && styles.reportTypeCardSelected,
                    { borderColor: item.color },
                  ]}
                  onPress={() => setSelectedType(item.type)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={32}
                    color={selectedType === item.type ? item.color : '#999'}
                  />
                  <Text
                    style={[
                      styles.reportTypeText,
                      selectedType === item.type && { color: item.color, fontWeight: '600' },
                    ]}
                  >
                    {item.label}
                  </Text>
                  {selectedType === item.type && (
                    <View style={[styles.checkmark, { backgroundColor: item.color }]}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.descriptionContainer}>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Provide detailed information about the incident..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={8}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>
                {description.length} characters (minimum 20)
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!selectedType || description.length < 20 || submitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!selectedType || description.length < 20 || submitting}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={
                selectedType && description.length >= 20 && !submitting
                  ? ['#FF6B6B', '#FF8787']
                  : ['#E0E0E0', '#E0E0E0']
              }
              style={styles.submitButtonGradient}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>

        {/* Bottom Navigation */}
        <CustomTabBar />
      </View>
    </LinearGradient>
  );
};

export default Report;

