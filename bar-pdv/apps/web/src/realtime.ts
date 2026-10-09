import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { EVENTOS } from '@bar/shared';
import { API_URL, getToken } from './api';

/** Qualquer mudança no bar (pedido, status, mesa) refaz as consultas ativas na tela. */
export function useRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const socket = io(API_URL, { auth: { token: getToken() } });
    const refresh = () => qc.invalidateQueries();
    socket.on(EVENTOS.FILA, refresh);
    socket.on(EVENTOS.MESAS, refresh);
    socket.on('connect', refresh); // ressincroniza após reconexão
    return () => {
      socket.disconnect();
    };
  }, [qc]);
}
