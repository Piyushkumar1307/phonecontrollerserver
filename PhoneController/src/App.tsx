import { useEffect, useRef, useState } from "react";

export default function App() {
  const socket = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState(false);
  const [sensorEnabled, setSensorEnabled] = useState(false);

  useEffect(() => {
    socket.current = new WebSocket("wss://phonecontrollerserver.onrender.com");

    socket.current.onopen = () => {
      console.log("Connected");
      setConnected(true);
    };

    socket.current.onclose = () => {
      setConnected(false);
    };

    return () => socket.current?.close();
  }, []);

  async function enableMotion() {
    try {
      // iPhone requires permission
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof (DeviceOrientationEvent as any).requestPermission === "function"
      ) {
        const permission = await (DeviceOrientationEvent as any).requestPermission();

        if (permission !== "granted") {
          alert("Motion permission denied");
          return;
        }
      }

      window.addEventListener("deviceorientation", handleOrientation);

      setSensorEnabled(true);

      console.log("Gyroscope Started");
    } catch (e) {
      console.error(e);
    }
  }

  function handleOrientation(event: DeviceOrientationEvent) {
    if (event.gamma == null) return;

    let move = event.gamma / 45;

    move = Math.max(-1, Math.min(1, move));

    socket.current?.send(
      JSON.stringify({
        move,
      })
    );

    console.log(
      `Gamma : ${event.gamma.toFixed(1)}  Move : ${move.toFixed(2)}`
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: 60,
        gap: 30,
      }}
    >
      <h1>📱 Phone Steering Wheel</h1>

      <h2>{connected ? "🟢 Connected" : "🔴 Disconnected"}</h2>

      <button
        style={{
          width: 250,
          height: 70,
          fontSize: 24,
        }}
        onClick={enableMotion}
      >
        {sensorEnabled ? "Gyroscope Enabled" : "Enable Gyroscope"}
      </button>
    </div>
  );
}