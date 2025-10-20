import React from 'react';
import { Text, View } from 'react-native';
import { styles } from './styles';

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
}

const AuthHeader: React.FC<AuthHeaderProps> = React.memo(({ title, subtitle }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
});

AuthHeader.displayName = 'AuthHeader';

export default AuthHeader;

