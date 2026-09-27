/**
 * SprachDost Curriculum — A1 & A2 deep content.
 * Injected into the AI tutor's brain so teaching is structured, not random.
 * Later: same data powers vocab flashcards + spaced repetition.
 */

export type CurriculumTopic = {
  id: string;
  title: string;
  grammar: string[];
  vocab: string[]; // German (articles included for nouns)
};

export type LevelCurriculum = {
  level: "A1" | "A2";
  topics: CurriculumTopic[];
};

export const A1_CURRICULUM: LevelCurriculum = {
  level: "A1",
  topics: [
    { id: "greetings", title: "Greetings & Introductions",
      grammar: ["ich bin / ich heiße", "du vs Sie", "questions with wo, woher, was"],
      vocab: ["Hallo", "Guten Morgen", "Guten Tag", "Guten Abend", "Tschüss", "Auf Wiedersehen", "Wie geht es dir?", "Ich heiße…", "Ich komme aus Indien", "Freut mich"] },
    { id: "numbers-time", title: "Numbers, Time & Days",
      grammar: ["ordinal numbers", "Uhrzeit (halb, viertel)", "wann-questions"],
      vocab: ["eins…zwanzig", "der Montag", "der Dienstag", "der Samstag", "die Uhr", "halb", "das Viertel", "der Tag", "die Woche", "heute/morgen"] },
    { id: "family", title: "Family & People",
      grammar: ["possessives (mein, dein, sein, ihr)", "sein/haben conjugation"],
      vocab: ["die Familie", "die Mutter", "der Vater", "die Schwester", "der Bruder", "das Kind", "die Eltern", "verheiratet", "ledig", "groß/klein"] },
    { id: "food", title: "Food & Drinks Basics",
      grammar: ["möchten", "essen/trinken conjugation", "akkusativ intro"],
      vocab: ["das Essen", "das Brot", "das Wasser", "der Saft", "die Milch", "das Frühstück", "essen", "trinken", "möchten", "schmecken"] },
    { id: "home", title: "Home & Furniture",
      grammar: ["es gibt + Akkusativ", "in + Dativ (location)"],
      vocab: ["die Wohnung", "das Zimmer", "das Bett", "der Tisch", "der Stuhl", "die Lampe", "die Küche", "das Bad", "das Fenster", "die Tür"] },
    { id: "daily-routine", title: "Daily Routine",
      grammar: ["reflexive verbs (sich freuen)", "separable verbs (aufstehen)", "time expressions"],
      vocab: ["aufstehen", "frühstücken", "arbeiten", "lernen", "kochen", "schlafen", "der Morgen", "der Abend", "jeden Tag", "zuerst… dann"] },
    { id: "clothing", title: "Clothing & Colors",
      grammar: ["adjective basics", "dieser/-e/-es"],
      vocab: ["das T-Shirt", "die Hose", "die Jacke", "die Schuhe", "tragen", "rot", "blau", "grün", "schwarz", "weiß"] },
    { id: "weather", title: "Weather & Seasons",
      grammar: ["impersonal 'es' (es regnet)", "im + month/season"],
      vocab: ["das Wetter", "die Sonne", "der Regen", "der Schnee", "warm", "kalt", "der Sommer", "der Winter", "es ist heiß", "es regnet"] },
    { id: "transport", title: "Transport & Directions",
      grammar: ["mit + Dativ (mit dem Bus)", "nach + city", "imperative (gehen Sie…)"],
      vocab: ["der Bus", "der Zug", "das Auto", "das Fahrrad", "fahren", "gehen", "links", "rechts", "geradeaus", "der Bahnhof"] },
    { id: "shopping-basics", title: "Shopping Basics",
      grammar: ["prices & euro", "Wie viel kostet…?", "Gefällt dir…?"],
      vocab: ["kaufen", "der Preis", "der Euro", "teuer", "billig", "das Geld", "die Tüte", "im Angebot", "die Größe", "nehmen"] },
    { id: "body-health", title: "Body & Health",
      grammar: ["wehtun / haben + Schmerzen", "modal verb 'müssen'"],
      vocab: ["der Kopf", "der Bauch", "der Zahn", "das Fieber", "krank", "gesund", "der Arzt", "die Schmerzen", "müde", "Gute Besserung"] },
    { id: "hobbies", title: "Hobbies & Free Time",
      grammar: ["gern/nicht gern + verb", "verb-final with 'weil' (simple)"],
      vocab: ["das Hobby", "spielen", "lesen", "hören", "schwimmen", "reisen", "die Musik", "der Sport", "gerne", "die Freizeit"] },
  ],
};

export const A2_CURRICULUM: LevelCurriculum = {
  level: "A2",
  topics: [
    { id: "past-perfekt", title: "Talking about the Past (Perfekt)",
      grammar: ["haben/sein + participle", "regular vs irregular participles", "word order with Perfekt"],
      vocab: ["gemacht", "gegangen", "gesehen", "gegessen", "gehört", "gestern", "letzte Woche", "vor zwei Tagen", "das Wochenende", "erzählen"] },
    { id: "dativ", title: "Dative Case Introduction",
      grammar: ["der→dem, die→der, das→dem", "dative prepositions: mit, zu, nach, bei, von"],
      vocab: ["mit dem Bus", "zu Hause", "bei der Arbeit", "von meiner Familie", "nach dem Essen", "helfen + Dat", "danken + Dat", "gehören", "das Geschenk", "die Freundin"] },
    { id: "comparisons", title: "Comparisons & Preferences",
      grammar: ["komparativ (größer, besser)", "als", "superlativ intro (am besten)"],
      vocab: ["besser", "schneller", "größer", "teurer", "als", "am liebsten", "mehr", "weniger", "genauso", "anders als"] },
    { id: "health-body-a2", title: "Health & Body (A2)",
      grammar: ["seit + Dativ (seit zwei Tagen)", "modal verbs review", "sich fühlen"],
      vocab: ["die Erkältung", "der Schnupfen", "der Husten", "die Grippe", "das Rezept", "die Versicherung", "der Termin", "sich erkälten", "ausruhen", "ansteckend"] },
    { id: "work-a2", title: "Work & Office Talk",
      grammar: ["office imperatives", "können/dürfen at work", "time clauses with 'wenn'"],
      vocab: ["das Büro", "die Besprechung", "der Chef/die Chefin", "die Überstunde", "der Urlaub", "die Bewerbung", "der Lebenslauf", "verdienen", "die E-Mail", "anrufen"] },
    { id: "holidays", title: "Holidays & Travel Talk",
      grammar: ["Perfekt for travel stories", "zweiteilige Konnektoren (erst… dann)", "future with 'werden' intro"],
      vocab: ["der Urlaub", "die Reise", "das Hotel", "der Strand", "die Sehenswürdigkeit", "packen", "fliegen", "besichtigen", "das Gepäck", "das Andenken"] },
    { id: "phone-calls", title: "Phone Calls & Messages",
      grammar: ["phone etiquette phrases", "indirect questions (ob…)", "polite forms"],
      vocab: ["der Anruf", "am Apparat", "besetzt", "zurückrufen", "die Nachricht", "die Mailbox", "erreichbar", "der Termin", "absagen", "verschieben"] },
    { id: "invitations-a2", title: "Invitations & Suggestions",
      grammar: ["suggestions with 'Lass uns…'", "Wie wäre es mit…?", "declining politely"],
      vocab: ["die Einladung", "vorschlagen", "annehmen", "ablehnen", "die Feier", "die Party", "mitbringen", "sich freuen auf", "passen", "leider"] },
    { id: "shopping-a2", title: "Shopping Deep Dive",
      grammar: ["reflexive + idiom (Das steht dir gut)", "genitive-free possession", "um…zu intro"],
      vocab: ["probieren/anprobieren", "umtauschen", "die Quittung", "das Sonderangebot", "bar/mit Karte", "das Kleidungsstück", "die Kasse", "der Kunde", "sparen", "der Einkauf"] },
    { id: "feelings", title: "Feelings & Opinions",
      grammar: ["ich finde / ich denke / meiner Meinung nach", "weil-clauses", "adjectives"],
      vocab: ["glücklich", "traurig", "wütend", "aufgeregt", "zufrieden", "die Meinung", "stimmen", "finden", "denken", "fühlen"] },
  ],
};

export const CURRICULA: Record<string, LevelCurriculum> = {
  A1: A1_CURRICULUM,
  A2: A2_CURRICULUM,
};

/** Find a matching curriculum topic for a free-text topic input (for Lehrer) */
export function findCurriculumBlock(level: string, topic: string): string | null {
  const cur = CURRICULA[level];
  if (!cur) return null;
  const t = topic.toLowerCase();
  for (const tp of cur.topics) {
    if (
      tp.title.toLowerCase().includes(t) ||
      t.includes(tp.id) ||
      tp.id.split("-").some((w) => w.length > 4 && t.includes(w))
    ) {
      return `CURRICULUM SUPPORT (stay close to it):
Topic: ${tp.title}
Grammar focus: ${tp.grammar.join("; ")}
Core vocab to weave in: ${tp.vocab.join(", ")}`;
    }
  }
  return null;
}

/** Vocabulary seed list for a level (later: flashcards & spaced repetition UI) */
export function getLevelVocab(level: string): string[] {
  const cur = CURRICULA[level];
  if (!cur) return [];
  return cur.topics.flatMap((t) => t.vocab);
}
