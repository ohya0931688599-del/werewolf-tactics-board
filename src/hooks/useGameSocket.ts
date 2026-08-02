import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTacticsStore, type VoteHistoryItem } from '../store/useTacticsStore';

interface PlayerData {
  id: string;
  seatNumber: number;
  isAlive: boolean;
}

interface RoomData {
  dayCount?: number;
  players: PlayerData[];
  voteHistory?: VoteHistoryItem[];
}

interface RoomUpdatedEvent {
  room: RoomData;
}

const SOCKET_URL = 'wss://sogoodswerewolfgame.onrender.com';

export const useGameSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const setGameState = useTacticsStore((state) => state.setGameState);

  useEffect(() => {
    // Connect to the socket server
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to game server (Spectator Mode)');
    });

    socket.on('room-updated', (data: RoomUpdatedEvent) => {
      if (!data || !data.room) return;
      const currentRoom = data.room;
      
      const currentDay = currentRoom.dayCount || 0;
      
      const alivePlayers = currentRoom.players
        .filter((player) => player.isAlive && player.seatNumber > 0)
        .map((player) => player.seatNumber);

      const voteHistory = currentRoom.voteHistory || [];

      setGameState(currentDay, alivePlayers, voteHistory);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from game server');
    });

    return () => {
      socket.disconnect();
    };
  }, [setGameState]);
};
