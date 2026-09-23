import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const currentBranchRef = React.useRef(null);
  const currentTicketRef = React.useRef(null);

  useEffect(() => {
    // Conectar directamente a backend en puerto 5000 o al origen de produccion
    const targetUrl = window.location.port === '5173' ? 'http://localhost:5000' : window.location.origin;
    const s = io(targetUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    s.on('connect', () => {
      setConnected(true);
      if (currentBranchRef.current) {
        s.emit('join_branch', currentBranchRef.current);
      }
      if (currentTicketRef.current) {
        s.emit('join_ticket', currentTicketRef.current);
      }
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  const joinBranch = (branchId) => {
    currentBranchRef.current = branchId;
    if (socket && branchId) {
      socket.emit('join_branch', branchId);
    }
  };

  const joinTicket = (ticketId) => {
    currentTicketRef.current = ticketId;
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
