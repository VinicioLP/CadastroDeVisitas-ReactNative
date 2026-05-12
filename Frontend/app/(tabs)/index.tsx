import { StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import EditScreenInfo from "@/components/EditScreenInfo";
import { Text, View } from "@/components/Themed";

export default function TabOneScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    await AsyncStorage.removeItem("currentUser");
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bem-vindo ao Cadastro de Visitas</Text>
      <View
        style={styles.separator}
        lightColor="#eee"
        darkColor="rgba(255,255,255,0.1)"
      />

      <TouchableOpacity
        style={{
          backgroundColor: "#FF3B30",
          padding: 15,
          borderRadius: 8,
          marginTop: 20,
        }}
        onPress={handleLogout}
      >
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Sair</Text>
      </TouchableOpacity>

      <EditScreenInfo path="app/(tabs)/index.tsx" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
});
