import React, { useState } from 'react'
import './App.css';

function App() {
  const requestBluetoothDevice = async () => {
    try {
      await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
      });
      console.log('bluetooth device selected');
    } catch (error) {
      console.error('Error selecting Bluetooth device:', error);
    }
  };
  return (
    <div className="App">
      <header className="App-header">
        <h1>Heart Rate Monitor</h1>
        <button onClick={requestBluetoothDevice}> Connect to Bluetooth Device </button>
      </header>
    </div>
  );
}

export default App;
