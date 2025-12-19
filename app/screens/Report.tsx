import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ChatBox } from '../components/ChatBox';
import CustomTabBar from '../components/Customtabbar/CustomTabBar';
import { HexagonalGrid } from '../components/HexagonalGrid';
import { useActiveCase } from '../hooks/useActiveCase';
import { supabase } from '../lib/supabase';
import { reverseGeocode } from '../utils/geocoding';
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
  'Violence': 'VIOLENCE INCIDENT REPORT\n\nPlease provide the following details:\n\n- Type of violence (physical, verbal, domestic, etc.)\n- What happened? (Detailed description of the incident)\n- Any witnesses present?\n- Any injuries sustained?\n- Current status of the situation\n\nPlease provide as much detail as possible to help us respond appropriately.',
  'Threat': 'THREAT INCIDENT REPORT\n\nPlease provide the following details:\n\n- Type of threat (verbal, written, online, physical, etc.)\n- What was the threat? (Exact words or actions)\n- How was the threat delivered? (In person, phone, message, etc.)\n- Any witnesses present?\n- Do you feel your safety is at risk?\n- Any additional information?\n\nPlease provide as much detail as possible to help us assess the situation.',
  'Theft': 'THEFT INCIDENT REPORT\n\nPlease provide the following details:\n\n- What was stolen? (Item description and value)\n- How was the theft committed? (Breaking in, pickpocketing, etc.)\n- Any witnesses present?\n- Was the location secured? (Locked doors, windows, etc.)\n- Any security cameras in the area?\n- Estimated value of stolen items\n- Any additional information?\n\nPlease provide as much detail as possible to help us investigate.',
  'Vandalism': 'VANDALISM INCIDENT REPORT\n\nPlease provide the following details:\n\n- What was vandalized? (Property, vehicle, public property, etc.)\n- Type of damage (graffiti, broken windows, damaged property, etc.)\n- Any witnesses present?\n- Estimated cost of damage\n- Was this reported to property owner?\n- Any security cameras in the area?\n- Any additional information?\n\nPlease provide as much detail as possible to help us investigate.',
  'Suspicious': 'SUSPICIOUS ACTIVITY REPORT\n\nPlease provide the following details:\n\n- What suspicious activity did you observe?\n- Description of vehicle(s) involved (if applicable)\n- What made this activity suspicious?\n- How long did the activity last?\n- Any witnesses present?\n- Any photos or videos taken?\n- Any additional information?\n\nPlease provide as much detail as possible to help us investigate.',
  'Emergency': 'EMERGENCY INCIDENT REPORT\n\nPlease provide the following details:\n\n- Type of emergency (medical, fire, accident, etc.)\n- What is the current situation?\n- Is anyone injured? (Number of people and severity)\n- Is the situation ongoing or resolved?\n- Are emergency services already on scene?\n- Any immediate danger present?\n- Any additional information?\n\nPlease provide as much detail as possible. If this is a life-threatening emergency, please call 911 immediately.',
  'Other': 'INCIDENT REPORT\n\nPlease provide the following details:\n\n- What happened? (Detailed description of the incident)\n- Any witnesses present?\n- Any injuries or damages?\n- Current status of the situation\n- Any additional information?\n\nPlease provide as much detail as possible to help us respond appropriately.',
};

const Report: React.FC = () => {
  const router = useRouter();
  const { activeCase, cancelReport, checkActiveCase } = useActiveCase();
  const [description, setDescription] = useState('');
  const [role, setRole] = useState<RoleType>('victim');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [locationText, setLocationText] = useState<string>('');
  const [locationLoading, setLocationLoading] = useState(false);

  // Monitor network connectivity - redirect to offline mode if connection is lost
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected ?? false;
      if (!isConnected) {
        router.replace('/components/OfflineEmergency/OfflineEmergency');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Fetch user location when component loads
  useEffect(() => {
    const fetchLocation = async () => {
      if (activeCase) {
        // If there's an active case, don't fetch location (form is read-only)
        return;
      }

      setLocationLoading(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          try {
            const currentLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.High,
            });
            const latitude = currentLocation.coords.latitude;
            const longitude = currentLocation.coords.longitude;

            // Reverse geocode to get full address
            if (latitude && longitude) {
              try {
                // Fetch full address from Nominatim API directly to get complete display_name
                const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&namedetails=1&accept-language=en,fil&extratags=1`;

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);

                const response = await fetch(url, {
                  headers: {
                    'User-Agent': 'AccessPoint-Mobile-App/1.0',
                    'Accept': 'application/json',
                  },
                  signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (response.ok) {
                  const data = await response.json();
                  // Use display_name for full address, fallback to geocodeResult
                  if (data?.display_name) {
                    setLocationText(data.display_name);
                  } else {
                    // Fallback to geocodeResult if display_name not available
                    const geocodeResult = await reverseGeocode(latitude, longitude);
                    const locationParts = [];
                    if (geocodeResult.barangay) locationParts.push(geocodeResult.barangay);
                    if (geocodeResult.city) locationParts.push(geocodeResult.city);
                    if (geocodeResult.region) locationParts.push(geocodeResult.region);
                    const locationAddress = locationParts.length > 0
                      ? locationParts.join(', ')
                      : `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                    setLocationText(locationAddress);
                  }
                } else {
                  // Fallback to geocodeResult if API call fails
                  const geocodeResult = await reverseGeocode(latitude, longitude);
                  const locationParts = [];
                  if (geocodeResult.barangay) locationParts.push(geocodeResult.barangay);
                  if (geocodeResult.city) locationParts.push(geocodeResult.city);
                  if (geocodeResult.region) locationParts.push(geocodeResult.region);
                  const locationAddress = locationParts.length > 0
                    ? locationParts.join(', ')
                    : `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                  setLocationText(locationAddress);
                }
              } catch (geocodeError) {
                // Fallback to GPS coordinates if geocoding fails
                setLocationText(`GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
              }
            }
          } catch (locationError: any) {
            // Location unavailable - use profile address as fallback
            console.warn('GPS location unavailable, using profile address:', locationError?.message);

            // Try to get user profile address from Supabase
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                const { data: userData } = await supabase
                  .from('tbl_users')
                  .select('barangay, city, region')
                  .eq('user_id', session.user.id)
                  .single();

                if (userData) {
                  const addressParts = [];
                  if (userData.barangay) addressParts.push(userData.barangay);
                  if (userData.city) addressParts.push(userData.city);
                  if (userData.region) addressParts.push(userData.region);
                  if (addressParts.length > 0) {
                    setLocationText(`${addressParts.join(', ')} (from profile)`);
                  } else {
                    setLocationText('Location unavailable - Please enable location services in device settings');
                  }
                } else {
                  setLocationText('Location unavailable - Please enable location services in device settings');
                }
              } else {
                setLocationText('Location unavailable - Please enable location services in device settings');
              }
            } catch (dbError) {
              setLocationText('Location unavailable - Please enable location services in device settings');
            }
          }
        } else {
          // Permission denied - use profile address as fallback
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data: userData } = await supabase
                .from('tbl_users')
                .select('barangay, city, region')
                .eq('user_id', session.user.id)
                .single();

              if (userData) {
                const addressParts = [];
                if (userData.barangay) addressParts.push(userData.barangay);
                if (userData.city) addressParts.push(userData.city);
                if (userData.region) addressParts.push(userData.region);
                if (addressParts.length > 0) {
                  setLocationText(`${addressParts.join(', ')} (from profile - location permission not granted)`);
                } else {
                  setLocationText('Location permission not granted - Please enable in device settings');
                }
              } else {
                setLocationText('Location permission not granted - Please enable in device settings');
              }
            } else {
              setLocationText('Location permission not granted - Please enable in device settings');
            }
          } catch (dbError) {
            setLocationText('Location permission not granted - Please enable in device settings');
          }
        }
      } catch (error: any) {
        console.error('Error fetching location:', error);
        // Final fallback - try to use profile address
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: userData } = await supabase
              .from('tbl_users')
              .select('barangay, city, region')
              .eq('user_id', session.user.id)
              .single();

            if (userData) {
              const addressParts = [];
              if (userData.barangay) addressParts.push(userData.barangay);
              if (userData.city) addressParts.push(userData.city);
              if (userData.region) addressParts.push(userData.region);
              if (addressParts.length > 0) {
                setLocationText(`${addressParts.join(', ')} (from profile)`);
              } else {
                setLocationText('Unable to fetch location - Please check device settings');
              }
            } else {
              setLocationText('Unable to fetch location - Please check device settings');
            }
          } else {
            setLocationText('Unable to fetch location - Please check device settings');
          }
        } catch (dbError) {
          setLocationText('Unable to fetch location - Please check device settings');
        }
      } finally {
        setLocationLoading(false);
      }
    };

    fetchLocation();
  }, [activeCase]);

  // Load active case data into form when active case exists
  useEffect(() => {
    const loadActiveCaseData = async () => {
      if (activeCase) {
        setDescription(activeCase.description || '');
        setSelectedCategory(activeCase.category || null);
        // Extract role from remarks if available, otherwise default to 'witness'
        const roleMatch = activeCase.remarks?.match(/Role:\s*(\w+)/i);
        setRole(roleMatch ? (roleMatch[1].toLowerCase() as RoleType) : 'witness');
        // Set location from active case coordinates
        if (activeCase.latitude && activeCase.longitude) {
          // Try to get full address from coordinates
          try {
            const geocodeResult = await reverseGeocode(activeCase.latitude, activeCase.longitude);
            const locationParts = [];
            if (geocodeResult.barangay) locationParts.push(geocodeResult.barangay);
            if (geocodeResult.city) locationParts.push(geocodeResult.city);
            if (geocodeResult.region) locationParts.push(geocodeResult.region);
            if (locationParts.length > 0) {
              setLocationText(locationParts.join(', '));
            } else {
              setLocationText(`GPS: ${activeCase.latitude.toFixed(6)}, ${activeCase.longitude.toFixed(6)}`);
            }
          } catch (error) {
            setLocationText(`GPS: ${activeCase.latitude.toFixed(6)}, ${activeCase.longitude.toFixed(6)}`);
          }
        }
      } else {
        // Reset form when no active case (case resolved/closed or cancelled)
        // This allows users to create a new report
        setDescription('');
        setSelectedCategory(null);
        setRole('victim');
        setAttachments([]);
        // Location will be fetched again by the location useEffect
      }
    };

    loadActiveCaseData();
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

              // Verify user is authenticated before upload
              const { data: { session }, error: sessionError } = await supabase.auth.getSession();
              if (!session || sessionError) {
                console.error('❌ No active session:', sessionError);
                Alert.alert(
                  'Authentication Required',
                  'Please log in to upload files.',
                  [{ text: 'OK' }]
                );
                resolve(false);
                return;
              }

              // Upload to Supabase Storage using ArrayBuffer
              console.log(`📤 Uploading file to bucket '${bucketName}': ${filePath} (${byteArray.length} bytes)`);
              console.log(`👤 Uploading as user: ${session.user.email || session.user.id}`);

              // Try to list buckets to verify, but don't block if it fails (permission issue)
              // The upload will fail with a clearer error if bucket doesn't exist
              const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
              if (bucketError) {
                console.warn('⚠️ Could not list buckets (might be permission issue):', bucketError.message);
                console.log('📝 Proceeding with upload attempt - will get clearer error if bucket missing');
              } else {
                const bucketExists = buckets?.some(b => b.name === bucketName);
                if (!bucketExists) {
                  const availableBuckets = buckets?.map(b => b.name).join(', ') || 'none';
                  console.warn(`⚠️ Bucket "${bucketName}" not in list. Available: [${availableBuckets}]`);
                  console.log('📝 This might be a permission issue. Attempting upload anyway...');
                  // Don't block - try upload and let it fail with clearer error
                } else {
                  console.log(`✅ Bucket "${bucketName}" found and accessible`);
                }
              }

              // Upload file
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload(filePath, byteArray, {
                  contentType: contentType,
                  upsert: true, // Allow overwriting if file exists
                  cacheControl: '3600',
                });

              if (uploadError) {
                console.error('❌ Upload error:', uploadError);
                console.error('Upload error details:', JSON.stringify(uploadError, null, 2));
                console.error('Error name:', uploadError.name);
                console.error('Error message:', uploadError.message);

                // More detailed error messages
                let errorMessage = 'Unknown error occurred';
                if (uploadError.message) {
                  errorMessage = uploadError.message;
                } else if (uploadError.name === 'StorageUnknownError') {
                  errorMessage = 'Storage service error. Please check:\n1. Bucket exists and is accessible\n2. RLS policies allow uploads\n3. File size is within limits\n4. Network connection is stable';
                }

                // Check if it's a bucket not found error
                if (uploadError.message?.includes('Bucket not found') ||
                  uploadError.message?.includes('not found') ||
                  (uploadError as any).statusCode === 404) {
                  Alert.alert(
                    'Bucket Not Found',
                    `The storage bucket "${bucketName}" was not found.\n\nPlease verify:\n1. The bucket name is exactly "${bucketName}"\n2. The bucket exists in your Supabase Storage\n3. The bucket is accessible`,
                    [{ text: 'OK' }]
                  );
                } else if (uploadError.message?.includes('new row violates row-level security') ||
                  uploadError.message?.includes('RLS') ||
                  uploadError.message?.includes('permission denied')) {
                  Alert.alert(
                    'Permission Denied',
                    `Upload failed due to permissions.\n\nPlease check:\n1. RLS policies allow INSERT for authenticated users\n2. Bucket is set to public or has proper policies\n3. You are logged in`,
                    [{ text: 'OK' }]
                  );
                } else {
                  Alert.alert(
                    'Upload Failed',
                    `Failed to upload file: ${errorMessage}`,
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
                // uploaded_at is handled by database DEFAULT CURRENT_TIMESTAMP
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
                      setLocationText('');
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
            // Add "City" suffix if not already present
            const cityName = geocodeResult.city || null;
            locationCity = cityName ? (cityName.endsWith(' City') ? cityName : `${cityName} City`) : null;
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
        status: 'Pending',
        latitude: latitude,
        longitude: longitude,
        location_city: locationCity, // From GPS geocoding, fallback to user profile
        location_barangay: locationBarangay, // From GPS geocoding, fallback to user profile
        remarks: `Report submitted via mobile app. Role: ${role.charAt(0).toUpperCase() + role.slice(1)}. User: ${userName}`,
        // created_at is handled by database DEFAULT NOW()
        // updated_at is handled by database trigger
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
      router.replace('/screens/Home');
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
                    // Clear description when category changes - placeholder will show predefined text
                    setDescription('');
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
                placeholder={selectedCategory ? (categoryDescriptions[selectedCategory] || categoryDescriptions['Other']) : ''}
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

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationContainer}>
              {locationLoading && (
                <View style={styles.locationLoading}>
                  <Text style={styles.locationLoadingText}>Loading...</Text>
                </View>
              )}
              <TextInput
                style={[styles.locationInput, activeCase && styles.readOnlyInput]}
                placeholder="Your location will appear here"
                placeholderTextColor="#999"
                value={locationText}
                editable={false}
                multiline
              />
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

        {/* ChatBox Component - Only show when active case exists */}
        {activeCase && <ChatBox onSendMessage={handleSendMessage} />}

        {/* Bottom Navigation */}
        <CustomTabBar />

      </View>
    </LinearGradient>
  );
};

export default Report;

