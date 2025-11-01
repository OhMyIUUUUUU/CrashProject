import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { styles } from './styles';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

const PrimaryButton: React.FC<PrimaryButtonProps> = React.memo(({ 
  title, 
  loading, 
  variant = 'primary',
  disabled,
  ...props 
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'outline' && styles.buttonOutline,
        (disabled || loading) && styles.buttonDisabled,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? '#ff6b6b' : '#fff'} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === 'secondary' && styles.buttonTextSecondary,
            variant === 'outline' && styles.buttonTextOutline,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
});

PrimaryButton.displayName = 'PrimaryButton';

export default PrimaryButton;

