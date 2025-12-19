import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { ActiveCase } from '../../hooks/useActiveCase';
import { styles } from '../../screens/styles';

interface FloatingChatButtonProps {
    activeCase: ActiveCase | null;
}

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ activeCase }) => {
    const router = useRouter();

    if (!activeCase) return null;

    return (
        <TouchableOpacity
            style={styles.floatingChatHead}
            activeOpacity={0.8}
            onPress={() => {
                router.push({
                    pathname: '/screens/ChatScreen',
                    params: {
                        report_id: activeCase.report_id,
                        office_name: (activeCase as any).office_name || 'Police Station',
                    },
                } as any);
            }}
        >
            <Ionicons name="chatbubbles" size={26} color="#FFFFFF" />
        </TouchableOpacity>
    );
};

export default FloatingChatButton;
