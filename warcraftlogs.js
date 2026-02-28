const https = require('https');

const WCL_SPEC_MAPPING = {
    'frost_dk': { class: 'DeathKnight', spec: 'Frost' },
    'unholy': { class: 'DeathKnight', spec: 'Unholy' },
    'havoc': { class: 'DemonHunter', spec: 'Havoc' },
    'devourer': { class: 'DemonHunter', spec: 'Devourer' },
    'balance': { class: 'Druid', spec: 'Balance' },
    'feral': { class: 'Druid', spec: 'Feral' },
    'augmentation': { class: 'Evoker', spec: 'Augmentation' },
    'devastation': { class: 'Evoker', spec: 'Devastation' },
    'beast_mastery': { class: 'Hunter', spec: 'BeastMastery' },
    'marksmanship': { class: 'Hunter', spec: 'Marksmanship' },
    'survival': { class: 'Hunter', spec: 'Survival' },
    'arcane': { class: 'Mage', spec: 'Arcane' },
    'fire': { class: 'Mage', spec: 'Fire' },
    'frost_mage': { class: 'Mage', spec: 'Frost' },
    'windwalker': { class: 'Monk', spec: 'Windwalker' },
    'retribution': { class: 'Paladin', spec: 'Retribution' },
    'shadow': { class: 'Priest', spec: 'Shadow' },
    'assassination': { class: 'Rogue', spec: 'Assassination' },
    'outlaw': { class: 'Rogue', spec: 'Outlaw' },
    'subtlety': { class: 'Rogue', spec: 'Subtlety' },
    'elemental': { class: 'Shaman', spec: 'Elemental' },
    'enhancement': { class: 'Shaman', spec: 'Enhancement' },
    'affliction': { class: 'Warlock', spec: 'Affliction' },
    'demonology': { class: 'Warlock', spec: 'Demonology' },
    'destruction': { class: 'Warlock', spec: 'Destruction' },
    'arms': { class: 'Warrior', spec: 'Arms' },
    'fury': { class: 'Warrior', spec: 'Fury' },
};

class WarcraftLogsAPI {
    constructor(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }
        if (!this.clientId || !this.clientSecret) {
            return null;
        }
        try {
            const token = await this.requestToken();
            this.accessToken = token;
            this.tokenExpiry = Date.now() + (50 * 60 * 1000);
            return token;
        } catch (error) {
            console.error('Token Fehler:', error.message);
            return null;
        }
    }

    requestToken() {
        return new Promise((resolve, reject) => {
            const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
            const options = {
                hostname: 'www.warcraftlogs.com',
                path: '/oauth/token',
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        if (response.access_token) {
                            resolve(response.access_token);
                        } else {
                            reject(new Error(response.error || 'Kein Token'));
                        }
                    } catch (e) {
                        reject(new Error('Ungültige Antwort'));
                    }
                });
            });
            req.on('error', reject);
            req.write('grant_type=client_credentials');
            req.end();
        });
    }

    async getPTRRankings(className, specName) {
        // PTR Daten noch nicht verfügbar - Fallback
        return null;
    }
}

module.exports = { WarcraftLogsAPI, WCL_SPEC_MAPPING };