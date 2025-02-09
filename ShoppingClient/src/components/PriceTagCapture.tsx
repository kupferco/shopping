import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet 
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { AlertNotificationRoot, Toast } from 'react-native-alert-notification';

const PriceTagCapture: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [type] = useState<CameraType>(CameraType.back);
  const cameraRef = useRef<Camera | null>(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7
      });
      setImage(photo.uri);
      uploadImage(photo.base64);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      base64: true,
      quality: 0.7
    });

    if (!result.cancelled) {
      setImage(result.uri);
      uploadImage(result.base64);
    }
  };

  const uploadImage = async (base64Image?: string) => {
    if (!base64Image) return;

    try {
      const response = await axios.post('http://localhost:8080/api/price-tag/ocr', {
        imageBase64: base64Image,
        storeId: 'your-store-id-here'
      });

      console.log('Upload response:', response.data);
      
      Toast.show({
        type: 'success',
        title: 'Success',
        textBody: `Product ${response.data.productName} added/updated`
      });
    } catch (error) {
      console.error('Image upload error:', error);
      
      Toast.show({
        type: 'danger',
        title: 'Error',
        textBody: 'Could not process the price tag. Please try again.'
      });
    }
  };

  const renderCamera = () => {
    if (cameraPermission === null) {
      return <View />;
    }
    if (cameraPermission === false) {
      return <Text>No access to camera</Text>;
    }
    return (
      <Camera 
        style={styles.camera} 
        type={type} 
        ref={cameraRef}
      >
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={takePicture}
          >
            <Text style={styles.buttonText}>Capture</Text>
          </TouchableOpacity>
        </View>
      </Camera>
    );
  };

  return (
    <AlertNotificationRoot>
      <View style={styles.container}>
        {!image ? (
          renderCamera()
        ) : (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: image }} 
              style={styles.image} 
            />
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.button}
                onPress={() => setImage(null)}
              >
                <Text style={styles.buttonText}>Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.button}
                onPress={pickImage}
              >
                <Text style={styles.buttonText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </AlertNotificationRoot>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: '80%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '90%',
    height: '80%',
    resizeMode: 'contain',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    padding: 20,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  }
});

export default PriceTagCapture;