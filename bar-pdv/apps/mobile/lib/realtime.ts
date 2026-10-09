import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { EVENTOS } from '@bar/shared';
import { API_URL, getToken } from './api';

export function useRealtime(ativo: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!ativo) return;
    const socket = io(API_URL, { auth: { token: getToken() }, transports: ['websocket'] });
    const refresh = () => qc.invalidateQueries();
    socket.on(EVENTOS.FILA, refresh);
    socket.on(EVENTOS.MESAS, refresh);
    socket.on('connect', refresh);
    return () => { socket.disconnect(); };
  }, [ativo, qc]);
}
