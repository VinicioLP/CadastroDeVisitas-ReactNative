import React, { useState, useEffect } from "react";
import { StyleSheet, FlatList, View, Text, Image, TouchableOpacity } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function ListVisitasScreen() {
  const [visitas, setVisitas] = useState<any[]>([]);
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadVisitas();
    });
    return unsubscribe;
  }, [navigation]);

  const loadVisitas = async () => {
    const visitsJson = await AsyncStorage.getItem("visitas");
    if (visitsJson) {
      setVisitas(JSON.parse(visitsJson).reverse());
    }
  };

  const clearVisits = async () => {
    await AsyncStorage.removeItem("visitas");
    setVisitas([]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.photoUri }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.locationName}</Text>
        <Text style={styles.cardText}>📅 {new Date(item.dateTime).toLocaleDateString()} {new Date(item.dateTime).toLocaleTimeString()}</Text>
        <Text style={styles.cardText}>👤 {item.funcionario}</Text>
        <Text style={styles.cardText} numberOfLines={2}>📝 {item.observation}</Text>
        <Text style={styles.cardCoords}>📍 {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Visitas Técnicas</Text>
        <TouchableOpacity onPress={clearVisits}>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      {visitas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>Nenhuma visita registrada ainda.</Text>
        </View>
      ) : (
        <FlatList
          data={visitas}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 15 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingTop: 50,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    flexDirection: "row",
    marginBottom: 15,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardImage: {
    width: 100,
    height: "100%",
    minHeight: 120,
  },
  cardContent: {
    flex: 1,
    padding: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  cardCoords: {
    fontSize: 12,
    color: "#007AFF",
    marginTop: 4,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    marginTop: 10,
    color: "#999",
    fontSize: 16,
  },
});
