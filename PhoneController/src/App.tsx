import { useEffect, useRef, useState } from "react";

export default function App() {
  const socket = useRef<WebSocket | null>(null);

  const [connected, setConnected] = useState(false);
  const [sensorEnabled, setSensorEnabled] = useState(false);

  const [calibrating, setCalibrating] = useState(false);
  const [calibrated, setCalibrated] = useState(false);

  // ===== Calibration =====
  const baselineYaw = useRef(0);
  const samples = useRef<number[]>([]);
  const collecting = useRef(false);

  // ===== Smoothing =====
  const smoothedValue = useRef(0);
  const SMOOTHING = 0.15; // lower = smoother

  // ===== Dead zone =====
  const DEAD_ZONE = 0.08;

  useEffect(() => {
    socket.current = new WebSocket("wss://phonecontrollerserver.onrender.com");

    socket.current.onopen = () => setConnected(true);
    socket.current.onclose = () => setConnected(false);

    return () => socket.current?.close();
  }, []);

  // =========================
  // CALIBRATION
  // =========================
  function startCalibration() {
    setCalibrating(true);
    setCalibrated(false);

    samples.current = [];
    collecting.current = true;

    setTimeout(() => {
      collecting.current = false;

      if (samples.current.length > 0) {
        const avg =
          samples.current.reduce((a, b) => a + b, 0) /
          samples.current.length;

        baselineYaw.current = avg;
      } else {
        baselineYaw.current = 0;
      }

      setCalibrating(false);
      setCalibrated(true);

      console.log("Calibration Done:", baselineYaw.current);
    }, 2000);
  }

  // =========================
  // ENABLE SENSOR
  // =========================
  async function enableMotion() {
    try {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof (DeviceOrientationEvent as any).requestPermission === "function"
      ) {
        const permission =
          await (DeviceOrientationEvent as any).requestPermission();

        if (permission !== "granted") {
          alert("Motion permission denied");
          return;
        }
      }

      window.addEventListener("deviceorientation", handleOrientation);

      setSensorEnabled(true);
      startCalibration();
    } catch (e) {
      console.error(e);
    }
  }

  // =========================
  // CORE SENSOR LOGIC
  // =========================
  function handleOrientation(event: DeviceOrientationEvent) {
    if (event.alpha == null) return;

    const rawYaw = event.alpha;

    // 1. calibration sample collection
    if (collecting.current) {
      samples.current.push(rawYaw);
    }

    // 2. normalize relative to baseline
    let value = rawYaw - baselineYaw.current;

    // wrap-around fix (0–360 jump issue)
    if (value > 180) value -= 360;
    if (value < -180) value += 360;

    // scale to -1 to 1
    value = value / 45;

    // 3. dead zone (remove tiny drift)
    if (Math.abs(value) < DEAD_ZONE) value = 0;

    // 4. smoothing (low-pass filter)
    smoothedValue.current =
      smoothedValue.current +
      SMOOTHING * (value - smoothedValue.current);

    const move = Math.max(-1, Math.min(1, smoothedValue.current));

    // send to server
    socket.current?.send(
      JSON.stringify({
        move,
      })
    );

    console.log(
      `Yaw: ${rawYaw.toFixed(1)} | Move: ${move.toFixed(2)}`
    );
  }

  // =========================
  // UI
  // =========================
  const statusText = calibrating
    ? "🧠 Auto calibration... hold phone still"
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
      <h1>📱 Phone Steering Wheel (Pro)</h1>

      <h2>{connected ? "🟢 Connected" : "🔴 Disconnected"}</h2>

      <div
        style={{
          padding: "10px 20px",
          borderRadius: 10,
          background: calibrating
            ? "#fff3cd"
            : calibrated
            ? "#d4edda"
            : "#f0f0f0",
          fontWeight: "bold",
        }}
      >
        {statusText}
      </div>

      <button
        style={{
          width: 260,
          height: 70,
          fontSize: 18,
        }}
        onClick={enableMotion}
        disabled={sensorEnabled && calibrating}
      >
        {sensorEnabled ? "Gyroscope Enabled" : "Enable Gyroscope"}
      </button>
    </div>
  );
}