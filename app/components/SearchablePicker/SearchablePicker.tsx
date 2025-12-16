import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

interface SearchablePickerProps {
  label: string;
  placeholder: string;
  value: string;
  data: string[];
  onValueChange: (value: string) => void;
  enabled?: boolean;
  error?: string;
}

const SearchablePicker: React.FC<SearchablePickerProps> = React.memo(({
  label,
  placeholder,
  value,
  data,
  onValueChange,
  enabled = true,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      console.log('SearchablePicker: data is not an array', data);
      return [];
    }
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(item => item.toLowerCase().includes(query));
  }, [data, searchQuery]);

  const handleSelect = useCallback((item: string) => {
    onValueChange(item);
    setIsOpen(false);
    setSearchQuery('');
  }, [onValueChange]);

  const handleToggle = useCallback(() => {
    if (enabled) {
      console.log('SearchablePicker: Toggling modal, data length:', data?.length);
      setIsOpen(prev => {
        const newState = !prev;
        if (newState) {
          setSearchQuery('');
        }
        return newState;
      });
    }
  }, [enabled, data]);

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

                  <View style={styles.searchContainer}>
                    <Ionicons name="search" size={18} color="#666" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder={`Search ${label.toLowerCase()}...`}
                      placeholderTextColor="#999"
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                        <Ionicons name="close-circle" size={18} color="#999" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.listContainer}>
                    {filteredData.length > 0 ? (
                      <FlatList
                        data={filteredData}
                        renderItem={renderItem}
                        keyExtractor={keyExtractor}
                        style={styles.list}
                        contentContainerStyle={styles.listContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                      />
                    ) : (
                      <View style={styles.emptyContainer}>
                        <Ionicons name="search-outline" size={40} color="#ccc" />
                        <Text style={styles.emptyText}>
                          {data && data.length > 0 ? 'No results found' : 'No data available'}
                        </Text>
                      </View>
                    )}
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

SearchablePicker.displayName = 'SearchablePicker';

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
    maxHeight: '80%',
    flexDirection: 'column',
    minHeight: 400,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginHorizontal: 20,
    marginVertical: 15,
    paddingHorizontal: 12,
    height: 45,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    padding: 0,
  },
  listContainer: {
    flex: 1,
    minHeight: 300,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 10,
    flexGrow: 1,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
});

export default SearchablePicker;

