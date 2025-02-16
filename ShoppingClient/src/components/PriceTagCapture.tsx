import React, { useState } from "react";
import { 
  View, 
  StyleSheet 
} from "react-native";
import axios from "axios";
import WebCameraCapture from "./WebCameraCapture";

const PriceTagCapture: React.FC = () => {
  const uploadImage = async (base64Image: string) => {
    try {
      const response = await axios.post('http://localhost:8080/api/price-tag/ocr', {
        imageBase64: base64Image.split(',')[1], // Remove data URL prefix
        storeId: 'your-store-id-here'
      });

      console.log('Upload response:', response.data);
    } catch (error) {
      console.error('Image upload error:', error);
    }
  };

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