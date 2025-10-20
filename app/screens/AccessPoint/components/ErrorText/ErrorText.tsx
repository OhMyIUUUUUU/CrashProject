import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface ErrorTextProps {
  message?: string;
}

const ErrorText: React.FC<ErrorTextProps> = React.memo(({ message }) => {
  if (!message) return null;
  
  return <Text style={styles.error}>{message}</Text>;
});

ErrorText.displayName = 'ErrorText';

const styles = StyleSheet.create({
  error: {
    fontSize: 14,
    color: '#ff3b30',
    textAlign: 'center',
    marginVertical: 10,
    paddingHorizontal: 20,
  },
});

export default ErrorText;

