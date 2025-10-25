import React, { useEffect, useState } from 'react';
import { io, Socket } from "socket.io-client";

interface ZoneCloseProps {
  tournament: any;
  round?: any;
  match?: any;
  matchData?: any;
}

const ZoneClose: React.FC<ZoneCloseProps> = ({ tournament, round, match }) => {
  const [circleInfo, setCircleInfo] = useState<any>({});

  useEffect(() => {
    if (!match?._id) return;

    console.log('Setting up zone close listeners for match:', match._id);

    const freshSocket = io("http://localhost:3000", {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    console.log('Socket connected for zone close:', freshSocket?.connected);

    const handleCircleInfoUpdate = (data: any) => {
      console.log('ZoneClose: Received circleInfoUpdate:', data);
      console.log('ZoneClose: Setting circle info state');
      setCircleInfo(data);
      console.log('ZoneClose: State updated, current circleInfo:', data);
    };

    freshSocket.on('circleInfoUpdate', handleCircleInfoUpdate);
    console.log('ZoneClose: Listener attached for circleInfoUpdate');

    // Test immediate emission
    setTimeout(() => {
      console.log('ZoneClose: Testing socket connection by emitting test event');
      freshSocket.emit('test', 'ZoneClose component test');
    }, 1000);

    return () => {
      console.log('ZoneClose: Cleaning up socket listeners');
      freshSocket.off('circleInfoUpdate', handleCircleInfoUpdate);
      freshSocket.disconnect();
    };
  }, [match?._id]);

  return (
    <div className="w-[1920px] h-[1080px] flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-8">ZONE CLOSE INFO</h1>
        <div className="text-4xl space-y-4">
          <div>Game Time: {circleInfo?.GameTime || 'N/A'}</div>
          <div>Circle Status: {circleInfo?.CircleStatus || 'N/A'}</div>
          <div>Circle Index: {circleInfo?.CircleIndex || 'N/A'}</div>
          <div>Counter: {circleInfo?.Counter || 'N/A'}</div>
          <div>Max Time: {circleInfo?.MaxTime || 'N/A'}</div>
        </div>
      </div>
    </div>
  );
};

export default ZoneClose;