import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

interface SimplePickerProps {
  label: string;
  placeholder: string;
  value: string;
  data: string[];
  onValueChange: (value: string) => void;
  enabled?: boolean;
  error?: string;
}

const SimplePicker: React.FC<SimplePickerProps> = React.memo(({
  label,
  placeholder,
  value,
  data,
  onValueChange,
  enabled = true,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback((item: string) => {
    onValueChange(item);
    setIsOpen(false);
  }, [onValueChange]);

  const handleToggle = useCallback(() => {
    if (enabled) {
      setIsOpen(prev => !prev);
    }
  }, [enabled]);

  const renderItem = useCallback(({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.dropdownItem, value === item && styles.selectedItem]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <Text style={[styles.itemText, value === item && styles.selectedItemText]}>
        {item}
      </Text>
      {value === item && (
        <Ionicons name="checkmark-circle" size={18} color="#ff6b6b" />
      )}
    </TouchableOpacity>
  ), [value, handleSelect]);

  const keyExtractor = useCallback((item: string, index: number) => `${item}-${index}`, []);

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
          <Text style={[styles.pickerButtonText, !value && styles.placeholderText]}>
            {value || placeholder}
          </Text>
          <Ionicons 
            name={isOpen ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={enabled ? "#666" : "#ccc"} 
          />
        </TouchableOpacity>
        {error && !isOpen && <Text style={styles.errorText}>{error}</Text>}
      </View>

      {isOpen && (
        <Modal
          visible={isOpen}
          transparent={true}
          animationType="none"
          onRequestClose={handleToggle}
        >
          <TouchableWithoutFeedback onPress={handleToggle}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select {label}</Text>
                    <TouchableOpacity onPress={handleToggle} activeOpacity={0.7}>
                      <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    style={styles.list}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </>
  );
});

SimplePicker.displayName = 'SimplePicker';

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
  errorText: {
    fontSize: 13,
    color: '#ff3b30',
    marginTop: 8,
    marginLeft: 4,
    fontWeight: '500',
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
    maxHeight: '50%',
    paddingBottom: 20,
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
  list: {
    flexGrow: 0,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedItem: {
    backgroundColor: '#ff6b6b10',
  },
  itemText: {
    fontSize: 16,
    color: '#1a1a1a',
    flex: 1,
  },
  selectedItemText: {
    color: '#ff6b6b',
    fontWeight: '600',
  },
});

export default SimplePicker;

