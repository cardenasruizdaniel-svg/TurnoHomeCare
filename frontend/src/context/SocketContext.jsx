import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Conectar directamente a backend en puerto 5000 o al origen de produccion
    const targetUrl = window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin;
    const s = io(targetUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    s.on('connect', () => {
      // console.log('[Socket] Conectado con ID:', s.id);
      setConnected(true);
    });

    s.on('disconnect', () => {
      // console.log('[Socket] Desconectado');
      setConnected(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const joinBranch = (branchId) => {
    if (socket && branchId) {
      socket.emit('join_branch', branchId);
    }
  };

  const joinTicket = (ticketId) => {
    if (socket && ticketId) {
      socket.emit('join_ticket', ticketId);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected, joinBranch, joinTicket }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
