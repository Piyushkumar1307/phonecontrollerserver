import { useEffect, useRef, useState } from "react";

export default function App() {
  const socket = useRef<WebSocket | null>(null);

  const [ip, setIp] = useState(
    localStorage.getItem("unity_ip") || "192.168.31.236"
  );

  const [connected, setConnected] = useState(false);

  const [connecting, setConnecting] = useState(false);

  const timer = useRef<number | null>(null);

  function connect()
  {
    if(socket.current)
    {
      socket.current.close();
    }

    setConnecting(true);

    localStorage.setItem("unity_ip", ip);

    // Use current domain in production, custom IP in development
    const wsUrl = ip === "localhost" || ip === "127.0.0.1" || window.location.hostname === "localhost"
      ? `ws://${ip}:8080`
      : `wss://${window.location.host}`;

    const ws = new WebSocket(wsUrl);

    socket.current = ws;

    ws.onopen = () =>
    {
      console.log("Connected");
      setConnected(true);
      setConnecting(false);
    };

    ws.onclose = () =>
    {
      console.log("Disconnected");
      setConnected(false);
      setConnecting(false);
    };

    ws.onerror = () =>
    {
      console.log("Connection Failed");
      setConnected(false);
      setConnecting(false);
    };
  }

  function startMove(dir:number)
  {
    if(!connected) return;

    socket.current?.send(JSON.stringify({
      move:dir
    }));

    timer.current = window.setInterval(()=>{
      socket.current?.send(JSON.stringify({
        move:dir
      }));
    },30);
  }

  function stopMove()
  {
    if(timer.current)
    {
      clearInterval(timer.current);
      timer.current=null;
    }

    socket.current?.send(JSON.stringify({
      move:0
    }));
  }

  useEffect(()=>{
    return ()=>{
      socket.current?.close();
    };
  },[]);

  return (
    <div
      style={{
        display:"flex",
        flexDirection:"column",
        alignItems:"center",
        gap:"20px",
        marginTop:"40px"
      }}
    >
      <h1>📱 Phone Controller</h1>

      <input
        type="text"
        placeholder="192.168.31.236"
        value={ip}
        onChange={(e)=>setIp(e.target.value)}
        style={{
          width:260,
          height:45,
          fontSize:20,
          textAlign:"center"
        }}
      />

      <button
        onClick={connect}
        style={{
          width:180,
          height:45,
          fontSize:18
        }}
      >
        Connect
      </button>

      <h2>
        {connecting
          ? "Connecting..."
          : connected
          ? "🟢 Connected"
          : "🔴 Disconnected"}
      </h2>

      <button
        style={{
          width:250,
          height:100,
          fontSize:35
        }}
        onMouseDown={()=>startMove(-1)}
        onMouseUp={stopMove}
        onTouchStart={()=>startMove(-1)}
        onTouchEnd={stopMove}
        onTouchCancel={stopMove}
      >
        ⬅ LEFT
      </button>

      <button
        style={{
          width:250,
          height:100,
          fontSize:35
        }}
        onMouseDown={()=>startMove(1)}
        onMouseUp={stopMove}
        onTouchStart={()=>startMove(1)}
        onTouchEnd={stopMove}
        onTouchCancel={stopMove}
      >
        RIGHT ➡
      </button>
    </div>
  );
}