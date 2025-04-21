import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal
} from 'react-native';
import { X } from 'lucide-react-native';

interface TagsModalProps {
    visible: boolean;
    onClose: () => void;
    tags: string[];
    isDark: boolean;
    onAddTag: (tag: string) => void;
    onRemoveTag: (index: number) => void;
}

const TagsModal: React.FC<TagsModalProps> = ({
                                                 visible,
                                                 onClose,
                                                 tags = [],
                                                 isDark,
                                                 onAddTag,
                                                 onRemoveTag
                                             }) => {
    const [newTag, setNewTag] = useState('');

    // Reset new tag when modal opens/closes
    useEffect(() => {
        if (!visible) {
            setNewTag('');
        }
    }, [visible]);

    const handleAddTag = () => {
        const trimmedTag = newTag.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            onAddTag(trimmedTag);
            setNewTag('');
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                className="flex-1 justify-center bg-black/50 p-4"
                activeOpacity={1}
                onPress={onClose}
            >
                <View className={`rounded-xl overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                    <View className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                        <Text className={`text-base font-montserrat-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Manage Tags
                        </Text>
                    </View>
                    <View className="p-4">
                        {/* Existing Tags */}
                        <View className="flex-row flex-wrap mt-2 gap-2 mb-4">
                            {tags.map((tag, index) => (
                                <View
                                    key={`${tag}-${index}`}
                                    className={`flex-row items-center rounded-full px-3 py-1.5 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
                                >
                                    <Text className={`mr-1 font-montserrat ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {tag}
                                    </Text>
                                    <TouchableOpacity onPress={() => onRemoveTag(index)}>
                                        <X size={14} color={isDark ? '#d1d5db' : '#4b5563'} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        {/* Add New Tag */}
                        <View className="flex-row items-center">
                            <TextInput
                                value={newTag}
                                onChangeText={setNewTag}
                                placeholder="Add new tag"
                                placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
                                className={`flex-1 px-3 py-2 rounded-lg mr-2 font-montserrat ${
                                    isDark ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-900'
                                }`}
                                onSubmitEditing={handleAddTag}
                                returnKeyType="done"
                            />
                            <TouchableOpacity
                                className="bg-green-500 rounded-lg px-3 py-2"
                                onPress={handleAddTag}
                            >
                                <Text className="text-white font-montserrat-medium">Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

export default TagsModal;