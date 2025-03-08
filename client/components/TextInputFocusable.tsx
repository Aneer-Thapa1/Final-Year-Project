// components/TextInputFocusable.tsx
import React, { useState, useRef, useEffect } from 'react';
import { TextInput, AppState, TextInputProps, NativeSyntheticEvent, TextInputFocusEventData } from 'react-native';

interface TextInputFocusableProps extends TextInputProps {
    // Add any custom props here
}

// Enhanced TextInput that forces focus to prevent keyboard dismissal
const TextInputFocusable: React.FC<TextInputFocusableProps> = (props) => {
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<TextInput | null>(null);

    // Track app state to handle background/foreground transitions
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'active' && isFocused) {
                // Re-focus when app comes back to foreground
                setTimeout(() => {
                    if (inputRef.current) {
                        inputRef.current.focus();
                    }
                }, 100);
            }
        });

        return () => {
            subscription.remove();
        };
    }, [isFocused]);

    // Periodic focus check to ensure keyboard stays visible
    useEffect(() => {
        let focusInterval: NodeJS.Timeout | undefined;

        if (isFocused) {
            focusInterval = setInterval(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 250); // Check focus every 250ms
        }

        return () => {
            if (focusInterval) clearInterval(focusInterval);
        };
    }, [isFocused]);

    const handleFocus = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        setIsFocused(true);
        if (props.onFocus) props.onFocus(e);
    };

    const handleBlur = (e: NativeSyntheticEvent<TextInputFocusEventData>) => {
        // Prevent blur by quickly re-focusing
        if (isFocused && inputRef.current) {
            setTimeout(() => {
                if (inputRef.current && isFocused) {
                    inputRef.current.focus();
                }
            }, 50);
        }

        if (props.onBlur) props.onBlur(e);
    };

    return (
        <TextInput
            {...props}
            ref={inputRef}
            onFocus={handleFocus}
            onBlur={handleBlur}
            blurOnSubmit={false}
            caretHidden={false}
            autoCapitalize="none"
            autoCorrect={false}
            disableFullscreenUI={true}
            spellCheck={false}
        />
    );
};

export default TextInputFocusable;