const http = require('http');
const https = require('https');
const url = require('url');

// ============================================
// DEBUG: Umgebungsvariablen  ausgeben
// ============================================
console.log('=== SERVER START ===');
console.log('WCL_CLIENT_ID:', process.env.WCL_CLIENT_ID ? 'VORHANDEN (Länge: ' + process.env.WCL_CLIENT_ID.length + ')' : 'NICHT GEFUNDEN');
console.log('WCL_CLIENT_SECRET:', process.env.WCL_CLIENT_SECRET ? 'VORHANDEN (Länge: ' + process.env.WCL_CLIENT_SECRET.length + ')' : 'NICHT GEFUNDEN');
console.log('NODE_ENV:', process.env.NODE_ENV || 'nicht gesetzt');
console.log('PORT:', process.env.PORT || 'nicht gesetzt (default: 3000)');
console.log('===================');

// Cache für Warcraft Logs Token
let wclToken = null;
let wclTokenExpiry = null;

// Cache für Daten (5 Minuten)
let dataCache = {
  rankings: null,
  trinkets: null,
  lastUpdate: null
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 Minuten

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

// Warcraft Logs OAuth Token abrufen
async function getWarcraftLogsToken() {
  const clientId = process.env.WCL_CLIENT_ID;
  const clientSecret = process.env.WCL_CLIENT_SECRET;
  
  // Debug-Ausgabe
  console.log('getWarcraftLogsToken aufgerufen');
  console.log('clientId verfügbar:', !!clientId);
  console.log('clientSecret verfügbar:', !!clientSecret);
  
  if (!clientId || !clientSecret) {
    console.log('FEHLER: WCL Credentials nicht gesetzt!');
    return null;
  }

  // Prüfe ob Token noch gültig
  if (wclToken && wclTokenExpiry && Date.now() < wclTokenExpiry) {
    console.log('Verwende gecachtes Token');
    return wclToken;
  }

  console.log('Hole neues WCL Token...');

  return new Promise((resolve, reject) => {
    const postData = `grant_type=client_credentials`;
    
    const options = {
      hostname: 'www.warcraftlogs.com',
      path: '/oauth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          console.log('WCL Token Response Status:', res.statusCode);
          const response = JSON.parse(data);
          
          if (response.access_token) {
            wclToken = response.access_token;
            wclTokenExpiry = Date.now() + (response.expires_in * 1000);
            console.log('WCL Token erfolgreich erhalten!');
            resolve(wclToken);
          } else {
            console.log('WCL Token Fehler:', response);
            resolve(null);
          }
        } catch (e) {
          console.error('Fehler beim Parsen der WCL Antwort:', e);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('WCL Token Request Fehler:', err);
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

// GraphQL Query an Warcraft Logs senden
async function queryWarcraftLogs(query, variables = {}) {
  const token = await getWarcraftLogsToken();
  
  if (!token) {
    console.log('Kein WCL Token verfügbar, verwende Fallback-Daten');
    return null;
  }

  console.log('Sende GraphQL Query...');

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ query, variables });
    
    const options = {
      hostname: 'www.warcraftlogs.com',
      path: '/api/v2/client',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          console.log('WCL GraphQL Response Status:', res.statusCode);
          const response = JSON.parse(data);
          
          if (response.errors) {
            console.log('WCL GraphQL Fehler:', response.errors);
            resolve(null);
          } else {
            console.log('WCL GraphQL erfolgreich!');
            resolve(response.data);
          }
        } catch (e) {
          console.error('Fehler beim Parsen der GraphQL Antwort:', e);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error('WCL GraphQL Request Fehler:', err);
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

// DPS Rankings von Warcraft Logs abrufen
async function getRankingsFromWCL() {
  const query = `
    query getRankings {
      worldData {
        encounter(id: 3009) {
          rankings(
            difficulty: 5
            metric: dps
            timeframe: Today
            className: "Any"
          )
        }
      }
    }
  `;
  
  const data = await queryWarcraftLogs(query);
  return data?.worldData?.encounter?.rankings;
}

// Fallback-Daten (wenn WCL nicht verfügbar)
const fallbackRankings = {
  'Death Knight - Blood': { dps: 1850000, tier: 'A', confidence: 'high' },
  'Death Knight - Frost': { dps: 2350000, tier: 'S', confidence: 'high' },
  'Death Knight - Unholy': { dps: 2280000, tier: 'S', confidence: 'high' },
  'Demon Hunter - Havoc': { dps: 2420000, tier: 'S', confidence: 'high' },
  'Demon Hunter - Vengeance': { dps: 1650000, tier: 'B', confidence: 'medium' },
  'Druid - Balance': { dps: 2180000, tier: 'A', confidence: 'high' },
  'Druid - Feral': { dps: 2050000, tier: 'A', confidence: 'high' },
  'Druid - Guardian': { dps: 1420000, tier: 'C', confidence: 'medium' },
  'Evoker - Devastation': { dps: 2250000, tier: 'S', confidence: 'high' },
  'Evoker - Augmentation': { dps: 1850000, tier: 'A', confidence: 'high' },
  'Hunter - Beast Mastery': { dps: 1980000, tier: 'A', confidence: 'high' },
  'Hunter - Marksmanship': { dps: 2120000, tier: 'A', confidence: 'high' },
  'Hunter - Survival': { dps: 1920000, tier: 'B', confidence: 'medium' },
  'Mage - Arcane': { dps: 2380000, tier: 'S', confidence: 'high' },
  'Mage - Fire': { dps: 2320000, tier: 'S', confidence: 'high' },
  'Mage - Frost': { dps: 2080000, tier: 'A', confidence: 'high' },
  'Monk - Brewmaster': { dps: 1480000, tier: 'C', confidence: 'medium' },
  'Monk - Windwalker': { dps: 2150000, tier: 'A', confidence: 'high' },
  'Paladin - Protection': { dps: 1380000, tier: 'C', confidence: 'medium' },
  'Paladin - Retribution': { dps: 2200000, tier: 'A', confidence: 'high' },
  'Priest - Shadow': { dps: 2100000, tier: 'A', confidence: 'high' },
  'Rogue - Assassination': { dps: 2300000, tier: 'S', confidence: 'high' },
  'Rogue - Outlaw': { dps: 2000000, tier: 'A', confidence: 'high' },
  'Rogue - Subtlety': { dps: 1950000, tier: 'B', confidence: 'medium' },
  'Shaman - Elemental': { dps: 2180000, tier: 'A', confidence: 'high' },
  'Shaman - Enhancement': { dps: 2050000, tier: 'A', confidence: 'high' },
  'Warlock - Affliction': { dps: 1980000, tier: 'A', confidence: 'high' },
  'Warlock - Demonology': { dps: 2250000, tier: 'S', confidence: 'high' },
  'Warlock - Destruction': { dps: 2150000, tier: 'A', confidence: 'high' },
  'Warrior - Arms': { dps: 2080000, tier: 'A', confidence: 'high' },
  'Warrior - Fury': { dps: 2020000, tier: 'A', confidence: 'high' },
  'Warrior - Protection': { dps: 1350000, tier: 'C', confidence: 'medium' }
};

const fallbackTrinkets = [
  { id: 1, name: 'Trinket A', source: 'Dungeon', value: 100 },
  { id: 2, name: 'Trinket B', source: 'Raid', value: 95 },
  { id: 3, name: 'Trinket C', source: 'Crafted', value: 90 }
];

// Server erstellen
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const method = req.method;

  console.log(`${new Date().toISOString()} - ${method} ${path}`);

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // Health Check
  if (path === '/health' || path === '/') {
    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;
    
    // Teste WCL Verbindung
    let wclConnected = false;
    if (clientId && clientSecret) {
      const token = await getWarcraftLogsToken();
      wclConnected = !!token;
    }
    
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      warcraft_logs_connected: wclConnected,
      env_vars_set: {
        client_id: !!clientId,
        client_secret: !!clientSecret
      },
      cache_last_update: dataCache.lastUpdate
    }));
    return;
  }

  // API Routes
  if (path === '/api/rankings') {
    // Prüfe Cache
    const now = Date.now();
    if (dataCache.rankings && dataCache.lastUpdate && (now - dataCache.lastUpdate) < CACHE_DURATION) {
      console.log('Verwende gecachte Rankings');
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        source: 'cache',
        lastUpdate: dataCache.lastUpdate,
        data: dataCache.rankings
      }));
      return;
    }

    // Versuche WCL Daten zu holen
    console.log('Versuche WCL Rankings zu holen...');
    const wclData = await getRankingsFromWCL();
    
    if (wclData) {
      console.log('WCL Rankings erfolgreich!');
      dataCache.rankings = wclData;
      dataCache.lastUpdate = now;
      
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        source: 'warcraftlogs',
        lastUpdate: now,
        data: wclData
      }));
    } else {
      console.log('Verwende Fallback-Rankings');
      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({
        source: 'fallback',
        lastUpdate: now,
        data: fallbackRankings
      }));
    }
    return;
  }

  if (path === '/api/trinkets') {
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      source: 'fallback',
      data: fallbackTrinkets
    }));
    return;
  }

  if (path === '/api/stats') {
    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;
    
    res.writeHead(200, corsHeaders);
    res.end(JSON.stringify({
      specs_tracked: 31,
      last_data_update: dataCache.lastUpdate || new Date().toISOString(),
      warcraft_logs_connected: !!(clientId && clientSecret),
      cache_hits: dataCache.rankings ? 'active' : 'none'
    }));
    return;
  }

  // 404
  res.writeHead(404, corsHeaders);
  res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 WoW Helper API Server läuft auf Port ${PORT}`);
  console.log(`📊 Health Check: http://localhost:${PORT}/health`);
});

