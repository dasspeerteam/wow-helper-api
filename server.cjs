#!/usr/bin/env node
/**
 * WoW Helper API Server - WoW: Midnight Edition
 * Mit echter Warcraft Logs API Integration
 * Patch 12.0.1 - Season 1
 */

const http = require('http');
const url = require('url');
const { WarcraftLogsAPI, WCL_SPEC_MAPPING } = require('./warcraftlogs');

const PORT = process.env.PORT || 3001;

// Warcraft Logs API Client
const wclClient = new WarcraftLogsAPI(
    process.env.WCL_CLIENT_ID,
    process.env.WCL_CLIENT_SECRET
);

// Cache für API-Responses (5 Minuten)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(key);
    return null;
}

function setCached(key, data) {
    cache.set(key, { data, timestamp: Date.now() });
}

// Lokale Fallback-Daten (wenn WCL nicht verfügbar)
const MIDNIGHT_DPS_DATA = {
    'Demonology': { dps: 1250000, rank: 1, percentile: 99, tier: 'S' },
    'Arcane': { dps: 1230000, rank: 2, percentile: 98, tier: 'S' },
    'Frost': { dps: 1220000, rank: 3, percentile: 97, tier: 'S' },
    'Augmentation': { dps: 1180000, rank: 4, percentile: 95, tier: 'S' },
    'Devastation': { dps: 1150000, rank: 5, percentile: 92, tier: 'A+' },
    'Affliction': { dps: 1140000, rank: 6, percentile: 90, tier: 'A+' },
    'Devourer': { dps: 1130000, rank: 7, percentile: 88, tier: 'A+' },
    'Outlaw': { dps: 1120000, rank: 8, percentile: 86, tier: 'A+' },
    'Elemental': { dps: 1110000, rank: 9, percentile: 84, tier: 'A+' },
    'Survival': { dps: 1100000, rank: 10, percentile: 82, tier: 'A+' },
    'Fury': { dps: 1090000, rank: 11, percentile: 80, tier: 'A+' },
    'BeastMastery': { dps: 1070000, rank: 12, percentile: 75, tier: 'A' },
    'Marksmanship': { dps: 1060000, rank: 13, percentile: 72, tier: 'A' },
    'Feral': { dps: 1050000, rank: 14, percentile: 70, tier: 'A' },
    'Shadow': { dps: 1040000, rank: 15, percentile: 68, tier: 'A' },
    'Unholy': { dps: 1030000, rank: 16, percentile: 65, tier: 'A' },
    'Subtlety': { dps: 1020000, rank: 17, percentile: 62, tier: 'A' },
    'Enhancement': { dps: 1010000, rank: 18, percentile: 60, tier: 'A' },
    'Assassination': { dps: 1000000, rank: 19, percentile: 58, tier: 'A' },
    'Windwalker': { dps: 990000, rank: 20, percentile: 55, tier: 'A' },
    'Balance': { dps: 970000, rank: 21, percentile: 50, tier: 'B' },
    'Destruction': { dps: 960000, rank: 22, percentile: 48, tier: 'B' },
    'Arms': { dps: 950000, rank: 23, percentile: 45, tier: 'B' },
    'Fire': { dps: 940000, rank: 24, percentile: 42, tier: 'B' },
    'Havoc': { dps: 930000, rank: 25, percentile: 40, tier: 'B' },
    'Retribution': { dps: 900000, rank: 26, percentile: 35, tier: 'C' },
};

function generateLocalRankings(className, specName) {
    const specKey = specName.replace(' ', '_');
    const data = MIDNIGHT_DPS_DATA[specKey] || { dps: 950000, rank: 15, percentile: 50, tier: '?' };
    const variance = (Math.random() - 0.5) * 0.02;
    const dps = Math.round(data.dps * (1 + variance));
    
    return {
        rank: data.rank,
        outOf: 26,
        total: 26,
        class: className,
        spec: specName,
        dps: dps,
        averageDps: Math.round(dps * 0.75),
        percentile: data.percentile,
        tier: data.tier,
        sampleSize: Math.floor(Math.random() * 5000) + 8000,
        lastUpdated: new Date().toISOString(),
        source: 'local-data',
        patch: '12.0.1',
        expansion: 'Midnight'
    };
}

async function getRankingsWithFallback(specId) {
    const spec = WCL_SPEC_MAPPING[specId];
    if (!spec) {
        return null;
    }

    // Versuche Warcraft Logs API
    try {
        const wclData = await wclClient.getPTRRankings(spec.class, spec.spec);
        if (wclData) {
            return {
                ...wclData,
                outOf: 26,
                total: 26,
                tier: MIDNIGHT_DPS_DATA[spec.spec]?.tier || '?',
                source: 'warcraftlogs-ptr',
                patch: '12.0.1',
                expansion: 'Midnight'
            };
        }
    } catch (error) {
        console.log(`WCL nicht verfügbar für ${specId}, verwende lokale Daten`);
    }

    // Fallback zu lokalen Daten
    return generateLocalRankings(spec.class, spec.spec);
}

function getTrinkets() {
    return {
        trinkets: [
            { name: 'House of Cards', itemLevel: 678, dps: 68500, source: 'The MOTHERLODE!!' },
            { name: 'Mekgines Salty Seabrew', itemLevel: 678, dps: 67200, source: 'Liberation of Undermine' },
            { name: 'Signet of the Priory', itemLevel: 678, dps: 65800, source: 'Priory of the Sacred Flame' },
            { name: 'Eye of Kezan', itemLevel: 678, dps: 64500, source: 'Liberation of Undermine' },
            { name: 'Ara-Kara Sacrifice', itemLevel: 678, dps: 63200, source: 'Ara-Kara' },
            { name: 'Cirral Concoctory', itemLevel: 678, dps: 62100, source: 'Cinderbrew Meadery' },
            { name: 'Mists Sacrifice', itemLevel: 678, dps: 61500, source: 'Mists of Tirna Scithe' },
            { name: 'Ragefeather Reborn', itemLevel: 678, dps: 60800, source: 'Nokhud Offensive' },
        ],
        updated: new Date().toISOString()
    };
}

function setCORSHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
}

const server = http.createServer(async (req, res) => {
    setCORSHeaders(res);
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;
    
    console.log(`${new Date().toISOString()} - ${req.method} ${path}`);
    
    if (path === '/api/health') {
        const hasWCL = !!(process.env.WCL_CLIENT_ID && process.env.WCL_CLIENT_SECRET);
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: '3.1.0',
            expansion: 'Midnight',
            patch: '12.0.1',
            specs_available: Object.keys(WCL_SPEC_MAPPING).length,
            warcraft_logs_connected: hasWCL,
            data_source: hasWCL ? 'warcraftlogs-ptr' : 'local-data'
        }));
        return;
    }
    
    if (path === '/api/rankings') {
        const cacheKey = 'all_rankings';
        const cached = getCached(cacheKey);
        
        if (cached) {
            res.writeHead(200);
            res.end(JSON.stringify(cached));
            return;
        }
        
        const results = {};
        for (const specId of Object.keys(WCL_SPEC_MAPPING)) {
            const ranking = await getRankingsWithFallback(specId);
            if (ranking) {
                results[specId] = ranking;
            }
        }
        
        setCached(cacheKey, results);
        res.writeHead(200);
        res.end(JSON.stringify(results));
        return;
    }
    
    const rankingsMatch = path.match(/^\/api\/rankings\/(.+)$/);
    if (rankingsMatch) {
        const specId = rankingsMatch[1];
        
        if (!WCL_SPEC_MAPPING[specId]) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Unbekannte Spezialisierung' }));
            return;
        }
        
        const cacheKey = `rankings_${specId}`;
        const cached = getCached(cacheKey);
        
        if (cached) {
            res.writeHead(200);
            res.end(JSON.stringify(cached));
            return;
        }
        
        const ranking = await getRankingsWithFallback(specId);
        
        if (ranking) {
            setCached(cacheKey, ranking);
            res.writeHead(200);
            res.end(JSON.stringify(ranking));
        } else {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Konnte Rankings nicht laden' }));
        }
        return;
    }
    
    const trinketsMatch = path.match(/^\/api\/trinkets\/(.+)$/);
    if (trinketsMatch) {
        const specId = trinketsMatch[1];
        
        if (!WCL_SPEC_MAPPING[specId]) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Unbekannte Spezialisierung' }));
            return;
        }
        
        const cacheKey = `trinkets_${specId}`;
        const cached = getCached(cacheKey);
        
        if (cached) {
            res.writeHead(200);
            res.end(JSON.stringify(cached));
            return;
        }
        
        const trinkets = getTrinkets();
        setCached(cacheKey, trinkets);
        res.writeHead(200);
        res.end(JSON.stringify(trinkets));
        return;
    }
    
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Nicht gefunden' }));
});

server.listen(PORT, () => {
    const hasWCL = !!(process.env.WCL_CLIENT_ID && process.env.WCL_CLIENT_SECRET);
    console.log(`WoW: Midnight API Server v3.1.0 - WCL: ${hasWCL ? 'Verbunden' : 'Lokale Daten'}`);
});
