import { createServer } from 'http';
import { randomInt } from 'crypto';

// Mock data storage
let currentIntensity = 6;
let isLive = true;
let storageUsed = 1.2;
let alerts = [
  { id: '1', intensity: 8, acceleration: 0.25, timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
  { id: '2', intensity: 6, acceleration: 0.16, timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString() },
  { id: '3', intensity: 5, acceleration: 0.12, timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
];

// SSE clients
let sseClients = new Set();

// Helper functions
function generateVelocityData(minutes = 60) {
  const data = [];
  const now = Date.now();
  for (let i = minutes; i >= 0; i--) {
    const time = now - i * 60000; // Each point represents 1 minute
    const x = (i / minutes) * Math.PI * 4;
    const y = Math.sin(x + Date.now() / 10000) * Math.exp(-Math.pow((i - minutes/2) / (minutes/4), 2)) * 8;
    data.push({
      timestamp: new Date(time).toISOString(),
      velocity: y,
      velocity_negative: -y,
    });
  }
  return data;
}

function generateHistogramData() {
  const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8'];
  return weeks.map(week => ({
    week,
    count: randomInt(20, 100),
    intensity_avg: randomInt(4, 9),
  }));
}

function generateStats() {
  return {
    total_alerts: randomInt(140, 180),
    critical_alerts: randomInt(8, 20),
    last_alert: alerts[0]?.timestamp || null,
    storage_used: parseFloat(storageUsed.toFixed(2)),
    storage_total: 2.0,
    devices_online: randomInt(2, 4),
    devices_total: 4,
  };
}

function sendJson(res, data) {
  res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

function sendError(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ success: false, message }));
}

// Broadcast to all SSE clients
function broadcastToClients(eventType, data) {
  const messageData = {
    event: eventType,
    data: data,
    timestamp: new Date().toISOString()
  };
  const message = `data: ${JSON.stringify(messageData)}\n\n`;

  console.log(`[SSE BROADCAST] Event: ${eventType}, Clients: ${sseClients.size}, Data:`, JSON.stringify(data).substring(0, 100));

  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      console.error('Error sending to SSE client:', error);
      sseClients.delete(client);
    }
  });
}

// Create HTTP server
const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`${req.method} ${path}`);

  try {
    // SSE endpoint for real-time updates
    if (path === '/api/events/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      });

      sseClients.add(res);

      // Send initial data
      res.write(`data: ${JSON.stringify({
        event: 'connection.established',
        data: {
          intensity: currentIntensity,
          is_live: isLive,
          alerts: alerts,
          timestamp: new Date().toISOString()
        }
      })}\n\n`);

      // Send periodic heartbeat
      const heartbeat = setInterval(() => {
        try {
          res.write(`data: ${JSON.stringify({
            event: 'heartbeat',
            timestamp: new Date().toISOString()
          })}\n\n`);
        } catch (error) {
          clearInterval(heartbeat);
          sseClients.delete(res);
        }
      }, 30000); // 30 seconds

      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(res);
        console.log('SSE client disconnected');
      });

      return; // Don't end the response for SSE
    }
    // Route handling
    else if (path === '/api/seismic/current-reading') {
      // Simulate changing intensity (1-7, mostly 1-3)
      if (Math.random() > 0.7) { 
        const isSpike = Math.random() > 0.95;
        currentIntensity = isSpike ? randomInt(4, 8) : randomInt(1, 4);
        
        // Broadcast intensity change via SSE
        broadcastToClients('seismic.update', {
          intensity: currentIntensity,
          velocity: 0.001 + Math.random() * 0.001 * currentIntensity,
          acceleration: 0.005 * currentIntensity,
          timestamp: new Date().toISOString(),
          device_id: 'device-001',
          is_live: isLive,
        });
      }
      
      sendJson(res, {
        success: true,
        data: {
          intensity: currentIntensity,
          velocity: 0.001 + Math.random() * 0.001 * currentIntensity,
          acceleration: 0.005 * currentIntensity,
          timestamp: new Date().toISOString(),
          device_id: 'device-001',
          is_live: isLive,
        }
      });
    }
    else if (path === '/api/seismic/live-velocity') {
      const minutes = parseInt(url.searchParams.get('minutes') || '60');
      sendJson(res, {
        success: true,
        data: {
          data: generateVelocityData(minutes),
          is_live: isLive,
        }
      });
    }
    else if (path === '/api/seismic/events') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      
      // Simulate new alerts occasionally (intensity 4-7)
      if (Math.random() > 0.9) { 
        const alertIntensity = randomInt(4, 8); 
        const newAlert = {
          id: Date.now().toString(),
          intensity: alertIntensity,
          acceleration: alertIntensity * 0.05,
          timestamp: new Date().toISOString(),
          device_id: 'device-001',
          created_at: new Date().toISOString(),
        };
        alerts.unshift(newAlert);
        if (alerts.length > 20) alerts.pop(); // Keep only recent 20 alerts

        // Broadcast new alert via SSE
        broadcastToClients('seismic.alert', newAlert);
      }

      sendJson(res, {
        success: true,
        data: {
          data: alerts,
          current_page: page,
          last_page: 1,
          per_page: limit,
          total: alerts.length,
        }
      });
    }
    else if (path === '/api/seismic/dashboard/stats') {
      // Simulate storage usage changes
      storageUsed += (Math.random() - 0.5) * 0.01;
      storageUsed = Math.max(0.5, Math.min(1.9, storageUsed));
      
      sendJson(res, {
        success: true,
        data: generateStats()
      });
    }
    else if (path === '/api/seismic/analytics/intensity-distribution') {
      const days = parseInt(url.searchParams.get('days') || '30');
      const groupBy = url.searchParams.get('groupBy') || 'week';
      
      sendJson(res, {
        success: true,
        data: {
          data: generateHistogramData()
        }
      });
    }
    else if (path === '/api/devices') {
      sendJson(res, {
        success: true,
        data: [
          { id: 'device-001', name: 'Main Sensor', status: 'online', battery: 85 },
          { id: 'device-002', name: 'Backup Sensor', status: 'online', battery: 92 },
          { id: 'device-003', name: 'Remote Sensor', status: 'offline', battery: 45 },
          { id: 'device-004', name: 'Mobile Sensor', status: 'online', battery: 67 },
        ]
      });
    }
    else if (path === '/api/alerts/active') {
      const activeAlerts = alerts.filter(alert => alert.intensity >= 6);
      sendJson(res, {
        success: true,
        data: activeAlerts
      });
    }
    else if (path === '/api/alerts/critical') {
      const criticalAlerts = alerts.filter(alert => alert.intensity >= 7);
      sendJson(res, {
        success: true,
        data: criticalAlerts
      });
    }
    else if (path === '/api/alerts/recent') {
      const hours = parseInt(url.searchParams.get('hours') || '24');
      const cutoff = Date.now() - hours * 60 * 60 * 1000;
      const recentAlerts = alerts.filter(alert => 
        new Date(alert.timestamp).getTime() > cutoff
      );
      sendJson(res, {
        success: true,
        data: recentAlerts
      });
    }
    else if (path.startsWith('/api/alerts/') && path.endsWith('/acknowledge')) {
      const alertId = path.split('/')[3];
      console.log(`Acknowledging alert: ${alertId}`);
      sendJson(res, {
        success: true,
        data: null
      });
    }
    else if (path === '/api/system/status') {
      sendJson(res, {
        success: true,
        data: {
          status: 'operational',
          uptime: '7 days, 14 hours',
          memory_usage: '45%',
          cpu_usage: '12%',
          database_status: 'healthy',
          sse_connections: sseClients.size,
        }
      });
    }
    else if (path === '/api/system/storage') {
      sendJson(res, {
        success: true,
        data: {
          used: storageUsed,
          total: 2.0,
          available: 2.0 - storageUsed,
          percentage_used: (storageUsed / 2.0) * 100,
        }
      });
    }
    else if (path === '/api') {
      // API root endpoint
      sendJson(res, {
        success: true,
        data: {
          name: 'USHER ERI Mock API',
          version: '1.0.0',
          status: 'running',
          sse_connections: sseClients.size,
          endpoints: [
            '/api/events/stream',
            '/api/seismic/current-reading',
            '/api/seismic/live-velocity',
            '/api/seismic/events',
            '/api/seismic/dashboard/stats',
            '/api/seismic/analytics/intensity-distribution',
            '/api/devices',
            '/api/alerts/active',
            '/api/alerts/critical',
            '/api/alerts/recent',
            '/api/system/status',
            '/api/system/storage'
          ]
        }
      });
    }
    else if (path === '/favicon.ico') {
      // Handle favicon request
      res.writeHead(204);
      res.end();
    }
    else {
      console.log(`404 - Endpoint not found: ${path}`);
      sendError(res, 404, 'Endpoint not found');
    }
  } catch (error) {
    console.error('Error:', error);
    sendError(res, 500, 'Internal server error');
  }
});

// Simulate real-time events with SSE broadcasting (slower updates)
setInterval(() => {
  // Randomly change intensity (1-7, mostly 1-3)
  if (Math.random() > 0.8) {
    const isSpike = Math.random() > 0.95;
    currentIntensity = isSpike ? randomInt(4, 8) : randomInt(1, 4);
    console.log(`Intensity changed to: ${currentIntensity}`);
    
    // Broadcast intensity change via SSE
    broadcastToClients('seismic.update', {
      intensity: currentIntensity,
      velocity: 0.001 + Math.random() * 0.001 * currentIntensity,
      acceleration: 0.005 * currentIntensity,
      timestamp: new Date().toISOString(),
      device_id: 'device-001',
      is_live: isLive,
    });
  }
  
  // Randomly toggle live status
  if (Math.random() > 0.95) {
    isLive = !isLive;
    console.log(`Live status changed to: ${isLive}`);
    
    // Broadcast status change
    broadcastToClients('device.status', {
      device_id: 'device-001',
      status: isLive ? 'online' : 'offline',
      last_seen: new Date().toISOString(),
    });
  }
  
  // Only generate alerts for intensity levels 4 and above
  if (Math.random() > 0.92) {
    const alertIntensity = randomInt(4, 8); // 4-7 for alerts
    const newAlert = {
      id: Date.now().toString(),
      intensity: alertIntensity,
      acceleration: alertIntensity * 0.05,
      timestamp: new Date().toISOString(),
      device_id: 'device-001',
      created_at: new Date().toISOString(),
    };
    alerts.unshift(newAlert);
    if (alerts.length > 20) alerts.pop();
    console.log(`New alert added: intensity ${alertIntensity}`);
    
    // Broadcast new alert via SSE
    broadcastToClients('seismic.alert', newAlert);
  }
}, 5000); // Update every 5 seconds

const PORT = 8000;
server.listen(PORT, () => {
  console.log(`\n=== USHER ERI Mock Backend Server ===`);
  console.log(`HTTP Server running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/api/events/stream`);
  console.log(`\nSimulating real-time seismic data...`);
  console.log(`Intensity changes randomly every few seconds`);
  console.log(`New alerts generated periodically`);
  console.log(`SSE broadcasts for live updates (5-second intervals)`);
  console.log(`Storage usage fluctuates over time`);
  console.log(`\nFrontend should connect to: http://localhost:3000`);
  console.log(`API endpoints available at: http://localhost:${PORT}/api/*`);
  console.log(`SSE stream: http://localhost:${PORT}/api/events/stream`);
  console.log(`\nPress Ctrl+C to stop server\n`);
});
