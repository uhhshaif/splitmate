import { NextResponse } from 'next/server';
import os from 'os';

// Polyfill Node.js global map to persist companion sessions in dev memory
const globalRef = global as any;
if (!globalRef.companionSessions) {
  globalRef.companionSessions = new Map<string, string>();
}
const companionSessions = globalRef.companionSessions;

// Helper to auto-detect laptop's local network IP on Wi-Fi
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Look for non-internal IPv4 address (typical home/office Wi-Fi IP e.g. 192.168.x.x)
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const localIp = getLocalNetworkIp();

    if (!sessionId) {
      // Just requesting local IP
      return NextResponse.json({ localIp });
    }

    const value = companionSessions.get(sessionId);
    if (value) {
      if (value === 'connected') {
        return NextResponse.json({
          status: 'connected',
          localIp
        });
      } else {
        // It's the base64 image - consume it
        companionSessions.delete(sessionId);
        return NextResponse.json({
          status: 'completed',
          image: value,
          localIp
        });
      }
    }

    return NextResponse.json({
      status: 'pending',
      localIp
    });

  } catch (error: any) {
    console.error('API /api/companion error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, image, status } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    if (status === 'connected') {
      companionSessions.set(sessionId, 'connected');
      return NextResponse.json({ success: true });
    }

    if (!image) {
      return NextResponse.json({ error: 'Missing image or status' }, { status: 400 });
    }

    // Save base64 image linked to this session
    companionSessions.set(sessionId, image);

    // Auto-cleanup session in memory after 5 minutes to prevent leak if never fetched
    setTimeout(() => {
      if (companionSessions.has(sessionId)) {
        companionSessions.delete(sessionId);
      }
    }, 5 * 60 * 1000);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('API /api/companion POST error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
