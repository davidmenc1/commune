# Chat App

Self-hostovatelná týmová chatová aplikace s real-time synchronizací, zaměřená na **vývojářské týmy** a **rychlost**.

> 📖 **[Kompletní technický přehled a dokumentace →](./TECH_OVERVIEW.md)**

## O projektu

Moderní chatová aplikace pro týmy, která běží kompletně na vlastní infrastruktuře. Žádné závislosti na cloudových službách třetích stran. Všechna data zůstávají pod tvou kontrolou.

**Proč Chat App místo Slack/Discord/Teams?**

- ✅ **100% self-hosted** - plná kontrola nad daty
- ✅ **Hluboká GitHub/GitLab integrace** - nativní propojení s development workflow
- ✅ **Per-channel webhooky** - snadná automatizace a CI/CD integrace
- ✅ **Zero latence** - real-time sync pomocí Rocicorp Zero
- ✅ **Nákladově efektivní** - jen hosting, žádné per-user fees

### Funkce

#### 💬 Základní Komunikace

- **Kanály** - veřejné i privátní, s možností nastavení přístupových práv
- **Skupiny** - organizace uživatelů pro snadnější správu přístupů
- **Přímé zprávy** - komunikace mezi dvěma uživateli
- **Vlákna** - odpovědi na zprávy ve vláknech
- **Reakce** - emoji reakce na zprávy
- **Přílohy** - nahrávání souborů a obrázků ke zprávám
- **Real-time sync** - okamžitá synchronizace napříč zařízeními pomocí Rocicorp Zero

#### 🔔 Notifikace

- **Mention systém** - @username pro upozornění konkrétních uživatelů
- **Real-time notifikace** - okamžité upozornění na mentions
- **Notification center** - přehled všech notifikací
- **Unread badges** - vizuální označení nepřečtených zpráv

#### 🔗 GitHub Integrace

- **OAuth propojení** - bezpečné připojení GitHub účtu
- **Repository integrace** - propojení repozitářů s kanály
- **Rich unfurling** - automatické rozbalení GitHub URL (PRs, issues, commits, branches, files)
- **GitHub mentions** - `@github/owner/repo#123` pro odkaz na issues/PRs
- **Build tracking** - sledování CI/CD buildů přímo v chatu
- **Activity feed** - přehled aktivit z připojených repozitářů

#### 🦊 GitLab Integrace

- **OAuth propojení** - bezpečné připojení GitLab účtu
- **Project integrace** - propojení projektů s kanály
- **Rich unfurling** - automatické rozbalení GitLab URL (MRs, issues, commits, branches, files)
- **GitLab mentions** - `@gitlab/project#123` pro odkaz na issues/MRs
- **Pipeline tracking** - sledování CI/CD pipelines přímo v chatu
- **Activity feed** - přehled aktivit z připojených projektů

#### 🪝 Webhooky

- **Per-channel webhooky** - každý kanál může mít vlastní webhook
- **CI/CD integrace** - automatické notifikace z build systémů
- **Custom automation** - integrace s libovolnými nástroji
- **Monitoring alerts** - automatické alerty do kanálů

## Technologie

| Kategorie       | Technologie                        |
| --------------- | ---------------------------------- |
| **Framework**   | Next.js 15 (App Router, Turbopack) |
| **Frontend**    | React 19, TypeScript               |
| **Styling**     | Tailwind CSS 4                     |
| **Komponenty**  | Radix UI, shadcn/ui                |
| **Databáze**    | PostgreSQL                         |
| **ORM**         | Drizzle ORM                        |
| **Real-time**   | Rocicorp Zero                      |
| **Autentizace** | Better Auth                        |
| **State**       | Jotai                              |
| **Validace**    | Zod                                |
| **Runtime**     | Bun                                |

## Quick Start

### Prerequisites

- **Bun** (runtime) - [instalace](https://bun.sh)
- **PostgreSQL** - databáze (lze použít Docker)
- **Node.js 18+** - alternativa k Bun

### Instalace

```bash
# 1. Clone repository
git clone <repository-url>
cd chat-app

# 2. Instalace závislostí
bun install

# 3. Start PostgreSQL (Docker)
docker-compose up -d postgres
# NEBO použij existující PostgreSQL

# 4. Konfigurace (.env.local)
DATABASE_URL=postgresql://user:password@localhost:5432/chatapp
ZERO_UPSTREAM_DB=postgresql://user:password@localhost:5432/chatapp

# 5. Databázové migrace
bunx drizzle-kit generate
bunx drizzle-kit migrate

# 6. Start Zero cache (v samostatném terminálu)
bun run cache

# 7. Start development server
bun run dev
```

Aplikace běží na **http://localhost:3000**

### Produkční Deployment

#### Docker Compose (Doporučeno)

```yaml
# docker-compose.yml
version: "3.8"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: chatapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your-secure-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  app:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:your-secure-password@postgres:5432/chatapp
      ZERO_UPSTREAM_DB: postgresql://postgres:your-secure-password@postgres:5432/chatapp
    ports:
      - "3000:3000"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

```bash
# Start všech služeb
docker-compose up -d

# Sledování logů
docker-compose logs -f
```

## Dokumentace

- **[TECH_OVERVIEW.md](./TECH_OVERVIEW.md)** - Kompletní technický přehled, architektura, porovnání se Slack/Discord/Teams
- **[NOTIFICATIONS.md](./NOTIFICATIONS.md)** - Dokumentace notifikačního systému

## Vývoj

```bash
bun run dev        # Development server s hot-reload
bun run build      # Production build
bun run start      # Start production server
bun run lint       # Linting
bun run cache      # Zero cache server
bun run generate   # Generování Zero schema
```

## Contributing

Příspěvky jsou vítány! Pokud máte nápad na novou funkci nebo jste našli bug:

1. Fork repository
2. Vytvoř feature branch (`git checkout -b feature/amazing-feature`)
3. Commit změny (`git commit -m 'Add amazing feature'`)
4. Push do branch (`git push origin feature/amazing-feature`)
5. Otevři Pull Request

## License

[MIT License](LICENSE) - použij jak chceš!

## Podpora

- 🐛 **Issues** - [GitHub Issues](https://github.com/your-repo/issues)
- 💬 **Discussions** - [GitHub Discussions](https://github.com/your-repo/discussions)
- 📧 **Email** - your-email@example.com
