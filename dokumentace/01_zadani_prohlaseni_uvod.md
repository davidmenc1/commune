# Zadání maturitního projektu

Název projektu: **Self-hosted chatovací aplikace pro vývojářské týmy s real-time synchronizací**

## Anotace

Cílem projektu je návrh, implementace a nasazení webové chatovací aplikace určené primárně pro vývojářské týmy. Aplikace má umožnit rychlou týmovou komunikaci v kanálech, práci s vlákny, zmínkami, notifikacemi a přílohami. Součástí řešení je integrace s platformami GitHub a GitLab (zobrazování odkazů na issue, pull requesty/merge requesty, commity a pipeline/build stavy) a podpora webhooků pro automatizované zprávy z externích systémů.

Projekt je realizován jako self-hosted řešení, aby organizace měla plnou kontrolu nad daty i provozem. Důraz je kladen na real-time synchronizaci mezi klienty, přehledné uživatelské rozhraní a rozšiřitelnost systému.

## Hlavní cíle projektu

1. Navrhnout architekturu moderní chatovací aplikace pro týmovou spolupráci.
2. Implementovat real-time komunikaci a synchronizaci dat mezi uživateli.
3. Implementovat správu kanálů, skupin, zpráv, vláken, reakcí a příloh.
4. Implementovat systém zmínek a notifikací.
5. Implementovat GitHub a GitLab integrace včetně rich preview a přenosu aktivit.
6. Implementovat per-channel webhooky pro napojení CI/CD a monitoringu.
7. Připravit dokumentaci, testovací scénáře a postup nasazení.

## Očekávané výstupy

- Funkční webová aplikace nasaditelná na vlastní infrastruktuře.
- Zdrojové kódy ve veřejném repozitáři.
- Technická dokumentace architektury a použitých technologií.
- Popis testování a vyhodnocení dosažených výsledků.
- Návod na spuštění, konfiguraci a základní administraci.

# Čestné prohlášení

Prohlašuji, že jsem maturitní projekt vypracoval samostatně a že jsem použil pouze zdroje uvedené v seznamu literatury. Veškeré převzaté informace, citace a myšlenky jiných autorů jsou v textu řádně označeny.

V ........................................ dne ........................................

Podpis autora: ........................................

# Poděkování

Děkuji vedoucímu maturitního projektu za odborné vedení, průběžné konzultace a věcné připomínky během vývoje aplikace i zpracování dokumentace. Poděkování patří také rodině a spolužákům za podporu, zpětnou vazbu a testování vytvořeného řešení.

# Resumé a klíčová slova

## Resumé (CZ)

Tato maturitní práce se zaměřuje na návrh a implementaci self-hosted chatovací aplikace pro vývojářské týmy s real-time synchronizací. Řešení kombinuje týmovou komunikaci v kanálech, vlákna, zmínky, notifikace, práci s přílohami a napojení na GitHub a GitLab, včetně webhooků pro automatizované zprávy z externích systémů. Při realizaci jsem využil moderní webový stack (Next.js, TypeScript, PostgreSQL, Drizzle ORM a Zero) a kladl důraz na přehlednou architekturu, výkon a rozšiřitelnost. Výsledkem je funkční webová aplikace, kterou lze provozovat na vlastní infrastruktuře, a která pokrývá hlavní komunikační potřeby technického týmu při vývoji softwaru.

## Klíčová slova (CZ)

self-hosted chat, real-time synchronizace, týmová komunikace, kanály a vlákna, GitHub integrace, GitLab integrace, webhooky, notifikace

## Resumé (EN)

This graduation project focuses on designing and implementing a self-hosted real-time chat application for software development teams. The solution combines channel-based communication, message threads, mentions, notifications, file attachments, and integrations with GitHub and GitLab, including webhooks for automated external events. The implementation uses a modern web stack (Next.js, TypeScript, PostgreSQL, Drizzle ORM, and Zero) with emphasis on clear architecture, performance, and extensibility. The result is a functional web application that can be deployed on private infrastructure and supports the core collaboration needs of technical teams during software development.

## Keywords (EN)

self-hosted chat, real-time synchronization, team communication, channels and threads, GitHub integration, GitLab integration, webhooks, notifications

# 1. Úvod

Digitální komunikace je pro vývojářské týmy klíčová. Běžně používané nástroje sice nabízejí širokou sadu funkcí, ale často přinášejí i omezení v oblasti ceny, kontroly nad daty nebo přizpůsobení konkrétnímu vývojovému workflow. Tento projekt se proto zaměřuje na vytvoření vlastní chatovací aplikace, která kombinuje rychlou komunikaci, integraci s vývojářskými platformami a možnost provozu na vlastní infrastruktuře.

Navržená aplikace řeší každodenní potřeby týmové spolupráce: komunikaci v kanálech, strukturované diskuse ve vláknech, upozornění pomocí zmínek, práci s přílohami a napojení na nástroje GitHub/GitLab. Důležitým aspektem je real-time synchronizace, která zajišťuje okamžité promítnutí změn všem připojeným uživatelům.

## a. Motivace a cíle projektu

Hlavní motivací projektu je vytvořit komunikační platformu, která je lépe přizpůsobená potřebám vývojářských týmů než obecná komerční řešení. V praxi se často ukazuje, že týmy potřebují:

- těsné napojení komunikace na repozitáře a CI/CD procesy,
- možnost provozovat systém interně bez závislosti na cizím cloudu,
- jasně definovaná přístupová práva a správu týmových struktur,
- rychlou odezvu aplikace při práci více uživatelů současně.

Cílem projektu je proto vyvinout aplikaci, která tyto požadavky splňuje a současně zůstává technicky čistá, rozšiřitelná a snadno nasaditelná. Vedle implementace samotných funkcí je cílem také ověřit, že zvolený technologický stack (Next.js, PostgreSQL, Drizzle, Rocicorp Zero) je vhodný pro moderní real-time chatovací systém.

## b. Požadavky a rozsah

Rozsah projektu zahrnuje návrh i realizaci plně funkčního MVP/produkčního základu aplikace s následujícími oblastmi:

- autentizace uživatelů a správa účtů,
- veřejné a privátní kanály,
- skupiny uživatelů a řízení přístupu,
- odesílání a editace zpráv,
- vlákna, reakce a zmínky,
- centrum notifikací,
- nahrávání příloh,
- GitHub a GitLab integrace (OAuth, data, rich preview),
- webhook endpointy pro externí systémy,
- real-time synchronizace dat mezi klienty,
- základní testování klíčových scénářů.

Mimo rozsah projektu je například vývoj mobilní nativní aplikace, pokročilá enterprise administrace (SSO/SAML), nebo komplexní analytické moduly nad provozními daty.

## c. Přehled existujících řešení

Na trhu existuje řada komunikačních platforem, například Slack, Microsoft Teams nebo Discord. Tyto nástroje jsou funkčně vyspělé, ale pro část organizací představují kompromis v oblastech, které jsou pro interní vývojářské týmy zásadní.

Z pohledu tohoto projektu jsou nejdůležitější srovnávací kritéria:

- **Kontrola nad daty:** běžná cloudová řešení ukládají data mimo infrastrukturu firmy.
- **Cena při růstu týmu:** licenční model „za uživatele“ může být dlouhodobě nákladný.
- **Hloubka integrace do vývojového workflow:** standardní integrace často nestačí specifickým procesům týmu.
- **Možnost přizpůsobení:** uzavřené platformy omezují zásahy do chování systému.

Navržená aplikace tyto body řeší self-hosted přístupem, otevřenou architekturou a přímým důrazem na potřeby vývoje softwaru. Nejde tedy o kopii existujících nástrojů, ale o účelové řešení orientované na technické týmy, které chtějí vyšší míru kontroly, integrace a přizpůsobitelnosti.
