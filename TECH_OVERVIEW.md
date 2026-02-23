# Chat App - Technický Přehled Projektu

## O Projektu

**Chat App** je moderní self-hosted aplikace pro týmovou komunikaci, speciálně navržená pro vývojářské týmy s důrazem na **rychlost, soukromí a developer experience**. Na rozdíl od komerčních řešení jako Slack, Discord nebo Teams běží kompletně na vaší vlastní infrastruktuře - žádná data neopouští vaše servery.

## Klíčové Vlastnosti

### 🚀 Zaměření na Vývojáře

Aplikace je postavena vývojáři pro vývojáře a nabízí:

- **Hlubokou integraci s GitHub a GitLab** - propojení repozitářů přímo do kanálů, automatické notifikace o issues, pull requestech, merge requestech, CI/CD pipeline stavech
- **Webhook systém** - každý kanál může mít vlastní webhooky pro automatizaci a integrace s dalšími nástroji
- **Rich text formátování** - podpora pro zobrazování kódu, commits, branches a dalších vývojářských artefaktů
- **Mentions a notifikace** - @mention systém s real-time notifikacemi

### ⚡ Rychlost a Real-time Synchronizace

- **Rocicorp Zero** - nejmodernější real-time synchronizační engine poskytující okamžitou synchronizaci napříč všemi zařízeními
- **Optimistické UI** - změny se zobrazují okamžitě, bez čekání na server
- **Efektivní databázové dotazy** - Drizzle ORM s PostgreSQL pro maximální výkon
- **Next.js 15 s Turbopack** - nejnovější technologie pro bleskově rychlé načítání

### 🔐 Soukromí a Kontrola

- **100% self-hosted** - všechna data zůstávají na vašich serverech
- **Žádné cloudové závislosti** - není potřeba spojení s externími službami
- **Vlastní autentizace** - Better Auth pro bezpečnou správu uživatelů
- **Granulární přístupová práva** - podpora pro privátní kanály, skupiny a role

## Technologický Stack

### Frontend

| Technologie         | Verze  | Účel                                                |
| ------------------- | ------ | --------------------------------------------------- |
| **Next.js**         | 15.5   | Full-stack React framework s App Router a Turbopack |
| **React**           | 19.1   | UI knihovna s nejnovějšími funkcemi                 |
| **TypeScript**      | 5.x    | Staticky typovaný JavaScript pro bezpečnost kódu    |
| **Tailwind CSS**    | 4.x    | Utility-first CSS framework pro rychlý vývoj UI     |
| **Radix UI**        | latest | Headless UI komponenty s plnou accessibility        |
| **shadcn/ui**       | latest | Krásné, přístupné komponenty postavené na Radix UI  |
| **Jotai**           | 2.14   | Atomický state management                           |
| **React Hook Form** | 7.x    | Výkonné formuláře s validací                        |
| **Zod**             | 4.x    | TypeScript-first schema validace                    |

### Backend & Database

| Technologie       | Účel                                               |
| ----------------- | -------------------------------------------------- |
| **PostgreSQL**    | Hlavní relační databáze pro všechna data           |
| **Drizzle ORM**   | Type-safe ORM s výborným developer experience      |
| **Better Auth**   | Moderní autentizační systém s podporou JWT         |
| **Rocicorp Zero** | Real-time synchronizační engine pro okamžitou sync |

### Runtime & Tooling

| Nástroj         | Účel                                              |
| --------------- | ------------------------------------------------- |
| **Bun**         | Ultra-rychlý JavaScript runtime a package manager |
| **Turbopack**   | Rychlejší alternativa k Webpack                   |
| **Drizzle Kit** | Databázové migrace a schema management            |
| **ESLint**      | Linting pro kvalitu kódu                          |

## Architektura

### Real-time Synchronizace (Rocicorp Zero)

Klíčovou technologií je **Rocicorp Zero** - moderní real-time sync engine, který poskytuje:

```typescript
// Zero schema s automatickou synchronizací
export const builder = createBuilder(schema);
export const permissions = definePermissions(schema, () => ({
  usersTable: ANYONE_CAN_DO_ANYTHING,
  channelsTable: ANYONE_CAN_DO_ANYTHING,
  messagesTable: ANYONE_CAN_DO_ANYTHING,
  // ... další tabulky
}));
```

**Výhody Zero:**

- Okamžitá synchronizace bez polling
- Offline-first přístup
- Automatické řešení konfliktů
- Optimistické UI updaty
- Nulová latence pro uživatele

### Databázové Schema

Aplikace používá relační model s následujícími hlavními entitami:

- **Users** - uživatelé s rolemi (user, admin, owner)
- **Channels** - kanály (veřejné/privátní) s přístupovými právy
- **Groups** - skupiny uživatelů pro snadnější správu přístupů
- **Messages** - zprávy s podporou pro vlákna (threads)
- **Reactions** - emoji reakce na zprávy
- **Attachments** - přílohy k zprávám
- **Notifications** - systém notifikací pro mentions
- **Channel Webhooks** - webhooky pro každý kanál
- **GitHub/GitLab Integrations** - propojení s git platformami

### API Structure

```
app/api/
├── attachments/         # Upload a správa příloh
├── auth/               # Autentizace (Better Auth)
├── channels/           # Správa kanálů a webhooků
├── github/            # GitHub integrace
│   ├── auth/          # OAuth flow
│   ├── callback/      # OAuth callback
│   ├── repos/         # Seznam repozitářů
│   ├── activity/      # GitHub aktivita
│   ├── builds/        # CI/CD buildy
│   └── integrations/  # Správa integrací
├── gitlab/           # GitLab integrace
│   ├── auth/         # OAuth flow
│   ├── callback/     # OAuth callback
│   ├── repos/        # Seznam projektů
│   ├── activity/     # GitLab aktivita
│   ├── pipelines/    # CI/CD pipelines
│   └── integrations/ # Správa integrací
├── webhooks/         # Webhook endpoints
└── zero/            # Zero sync API
```

## Klíčové Funkce

### 1. Kanály a Skupiny

- **Veřejné kanály** - přístupné všem v týmu
- **Privátní kanály** - pouze pro vybrané uživatele/skupiny
- **Skupinová správa** - vytvoření skupin uživatelů pro jednoduché sdílení přístupu
- **Granulární oprávnění** - čtení vs. zápis práva per uživatel/skupina

### 2. Zprávy a Komunikace

- **Real-time zprávy** - okamžité doručení bez refreshe
- **Vlákna (threads)** - odpovědi na zprávy ve vláknech
- **Emoji reakce** - rychlé reakce na zprávy
- **Přílohy** - nahrávání souborů a obrázků
- **Direct messages** - přímá komunikace mezi uživateli
- **Mention systém** - @username notifikace

### 3. GitHub Integrace

Plná integrace s GitHub repozitáři:

- **OAuth autentizace** - bezpečné propojení GitHub účtu
- **Propojení repozitářů** - připojení libovolných repo do kanálů
- **Rich unfurling** - automatické rozbalení GitHub URL do krásných karet:
  - Pull Requests s náhledem
  - Issues s detaily
  - Commits s diff
  - Branches
  - Files se zvýrazněním kódu
- **GitHub mentions** - `@github/user/repo#123` pro odkaz na issues/PRs
- **Build status** - sledování CI/CD buildů přímo v chatu
- **Activity feed** - přehled aktivit z propojených repozitářů

### 4. GitLab Integrace

Stejně robustní integrace s GitLab:

- **OAuth autentizace** - bezpečné propojení GitLab účtu
- **Propojení projektů** - připojení projektů do kanálů
- **Rich unfurling** - automatické rozbalení GitLab URL:
  - Merge Requests s náhledem
  - Issues s detaily
  - Commits s diff
  - Branches
  - Files se syntax highlighting
- **GitLab mentions** - `@gitlab/project#123` pro odkaz na issues/MRs
- **Pipeline status** - sledování CI/CD pipeline přímo v chatu
- **Activity feed** - přehled aktivit z propojených projektů

### 5. Webhook Systém

Každý kanál může mít vlastní webhooky:

```bash
# POST zprávy do kanálu přes webhook
curl -X POST https://your-app.com/api/webhooks/TOKEN \
  -H "Content-Type: application/json" \
  -d '{"content": "Deploy succeeded! 🚀"}'
```

**Use cases:**

- CI/CD notifikace
- Monitoring alerty
- Automatické reports
- Integrace s dalšími nástroji
- Custom boty

### 6. Notifikační Systém

Sofistikovaný systém notifikací:

- **Real-time mentions** - okamžité notifikace při @mention
- **Unread badge** - počet nepřečtených notifikací
- **Notification center** - dedicated stránka s přehledem
- **Mark as read** - hromadné označení jako přečtené
- **Navigate to message** - kliknutím na notifikaci skok na zprávu

## Proč Chat App > Slack, Discord, Teams?

### 🎯 Pro Vývojářské Týmy

| Vlastnost              | Chat App              | Slack         | Discord       | Teams         |
| ---------------------- | --------------------- | ------------- | ------------- | ------------- |
| **Self-hosted**        | ✅ Plná kontrola      | ❌ Cloud only | ❌ Cloud only | ❌ Cloud only |
| **GitHub integrace**   | ✅ Hluboká integrace  | ⚠️ Basic      | ⚠️ Basic      | ⚠️ Basic      |
| **GitLab integrace**   | ✅ Hluboká integrace  | ⚠️ Basic      | ❌            | ⚠️ Basic      |
| **Webhooky**           | ✅ Per-channel        | ✅ Ano        | ⚠️ Limited    | ✅ Ano        |
| **Real-time rychlost** | ✅ Zero latence       | ⚠️ Good       | ⚠️ Good       | ⚠️ Meh        |
| **Soukromí dat**       | ✅ 100% vaše          | ❌ Cloud      | ❌ Cloud      | ❌ Cloud      |
| **Cena**               | ✅ Free (jen hosting) | 💰 Per-user   | 💰 Per-user   | 💰 Per-user   |
| **Customizace**        | ✅ Úplná              | ❌ Limited    | ❌ Limited    | ❌ Limited    |

### 💰 Nákladová Efektivita

**Slack/Teams/Discord:**

- $7-15 per user/měsíc
- Tým 50 lidí = $350-750/měsíc = $4,200-9,000/rok

**Chat App:**

- $0 za software (open-source)
- Jen náklady na hosting (např. $50-200/měsíc pro všechny)
- Úspora: $4,000-8,800/rok

### 🔐 Soukromí a Bezpečnost

**Proč je self-hosting důležitý?**

1. **Data sovereignty** - všechna data zůstávají ve vaší jurisdikci
2. **GDPR compliance** - plná kontrola nad osobními údaji
3. **Zero third-party risk** - žádné úniky dat do cloudu
4. **Audit trail** - kompletní kontrola nad logy a historií
5. **Custom security policies** - vlastní bezpečnostní pravidla

### ⚡ Performance

**Rocicorp Zero vs. tradiční polling:**

```
Slack/Discord/Teams:
├── Polling každých 3-5 sekund
├── Latence: 3-5 sekund pro nové zprávy
└── Zbytečná síťová zátěž

Chat App (Zero):
├── WebSocket s okamžitou sync
├── Latence: <100ms pro nové zprávy
└── Efektivní pouze při změnách
```

### 🛠️ Developer Experience

**Co dělá Chat App lepším pro vývojáře:**

1. **Native GitHub/GitLab integrace** - ne jen linky, ale plnohodnotné preview s kódem
2. **Webhooky per-kanál** - snadná integrace CI/CD
3. **Mentions v kódu** - odkaz přímo na issues/PRs/MRs
4. **Build status tracking** - sledování deployů v reálném čase
5. **Code-first** - formátování textu optimalizované pro kód

### 🚀 Moderní Stack

Na rozdíl od zastaralých technologií v Slack/Teams:

- **Next.js 15** - nejnovější React framework
- **React 19** - nejmodernější React features
- **Turbopack** - 10x rychlejší než Webpack
- **Bun** - 3x rychlejší než npm/yarn
- **Zero** - next-gen real-time sync

## Deployment

### Docker Compose (Doporučeno)

```yaml
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: chatapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/chatapp
      ZERO_UPSTREAM_DB: postgresql://postgres:password@postgres:5432/chatapp
    ports:
      - "3000:3000"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### Minimální Hardware Requirements

- **CPU:** 2 cores
- **RAM:** 4 GB (8 GB doporučeno)
- **Disk:** 20 GB (+ prostor pro attachments)
- **Network:** 100 Mbps+

### Pro Tým 50 Uživatelů

- **CPU:** 4 cores
- **RAM:** 8-16 GB
- **Disk:** 100+ GB (závislé na attachments)
- Náklady na VPS: ~$40-100/měsíc

## Vývoj

### Quick Start

```bash
# Clone repository
git clone <repo-url>
cd chat-app

# Install dependencies (s Bun)
bun install

# Start PostgreSQL
docker-compose up -d postgres
# NEBO
./run_db.sh

# Setup databáze
bunx drizzle-kit generate
bunx drizzle-kit migrate

# Start Zero cache
bun run cache  # v samostatném terminálu

# Start dev server
bun run dev
```

Aplikace běží na `http://localhost:3000`

### Scripts

```bash
bun run dev        # Development server s Turbopack
bun run build      # Production build
bun run start      # Production server
bun run lint       # ESLint check
bun run cache      # Zero cache server
bun run generate   # Generate Zero schema
```

## Budoucí Roadmap

### V Plánu

- [ ] **Mobile aplikace** - React Native app pro iOS/Android
- [ ] **Email notifikace** - volitelné email notifikace pro mentions
- [ ] **Push notifikace** - browser push notifications
- [ ] **Video/Audio hovory** - WebRTC integrace
- [ ] **Slack/Discord import** - migrace dat ze starých platforem
- [ ] **Více integrací** - Jira, Linear, Notion, atd.
- [ ] **Custom témata** - light/dark mode + custom barvy
- [ ] **API documentation** - OpenAPI/Swagger docs
- [ ] **Admin dashboard** - pokročilá správa instancí

### Community Přínos

Projekt je open-source a vítáme příspěvky! Oblasti pro pomoct:

- 🐛 Bug reporting a fixes
- ✨ Nové funkce
- 📝 Dokumentace
- 🌍 Překlady (i18n)
- 🎨 UI/UX vylepšení
- 🔌 Nové integrace

## Závěr

**Chat App** je moderní alternativa k Slack, Discord a Teams, speciálně navržená pro vývojářské týmy, které chtějí:

✅ **Plnou kontrolu nad svými daty**
✅ **Nativní integrace s vývojářskými nástroji**
✅ **Bleskově rychlou komunikaci bez latence**
✅ **Nákladově efektivní řešení**
✅ **Moderní technologický stack**

Postavená na nejmodernějších technologiích (Next.js 15, React 19, Rocicorp Zero, PostgreSQL), aplikace poskytuje enterprise-grade funkcionalitu při zachování jednoduchosti self-hosted nasazení.

---

**Kontakt:** [Your Email]
**License:** MIT (nebo jiná)
**Repository:** [GitHub URL]

