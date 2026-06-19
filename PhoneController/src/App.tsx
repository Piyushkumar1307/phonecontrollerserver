import { useEffect, useRef, useState } from "react";

export default function App() {
  const socket = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState(false);
  const [sensorEnabled, setSensorEnabled] = useState(false);

  const [calibrating, setCalibrating] = useState(false);
  const [calibrated, setCalibrated] = useState(false);

  const baselineGamma = useRef(0);
  const samples = useRef<number[]>([]);
  const collecting = useRef(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const requestWakeLockRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    async function requestWakeLock() {
      if (!("wakeLock" in navigator)) return;

      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      } catch (err) {
        console.warn("Wake lock request failed:", err);
      }
    }

    requestWakeLockRef.current = requestWakeLock;
    requestWakeLock();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      wakeLockRef.current?.release();
    };
  }, []);

  useEffect(() => {
    socket.current = new WebSocket("wss://phonecontrollerserver.onrender.com");

    socket.current.onopen = () => {
      setConnected(true);
    };

    socket.current.onclose = () => {
      setConnected(false);
    };

    return () => socket.current?.close();
  }, []);

  function startCalibration() {
    setCalibrating(true);
    setCalibrated(false);

    samples.current = [];
    collecting.current = true;

    // Collect data for 2 seconds
    setTimeout(() => {
      collecting.current = false;

      if (samples.current.length > 0) {
        const avg =
          samples.current.reduce((a, b) => a + b, 0) /
          samples.current.length;

        baselineGamma.current = avg;
      } else {
        baselineGamma.current = 0;
      }

      setCalibrating(false);
      setCalibrated(true);

      console.log("Calibration Done. Baseline:", baselineGamma.current);
    }, 2000);
  }

  async function enableMotion() {
    try {
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

      // Re-request wake lock after user gesture (required on some mobile browsers)
      await requestWakeLockRef.current();

      setSensorEnabled(true);

      // 🔥 Start auto calibration immediately
      startCalibration();
    } catch (e) {
      console.error(e);
    }
  }

  function handleOrientation(event: DeviceOrientationEvent) {
    if (event.gamma == null) return;

    // collect samples during calibration
    if (collecting.current) {
      samples.current.push(event.gamma);
    }

    // normalize using baseline
    let move = (event.gamma - baselineGamma.current) / 45;

    move = Math.max(-1, Math.min(1, move));

    socket.current?.send(JSON.stringify({ move }));

    console.log(
      `Gamma: ${event.gamma.toFixed(1)} | Move: ${move.toFixed(2)}`
    );
  }

  const statusText = calibrating
    ? "🧠 Auto calibration in progress... hold your phone still"
    : calibrated
    ? "✅ Calibration done"
    : "Idle";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginTop: 60,
        gap: 25,
        fontFamily: "sans-serif",
      }}
    >
      <h1>📱 Phone Steering Wheel</h1>

      <h2>{connected ? "🟢 Connected" : "🔴 Disconnected"}</h2>

      {/* 🔥 Calibration Status */}
      <div
        style={{
          padding: "10px 20px",
          borderRadius: 10,
          background: calibrating
            ? "#fff3cd"
            : calibrated
            ? "#d4edda"
            : "#f0f0f0",
          color: "#000",
          fontWeight: "bold",
          transition: "0.3s",
        }}
      >
        {statusText}
      </div>

      <button
        style={{
          width: 250,
          height: 70,
          fontSize: 20,
          cursor: "pointer",
        }}
        onClick={enableMotion}
        disabled={sensorEnabled && calibrating}
      >
        {sensorEnabled ? "Gyroscope Enabled" : "Enable Gyroscope"}
      </button>
    </div>
  );
}