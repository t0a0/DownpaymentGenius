// Help content per key. Title and short text live in the i18n dictionaries as help.<key>.title|short;
// this registry adds the German term, an optional "history says" hint and field-specific follow-up questions.

export interface HelpEntry {
  germanTerm: string;
  /** i18n key of a typical range / history hint */
  hint?: string;
  extra: { en: string[]; de: string[] };
}

const e = (germanTerm: string, en: string[], de: string[], hint?: string): HelpEntry => ({
  germanTerm,
  hint,
  extra: { en, de },
});

export const HELP: Record<string, HelpEntry> = {
  'you.capital': e(
    'Depotwert',
    ['How much of my portfolio should I keep invested instead of putting it into the down payment?'],
    ['Wie viel meines Depots sollte ich angelegt lassen, statt es ins Eigenkapital zu stecken?'],
  ),
  'you.capitalGainPct': e(
    'Unrealisierter Kursgewinn (FIFO)',
    ['How is the gain taxed when I sell ETF shares for a down payment, and how does FIFO change it?'],
    ['Wie wird der Gewinn versteuert, wenn ich ETF-Anteile für das Eigenkapital verkaufe, und was ändert FIFO?'],
  ),
  'you.cash': e(
    'Tagesgeld / Girokonto',
    ['Should spare cash sit in a savings account or be invested while I wait to buy?'],
    ['Sollte freies Geld auf dem Tagesgeld liegen oder angelegt werden, während ich auf den Kauf warte?'],
  ),
  'you.cushion': e(
    'Notgroschen',
    ['How big should an emergency fund be after buying a home in Germany?'],
    ['Wie groß sollte der Notgroschen nach einem Immobilienkauf in Deutschland sein?'],
  ),
  'you.monthlySavings': e(
    'Sparrate',
    ['How does a higher savings rate change the best moment to buy?'],
    ['Wie verändert eine höhere Sparrate den besten Kaufzeitpunkt?'],
  ),
  'you.savingsGrowth': e(
    'Dynamisierung der Sparrate',
    ['What savings growth is realistic over 10–30 years?'],
    ['Welche Steigerung der Sparrate ist über 10–30 Jahre realistisch?'],
  ),
  'you.netIncome': e(
    'Haushaltsnettoeinkommen (Haushaltsrechnung)',
    ['How do German banks calculate the maximum affordable monthly payment?'],
    ['Wie berechnen deutsche Banken die maximal tragbare Monatsrate?'],
  ),
  'you.incomeGrowth': e(
    'Einkommenssteigerung',
    ['How does expected income growth affect how much a bank will lend later?'],
    ['Wie beeinflusst erwartetes Einkommenswachstum, wie viel eine Bank später leiht?'],
  ),
  'you.birthYear': e('Geburtsjahr', ['Up to which age do German banks usually want a mortgage repaid?'], ['Bis zu welchem Alter wollen deutsche Banken ein Darlehen meist getilgt sehen?']),
  'you.household': e(
    'Einzel- / Zusammenveranlagung, Sparerpauschbetrag',
    ['How does joint assessment change the saver’s allowance and capital gains tax?'],
    ['Wie ändert die Zusammenveranlagung den Sparerpauschbetrag und die Abgeltungsteuer?'],
  ),
  'you.churchTax': e(
    'Kirchensteuer auf Kapitalerträge',
    ['How exactly is church tax computed on capital income under §32d EStG?'],
    ['Wie genau wird die Kirchensteuer auf Kapitalerträge nach §32d EStG berechnet?'],
  ),
  'you.firstTimeBuyer': e(
    'Ersterwerber',
    ['Which past ownership (inherited, partial, sold) disqualifies me from first-time buyer programmes?'],
    ['Welches frühere Eigentum (geerbt, anteilig, verkauft) schließt mich von Ersterwerber-Programmen aus?'],
  ),
  'you.childBirthYears': e(
    'Kinder (Hessengeld-Kinderbonus)',
    ['Which children count for Hessengeld, and when must they be born?'],
    ['Welche Kinder zählen beim Hessengeld, und wann müssen sie geboren sein?'],
  ),
  'invest.expectedReturn': e(
    'Erwartete Rendite',
    ['What long-run return is realistic for a global equity ETF in EUR, and how wide is the uncertainty?'],
    ['Welche langfristige Rendite ist für einen weltweiten Aktien-ETF in EUR realistisch, und wie groß ist die Unsicherheit?'],
    'hist.expectedReturn',
  ),
  'invest.fundType': e(
    'Teilfreistellung (§20 InvStG)',
    ['Which funds count as equity funds for the 30 % Teilfreistellung?'],
    ['Welche Fonds gelten als Aktienfonds für die 30 % Teilfreistellung?'],
  ),
  'invest.cashRate': e('Tagesgeldzins', ['What cash rates are realistic over the next years?'], ['Welche Tagesgeldzinsen sind in den nächsten Jahren realistisch?']),
  'invest.basiszins': e(
    'Basiszins (Vorabpauschale, §18 InvStG)',
    ['How is the Vorabpauschale calculated and when is it debited?'],
    ['Wie wird die Vorabpauschale berechnet und wann wird sie abgebucht?'],
    'hist.basiszins',
  ),
  'rent.coldRent': e(
    'Nettokaltmiete',
    ['Which costs are in Kaltmiete vs Nebenkosten, and which of them would I still pay as an owner?'],
    ['Welche Kosten sind in der Kaltmiete und welche in den Nebenkosten, und welche zahle ich als Eigentümer weiter?'],
  ),
  'rent.rentGrowth': e(
    'Mietsteigerung (Mietpreisbremse, Kappungsgrenze)',
    ['How much can my landlord raise the rent in an existing lease in Germany?'],
    ['Wie stark darf mein Vermieter die Miete in einem bestehenden Mietvertrag erhöhen?'],
    'hist.rentGrowth',
  ),
  'property.type': e(
    'Eigentumswohnung / Haus',
    ['Which owner costs differ between a condominium and a house?'],
    ['Welche Eigentümerkosten unterscheiden sich zwischen Eigentumswohnung und Haus?'],
  ),
  'property.city': e('Stadt / Standort', ['How do price and rent trends differ between German cities?'], ['Wie unterscheiden sich Preis- und Mietentwicklung zwischen deutschen Städten?']),
  'property.state': e(
    'Bundesland (Grunderwerbsteuer)',
    ['How much Grunderwerbsteuer is due in my state, and when is it paid?'],
    ['Wie viel Grunderwerbsteuer fällt in meinem Bundesland an, und wann wird sie fällig?'],
  ),
  'property.price': e('Kaufpreis', ['How do I check whether an asking price is fair?'], ['Wie prüfe ich, ob ein Angebotspreis fair ist?']),
  'property.area': e('Wohnfläche (WoFlV)', ['How is living area measured in Germany?'], ['Wie wird die Wohnfläche in Deutschland berechnet?']),
  'property.priceGrowth': e(
    'Preisentwicklung (Häuserpreisindex)',
    ['How have German home prices developed over the long run and in my city?'],
    ['Wie haben sich Immobilienpreise in Deutschland langfristig und in meiner Stadt entwickelt?'],
    'hist.priceGrowth',
  ),
  'property.ageingDrag': e(
    'Alterungsabschlag / Abnutzung',
    ['Why does a specific building grow in value more slowly than a quality-adjusted price index?'],
    ['Warum steigt der Wert eines bestimmten Gebäudes langsamer als ein qualitätsbereinigter Preisindex?'],
  ),
  'property.notaryPct': e('Notar- und Grundbuchkosten', ['What exactly do notary and land registry fees cover?'], ['Was genau decken Notar- und Grundbuchkosten ab?']),
  'property.brokerPct': e(
    'Maklerprovision (Halbteilungsprinzip)',
    ['What does the 2020 rule on splitting broker fees mean for buyers?'],
    ['Was bedeutet die Halbteilung der Maklerprovision seit 2020 für Käufer?'],
  ),
  'property.noBroker': e('Provisionsfrei', ['Where can I find homes without a broker fee?'], ['Wo finde ich Immobilien ohne Maklerprovision?']),
  'property.oneOffCosts': e('Einmalige Kosten (Renovierung, Umzug)', ['What one-off costs are often forgotten when buying?'], ['Welche einmaligen Kosten werden beim Kauf oft vergessen?']),
  'property.hausgeld': e(
    'Hausgeld (nicht umlagefähig)',
    ['Which parts of Hausgeld can a landlord pass on to tenants, and which cannot?'],
    ['Welche Teile des Hausgelds kann ein Vermieter umlegen, welche nicht?'],
  ),
  'property.maintenance': e(
    'Instandhaltung (Peterssche Formel)',
    ['How much should I budget for maintenance per m² and year?'],
    ['Wie viel sollte ich pro m² und Jahr für Instandhaltung einplanen?'],
  ),
  'property.insurance': e('Wohngebäudeversicherung', ['What does building insurance cost for a house?'], ['Was kostet eine Wohngebäudeversicherung für ein Haus?']),
  'property.grundsteuer': e('Grundsteuer (Grundsteuerreform 2025)', ['How did the 2025 Grundsteuer reform change the amount?'], ['Wie hat die Grundsteuerreform 2025 die Höhe verändert?']),
  'property.hessengeldExtension': e(
    'Hessengeld (Antragsfrist)',
    ['What are the latest rules and deadlines for Hessengeld?'],
    ['Was sind die aktuellen Regeln und Fristen beim Hessengeld?'],
  ),
  'mortgage.rateTiers': e(
    'Beleihungsauslauf / Zinsstaffel',
    ['Why do mortgage rates jump at 60/80/90/100 % LTV, and how big are the steps today?'],
    ['Warum springen Bauzinsen bei 60/80/90/100 % Beleihung, und wie groß sind die Stufen heute?'],
    'hist.rateTiers',
  ),
  'mortgage.fixationAdj': e(
    'Zinsaufschlag je Zinsbindung',
    ['How much more does a 15- or 20-year fixation cost today than 10 years?'],
    ['Wie viel teurer ist heute eine Zinsbindung von 15 oder 20 Jahren als von 10 Jahren?'],
  ),
  'mortgage.fixationYears': e(
    'Sollzinsbindung',
    ['How do I choose the Zinsbindung, and what is the §489 BGB right to terminate after 10 years?'],
    ['Wie wähle ich die Zinsbindung, und was ist das Kündigungsrecht nach §489 BGB nach 10 Jahren?'],
  ),
  'mortgage.bwDiscount': e(
    'Beleihungswert (BelWertV)',
    ['How do banks determine the Beleihungswert, and how far below the price is it typically?'],
    ['Wie ermitteln Banken den Beleihungswert, und wie weit liegt er typischerweise unter dem Kaufpreis?'],
  ),
  'mortgage.tilgung': e('Anfängliche Tilgung', ['How long does repayment take at 2 % vs 3 % initial Tilgung?'], ['Wie lange dauert die Tilgung bei 2 % vs. 3 % anfänglicher Tilgung?']),
  'mortgage.sondertilgung': e('Sondertilgung', ['Is a special repayment option worth a rate surcharge?'], ['Lohnt sich ein Sondertilgungsrecht trotz Zinsaufschlag?']),
  'mortgage.drift': e(
    'Zinsentwicklung',
    ['What drives German mortgage rates, and how fast have they moved historically?'],
    ['Was treibt die Bauzinsen in Deutschland, und wie schnell haben sie sich historisch bewegt?'],
    'hist.drift',
  ),
  'mortgage.driftYears': e('Dauer der Zinsdrift', ['How long have rate trends typically lasted?'], ['Wie lange halten Zinstrends typischerweise an?']),
  'mortgage.followUpMode': e(
    'Anschlussfinanzierung (Prolongation, Umschuldung, Forward-Darlehen)',
    ['What are my options when the Zinsbindung ends?'],
    ['Welche Möglichkeiten habe ich, wenn die Zinsbindung endet?'],
  ),
  'mortgage.followUpRate': e(
    'Anschlusszins',
    ['What follow-up rate should I plan for in 10 years?'],
    ['Mit welchem Anschlusszins sollte ich in 10 Jahren planen?'],
    'hist.followUpRate',
  ),
  'mortgage.financeFees': e(
    'Vollfinanzierung / 110 %-Finanzierung',
    ['What does financing the purchase fees cost, and which banks offer it?'],
    ['Was kostet die Mitfinanzierung der Kaufnebenkosten, und welche Banken bieten sie an?'],
  ),
  'mortgage.maxPaymentShare': e(
    'Haushaltsrechnung / Belastungsquote',
    ['Which payment-to-income ratio do German banks accept?'],
    ['Welche Belastungsquote akzeptieren deutsche Banken?'],
  ),
  'sim.horizonMode': e('Betrachtungshorizont', ['Why does the comparison date matter so much for rent vs buy?'], ['Warum ist der Vergleichszeitpunkt bei Mieten vs. Kaufen so wichtig?']),
  'sim.horizonYear': e('Betrachtungshorizont (Jahr)', ['Which horizon is sensible for a rent-vs-buy comparison?'], ['Welcher Horizont ist für einen Vergleich Mieten vs. Kaufen sinnvoll?']),
  'sim.horizonAge': e('Betrachtungshorizont (Alter)', ['How should retirement plans affect the horizon?'], ['Wie sollte die Ruhestandsplanung den Horizont beeinflussen?']),
  'sim.maxWait': e('Maximale Wartezeit', ['What are the risks of waiting many years to buy?'], ['Welche Risiken hat es, viele Jahre mit dem Kauf zu warten?']),
  'sim.cpi': e('Inflation (Verbraucherpreisindex)', ['What inflation should I assume for Germany long-term?'], ['Welche Inflation sollte ich für Deutschland langfristig annehmen?'], 'hist.cpi'),
  'sim.real': e('Kaufkraftbereinigt (real)', ['When should I compare in real rather than nominal terms?'], ['Wann sollte ich real statt nominal vergleichen?']),
  'sim.liquidate': e(
    'Liquidationswert',
    ['Why should a portfolio and a home be valued on the same basis in a comparison?'],
    ['Warum sollten Depot und Immobilie im Vergleich gleich bewertet werden?'],
  ),
  'sim.sellingCosts': e('Verkaufskosten', ['What does selling a home in Germany cost?'], ['Was kostet der Verkauf einer Immobilie in Deutschland?']),

  'kpi.bestMoment': e('Bester Kaufzeitpunkt', ['What could make the best moment move earlier or later?'], ['Was könnte den besten Zeitpunkt nach vorne oder hinten verschieben?']),
  'kpi.downPayment': e('Eigenkapital', ['How much equity do German banks expect, and is more always better?'], ['Wie viel Eigenkapital erwarten deutsche Banken, und ist mehr immer besser?']),
  'kpi.ltv': e('Beleihungsauslauf', ['How do I find the LTV sweet spot between rate and invested capital?'], ['Wie finde ich die beste Beleihung zwischen Zins und angelegtem Kapital?']),
  'kpi.rate': e('Effektivzins', ['What is the difference between Sollzins and Effektivzins?'], ['Was ist der Unterschied zwischen Sollzins und Effektivzins?']),
  'kpi.paymentShare': e('Belastungsquote', ['What share of income can I safely spend on a mortgage?'], ['Welchen Anteil meines Einkommens kann ich sicher für die Rate ausgeben?']),
  'kpi.totalInterest': e('Zinskosten gesamt', ['How can I lower total interest without lowering returns elsewhere?'], ['Wie kann ich die Zinskosten senken, ohne anderswo Rendite zu verlieren?']),
  'kpi.debtFree': e('Schuldenfreiheit', ['How do Tilgung and Sondertilgung change the payoff date?'], ['Wie verändern Tilgung und Sondertilgung den Zeitpunkt der Schuldenfreiheit?']),
  'kpi.marginalRate': e('Grenzzins', ['How do I compare the marginal mortgage rate with my after-tax return?'], ['Wie vergleiche ich den Grenzzins mit meiner Rendite nach Steuern?']),
  'kpi.netLostNow': e('Nettoverlust (jetzt kaufen)', ['Which costs of buying now are unrecoverable?'], ['Welche Kosten eines Kaufs jetzt sind verloren?']),
  'kpi.netLostLater': e('Nettoverlust (später kaufen)', ['What do I lose and gain by waiting?'], ['Was verliere und gewinne ich durch Warten?']),
  'kpi.netLostNever': e('Nettoverlust (nie kaufen)', ['When does renting forever beat buying?'], ['Wann schlägt dauerhaftes Mieten den Kauf?']),

  'chart.netWorth': e('Nettovermögen', ['How should I read net worth paths of renting vs buying?'], ['Wie lese ich Vermögensverläufe von Mieten vs. Kaufen?']),
  'chart.timing': e('Kaufzeitpunkt', ['Why is the curve of net worth by purchase month often flat near the top?'], ['Warum ist die Kurve des Nettovermögens nach Kaufmonat nahe dem Maximum oft flach?']),
  'chart.heatmap': e('Zeitpunkt × Beleihungsauslauf', ['Why can a slightly larger loan be worse than a slightly smaller one?'], ['Warum kann ein etwas größeres Darlehen schlechter sein als ein etwas kleineres?']),
  'chart.waste': e('Kostenaufstellung', ['Which of these costs are unavoidable, and which depend on the decision?'], ['Welche dieser Kosten sind unvermeidbar, welche hängen von der Entscheidung ab?']),
  'chart.breakeven': e('Break-even-Analyse', ['How should I use breakeven values when the future is uncertain?'], ['Wie nutze ich Break-even-Werte, wenn die Zukunft unsicher ist?']),
  'chart.tornado': e('Sensitivitätsanalyse', ['Which assumption should I research most carefully?'], ['Welche Annahme sollte ich am gründlichsten prüfen?']),
  'chart.stress': e('Zinsänderungsrisiko', ['How can I protect myself against higher follow-up rates?'], ['Wie schütze ich mich gegen höhere Anschlusszinsen?']),
  'chart.scenarios': e('Szenarioanalyse', ['How likely are such macro scenarios over 30 years?'], ['Wie wahrscheinlich sind solche Makro-Szenarien über 30 Jahre?']),
  'chart.yearly': e('Jahresübersicht', ['What should I check in a yearly cash-flow table?'], ['Worauf sollte ich in einer jährlichen Cashflow-Tabelle achten?']),
};
