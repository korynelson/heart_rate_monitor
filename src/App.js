import React, { useState } from 'react';
import './App.css';

// Mapping of known characteristic UUIDs to descriptions
const CHARACTERISTIC_UUIDS = {
  "2a37": { name: "Heart Rate Measurement", description: "Measures the heart rate and sends notifications." },
  "2a19": { name: "Battery Level", description: "Represents the device's battery level as a percentage." },
  // Add more UUIDs as needed
};

function App() {
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [heartRate, setHeartRate] = useState(null); // State to track heart rate
  const [errorMessage, setErrorMessage] = useState(null); 

  const requestBluetoothDevice = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'generic_access',
          'battery_service',
          'device_information',
          'heart_rate' // Ensure the heart rate service UUID is included
        ],
      });
      console.log('Bluetooth device selected');
  
      if (!device) {
        throw new Error("No device selected or device is null");
      }
  
      if (!device.gatt) {
        console.error("Selected device does not support GATT:", device);
        throw new Error("Selected device does not support GATT");
      }
  
      const server = await device.gatt.connect();
      console.log("Connected to GATT server:", server);
  
      const services = await server.getPrimaryServices();
      console.log("Primary services retrieved:", services);
  
      // Find and handle the heart rate measurement characteristic
      const heartRateService = await server.getPrimaryService('heart_rate'); // Use the standard service UUID
      const heartRateCharacteristic = await heartRateService.getCharacteristic('00002a37-0000-1000-8000-00805f9b34fb'); // Use the full UUID
  
      // Subscribe to heart rate notifications
      await heartRateCharacteristic.startNotifications();
      heartRateCharacteristic.addEventListener('characteristicvaluechanged', handleHeartRateMeasurement);
  
      // Get device information
      const connectInfo = {
        name: device.name || 'Unknown Device',
        id: device.id,
        services: await Promise.all(services.map(async (service) => {
          const characteristics = await service.getCharacteristics();
          return {
            uuid: service.uuid,
            characteristics: await Promise.all(characteristics.map(async (characteristic) => {
              const properties = characteristic.properties;
  
              let descriptorDetails = [];
              try {
                const descriptors = await characteristic.getDescriptors();
                descriptorDetails = await Promise.all(descriptors.map(async (descriptor) => {
                  const value = await descriptor.readValue();
                  return {
                    uuid: descriptor.uuid,
                    value: new TextDecoder().decode(value),
                  };
                }));
              } catch (descriptorError) {
                console.error("Error reading descriptors:", descriptorError);
              }
  
              const uuid = characteristic.uuid.slice(4, 8);
              const knownCharacteristic = CHARACTERISTIC_UUIDS[uuid] || { name: "Unknown Characteristic", description: "" };
  
              return {
                uuid: characteristic.uuid,
                name: knownCharacteristic.name,
                description: knownCharacteristic.description,
                properties: {
                  read: properties.read,
                  write: properties.write,
                  notify: properties.notify,
                  indicate: properties.indicate,
                },
                descriptors: descriptorDetails,
              };
            })),
          };
        })),
      };
  
      setDeviceInfo(connectInfo);
      
    } catch (error) {
      setErrorMessage(`Bluetooth Error: ${error.message}`);
      console.error("Error in Bluetooth device selection:", error);
    }
  };
  

  // Handle incoming heart rate measurement
  const handleHeartRateMeasurement = (event) => {
    const value = event.target.value;
    const heartRateValue = value.getUint8(1); // Heart rate value is at index 1 for standard format
    setHeartRate(heartRateValue);
  };

  return (
    <div className="App">
      <h1>Bluetooth Device Info</h1>
      <button onClick={requestBluetoothDevice}>Connect to Bluetooth Device</button>
      {heartRate !== null && (
        <div className="heart-rate-card">
          <h2>Heart Rate</h2>
          <p>{heartRate} BPM</p>
        </div>
      )}
      {deviceInfo && (
        <div className="device-card">
          <h2>Device: {deviceInfo.name}</h2>
          <p>ID: {deviceInfo.id}</p>
          <h3>Services:</h3>
          {deviceInfo.services.map((service, index) => (
            <div key={index}>
              <h4>Service UUID: {service.uuid}</h4>
              <ul>
                {service.characteristics.map((characteristic, idx) => (
                  <li key={idx}>
                    <strong>{characteristic.name}</strong> (UUID: {characteristic.uuid})
                    <p>{characteristic.description}</p>
                    <ul>
                      {Object.keys(characteristic.properties).map((prop, i) =>
                        characteristic.properties[prop] ? <li key={i}>{prop}</li> : null
                      )}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
        </div>
      )}
    </div>
  );
}

export default App;
