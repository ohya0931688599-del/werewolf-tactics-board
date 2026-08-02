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
  const gameMode = useTacticsStore((state) => state.gameMode);
  const roomId = useTacticsStore((state) => state.roomId);
  const setGameMode = useTacticsStore((state) => state.setGameMode);

  useEffect(() => {
    // Connect to the socket server
    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket'],
    });

    const socket = socketRef.current;

    const handleRoomData = (currentRoom: RoomData) => {
      const currentDay = currentRoom.dayCount || 0;
      const alivePlayers = currentRoom.players
        .filter((player) => player.isAlive && player.seatNumber > 0)
        .map((player) => player.seatNumber);
      const voteHistory = currentRoom.voteHistory || [];
      setGameState(currentDay, alivePlayers, voteHistory);
    };

    socket.on('connect', () => {
      console.log('Connected to game server (Spectator Mode)');
      if (gameMode === 'online' && roomId) {
        socket.emit('spectate-room', roomId, (response: any) => {
          if (response.success && response.room) {
            handleRoomData(response.room);
          } else {
            console.error('Failed to spectate room:', response.message);
            alert(`連線失敗: ${response.message || '找不到該房間'}`);
            setGameMode(null); // Return to start screen
          }
        });
      }
    });

    socket.on('room-updated', (data: RoomUpdatedEvent) => {
      if (!data || !data.room) return;
      if (gameMode === 'online') {
        handleRoomData(data.room);
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from game server');
    });

    return () => {
      socket.disconnect();
    };
  }, [setGameState, gameMode, roomId, setGameMode]);
};
