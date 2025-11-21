import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Lazy load ImagePicker to handle cases where native module isn't available
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (error) {
  console.warn('ImagePicker not available:', error);
}
import { ChatBox } from '../AccessPoint/components/ChatBox';
import { HexagonalGrid } from '../AccessPoint/components/HexagonalGrid';
import CustomTabBar from '../AccessPoint/components/Customtabbar/CustomTabBar';
import { styles } from './styles';

type RoleType = 'victim' | 'witness' | null;

const Report: React.FC = () => {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [role, setRole] = useState<RoleType>('victim');
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [locationText, setLocationText] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);

  const handleGetLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to get your current location.');
        setGettingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const lat = currentLocation.coords.latitude;
      const long = currentLocation.coords.longitude;
      setLocation({
        latitude: lat,
        longitude: long,
      });
      setLocationText(`Latitude: ${lat.toFixed(6)}, Longitude: ${long.toFixed(6)}`);
      Alert.alert('Success', 'Location retrieved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to get location. Please try again.');
      console.error('Location error:', error);
    } finally {
      setGettingLocation(false);
    }
  };

  const handlePickImage = async () => {
    if (!ImagePicker) {
      Alert.alert(
        'Feature Unavailable',
        'Image picker is not available. Please rebuild the app using:\n\nnpx expo run:android\n\nor\n\nnpx expo run:ios'
      );
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library permission is required to attach images/videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newAttachments = result.assets.map(asset => asset.uri);
        setAttachments([...attachments, ...newAttachments]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to open image picker. Please try again.');
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description');
      return;
    }

    if (!role) {
      Alert.alert('Error', 'Please select your role');
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
              setRole('victim');
              setLocation(null);
              setLocationText('');
              setAttachments([]);
              router.push('/screens/Home/Home');
            },
          },
        ]
      );
    }, 1500);
  };

  const handleSendMessage = (message: string) => {
    // TODO: Replace with actual API call to send message
    // Example: await supabase.from('messages').insert({ message, user_id: user?.id });
    console.log('Message sent:', message);
  };

  return (
    <LinearGradient
      colors={['#FF6B6B', '#FF8787', '#FFA8A8']}
      style={styles.gradientContainer}
    >
      <View style={styles.container}>
        {/* Header with Glassmorphism Blur */}
        <View style={styles.reportHeader}>
          <BlurView 
            intensity={100} 
            tint="light" 
            style={styles.reportHeaderBlur}
          >
            <View style={styles.reportHeaderContent}>
              <View style={styles.reportHeaderIconContainer}>
                <BlurView 
                  intensity={80} 
                  tint="light" 
                  style={styles.reportHeaderIconBlur}
                >
                  <Ionicons name="document-text" size={28} color="#FF6B6B" />
                </BlurView>
              </View>
              <View style={styles.reportHeaderTextContainer}>
                <Text style={styles.reportHeaderTitle}>Submit Report</Text>
                <Text style={styles.reportHeaderSubtitle}>Report an incident or emergency</Text>
              </View>
            </View>
          </BlurView>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Category Report Grid - Hexagonal Pattern */}
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Text style={styles.sectionTitle}>Category Report</Text>
              <TouchableOpacity
                style={styles.guideButton}
                onPress={() => {
                  Alert.alert(
                    'Category Guide',
                    'Violence - Warning icon\nThreat - Alert circle icon\nTheft - Bag icon\nVandalism - Construct icon\nSuspicious - Eye icon\nEmergency - Shield icon\nOther - Three dots icon (center)',
                    [{ text: 'OK' }]
                  );
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="help-circle" size={26} color="#FF6B6B" />
              </TouchableOpacity>
            </View>
            <View style={styles.hexagonalGridContainer}>
              <HexagonalGrid
                onHexagonPress={(index, label) => {
                  console.log(`Selected category: ${label} (index: ${index})`);
                  // You can add category selection logic here
                }}
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionSectionTitle}>Description</Text>
            <View style={styles.descriptionContainer}>
              <TextInput
                style={styles.descriptionInput}
                placeholder="What is happening? Who is involved? Where exactly are you/it located?"
                placeholderTextColor="#999"
                multiline
                numberOfLines={8}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Role Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Role</Text>
            <View style={styles.roleContainer}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === 'victim' && styles.roleButtonSelected,
                ]}
                onPress={() => setRole('victim')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="person"
                  size={24}
                  color={role === 'victim' ? '#FF6B6B' : '#999'}
                />
                <Text
                  style={[
                    styles.roleButtonText,
                    role === 'victim' && styles.roleButtonTextSelected,
                  ]}
                >
                  Victim
                </Text>
                {role === 'victim' && (
                  <View style={styles.roleCheckmark}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleButton,
                  role === 'witness' && styles.roleButtonSelected,
                ]}
                onPress={() => setRole('witness')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="eye"
                  size={24}
                  color={role === 'witness' ? '#FF6B6B' : '#999'}
                />
                <Text
                  style={[
                    styles.roleButtonText,
                    role === 'witness' && styles.roleButtonTextSelected,
                  ]}
                >
                  Witness
                </Text>
                {role === 'witness' && (
                  <View style={styles.roleCheckmark}>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Auto-Get GPS Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Auto-Get GPS Location</Text>
            <View style={styles.locationContainer}>
              <TextInput
                style={styles.locationInput}
                placeholder="Location will appear here when retrieved..."
                placeholderTextColor="#999"
                value={locationText}
                editable={false}
                onPressIn={handleGetLocation}
              />
              {gettingLocation && (
                <View style={styles.locationLoading}>
                  <Text style={styles.locationLoadingText}>Getting location...</Text>
                </View>
              )}
            </View>
          </View>

          {/* Image/Video Attachment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            <View style={styles.attachmentSection}>
              <TouchableOpacity
                style={styles.attachmentButton}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#FF8787']}
                  style={styles.attachmentButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="camera" size={24} color="#FFFFFF" />
                  <Text style={styles.attachmentButtonText}>Add Image/Video</Text>
                </LinearGradient>
              </TouchableOpacity>

              {attachments.length > 0 && (
                <View style={styles.attachmentsContainer}>
                  {attachments.map((uri, index) => (
                    <View key={index} style={styles.attachmentItem}>
                      <Image source={{ uri }} style={styles.attachmentImage} />
                      <TouchableOpacity
                        style={styles.removeAttachmentButton}
                        onPress={() => handleRemoveAttachment(index)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF5252', '#FF6B6B', '#FF8787']}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
            <Text style={styles.submitButtonText}>Submit</Text>
            <View style={styles.submitButtonIcon}>
              <Ionicons 
                name="checkmark" 
                size={20} 
                color="#FF5252" 
              />
            </View>
          </TouchableOpacity>
        </ScrollView>

        {/* ChatBox Component */}
        <ChatBox onSendMessage={handleSendMessage} />

        {/* Bottom Navigation */}
        <CustomTabBar />
      </View>
    </LinearGradient>
  );
};

export default Report;

