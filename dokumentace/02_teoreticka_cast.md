# 2. Teoretická část

Teoretická část práce shrnuje klíčové koncepty a technologické principy, na nichž je navržená aplikace postavena. Nejde o vyčerpávající popis všech použitých knihoven, ale o uvedení problémů, které musel návrh řešit, a přístupů, které byly pro jejich řešení zvoleny. Každá podkapitola se zaměřuje na jednu z hlavních oblastí: real-time synchronizaci dat, autentizaci a autorizaci uživatelů a integraci s vývojářskými platformami.

## a. Real-time synchronizace a offline-first přístup

### Problém

Chatovací aplikace ze své podstaty vyžaduje, aby se změny provedené jedním uživatelem (odeslání zprávy, reakce, úprava kanálu) okamžitě promítly všem ostatním připojeným klientům. Tradiční přístup založený na opakovaném dotazování serveru (polling) přináší zbytečnou síťovou zátěž a latenci v řádu sekund. Pro plynulou komunikaci v týmu je však žádoucí, aby latence byla co nejnižší – ideálně pod 100 ms.

Kromě rychlosti synchronizace existuje i požadavek na odolnost vůči výpadkům připojení. Uživatel by měl mít možnost prohlížet historii konverzací i v okamžiku, kdy je dočasně offline, a po obnovení spojení by se lokální a serverový stav měly automaticky sjednotit.

### Koncept offline-first

Offline-first je architektonický přístup, při kterém aplikace primárně pracuje s lokální kopií dat a serverovou synchronizaci považuje za asynchronní operaci na pozadí [1]. Díky tomu:

- uživatelské rozhraní reaguje okamžitě, protože čtení i zápis probíhají proti lokálnímu úložišti,
- operace provedené bez připojení se po obnovení spojení automaticky přenesou na server,
- odpadá nutnost řešit stav „načítání" při každé interakci.

Tento přístup je v kontextu chatovací aplikace obzvláště výhodný, neboť umožňuje tzv. optimistické aktualizace uživatelského rozhraní (optimistic UI updates). Při odeslání zprávy se tato zpráva ihned zobrazí v konverzaci, aniž by bylo nutné čekat na potvrzení ze serveru. Pokud server změnu přijme, stav zůstane beze změny; pokud ji odmítne, lokální stav se automaticky opraví.

### Rocicorp Zero

Pro realizaci real-time synchronizace byla v projektu zvolena knihovna Rocicorp Zero [1]. Jedná se o synchronizační engine, který nad relační databází PostgreSQL vytváří vrstvu umožňující automatickou obousměrnou synchronizaci mezi serverem a klienty prostřednictvím protokolu WebSocket.

Principy fungování Rocicorp Zero lze shrnout následovně:

1. **Definice schématu:** Vývojář definuje datový model (tabulky, sloupce, vztahy) ve formátu, který Rocicorp Zero používá k vygenerování typově bezpečného klientského API. V projektu je toto schéma generováno automaticky z Drizzle ORM definic pomocí nástroje `drizzle-zero`.

2. **Zero Cache:** Na serveru běží proces `zero-cache`, který naslouchá změnám v PostgreSQL databázi a distribuuje je připojeným klientům. Klienti se k tomuto procesu připojují přes WebSocket a přijímají pouze ty změny, které se týkají dat, na něž jsou aktuálně přihlášeni (subscribed).

3. **Lokální replika:** Na straně klienta Rocicorp Zero udržuje lokální repliku relevantního podmnožiny dat. Dotazy (`useQuery`) čtou z této lokální repliky, což zajišťuje nulovou latenci při čtení. Mutace (vytvoření, úprava, smazání záznamu) se nejprve aplikují lokálně a poté se asynchronně propagují na server.

4. **Řešení konfliktů:** Při souběžných změnách od více klientů Rocicorp Zero automaticky řeší konflikty na základě principu „poslední zápis vyhrává" (last-write-wins), přičemž serverový stav je vždy autoritativní. Pokud dojde k rozporu mezi lokální a serverovou verzí, lokální stav se přepíše serverovou hodnotou.

5. **Oprávnění na úrovni synchronizace:** Rocicorp Zero umožňuje definovat pravidla přístupu (permissions), která určují, které tabulky a řádky smí daný klient číst nebo měnit. V aktuální verzi projektu je tato vrstva nakonfigurována permisivně, přičemž jemnější řízení přístupu je zajištěno na aplikační úrovni.

### Srovnání s tradičními přístupy

| Vlastnost | Polling | WebSocket (ruční) | Rocicorp Zero |
|---|---|---|---|
| Latence | 3–5 s (interval pollingu) | Nízká (závisí na implementaci) | < 100 ms |
| Offline podpora | Žádná | Nutná vlastní implementace | Vestavěná |
| Optimistické UI | Nutná vlastní implementace | Nutná vlastní implementace | Vestavěné |
| Řešení konfliktů | Na straně serveru | Nutná vlastní implementace | Automatické |
| Složitost implementace | Nízká | Vysoká | Střední |

Z tabulky vyplývá, že Rocicorp Zero poskytuje řadu vlastností, které by při použití tradičního WebSocket řešení vyžadovaly značné množství vlastního kódu. Zároveň zachovává nízkou latenci a přidává offline-first schopnosti, které prostý polling nenabízí.

### Shrnutí

Real-time synchronizace je pro chatovací aplikaci klíčovou vlastností. Zvolený přístup využívající Rocicorp Zero umožňuje dosáhnout okamžité odezvy uživatelského rozhraní, automatické synchronizace mezi klienty a odolnosti vůči dočasným výpadkům připojení. Tím je splněn jeden z hlavních požadavků projektu – zajistit plynulou a rychlou komunikaci v týmu.

## b. Autentizace a autorizace

### Problém

Každá víceuživatelská aplikace musí řešit dvě základní otázky: ověření identity uživatele (autentizace) a určení, k jakým zdrojům a operacím má ověřený uživatel přístup (autorizace). V kontextu self-hosted chatovací aplikace pro vývojářské týmy jsou tyto otázky obzvláště důležité, protože komunikace často obsahuje citlivé informace o projektech, infrastruktuře a interních procesech.

### Autentizace

Autentizace je proces ověření, že uživatel je skutečně tím, za koho se vydává. V praxi existuje řada přístupů k autentizaci webových aplikací:

- **Přihlášení jménem a heslem** – nejrozšířenější metoda, při které uživatel prokazuje svou identitu znalostí sdíleného tajemství (hesla). Bezpečnost závisí na správném ukládání hesel (hashování) a ochraně přenosového kanálu.
- **OAuth 2.0** – delegovaná autentizace, při které uživatel ověřuje svou identitu prostřednictvím třetí strany (např. GitHub, GitLab, Google). Aplikace nikdy nezíská uživatelovo heslo k externímu účtu; místo toho obdrží časově omezený přístupový token [6].
- **Jednorázové kódy a magické odkazy** – alternativy eliminující nutnost pamatovat si heslo.

V projektu byla pro správu autentizace zvolena knihovna Better Auth [6], která poskytuje kompletní autentizační infrastrukturu včetně:

- registrace a přihlášení pomocí e-mailu a hesla,
- generování a správy sessions,
- podpory JWT (JSON Web Token) pro bezstavovou autentizaci.

#### JSON Web Token (JWT)

JWT je otevřený standard (RFC 7519) pro bezpečný přenos informací mezi stranami ve formě JSON objektu [6]. Token se skládá ze tří částí oddělených tečkou: hlavičky (header), těla (payload) a podpisu (signature). Hlavička specifikuje algoritmus podpisu, tělo obsahuje tzv. claims – tvrzení o uživateli (identifikátor, jméno, e-mail, role) – a podpis zajišťuje integritu celého tokenu.

V projektu je JWT využíván pro autentizaci požadavků vůči synchronizační vrstvě Rocicorp Zero. Po úspěšném přihlášení prostřednictvím Better Auth klient získá session token, který následně vymění za JWT. Tento JWT je uložen v lokálním úložišti prohlížeče a předáván při každém požadavku na Zero Cache server, který na jeho základě identifikuje uživatele.

### Autorizace – role a oprávnění

Autorizace určuje, jaké operace smí autentizovaný uživatel provádět. V projektu je autorizační model navržen ve dvou rovinách:

#### Globální role uživatele

Každý uživatel má přiřazenu jednu ze tří globálních rolí:

- **owner** – vlastník instance, má plný přístup ke všem funkcím včetně správy uživatelů,
- **admin** – administrátor s rozšířenými právy pro správu kanálů a skupin,
- **user** – standardní uživatel s právy pro komunikaci.

Globální role jsou uloženy přímo v tabulce uživatelů jako hodnota výčtového typu (`user_roles`).

#### Přístupová práva na úrovni kanálů

Druhá rovina autorizace se týká přístupu ke konkrétním kanálům. Kanály mohou být veřejné (přístupné všem uživatelům instance) nebo privátní (přístupné pouze explicitně oprávněným uživatelům či skupinám). Řízení přístupu k privátním kanálům je zajištěno dvěma mechanismy:

1. **Přístup jednotlivých uživatelů** – tabulka `channel_user_access` uchovává vazbu mezi kanálem a uživatelem spolu s příznakem `can_write`, který rozlišuje právo pouze ke čtení a právo k zápisu.

2. **Přístup skupin** – tabulka `channel_group_access` funguje analogicky, ale váže oprávnění na skupinu uživatelů. Skupiny (`groups`) sdružují uživatele a umožňují hromadné přidělování přístupu, což zjednodušuje správu oprávnění ve větších týmech.

Tento dvouúrovňový model umožňuje flexibilní řízení přístupu – od jednoduchých scénářů (veřejné kanály pro celý tým) po komplexní nastavení (privátní kanál přístupný pouze dvěma skupinám s právem čtení a jednomu konkrétnímu uživateli s právem zápisu).

#### Členství v kanálech

Kromě přístupových práv eviduje systém také členství v kanálech prostřednictvím tabulky `channel_members`. Každý člen kanálu má přiřazenu roli v rámci daného kanálu (`guest`, `member`, `admin`), která dále upřesňuje jeho oprávnění v kontextu konkrétního kanálu.

### OAuth 2.0 v kontextu integrací

Protokol OAuth 2.0 je v projektu využíván nejen případně pro přihlášení uživatelů, ale především pro autorizaci přístupu k externím platformám GitHub a GitLab. Podrobněji je tento mechanismus popsán v následující podkapitole (2c).

### Shrnutí

Autentizační a autorizační vrstva projektu kombinuje knihovnu Better Auth pro správu uživatelských účtů a sessions s JWT tokeny pro bezstavovou autentizaci vůči synchronizační vrstvě. Autorizace je řešena na dvou úrovních: globálními rolemi uživatelů a granulárními přístupovými právy ke kanálům na bázi jednotlivých uživatelů i skupin.

## c. Integrace vývojářských nástrojů (GitHub/GitLab)

### Problém

Vývojářské týmy při každodenní práci neustále přepínají mezi komunikačním nástrojem a platformou pro správu zdrojového kódu. Informace o stavu pull requestů, otevřených issues, výsledcích CI/CD pipeline nebo konkrétních commitech je nutné ručně kopírovat a vkládat do chatové konverzace. Tento kontext se přitom rychle stává neaktuálním a ostatní členové týmu musí klikat na externí odkazy, aby zjistili podrobnosti.

Cílem integrace vývojářských nástrojů je překlenout tuto mezeru a přinést relevantní informace z platforem GitHub [9] a GitLab [10] přímo do komunikačního rozhraní aplikace.

### OAuth 2.0 Authorization Code Flow

Přístup k API platforem GitHub a GitLab vyžaduje autorizaci uživatele. Obě platformy podporují protokol OAuth 2.0 [9][10], konkrétně tzv. Authorization Code Flow, který je v projektu implementován následovně:

1. **Iniciace:** Uživatel v nastavení kanálu zvolí připojení integrace. Aplikace přesměruje prohlížeč na autorizační URL dané platformy (např. `https://github.com/login/oauth/authorize`) s parametry `client_id`, `redirect_uri`, `scope` a `state`.

2. **Autorizace uživatelem:** Uživatel se na platformě přihlásí (pokud již není) a udělí aplikaci požadovaná oprávnění. Pro GitHub jsou vyžadovány scopes `repo` a `read:user`, pro GitLab scopes `read_api`, `read_user` a `read_repository`.

3. **Callback:** Platforma přesměruje prohlížeč zpět na callback URL aplikace (`/api/github/callback` resp. `/api/gitlab/callback`) s autorizačním kódem.

4. **Výměna kódu za token:** Serverová část aplikace vymění autorizační kód za přístupový token prostřednictvím POST požadavku na token endpoint platformy (např. `https://github.com/login/oauth/access_token`).

5. **Uložení integrace:** Přístupový token je uložen v databázi spolu s informacemi o propojeném repozitáři/projektu a kanálu, ke kterému integrace patří.

Parametr `state` v kroku 1 přenáší identifikátor kanálu zakódovaný v Base64, čímž je po návratu z OAuth flow možné integraci přiřadit ke správnému kanálu.

### Architektura integrace

Integrace s GitHub a GitLab je v projektu navržena na úrovni kanálu. Každý kanál může mít připojen jeden GitHub repozitář a/nebo jeden GitLab projekt. Tato vazba je uložena v tabulkách `channel_github_integrations` a `channel_gitlab_integrations`, které obsahují:

- identifikátor kanálu,
- identifikaci repozitáře/projektu (vlastník a název pro GitHub, cesta projektu pro GitLab),
- přístupový token pro komunikaci s API,
- identifikátor uživatele, který integraci vytvořil,
- časové razítko vytvoření.

Na straně serveru jsou implementovány klientské třídy `GitHubClient` a `GitLabClient`, které zapouzdřují komunikaci s příslušnými REST API. Obě třídy využívají in-memory cache s TTL (Time To Live) jedné minuty pro snížení počtu požadavků na externí API a zrychlení odezvy.

### Rich preview (unfurling)

Jednou z klíčových funkcí integrace je automatické rozpoznávání a obohacování odkazů na vývojářské artefakty přímo v textu zpráv. Tato funkcionalita se běžně označuje jako „unfurling" a je v projektu realizována prostřednictvím parserů `github-parser` a `gitlab-parser`.

Parsery analyzují text zprávy pomocí sady regulárních výrazů a identifikují následující typy odkazů:

**Pro GitHub:**
- Issues a pull requesty – formát `#123` nebo `owner/repo#123`, případně plné URL,
- commity – SHA hash (7–40 hexadecimálních znaků) nebo URL,
- soubory – cesta k souboru s volitelným číslem řádku (např. `src/index.ts:42`),
- větve – formát `branch:název` nebo URL,
- buildy – zkratka `:build` pro zobrazení posledního běhu GitHub Actions.

**Pro GitLab:**
- Issues – formát `#123` nebo `group/project#123`, případně plné URL,
- merge requesty – formát `!123` nebo `group/project!123`,
- commity, soubory a větve – analogicky ke GitHub,
- pipelines – zkratka `:pipeline` pro zobrazení posledního běhu CI/CD pipeline.

Výstupem parseru je strukturovaný objekt obsahující seznam nalezených referencí s informací o jejich typu, pozici v textu a identifikačních údajích (číslo issue, SHA commitu apod.). Klientská část aplikace na základě těchto referencí zobrazí obohacené náhledy s aktuálními daty načtenými z API dané platformy.

### Sledování aktivity a CI/CD

Kromě rozpoznávání odkazů ve zprávách integrace umožňuje aktivní sledování dění v propojeném repozitáři/projektu. Prostřednictvím API endpointů `/api/github/activity` a `/api/gitlab/activity` může klientská část aplikace načíst přehledy nedávných commitů, otevřených pull requestů/merge requestů a issues.

Samostatné endpointy `/api/github/builds` a `/api/gitlab/pipelines` poskytují informace o stavu CI/CD procesů – běhu GitHub Actions workflow, resp. GitLab CI/CD pipeline. Uživatelé tak mohou sledovat výsledky buildů a deploymentů přímo v chatovém rozhraní, aniž by museli opouštět aplikaci.

### Shrnutí

Integrace s platformami GitHub a GitLab představuje jednu z hlavních odlišujících vlastností projektu oproti obecným chatovacím aplikacím. Díky OAuth 2.0 autorizaci, klientským třídám pro komunikaci s API a parserům pro rozpoznávání referencí ve zprávách je dosaženo těsného propojení komunikace s vývojovým workflow. Uživatelé získávají kontextové informace o issues, pull requestech, commitech a stavu CI/CD přímo v konverzaci, což snižuje nutnost přepínání mezi nástroji.

---

**Použité zdroje v této kapitole:**

[1] Rocicorp. *Zero Documentation – Quickstart.* Dostupné z: https://zero.rocicorp.dev/docs/quickstart

[6] Better Auth. *Better Auth Documentation.* Dostupné z: https://better-auth.com/doc

[9] GitHub. *GitHub REST API Documentation.* Dostupné z: https://docs.github.com/en

[10] GitLab. *GitLab API Documentation.* Dostupné z: https://docs.gitlab.com/