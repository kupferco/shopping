import React, { useRef, useState, useEffect } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import Webcam from 'react-webcam';

interface WebCameraCaptureProps {
  onCapture: (image: string) => void;
}

const WebCameraCapture: React.FC<WebCameraCaptureProps> = ({ onCapture }) => {
  const webcamRef = useRef<Webcam>(null);
  const containerRef = useRef<View>(null);
  const flashOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const container = containerRef.current;
    
    const handleClick = (event: MouseEvent) => {
      event.preventDefault();
      
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot();
        
        if (imageSrc) {
          // Trigger flash animation
          Animated.sequence([
            Animated.timing(flashOpacity, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true
            }),
            Animated.timing(flashOpacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true
            })
          ]).start();

          // Call the onCapture prop with the image
          onCapture(imageSrc);
        }
      }
    };

    // Use addEventListener for web-specific click handling
    const containerElement = containerRef.current as unknown as HTMLDivElement;
    containerElement?.addEventListener('click', handleClick);

    return () => {
      containerElement?.removeEventListener('click', handleClick);
    };
  }, [onCapture]);

  return (
    <View 
      ref={containerRef}
      style={styles.container}
    >
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          facingMode: "environment",
          width: { ideal: Dimensions.get('window').height },
          height: { ideal: Dimensions.get('window').width }
        }}
        style={styles.webcam}
      />
      
      <Animated.View 
        style={[
          styles.flashOverlay, 
          { 
            opacity: flashOpacity,
          }
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  webcam: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as any,
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 10,
  },
});

export default WebCameraCapture;