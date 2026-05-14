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
  Modal,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const API_URL = "http://192.168.137.1:8000/api";
const VISITS_STORAGE_KEY = "visitas";

type VisitStatus = "pending" | "synced" | "failed";

type LocalVisit = {
  id: string;
  client_id: string;
  locationName: string;
  observation: string;
  photoUri: string;
  latitude: number;
  longitude: number;
  dateTime: string;
  funcionario: string;
  synced: boolean;
  status: VisitStatus;
  serverId?: number;
};

export default function CadastroVisitaScreen() {
  const [locationName, setLocationName] = useState("");
  const [observation, setObservation] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isMapModalVisible, setIsMapModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
    requestPermissions();
    syncPendingVisits();
  }, []);

  const getStoredVisits = async (): Promise<LocalVisit[]> => {
    const visitsJson = await AsyncStorage.getItem(VISITS_STORAGE_KEY);
    const visits = visitsJson ? JSON.parse(visitsJson) : [];

    return visits.map((visit: any) => {
      const localId = visit.id || Date.now().toString();

      return {
        ...visit,
        id: localId,
        client_id: visit.client_id || localId,
        synced: visit.synced === true,
        status: visit.synced === true ? "synced" : visit.status || "pending",
      };
    });
  };

  const saveStoredVisits = async (visits: LocalVisit[]) => {
    await AsyncStorage.setItem(VISITS_STORAGE_KEY, JSON.stringify(visits));
    setPendingCount(visits.filter((visit) => !visit.synced).length);
  };

  const updatePendingCount = async () => {
    const visits = await getStoredVisits();
    setPendingCount(visits.filter((visit) => !visit.synced).length);
  };

  const loadUserData = async () => {
    const userJson = await AsyncStorage.getItem("currentUser");
    if (userJson) {
      setCurrentUser(JSON.parse(userJson));
    }
    updatePendingCount();
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

  const buildVisitFormData = (visit: LocalVisit) => {
    const formData = new FormData();

    formData.append("client_id", visit.client_id);
    formData.append("location_name", visit.locationName);
    formData.append("observation", visit.observation);
    formData.append("latitude", String(visit.latitude));
    formData.append("longitude", String(visit.longitude));
    formData.append("visit_date", visit.dateTime);
    formData.append("photo", {
      uri: visit.photoUri,
      type: "image/jpeg",
      name: `visit-${visit.client_id}.jpg`,
    } as any);

    return formData;
  };

  const sendVisitToApi = async (visit: LocalVisit, token: string) => {
    const response = await fetch(`${API_URL}/visits`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: buildVisitFormData(visit),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Falha ao sincronizar visita");
    }

    return data;
  };

  const syncPendingVisits = async () => {
    if (isSyncing) {
      return { synced: 0, failed: 0 };
    }

    const token = await AsyncStorage.getItem("authToken");

    if (!token) {
      await updatePendingCount();
      return { synced: 0, failed: 0 };
    }

    setIsSyncing(true);

    try {
      const visits = await getStoredVisits();
      let synced = 0;
      let failed = 0;

      for (const visit of visits) {
        if (visit.synced) {
          continue;
        }

        try {
          const result = await sendVisitToApi(visit, token);
          visit.synced = true;
          visit.status = "synced";
          visit.serverId = result.data?.id;
          synced += 1;
        } catch (error) {
          visit.synced = false;
          visit.status = "failed";
          failed += 1;
        }
      }

      await saveStoredVisits(visits);
      return { synced, failed };
    } finally {
      setIsSyncing(false);
    }
  };

  const resetForm = () => {
    setLocationName("");
    setObservation("");
    setPhotoUri(null);
  };

  const handleSave = async () => {
    const trimmedLocationName = locationName.trim();

    if (!trimmedLocationName || !photoUri || !location) {
      Alert.alert(
        "Erro",
        "Preencha o local, tire uma foto e selecione a localizacao no mapa.",
      );
      return;
    }

    const localId = Date.now().toString();
    const novaVisita: LocalVisit = {
      id: localId,
      client_id: localId,
      locationName: trimmedLocationName,
      observation: observation.trim(),
      photoUri,
      latitude: location.latitude,
      longitude: location.longitude,
      dateTime: new Date().toISOString(),
      funcionario: currentUser?.name || "Desconhecido",
      synced: false,
      status: "pending",
    };

    try {
      const visits = await getStoredVisits();
      visits.push(novaVisita);
      await saveStoredVisits(visits);

      const result = await syncPendingVisits();
      resetForm();

      if (result.synced > 0 && result.failed === 0) {
        Alert.alert("Sucesso", "Visita registrada e sincronizada com sucesso!");
      } else {
        Alert.alert(
          "Salvo offline",
          "A visita foi salva na lista de pendentes e sera sincronizada quando houver conexao.",
        );
      }
    } catch (error) {
      Alert.alert("Erro", "Nao foi possivel salvar a visita.");
    }
  };

  const handleManualSync = async () => {
    const result = await syncPendingVisits();
    Alert.alert(
      "Sincronizacao",
      result.synced > 0
        ? `${result.synced} visita(s) sincronizada(s).`
        : "Nenhuma visita pendente foi sincronizada agora.",
    );
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("currentUser");
    await AsyncStorage.removeItem("authToken");
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
            <Text style={{ color: "white", fontSize: 18, fontWeight: "bold" }}>
              Fechar
            </Text>
          </TouchableOpacity>

          <View style={styles.cameraBottomButtons}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePicture}
            >
              <MaterialCommunityIcons name="camera" size={40} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Nova Visita Tecnica</Text>
          {currentUser && (
            <Text style={styles.subtitle}>Funcionario: {currentUser.name}</Text>
          )}
          <Text style={styles.syncInfo}>
            {pendingCount > 0
              ? `${pendingCount} visita(s) pendente(s)`
              : "Tudo sincronizado"}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleManualSync}
            disabled={isSyncing}
          >
            <MaterialCommunityIcons
              name={isSyncing ? "sync" : "cloud-sync-outline"}
              size={24}
              color="#007AFF"
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.label}>Nome do Local</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Fabrica Central"
        value={locationName}
        onChangeText={setLocationName}
      />

      <Text style={styles.label}>Observacao</Text>
      <TextInput
        style={[styles.input, { height: 80 }]}
        placeholder="Descreva a atividade..."
        multiline
        value={observation}
        onChangeText={setObservation}
      />

      <Text style={styles.label}>Foto do Local (Obrigatorio)</Text>
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
          <Text style={styles.cameraButtonText}>Abrir Camera</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Localizacao (Clique para ajustar)</Text>
      <TouchableOpacity
        style={styles.mapButton}
        onPress={() => setIsMapModalVisible(true)}
      >
        <MaterialCommunityIcons name="map" size={24} color="white" />
        <Text style={styles.mapButtonText}>
          {location ? "Editar Localizacao" : "Selecionar Localizacao"}
        </Text>
      </TouchableOpacity>
      {location && (
        <Text style={styles.locationInfo}>
          Lat: {location.latitude.toFixed(4)}, Long:{" "}
          {location.longitude.toFixed(4)}
        </Text>
      )}

      <Modal
        visible={isMapModalVisible}
        animationType="slide"
        onRequestClose={() => setIsMapModalVisible(false)}
      >
        <View style={styles.mapModalContainer}>
          <View style={styles.mapModalHeader}>
            <Text style={styles.mapModalTitle}>Selecionar Localizacao</Text>
            <TouchableOpacity onPress={() => setIsMapModalVisible(false)}>
              <MaterialCommunityIcons name="close" size={28} color="#333" />
            </TouchableOpacity>
          </View>

          {location && (
            <MapView
              style={styles.fullMap}
              initialRegion={{
                ...location,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={(e) => setLocation(e.nativeEvent.coordinate)}
            >
              <Marker coordinate={location} title="Local da Visita" />
            </MapView>
          )}

          <View style={styles.mapModalFooter}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setIsMapModalVisible(false)}
            >
              <Text style={styles.confirmButtonText}>CONFIRMAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    padding: 8,
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
  syncInfo: {
    fontSize: 12,
    color: "#007AFF",
    marginTop: 2,
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
  mapButton: {
    backgroundColor: "#007AFF",
    height: 50,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 5,
  },
  mapButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  locationInfo: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
    paddingHorizontal: 10,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 50,
  },
  mapModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  fullMap: {
    flex: 1,
    width: "100%",
  },
  mapModalFooter: {
    padding: 20,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  confirmButton: {
    backgroundColor: "#34C759",
    height: 55,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  confirmButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
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
