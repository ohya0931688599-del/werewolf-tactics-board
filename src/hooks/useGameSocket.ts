import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useTacticsStore } from '../store/useTacticsStore';

// Adjust based on the actual Room interface, here we extract just what we need
interface PlayerData {
  id: number;
  isAlive: boolean;
}

interface RoomData {
  dayCount: number;
  players: PlayerData[];
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
      // Add any additional options if needed
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to game server (Spectator Mode)');
    });

    socket.on('room-updated', (data: RoomUpdatedEvent) => {
      if (!data || !data.room) return;
      const currentRoom = data.room;
      
      const currentDay = currentRoom.dayCount || 0;
      
      // Extract alive players (assuming players have an id or we use index + 1 if id is string)
      // If player structure differs, adjust accordingly
      const alivePlayers = currentRoom.players
        .filter((player) => player.isAlive)
        .map((player) => player.id || 0) // Assume player has numeric `id`, adjust if it's string or missing
        .filter((id) => id > 0);

      // console.log(`現在是第 ${currentDay} 天，還有 ${alivePlayers.length} 人存活`);
      setGameState(currentDay, alivePlayers);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from game server');
    });

    return () => {
      socket.disconnect();
    };
  }, [setGameState]);
};
