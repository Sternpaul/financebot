'use client';

import { useState, useEffect } from 'react';
import { fetchIngestionLogs } from '@/app/actions/logs';

export default function IngestionLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'raw' | 'ai' | 'podcast'>('raw');

  useEffect(() => {
    const fetchLogs = async () => {
      const data = await fetchIngestionLogs(100, activeTab);
      setLogs(data);
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [activeTab]);

  const filteredLogs = logs;

  return (
    <div style={{ marginTop: '40px', padding: '20px', borderTop: '2px solid #333' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h2>System Logs</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setActiveTab('raw')}
            style={{ 
              padding: '6px 12px', 
              background: activeTab === 'raw' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'raw' ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--accent-primary)',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
            Raw Ingestion
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            style={{ 
              padding: '6px 12px', 
              background: activeTab === 'ai' ? '#bb86fc' : 'transparent',
              color: activeTab === 'ai' ? '#000' : 'var(--text-secondary)',
              border: '1px solid #bb86fc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
            AI Brain Activity
          </button>
          <button 
            onClick={() => setActiveTab('podcast')}
            style={{ 
              padding: '6px 12px', 
              background: activeTab === 'podcast' ? '#ffcc00' : 'transparent',
              color: activeTab === 'podcast' ? '#000' : 'var(--text-secondary)',
              border: '1px solid #ffcc00',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
            Podcast Sync
          </button>
        </div>
      </div>
      <div 
        style={{ 
          fontFamily: 'monospace', 
          fontSize: '12px', 
          backgroundColor: '#000', 
          color: activeTab === 'ai' ? '#e0b0ff' : activeTab === 'podcast' ? '#ffcc00' : '#0f0', 
          padding: '10px', 
          borderRadius: '5px',
          height: '400px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap'
        }}
      >
        {filteredLogs.length === 0 ? 'Waiting for logs...' : filteredLogs.map(log => {
          const time = new Date(log.timestamp).toLocaleTimeString();
          const prefix = `[${time}] [${log.source_platform.toUpperCase()}] [${log.source_handle}]`;
          const status = `[${log.status}]`;
          return (
            <div key={log.id} style={{ marginBottom: '4px', color: log.status === 'ERROR' ? '#f00' : log.status === 'SUCCESS' ? (activeTab === 'ai' ? '#e0b0ff' : activeTab === 'podcast' ? '#ffcc00' : '#0f0') : '#888' }}>
              {prefix} {status} {log.message}
            </div>
          );
        })}
      </div>
    </div>
  );
}
