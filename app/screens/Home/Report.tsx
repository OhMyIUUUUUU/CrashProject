import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ChatModal } from '../AccessPoint/components/Chatsystem/ChatModal';
import { FloatingChatHead } from '../AccessPoint/components/Chatsystem/FloatingChatHead';
import { useActiveCase } from '../../hooks/useActiveCase';
import { supabase } from '../../lib/supabase';
import { reverseGeocode } from '../../../utils/geocoding';
import { ChatBox } from '../AccessPoint/components/ChatBox';
import CustomTabBar from '../AccessPoint/components/Customtabbar/CustomTabBar';
import { HexagonalGrid } from '../AccessPoint/components/HexagonalGrid';
import { styles } from './styles';

// Lazy load ImagePicker to handle cases where native module isn't available
let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch (error) {
  console.warn('ImagePicker not available:', error);
}

type RoleType = 'victim' | 'witness' | null;

// Predefined description text for each category
const categoryDescriptions: Record<string, string> = {
  'Violence': 'Please provide details about the incident:\n\n- What happened?\n- When did this occur?\n- Where is the location?\n- Who is involved?\n- Any additional information?',
  'Threat': 'Please provide details about the incident:\n\n- What happened?\n- When did this occur?\n- Where is the location?\n- Who is involved?\n- Any additional information?',
  'Theft': 'Please provide details about the incident:\n\n- What happened?\n- When did this occur?\n- Where is the location?\n- Who is involved?\n- Any additional information?',
  'Vandalism': 'Please provide details about the incident:\n\n- What happened?\n- When did this occur?\n- Where is the location?\n- Who is involved?\n- Any additional information?',
  'Suspicious': 'Please provide details about the incident:\n\n- What happened?\n- When did this occur?\n- Where is the location?\n- Who is involved?\n- Any additional information?',
  'Emergency': 'Please provide details about the incident:\n\n- What happened?\n- When did this occur?\n- Where is the location?\n- Who is involved?\n- Any additional information?',
  'Other': 'Please provide details about the incident:\n\n- What happened?\n- When did this occur?\n- Where is the location?\n- Who is involved?\n- Any additional information?',
};

const Report: React.FC = () => {
  const router = useRouter();
  const { activeCase, cancelReport, checkActiveCase } = useActiveCase();
  const [description, setDescription] = useState('');
  const [role, setRole] = useState<RoleType>('victim');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);

  // Monitor network connectivity - redirect to offline mode if connection is lost
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      if (!isConnected) {
        router.replace('/screens/AccessPoint/components/OfflineEmergency/OfflineEmergency');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Load active case data into form when active case exists
  useEffect(() => {
    if (activeCase) {
      setDescription(activeCase.description || '');
      setSelectedCategory(activeCase.category || null);
      // Extract role from remarks if available, otherwise default to 'witness'
      const roleMatch = activeCase.remarks?.match(/Role:\s*(\w+)/i);
      setRole(roleMatch ? (roleMatch[1].toLowerCase() as RoleType) : 'witness');
    } else {
      // Reset form when no active case (case resolved/closed or cancelled)
      // This allows users to create a new report
      setDescription('');
      setSelectedCategory(null);
      setRole('victim');
      setAttachments([]);
    }
  }, [activeCase]);


  const handlePickImage = async () => {
    if (!ImagePicker) {
      Alert.alert(
        'Feature Unavailable',
        'Image picker is not available. Please rebuild the app using:\n\nnpx expo run:android\n\nor\n\nnpx expo run:ios'
      );
      return;
    }

    try {
      // Request media library permissions
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Media library permission is required to attach images/videos. Please enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Open Settings', 
              onPress: () => {
                // On some platforms, you might want to open settings
                // For now, just show the alert
              }
            }
          ]
        );
        return;
      }

      // Request camera permissions (in case user wants to take a photo)
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        // Camera permission is optional, just log a warning
        console.warn('Camera permission not granted. User can still select from library.');
      }

      // Show options to user: Take Photo or Choose from Library
      Alert.alert(
        'Add Attachment',
        'How would you like to add a file?',
        [
          {
            text: 'Choose from Library',
            onPress: async () => {
              try {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.All,
                  allowsMultipleSelection: true,
                  quality: 0.8,
                });

                if (!result.canceled && result.assets) {
                  const newAttachments = result.assets.map((asset: any) => asset.uri);
                  setAttachments([...attachments, ...newAttachments]);
                }
              } catch (error) {
                console.error('Image picker error:', error);
                Alert.alert('Error', 'Failed to open image library. Please try again.');
              }
            },
          },
          {
            text: 'Take Photo/Video',
            onPress: async () => {
              try {
                if (cameraStatus !== 'granted') {
                  Alert.alert(
                    'Permission Required',
                    'Camera permission is required to take photos/videos. Please enable it in your device settings.'
                  );
                  return;
                }

                const result = await ImagePicker.launchCameraAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.All,
                  allowsEditing: false,
                  quality: 0.8,
                });

                if (!result.canceled && result.assets) {
                  const newAttachments = result.assets.map((asset: any) => asset.uri);
                  setAttachments([...attachments, ...newAttachments]);
                }
              } catch (error) {
                console.error('Camera error:', error);
                Alert.alert('Error', 'Failed to open camera. Please try again.');
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert('Error', 'Failed to request permissions. Please try again.');
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  // Function to delete a file from storage bucket
  const deleteFileFromBucket = async (filePath: string): Promise<boolean> => {
    try {
      const bucketName = 'crash-media';
      console.log(`🗑️ Deleting file from bucket: ${filePath}`);
      
      const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Error deleting file from bucket:', error);
        return false;
      }

      console.log('✅ File deleted successfully from bucket');
      return true;
    } catch (error) {
      console.error('Error deleting file from bucket:', error);
      return false;
    }
  };

  // Upload attachment to Supabase Storage and save to tbl_media
  const uploadAttachment = async (fileUri: string, reportId: string, index: number, senderId: string): Promise<boolean> => {
    try {
      // Generate unique filename
      const fileExtension = fileUri.split('.').pop() || 'jpg';
      const fileName = `${reportId}_${Date.now()}_${index}.${fileExtension}`;
      const filePath = `reports/${reportId}/${fileName}`;

      // Determine content type
      const isVideo = fileUri.includes('.mp4') || fileUri.includes('.mov') || fileUri.includes('.avi');
      const contentType = isVideo ? 'video/mp4' : 'image/jpeg';

      // Bucket name
      const bucketName = 'crash-media';
      
      // Try to upload directly - if bucket exists, this will work
      // If it doesn't exist, we'll get a clear error message
      console.log(`📤 Attempting to upload to bucket: ${bucketName}`);
      
      return await uploadToBucket(fileUri, reportId, index, bucketName, filePath, contentType, isVideo, senderId);
    } catch (error) {
      console.error('Error uploading attachment:', error);
      return false;
    }
  };

  // Helper function to upload to a specific bucket
  const uploadToBucket = async (
    fileUri: string,
    reportId: string,
    index: number,
    bucketName: string,
    filePath: string,
    contentType: string,
    isVideo: boolean,
    senderId: string
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      // Read file using fetch (works with file:// URIs in React Native)
      fetch(fileUri)
        .then(response => response.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              // Get base64 string
              const base64String = reader.result as string;
              // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
              const base64Data = base64String.includes(',') 
                ? base64String.split(',')[1] 
                : base64String;

              // Convert base64 to Uint8Array
              const byteCharacters = atob(base64Data);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);

              // Upload to Supabase Storage using ArrayBuffer
              console.log(`📤 Uploading file to bucket '${bucketName}': ${filePath} (${byteArray.length} bytes)`);
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, byteArray, {
                  contentType: contentType,
                  upsert: false,
                });

              if (uploadError) {
                console.error('❌ Upload error:', uploadError);
                console.error('Upload error details:', JSON.stringify(uploadError, null, 2));
                
                // Check if it's a bucket not found error
                if (uploadError.message?.includes('Bucket not found') || (uploadError as any).statusCode === 404) {
                  Alert.alert(
                    'Bucket Not Found',
                    `The storage bucket "${bucketName}" was not found.\n\nPlease verify:\n1. The bucket name is exactly "${bucketName}"\n2. The bucket exists in your Supabase Storage\n3. The bucket is accessible`,
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert(
                    'Upload Failed',
                    `Failed to upload file: ${uploadError.message || 'Unknown error'}`,
                    [{ text: 'OK' }]
                  );
                }
                resolve(false);
                return;
              }

              console.log('✅ File uploaded successfully:', uploadData);

              // Get public URL
              const { data: urlData } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

              const fileUrl = urlData.publicUrl;
              console.log('📎 File URL:', fileUrl);

              // Save media record to tbl_media (matching schema: media_id, file_url, report_id, file_type, sender_id, uploaded_at)
              const mediaRecord = {
                report_id: reportId,
                file_url: fileUrl,
                file_type: isVideo ? 'video' : 'image',
                sender_id: senderId,
                uploaded_at: new Date().toISOString(),
              };

              console.log('💾 Saving media record to tbl_media:', mediaRecord);
              const { data: insertedData, error: mediaError } = await supabase
                .from('tbl_media')
                .insert(mediaRecord)
                .select();

              if (mediaError) {
                console.error('❌ Media insert error:', mediaError);
                console.error('Media insert error details:', JSON.stringify(mediaError, null, 2));
                resolve(false);
                return;
              }

              console.log('✅ Media record saved successfully:', insertedData);
              resolve(true);
            } catch (error) {
              console.error('Error processing file:', error);
              resolve(false);
            }
          };
          reader.onerror = () => {
            console.error('FileReader error');
            resolve(false);
          };
          reader.readAsDataURL(blob);
        })
        .catch(error => {
          console.error('Error reading file:', error);
          resolve(false);
        });
    });
  };

  const handleCancelReport = async () => {
    if (!activeCase || cancelling || countdown > 0) return;

    Alert.alert(
      'Cancel Report',
      'Are you sure you want to cancel this active case?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            // Start 5-second countdown
            setCountdown(5);
            setCancelling(true);

            // Clear any existing interval
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }

            // Start countdown
            countdownIntervalRef.current = setInterval(() => {
              setCountdown((prev) => {
                if (prev <= 1) {
                  // Countdown finished, cancel the report
                  if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                  }
                  
                  // Cancel the report
                  cancelReport(activeCase.report_id, activeCase).then((success) => {
                    setCancelling(false);
                    setCountdown(0);
                    if (success) {
                      Alert.alert('Success', 'Report has been cancelled successfully.');
                      // Clear form
                      setDescription('');
                      setRole('victim');
                      setAttachments([]);
                    } else {
                      Alert.alert('Error', 'Failed to cancel report. Please try again.');
                    }
                  });
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          },
        },
      ]
    );
  };

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  const handleSubmit = async () => {
    if (activeCase) {
      Alert.alert('Error', 'You have an active case. Please cancel it first before submitting a new report.');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description');
      return;
    }

    if (!role) {
      Alert.alert('Error', 'Please select your role');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Fetch User ID from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      const authUserId = session?.user?.id || null;
      const userEmail = session?.user?.email || null;

      if (!authUserId && !userEmail) {
        Alert.alert('Error', 'Please log in to submit a report');
        setSubmitting(false);
        return;
      }

      // 2. Fetch User Info from database
      let userInfo = null;
      let reporterId = null;

      // Try to get user by user_id (matching Supabase auth user ID)
      if (authUserId) {
        const { data, error } = await supabase
          .from('tbl_users')
          .select('user_id, first_name, last_name, barangay, city')
          .eq('user_id', authUserId)
          .single();
        
        if (data && !error) {
          userInfo = data;
          reporterId = data.user_id;
        }
      }

      // If not found by user_id, try by email
      if (!userInfo && userEmail) {
        const { data, error } = await supabase
          .from('tbl_users')
          .select('user_id, first_name, last_name, barangay, city')
          .eq('email', userEmail)
          .single();
        
        if (data && !error) {
          userInfo = data;
          reporterId = data.user_id;
        }
      }

      if (!userInfo || !reporterId) {
        Alert.alert('Error', 'Unable to fetch user information. Please try again.');
        setSubmitting(false);
        return;
      }

      const userName = `${userInfo.first_name || ''} ${userInfo.last_name || ''}`.trim() || 'User';
      const now = new Date().toISOString();

      // 3. Fetch GPS Location and reverse geocode
      let latitude: number | null = null;
      let longitude: number | null = null;
      let locationCity: string | null = null; // Only from GPS, no profile fallback
      let locationBarangay: string | null = null; // Only from GPS, no profile fallback
      
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          latitude = currentLocation.coords.latitude;
          longitude = currentLocation.coords.longitude;
          
           // Reverse geocode to get city and barangay from GPS coordinates ONLY
           if (latitude && longitude) {
             const geocodeResult = await reverseGeocode(latitude, longitude);
             locationCity = geocodeResult.city || null; // Only from GPS, no profile fallback
             locationBarangay = geocodeResult.barangay || null; // Only from GPS, no profile fallback
           }
        } else {
          console.warn('Location permission not granted. Report will be submitted without GPS coordinates and location.');
        }
      } catch (error) {
        console.error('Error fetching location:', error);
        // Continue without location - don't block report submission
      }

      // 4. Create report payload
      const reportPayload = {
        reporter_id: reporterId,
        assigned_office_id: null,
        category: selectedCategory,
        description: description.trim(),
        status: 'pending',
        latitude: latitude,
        longitude: longitude,
        location_city: locationCity, // From GPS geocoding, fallback to user profile
        location_barangay: locationBarangay, // From GPS geocoding, fallback to user profile
        remarks: `Report submitted via mobile app. Role: ${role.charAt(0).toUpperCase() + role.slice(1)}. User: ${userName}`,
        created_at: now,
        updated_at: now,
      };

      // 5. Insert report into database
      const { data, error } = await supabase
        .from('tbl_reports')
        .insert([reportPayload])
        .select()
        .single();

      if (error) {
        console.error('Report submission error:', error);
        Alert.alert(
          'Error',
          'Failed to submit report. Please try again.',
          [{ text: 'OK' }]
        );
        setSubmitting(false);
        return;
      }

      console.log('Report submitted successfully:', data);
      const reportId = data.report_id;

      // 4. Upload attachments if any
      if (attachments.length > 0) {
        console.log(`📎 Starting upload of ${attachments.length} attachment(s) for report ${reportId}...`);
        const uploadPromises = attachments.map((attachment, index) => {
          console.log(`📎 Processing attachment ${index + 1}/${attachments.length}: ${attachment.substring(0, 50)}...`);
          return uploadAttachment(attachment, reportId, index, reporterId);
        });
        
        const uploadResults = await Promise.all(uploadPromises);
        const successCount = uploadResults.filter(result => result === true).length;
        
        console.log(`📊 Upload results: ${successCount} successful out of ${attachments.length} total`);
        
        if (successCount < attachments.length) {
          console.warn(`⚠️ Only ${successCount} out of ${attachments.length} attachments uploaded successfully`);
          Alert.alert(
            'Upload Warning',
            `Only ${successCount} out of ${attachments.length} file(s) were uploaded successfully. The report has been submitted.`
          );
        } else {
          console.log(`✅ All ${attachments.length} attachment(s) uploaded and saved to database successfully`);
        }
      } else {
        console.log('ℹ️ No attachments to upload');
      }
      
      // 5. Wait a moment for database to process, then refresh active case
      console.log('⏳ Waiting for database to process...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      // Refresh active case after submission (wait for it to complete)
      console.log('🔄 Refreshing active case after report submission...');
      await checkActiveCase();
      console.log('✅ Active case refresh completed');

      // Clear form
      setDescription('');
      setRole('victim');
      setSelectedCategory(null);
      setAttachments([]);

      // Show success alert (non-blocking)
      Alert.alert(
        'Success',
        'Your report has been submitted successfully. Emergency services have been notified.',
        [{ text: 'OK' }]
      );

      // Automatically navigate to Home screen immediately
      router.replace('/screens/Home/Home');
    } catch (error: any) {
      console.error('Error submitting report:', error);
      Alert.alert(
        'Error',
        'Failed to submit report. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
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
          {/* Message when no active case - user can create new report */}
          {!activeCase && (
            <View style={styles.newReportBanner}>
              <Ionicons name="add-circle" size={24} color="#34C759" />
              <Text style={styles.newReportBannerText}>You can create a new report</Text>
            </View>
          )}

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
            {selectedCategory && !activeCase && (
              <View style={{ marginBottom: 12, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '600' }}>
                  Selected: <Text style={{ fontWeight: '800' }}>{selectedCategory}</Text>
                </Text>
              </View>
            )}
            <View style={styles.hexagonalGridContainer}>
              <HexagonalGrid
                onHexagonPress={(index, label) => {
                  if (!activeCase) {
                    console.log(`Selected category: ${label} (index: ${index})`);
                    setSelectedCategory(label);
                    // Set predefined description text for the selected category
                    const predefinedText = categoryDescriptions[label] || categoryDescriptions['Other'];
                    setDescription(predefinedText);
                  }
                }}
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionSectionTitle}>Description</Text>
            <View style={styles.descriptionContainer}>
              <TextInput
                style={[styles.descriptionInput, activeCase && styles.readOnlyInput]}
                placeholder="What is happening? Who is involved? Where exactly are you/it located?"
                placeholderTextColor="#999"
                multiline
                numberOfLines={8}
                value={description}
                onChangeText={activeCase ? undefined : setDescription}
                editable={!activeCase}
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
                  activeCase && styles.readOnlyButton,
                ]}
                onPress={activeCase ? undefined : () => setRole('victim')}
                disabled={!!activeCase}
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
                  activeCase && styles.readOnlyButton,
                ]}
                onPress={activeCase ? undefined : () => setRole('witness')}
                disabled={!!activeCase}
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

          {/* Image/Video Attachment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            <View style={styles.attachmentSection}>
              <TouchableOpacity
                style={[styles.attachmentButton, activeCase && styles.readOnlyButton]}
                onPress={activeCase ? undefined : handlePickImage}
                disabled={!!activeCase}
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

          {/* Submit Button or Cancel Report Button */}
          {activeCase ? (
            <TouchableOpacity
              style={styles.cancelReportButton}
              onPress={handleCancelReport}
              disabled={cancelling || countdown > 0}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelReportButtonText}>
                {countdown > 0 ? `Cancelling in ${countdown}s...` : cancelling ? 'Cancelling...' : 'Cancel Report'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF5252', '#FF6B6B', '#FF8787']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
              <Text style={styles.submitButtonText}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Text>
              <View style={styles.submitButtonIcon}>
                <Ionicons 
                  name="checkmark" 
                  size={20} 
                  color="#FF5252" 
                />
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ChatBox Component */}
        <ChatBox onSendMessage={handleSendMessage} />

        {/* Bottom Navigation */}
        <CustomTabBar />

        {/* Floating Chat Head - Only show when active case exists */}
        {activeCase && (
          <FloatingChatHead
            onPress={() => setChatModalVisible(true)}
            unreadCount={0} // TODO: Calculate unread count from messages
          />
        )}

        {/* Chat Modal */}
        <ChatModal
          visible={chatModalVisible}
          onClose={() => setChatModalVisible(false)}
          activeCase={activeCase}
        />
      </View>
    </LinearGradient>
  );
};

export default Report;

