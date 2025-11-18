import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState, useCallback } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import ErrorText from '../ErrorText/ErrorText';

interface DatePickerProps {
  label: string;
  placeholder?: string;
  value: string; // Format: YYYY-MM-DD
  onValueChange: (value: string) => void;
  enabled?: boolean;
  error?: string;
  maximumDate?: Date;
  minimumDate?: Date;
}

const DatePicker: React.FC<DatePickerProps> = React.memo(({
  label,
  placeholder = 'Select date',
  value,
  onValueChange,
  enabled = true,
  error,
  maximumDate,
  minimumDate,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parse value to Date object, or use today's date
  const getDateFromValue = useCallback((): Date => {
    if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    return new Date();
  }, [value]);

  const [selectedDate, setSelectedDate] = useState<Date>(getDateFromValue());

  const handleToggle = useCallback(() => {
    if (!enabled) return;
    setIsOpen(prev => {
      if (!prev) {
        // When opening, set the current date from value
        setSelectedDate(getDateFromValue());
      }
      return !prev;
    });
  }, [enabled, getDateFromValue]);

  const handleDateChange = useCallback((event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setIsOpen(false);
      if (event.type === 'set' && date) {
        formatAndSaveDate(date);
      }
      // On Android, the picker is a native dialog, so we don't need to manage showPicker state
      return;
    }
    
    // iOS handling
    if (event.type === 'set' && date) {
      setSelectedDate(date);
      // On iOS, we keep the picker open so user can confirm
    } else if (event.type === 'dismissed') {
      setIsOpen(false);
      // Reset to original value
      setSelectedDate(getDateFromValue());
    }
  }, [formatAndSaveDate, getDateFromValue]);

  const formatAndSaveDate = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    onValueChange(formattedDate);
  }, [onValueChange]);

  const handleConfirm = useCallback(() => {
    formatAndSaveDate(selectedDate);
    setIsOpen(false);
  }, [selectedDate, formatAndSaveDate]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    // Reset to original value
    setSelectedDate(getDateFromValue());
  }, [getDateFromValue]);

  const formatDisplayDate = useCallback((dateStr: string): string => {
    if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return '';
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, []);

  const displayValue = value ? formatDisplayDate(value) : '';

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={[
            styles.pickerButton,
            !enabled && styles.pickerButtonDisabled,
            error && styles.pickerButtonError,
            isOpen && styles.pickerButtonOpen,
          ]}
          onPress={handleToggle}
          disabled={!enabled}
          activeOpacity={0.7}
        >
          <Text style={[styles.pickerButtonText, !displayValue && styles.placeholderText]}>
            {displayValue || placeholder}
          </Text>
          <Ionicons 
            name="calendar-outline" 
            size={20} 
            color={error ? '#ff3b30' : isOpen ? '#ff6b6b' : '#666'} 
          />
        </TouchableOpacity>
        {error && <ErrorText message={error} />}
      </View>

      {Platform.OS === 'android' && isOpen && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}

      {Platform.OS === 'ios' && isOpen && (
        <Modal
          visible={isOpen}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <TouchableWithoutFeedback onPress={handleCancel}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select {label}</Text>
                    <TouchableOpacity onPress={handleCancel} activeOpacity={0.7}>
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.pickerContainer}>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      maximumDate={maximumDate}
                      minimumDate={minimumDate}
                      style={styles.datePicker}
                    />
                    <View style={styles.modalActions}>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.cancelButton]}
                        onPress={handleCancel}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, styles.confirmButton]}
                        onPress={handleConfirm}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.confirmButtonText}>Confirm</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </>
  );
});

DatePicker.displayName = 'DatePicker';

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
    paddingHorizontal: 18,
    height: 56,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pickerButtonDisabled: {
    backgroundColor: '#f9f9f9',
    opacity: 0.6,
  },
  pickerButtonError: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
  },
  pickerButtonOpen: {
    borderColor: '#ff6b6b',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
    fontWeight: '400',
  },
  placeholderText: {
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  pickerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  datePicker: {
    width: '100%',
    height: 200,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  confirmButton: {
    backgroundColor: '#ff6b6b',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default DatePicker;

