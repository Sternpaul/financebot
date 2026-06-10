'use client';

import { useState, useEffect } from 'react';
import { fetchIngestionLogs } from '@/app/actions/logs';

export default function IngestionLogs() {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const data = await fetchIngestionLogs(50);
      setLogs(data);
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ marginTop: '40px', padding: '20px', borderTop: '2px solid #333' }}>
      <h2 style={{ marginBottom: '10px' }}>Real-Time Ingestion Logs</h2>
      <div 
        style={{ 
          fontFamily: 'monospace', 
          fontSize: '12px', 
          backgroundColor: '#000', 
          color: '#0f0', 
          padding: '10px', 
          borderRadius: '5px',
          height: '400px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap'
        }}
      >
        {logs.length === 0 ? 'Waiting for logs...' : logs.map(log => {
          const time = new Date(log.timestamp).toLocaleTimeString();
          const prefix = `[${time}] [${log.source_platform.toUpperCase()}] [${log.source_handle}]`;
          const status = `[${log.status}]`;
          return (
            <div key={log.id} style={{ marginBottom: '4px', color: log.status === 'ERROR' ? '#f00' : log.status === 'SUCCESS' ? '#0f0' : '#888' }}>
              {prefix} {status} {log.message}
            </div>
          );
        })}
      </div>
    </div>
  );
}
