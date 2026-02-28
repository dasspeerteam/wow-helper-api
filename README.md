# 🎮 WoW Helper API

Backend-Service für den [WoW Retail Helper](https://flxtygp36djy6.ok.kimi.link) - ein Tool für BiS-Gear, Talentbäume und Live-Daten für World of Warcraft Retail. 19-50

## Features

- ⚡ **DPS Rankings** für alle 22 DD-Spezialisierungen
- 💎 **Trinket-Empfehlungen** basierend auf aktuellen Simulationen
- 🔄 **Auto-Refresh** mit 5-Minuten-Cache
- 🌐 **CORS-fähig** für Frontend-Integration
- 📊 **Aktuelle Daten** für The War Within Season 2

## API Endpoints

| Endpoint | Beschreibung | Beispiel |
|----------|--------------|----------|
| `GET /api/health` | Status-Check | [/api/health](https://deine-url.com/api/health) |
| `GET /api/rankings` | Alle Spec-Rankings | [/api/rankings](https://deine-url.com/api/rankings) |
| `GET /api/rankings/:specId` | Einzelne Spec | [/api/rankings/fire](https://deine-url.com/api/rankings/fire) |
| `GET /api/trinkets/:specId` | Trinket-Empfehlungen | [/api/trinkets/frost_dk](https://deine-url.com/api/trinkets/frost_dk) |

### Spec IDs

| ID | Klasse | Spezialisierung |
|----|--------|-----------------|
| `frost_dk` | Todesritter | Frost |
| `unholy` | Todesritter | Unheilig |
| `havoc` | Dämonenjäger | Verwüstung |
| `balance` | Druide | Gleichgewicht |
| `feral` | Druide | Wildheit |
| `augmentation` | Rufer | Augmentation |
| `devastation` | Rufer | Verwüstung |
| `beast_mastery` | Jäger | Tierherrschaft |
| `marksmanship` | Jäger | Treffsicherheit |
| `survival` | Jäger | Überleben |
| `arcane` | Magier | Arkan |
| `fire` | Magier | Feuer |
| `frost_mage` | Magier | Frost |
| `windwalker` | Mönch | Windläufer |
| `retribution` | Paladin | Vergeltung |
| `shadow` | Priester | Schatten |
| `assassination` | Schurke | Meucheln |
| `outlaw` | Schurke | Gesetzlosigkeit |
| `subtlety` | Schurke | Täuschung |
| `elemental` | Schamane | Elementar |
| `enhancement` | Schamane | Verstärkung |
| `affliction` | Hexenmeister | Gebrechen |
| `demonology` | Hexenmeister | Dämonologie |
| `destruction` | Hexenmeister | Zerstörung |
| `arms` | Krieger | Waffen |
| `fury` | Krieger | Furor |

## Response Beispiel

### Rankings

```json
{
  "rank": 7,
  "outOf": 24,
  "total": 24,
  "class": "Mage",
  "spec": "Fire",
  "dps": 905420,
  "averageDps": 706227,
  "percentile": 85,
  "sampleSize": 12453,
  "lastUpdated": "2025-03-15T10:30:00.000Z",
  "source": "warcraftlogs"
}
```

### Trinkets

```json
{
  "trinkets": [
    {
      "name": "Ara-Kara Sacrifice",
      "itemLevel": 639,
      "dps": 45200,
      "source": "Ara-Kara"
    }
  ],
  "updated": "2025-03-15T10:30:00.000Z"
}
```

## Deployment

### Option 1: Railway.app (Empfohlen)

1. Erstelle ein GitHub Repository mit diesem Code
2. Gehe zu [railway.app](https://railway.app)
3. Login mit GitHub
4. "New Project" → "Deploy from GitHub repo"
5. Wähle dein Repository
6. Railway erkennt Node.js automatisch
7. Deploy!

### Option 2: Render.com

1. Erstelle ein GitHub Repository
2. Gehe zu [render.com](https://render.com)
3. "New Web Service" → "Build from GitHub"
4. Konfiguration:
   - **Build Command:** `echo "Build complete"`
   - **Start Command:** `node server.cjs`
5. Deploy!

### Option 3: Fly.io

```bash
# Installiere Fly CLI
curl -L https://fly.io/install.sh | sh

# Login und Deploy
fly auth login
fly launch
fly deploy
```

## Frontend-Integration

Setze die Umgebungsvariable im Frontend:

```bash
VITE_API_URL=https://deine-backend-url.com/api
```

Die Frontend-App erkennt automatisch, ob ein Backend verfügbar ist.

## Datenquellen

- **DPS-Daten:** Basierend auf Warcraft Logs Rankings (Heroic/Mythic)
- **Trinket-Daten:** Basierend auf Bloodmallet-Simulationen
- **Patch:** The War Within Season 2 (11.1)

## Lizenz

MIT - Frei verwendbar!

---

Made with ❤️ for the WoW Community
