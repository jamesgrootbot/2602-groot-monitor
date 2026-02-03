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
      console.log('Gateway Socket Open');
      setStatus('connecting');
      // Proactively send connect if challenge doesn't come
      setTimeout(() => {
        if (status === 'connecting') {
          console.log('Proactive connect...');
          ws.send(JSON.stringify({
            type: 'req',
            id: 'proactive-' + Date.now(),
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: { id: 'groot-monitor', version: '1.0.0', platform: 'web', mode: 'operator' },
              role: 'operator',
              scopes: ['operator.read'],
              auth: { token },
              device: {
                id: 'groot-monitor-web',
                publicKey: 'none',
                signature: 'none',
                signedAt: Date.now(),
                nonce: 'none'
              }
            }
          }));
        }
      }, 1000);
    };

    ws.onerror = (err) => {
      console.error('WS Error:', err);
    };

    ws.onmessage = (event) => {
      console.log('WS Raw Message:', event.data);
      const data = JSON.parse(event.data);
      console.log('WS Event:', data);
      if (data.event === 'connect.challenge') {
        const req = {
          type: 'req',
          id: 'handshake-' + Date.now(),
          method: 'connect',
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: { id: 'groot-monitor', version: '1.0.0', platform: 'web', mode: 'operator' },
            role: 'operator',
            scopes: ['operator.read'],
            auth: { token },
            device: {
              id: 'groot-monitor-web',
              publicKey: 'none',
              signature: 'none',
              signedAt: Date.now(),
              nonce: 'none'
            }
          }
        };
        console.log('Sending Handshake:', req);
        ws.send(JSON.stringify(req));
      }

      if (data.type === 'res' && data.ok) {
        console.log('Handshake Success:', data.payload);
        setStatus('connected');
        console.log('Gateway Ready');
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
