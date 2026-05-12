import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  Image,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function CadastroVisitaScreen() {
  const [locationName, setLocationName] = useState("");
  const [observation, setObservation] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
    requestPermissions();
  }, []);

  const loadUserData = async () => {
    const userJson = await AsyncStorage.getItem("currentUser");
    if (userJson) {
      setCurrentUser(JSON.parse(userJson));
    }
  };

  const requestPermissions = async () => {
    await requestCameraPermission();
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      const currentLoc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: currentLoc.coords.latitude,
        longitude: currentLoc.coords.longitude,
      });
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: false,
        });
        setPhotoUri(photo.uri);
        setIsCameraVisible(false);
      } catch (error) {
        Alert.alert("Erro", "Falha ao capturar foto.");
      }
    }
  };

  const handleSave = async () => {
    if (!locationName || !photoUri || !location) {
      Alert.alert("Erro", "Preencha o local, tire uma foto e selecione a localização no mapa.");
      return;
    }

    const novaVisita = {
      id: Date.now().toString(),
      locationName,
      observation,
      photoUri,
      latitude: location.latitude,
      longitude: location.longitude,
      dateTime: new Date().toISOString(),
      funcionario: currentUser?.name || "Desconhecido",
    };

    try {
      const existingVisitsJson = await AsyncStorage.getItem("visitas");
      const visits = existingVisitsJson ? JSON.parse(existingVisitsJson) : [];
      visits.push(novaVisita);
      await AsyncStorage.setItem("visitas", JSON.stringify(visits));

      Alert.alert("Sucesso", "Visita registrada com sucesso!");
      // Limpar formulário
      setLocationName("");
      setObservation("");
      setPhotoUri(null);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar a visita.");
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("currentUser");
    router.replace("/login");
  };

  if (isCameraVisible) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView style={styles.camera} ref={cameraRef} />
        <View style={styles.cameraOverlay}>
          <TouchableOpacity 
            style={styles.closeCameraButton} 
            onPress={() => setIsCameraVisible(false)}
          >
            <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>Fechar</Text>
          </TouchableOpacity>

          <View style={styles.cameraBottomButtons}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <MaterialCommunityIcons name="camera" size={40} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Nova Visita Técnica</Text>
          {currentUser && <Text style={styles.subtitle}>Funcionário: {currentUser.name}</Text>}
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Nome do Local</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Fábrica Central"
        value={locationName}
        onChangeText={setLocationName}
      />

      <Text style={styles.label}>Observação</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Descreva a atividade..."
        multiline
        value={observation}
        onChangeText={setObservation}
      />

      <Text style={styles.label}>Foto do Local (Obrigatório)</Text>
      <View style={styles.photoSection}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <MaterialCommunityIcons name="image-off" size={40} color="#ccc" />
          </View>
        )}
        <TouchableOpacity 
          style={styles.cameraButton} 
          onPress={() => setIsCameraVisible(true)}
        >
          <MaterialCommunityIcons name="camera-plus" size={24} color="white" />
          <Text style={styles.cameraButtonText}>Abrir Câmera</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Localização (Clique para ajustar)</Text>
      <View style={styles.mapContainer}>
        {location && (
          <MapView
            style={styles.map}
            initialRegion={{
              ...location,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            onPress={(e) => setLocation(e.nativeEvent.coordinate)}
          >
            <Marker coordinate={location} title="Local da Visita" />
          </MapView>
        )}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>SALVAR VISITA</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 5,
    marginTop: 15,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  photoSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraButton: {
    flex: 1,
    backgroundColor: "#007AFF",
    height: 50,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  cameraButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ddd",
    marginTop: 5,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  saveButton: {
    backgroundColor: "#34C759",
    height: 55,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 20,
  },
  cameraBottomButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: "white",
  },
  closeCameraButton: {
    alignSelf: "flex-end",
    marginTop: 30,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 5,
  },
});
