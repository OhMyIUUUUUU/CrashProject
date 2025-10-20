import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { styles } from './styles';

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  icon?: React.ReactNode;
}

const InputField: React.FC<InputFieldProps> = React.memo(({ 
  label, 
  error, 
  icon, 
  ...props 
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          style={[styles.input, icon ? styles.inputWithIcon : undefined]}
          placeholderTextColor="#999"
          {...props}
        />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
});

InputField.displayName = 'InputField';

export default InputField;

