// TextConversation.tsx
import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Button, ScrollView, Text, StyleSheet } from 'react-native';
import { API_URL } from '@env';

interface ServerMessage {
    role: string;
    text: string;
}

interface TextConversationProps {
    sessionId: string | null;
    history: ServerMessage[];
}

const TextConversation: React.FC<TextConversationProps> = ({ sessionId, history }) => {
    const [messages, setMessages] = useState<ServerMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<TextInput | null>(null);
    const scrollViewRef = useRef<ScrollView | null>(null);

    // Load initial history
    useEffect(() => {
        setMessages(history);
    }, [history]);

    const handleSendMessage = async () => {
        if (!userInput.trim() || !sessionId) return;

        setMessages((prev) => [...prev, { role: 'user', text: userInput }]);
        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/gemini`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, inputText: userInput }),
            });

            if (!response.ok) {
                console.error('Failed to send message.');
                return;
            }

            const data = await response.json();
            setMessages((prev) => [...prev, { role: 'assistant', text: data.response }]);
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setUserInput('');
            inputRef.current?.focus();
            setLoading(false);
        }
    };

    const handleKeyDown = (event: any) => {
        if (event.nativeEvent.key === 'Enter' && !event.nativeEvent.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    useEffect(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
        }
    }, [messages]);

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
            >
                {messages.map((message, index) => (
                    <View
                        key={index}
                        style={[
                            styles.message,
                            message.role === 'user' ? styles.userMessage : styles.agentMessage,
                        ]}
                    >
                        <Text>{message.text}</Text>
                    </View>
                ))}
                {loading && <Text style={styles.loadingText}>Loading...</Text>}
            </ScrollView>
            <View style={styles.inputContainer}>
                <TextInput
                    ref={inputRef}
                    value={userInput}
                    onChangeText={setUserInput}
                    onKeyPress={handleKeyDown}
                    placeholder="Type your message here"
                    style={styles.textInput}
                    multiline
                />
                <Button
                    onPress={handleSendMessage}
                    title={loading ? 'Sending...' : 'Send'}
                    disabled={loading}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: 10,
    },
    message: {
        marginVertical: 5,
    },
    userMessage: {
        alignSelf: 'flex-end',
    },
    agentMessage: {
        alignSelf: 'flex-start',
    },
    loadingText: {
        fontStyle: 'italic',
        alignSelf: 'flex-start',
        marginVertical: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderColor: '#ccc',
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginRight: 10,
    },
});

export default TextConversation;
