import React, { useState } from "react";
import { 
  View, 
  StyleSheet,
  Alert
} from "react-native";
import axios from "axios";
import WebCameraCapture from "./WebCameraCapture";
import { ActivityIndicator } from "react-native";

const PriceTagCapture: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const uploadImage = async (base64Image: string) => {
    // Log the full base64 image to check its format
    console.log('Base64 Image Length:', base64Image.length);
    console.log('Base64 Image Prefix:', base64Image.slice(0, 50));
  
    const cleanBase64 = base64Image.includes(',') 
      ? base64Image.split(',')[1] 
      : base64Image;
  
    console.log('Clean Base64 Length:', cleanBase64.length);
  
    setIsLoading(true);
  
    try {
      const response = await axios.post('http://localhost:8080/api/price-tag/ocr', {
        imageBase64: cleanBase64,
        storeId: '92d3ef91-f850-4d09-9a54-769eda9d5989'
      }, {
        // Add more detailed error handling
        validateStatus: function (status) {
          return status >= 200 && status < 300; // Default
        }
      });
  
      console.log('Upload Response:', response.data);
      
      // Rest of the code remains the same...
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Log more detailed error information
        console.error('Detailed Axios Error:', {
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers
        });
  
        Alert.alert(
          'Upload Error', 
          error.response?.data?.error || 'Failed to upload image. Please try again.'
        );
      } else {
        Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Render loading indicator if processing
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebCameraCapture onCapture={uploadImage} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default PriceTagCapture;