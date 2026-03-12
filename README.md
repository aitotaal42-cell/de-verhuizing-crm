# De Verhuizing CRM

Standalone CRM-systeem voor het beheren van offertes, terugbelverzoeken en contactberichten.

## Installatie

```bash
git clone https://github.com/aitotaal42-cell/de-verhuizing-crm.git
cd de-verhuizing-crm
npm install
node setup.js admin JouwWachtwoord "Je Naam"
```

## Opstarten

```bash
ALLOWED_ORIGINS=https://deverhuizing.nl,https://www.deverhuizing.nl,https://crm.deverhuizing.nl \
SESSION_SECRET=kies-een-lang-geheim \
PORT=3001 \
node server.js
```

### Met PM2 (aanbevolen voor productie)

```bash
npm install -g pm2

ALLOWED_ORIGINS=https://deverhuizing.nl,https://www.deverhuizing.nl,https://crm.deverhuizing.nl \
SESSION_SECRET=kies-een-lang-geheim \
pm2 start server.js --name "crm"

pm2 save
pm2 startup
```

## Omgevingsvariabelen

| Variabele | Verplicht | Standaard | Beschrijving |
|-----------|-----------|-----------|--------------|
| `ALLOWED_ORIGINS` | Ja | - | Komma-gescheiden lijst van toegestane domeinen voor CORS (bijv. `https://deverhuizing.nl,https://www.deverhuizing.nl,https://crm.deverhuizing.nl`) |
| `SESSION_SECRET` | Ja | - | Geheime sleutel voor sessie-encryptie |
| `PORT` | Nee | 3001 | Poort waarop de server draait |

## Website koppelen

Pas `js/forms.js` aan op je website:

```javascript
var DV_API_URL = 'https://crm.deverhuizing.nl';
var DV_API_MODE = 'crm';
```

## API Endpoints

### Publiek (voor website-formulieren)
- `POST /api/quote-requests` - Offerte aanvraag (verplicht: firstName, phone)
- `POST /api/callback-requests` - Terugbelverzoek (verplicht: firstName, phone)
- `POST /api/contact-messages` - Contactbericht (verplicht: name, email, subject, message)

### CRM (vereist inlog)
- `GET /api/crm/stats` - Dashboard statistieken
- `GET /api/crm/quote-requests` - Alle offertes
- `GET /api/crm/callback-requests` - Alle terugbelverzoeken
- `GET /api/crm/contact-messages` - Alle berichten
- `PATCH /api/crm/quote-requests/:id` - Status/toewijzing wijzigen
- `PATCH /api/crm/callback-requests/:id` - Status/toewijzing wijzigen

## Extra account aanmaken

```bash
node setup.js gebruikersnaam wachtwoord "Volledige Naam"
```
