import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  inputContainerError: {
    borderColor: '#ff3b30',
  },
  iconContainer: {
    paddingLeft: 15,
    paddingRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#1a1a1a',
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  error: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 5,
    marginLeft: 5,
  },
});

