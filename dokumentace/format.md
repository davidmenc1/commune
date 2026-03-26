─── STRUKTURA DOKUMENTU ─────────────────────────────────────────────────────

Úrovně nadpisů se mapují na Word styly:

    # Název             → Nadpis 1  (číslovaná kapitola, např. "1 Úvod")
    ## Podnadpis        → Nadpis 2  (např. "1.1 Motivace")
    ### Pod-podnadpis   → Nadpis 3  (např. "1.1.1 Detail")

Speciální sekce (Úvod, Závěr, Obsah, Poděkování, Resumé) se v konečném
dokumentu NEČÍSLUJÍ, ale mohou se objevit jako # nadpisy v Markdownu.

Zdůraznění:
**tučné** → důležité termíny, klíčové koncepty
_kurzíva_ → názvy děl, cizí termíny, sekundární zdůraznění
`inline kód` → kód, jména souborů, technické řetězce

─── POZNÁMKY POD ČAROU A CITACE ─────────────────────────────────────────────

Citace používají pandoc-style poznámky pod čarou:

    V textu: nějaké tvrzení[^3]
    Definice poznámky (na konci souboru):
        [^3]: NOVÁK, J. *Název publikace*. Praha: Vydavatel, 2020. ISBN …

Pravidla:
• RUČNĚ NEČÍSLUJTE poznámky pod čarou – zachovejte původní čísla.
• Pokud přidáte novou citaci, připojte i značku [^n] a její definici.
• Internetové zdroje patří také do seznamu poznámek.
• Každá bibliografická položka musí být v textu citována alespoň jednou.

Formát citací (norma ČSN):
PŘÍJMENÍ, Iniciála. _Název díla_. Místo: Vydavatel, Rok. ISBN/ISSN.
Pro webové zdroje: PŘÍJMENÍ, I. _Název stránky_ [online]. Rok [cit. YYYY-MM-DD].
Dostupné z: <URL>

─── OBRÁZKY ─────────────────────────────────────────────────────────────────

Obrázky jsou uloženy v podsložce images/ a jsou odkazovány takto:

    ![Obrázek X: Text popisku](images/nazev_souboru.ext)

Pravidla:
• NEPŘEJMENOVÁVÁTE soubory obrázků.
• Můžete upravovat popisky.
• Každý obrázek musí být v textu odkazován
(např. "jak je vidět na Obrázku 3" nebo "viz Obr. 3").
• Obrázky bez odkazu v textu by měly být přesunuty do příloh.

─── TABULKY ─────────────────────────────────────────────────────────────────

Tabulky používají syntaxi GFM (GitHub Flavored Markdown):

    | Sloupec A | Sloupec B | Sloupec C |
    |-----------|-----------|-----------|
    | data      | data      | data      |

• Každá tabulka potřebuje popis (nad nebo pod ní):
**Tab. N: Popis obsahu tabulky**

• Každá tabulka musí být v textu odkazována.

─── FORMÁLNÍ POŽADAVKY (Maturitní projekt) ──────────────────────────────────

Dokument musí při konverzi na .docx splňovat tyto normy:

ROZSAH:
• IT projekty: minimum 12 stran vlastního textu
• Projekty internetového marketingu: minimum 20 stran vlastního textu
• Počet stran NEZAHRNUJE: titulní list, prohlášení, poděkování, obsah

TEXT:
• Písmo: proporcionální patkové (Cambria, Times, Computer Modern)
• Velikost: 12 pt pro běžný text, ~80 znaků na řádek
• Řádkování: 1,2 – 1,4
• Okraje: 2,5 cm vlevo/vpravo, 3,0 cm nahoře/dole
• Zarovnání: do bloku (oboustranný tisk je standard)

ČÍSLOVÁNÍ STRÁNEK:
• Arabské číslice; titulní list, prohlášení, poděkování, resumé a obsah
se NEČÍSLUJÍ, ale POČÍTAJÍ se do celkového počtu.
• Číslování začíná na první stránce vlastního textu číslem, které
odráží celkový počet nečíslovaných stránek (např. pokud je 6 nečíslovaných
stran, vlastní text začíná na straně 7).

KAPITOLY:
• Číslované: "1", "1.1", "1.1.1" apod.
• Nečíslované: Úvod, Závěr, Obsah, Poděkování, Resumé, Seznam příloh
• Názvy kapitol začínají velkým písmenem.

OBRÁZKY / TABULKY / GRAFY:
• Každý musí mít sekvenční číslo a popisný titulek.
Formát: "Obr. N: …" nebo "Tab. N: …" nebo "Graf N: …"
• Každý musí být v textu odkazován.
• Seznam obrázků a seznam tabulek následují za bibliografií.

TYPOGRAFIE:
• Používejte minimální počet různých typů písem (≤3 v základním textu).
• Vyhněte se osiřelým řádkům a velkým prázdným mezerám.
• Používejte pevné mezery před jednopísmeným předložkami (v, z, s, k, …)
a před jednotkami (10 km, 25 %).

─── SPECIÁLNÍ POKYNY PRO RŮZNÉ TYPY PROJEKTŮ ────────────────────────────────

IT PROJEKTY (webové portály, desktopové aplikace, informační systémy):
• Teoretická část: popis různých přístupů k řešení, analýza existujících řešení
• Datový model s popisem tabulek a polí
• Popis architektury systému – jaké jsou hlavní komponenty, jak si vyměňují informace
• Use Case diagram dle pravidel UML (pro webové a desktopové aplikace)
• Diagram tříd (pro OOP projekty)
• Dokumentace API (povinně, pokud projekt obsahuje backend/API)
• Popis systému (uživatelská příručka, popis důležitých algoritmů)
• Spustitelná verze aplikace na školním serveru

INTERNETOVÝ MARKETING:
• Teoretická část: detailní rozpracování prvků marketingového mixu (4P nebo 7P)
• Analytická část: analýza cílových skupin, vyhodnocení konkurence, SWOT analýza
• Návrhová část: vlastní návrh marketingové strategie, plán komunikačních aktivit
• Výsledky a diskuze: realizované výstupy, měření dopadu, doporučení
• Reálné výstupy (videa, brožury, weby, sociální média) jako přílohy

POČÍTAČOVÉ HRY:
• Game Design Dokument (první verze již pro zadání projektu)
• Popis herních mechanik, příběhu, umělé inteligence
• Spustitelná verze hry

─── OBSAH PÍSEMNÉ PRÁCE – JEDNOTLIVÉ SEKCE ──────────────────────────────────

ÚVOD:
Přesně vymezte problém, kterým se práce zabývá, vysvětlete, k čemu má
práce sloužit, proč je napsána, kdo už v oblasti pracuje. Zahrňte přehled
dosud zkoumané problematiky (rešerši) s citáním literatury.

TEORETICKÁ ČÁST:
Zmapování současného stavu, uvedení podkladů pro řešení, volba optimálních
nástrojů, zjištění pramenů, vymezení klíčových slov. Vyhněte se dlouhým
seznamům technologií – pokud je list zahrnut, neměl by přesáhnout 1 stránku.

METODIKA A VLASTNÍ ŘEŠENÍ:
Volba metod práce, pracovní harmonogram, stručný a přehledný popis postupu.
U softwarových projektů: architektura systému (komponenty, vrstvy, interakce).
Včetně diagramů UML (Use Case, Class Diagram), API dokumentace, uživatelské příručky.

VÝSLEDKY:
Co bylo zjištěno, vypočítáno, vyzkoušeno, vyvinuto – bez hodnotícího kritéria.
Fakta vyjádřená větami, tabulkami, grafy, diagramy. Stručné a jasné.

DISKUZE:
Zdůvodnění vybraného řešení, porovnání se známými fakty nebo jinými variantami,
ekonomické hodnocení. Porovnání s výsledky jiných prací na stejné téma.
Zde se nešetří místem – uveďte vše důležité, zvláště rozdíly od již známého.

ZÁVĚR:
Celkové hodnocení, podmínky pro úspěšnou realizaci, možná rozšíření projektu.

─── SEZNAM PŘÍLOH ───────────────────────────────────────────────────────────

Přílohy obsahují tabulky, diagramy, grafy, schémata apod., která nejsou přímou
součástí vlastního textu. Jsou umístěny na konci práce za bibliografií.

• Každá příloha je označena číslem (arabským nebo římským).
• Typ přílohy je vhodně označen (Tabulka 1, Schéma 4, Obrázek A, …).
• Každá příloha má vlastní název (např. "Tabulka č. 1: Návštěvnost webu").
• Materiály klíčové pro text (souhrnné tabulky, zjištěné hodnoty) patří do textu.
• Ostatní přílohy jsou na konci.
