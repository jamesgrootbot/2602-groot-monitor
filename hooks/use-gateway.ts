'use client';

import { useState, useEffect, useCallback } from 'react';

export interface GatewayEvent {
  type: string;
  event: string;
  payload: any;
}

export function useGateway(url: string, token: string) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [lastEvent, setLastEvent] = useState<GatewayEvent | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    setSocket(ws);

    ws.onopen = () => {
      console.log('Gateway Connected');
      setStatus('connecting');
      // Handshake is handled by the server sending a challenge, 
      // but if we are local we might just send the connect req.
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.event === 'connect.challenge') {
        // Local handshake shortcut (if allowed)
        ws.send(JSON.stringify({
          type: 'req',
          id: 'handshake-' + Date.now(),
          method: 'connect',
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            role: 'operator',
            auth: { token }
          }
        }));
      }

      if (data.type === 'res' && data.payload?.type === 'hello-ok') {
        setStatus('connected');
      }

      if (data.type === 'event') {
        setLastEvent(data);
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
    };

    return () => ws.close();
  }, [url, token]);

  return { status, lastEvent };
}
