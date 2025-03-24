import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TextInput, Button, Modal, Image } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import React, { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
//firebase imports:
import {db} from './firebaseconfig'; 
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore"; 

export default function App() {
  // USE STATES 
  const [markers, setMarkers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentMarker, setCurrentMarker] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null); // State to store the selected image

  useEffect(() => {  // React hook that is run at the start of the app.
    getMarkersFromFirebase();
  }
  , []); // Empty array as second argument to only run once.

  // FIREBASE FUNCTIONS
  async function addMarkerToFirebase(marker) { 
    try{ 
      await addDoc(collection(db, "markers"), {  // adds a new document to the collection "markers" in the firestore database. Auto-gen id's.
        title: marker.title,
        description:  marker.description,
        image: marker.image,
        latitude: marker.coordinate.latitude,
        longitude: marker.coordinate.longitude,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Error adding document: ", e);
    }
  }
  async function getMarkersFromFirebase() {
    const markersCollection = await getDocs(collection(db, "markers"));  //todo
    markersCollection.forEach((doc) => {
      const marker = doc.data();
      const newMarker = {
        coordinate: { latitude: marker.latitude, longitude: marker.longitude },
        key: doc.id,
        title: marker.title,
        description: marker.description,
        image: marker.image,
      };
      setMarkers((prevMarkers) => [...prevMarkers, newMarker]);
    });

  }

  // MAP FUCTIONS
  function addMarker(data) {
    console.log("marker added");
    const { latitude, longitude } = data.nativeEvent.coordinate;
    const newMarker = {
      coordinate: { latitude, longitude },
      key: `${data.timeStamp}-${markers.length}`,
      title: "Butikkens navn",
      description: "Hvad er på tilbud: ",
      image: null, // Initialize with no image
    };

    setTimeout(() => {
      setMarkers((prevMarkers) => [...prevMarkers, newMarker]); // spread operator. Adds newMarker to the markers array
    }, 50);
  }

  function informationPopUp(marker) {
    setCurrentMarker(marker);
    setTitle(marker.title);
    setDescription(marker.description);
    setImage(marker.image); // Set the image for the modal
    setModalVisible(true);
  }

  function saveMarkerDetails() {
    if (currentMarker) {
      const updatedMarker = { ...currentMarker, title, description, image };
      setMarkers((prevMarkers) =>
        prevMarkers.map((m) => (m.key === currentMarker.key ? updatedMarker : m))
      );
      addMarkerToFirebase(updatedMarker);
      setModalVisible(false);
      setCurrentMarker(null);
    }
  }

  async function pickImage() {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      alert("Permission to access the media library is required!");
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!pickerResult.canceled) {
      setImage(pickerResult.assets[0].uri); // Update the image state
    }
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        onLongPress={addMarker}
        key={markers.length} // This is a hack to force a re-render of the map when a new marker is added. 
      >
        {markers.map((marker) => (
          <Marker
            coordinate={marker.coordinate}
            key={marker.key}
            title={marker.title}
            description={marker.description}
            onPress={() => informationPopUp(marker)} // Trigger informationPopUp on marker press. Tried with longpress incase you 
                                                    // wanted to just see the marker, but then the map just zooms in. Couldnt find a fix.  
          />
        ))}
      </MapView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text>Enter Marker Details</Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
            />
            {image && (
              <Image
                source={{ uri: image }}
                style={styles.imagePreview}
              />
            )}
            <Button title="Pick an Image" onPress={pickImage} />
            <Button title="Save" onPress={saveMarkerDetails} />
            <Button title="Cancel" onPress={() => setModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  input: {
    width: '100%',
    borderBottomWidth: 1,
    marginBottom: 10,
    padding: 5,
  },
  imagePreview: {
    width: 100,
    height: 100,
    marginBottom: 10,
    borderRadius: 10,
  },
});
