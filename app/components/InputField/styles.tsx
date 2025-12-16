import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
  },
  iconContainer: {
    paddingLeft: 18,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '400',
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  error: {
    fontSize: 13,
    color: '#ff3b30',
    marginTop: 8,
    marginLeft: 4,
    fontWeight: '500',
  },
});

