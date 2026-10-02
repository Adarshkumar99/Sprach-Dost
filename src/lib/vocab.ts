/**
 * Vocabulary dataset — German ⇄ English, CEFR A1 + A2, grouped by topic.
 * Powers the flashcard trainer and (later) the scenario "words learned" stats.
 */

export type VocabWord = {
  de: string;
  en: string;
  ex?: string;   // example sentence (German)
  exEn?: string; // example sentence (English translation)
  level: "A1" | "A2" | "B1";
  topic: string;
};

const w = (de: string, en: string, level: "A1" | "A2" | "B1", topic: string): VocabWord => ({ de, en, level, topic });

export const VOCAB: VocabWord[] = [
  /* ───────── A1 ───────── */
  // greetings
  w("Hallo", "hello", "A1", "Greetings"),
  w("Guten Morgen", "good morning", "A1", "Greetings"),
  w("Guten Tag", "good day", "A1", "Greetings"),
  w("Guten Abend", "good evening", "A1", "Greetings"),
  w("Tschüss", "bye", "A1", "Greetings"),
  w("Auf Wiedersehen", "goodbye", "A1", "Greetings"),
  w("Wie geht es dir?", "how are you?", "A1", "Greetings"),
  w("Ich heiße…", "my name is…", "A1", "Greetings"),
  w("Ich komme aus Indien", "I come from India", "A1", "Greetings"),
  w("Freut mich", "nice to meet you", "A1", "Greetings"),
  // numbers, time & days
  w("der Montag", "Monday", "A1", "Numbers & Time"),
  w("der Dienstag", "Tuesday", "A1", "Numbers & Time"),
  w("der Samstag", "Saturday", "A1", "Numbers & Time"),
  w("die Uhr", "clock / hour", "A1", "Numbers & Time"),
  w("halb", "half (past)", "A1", "Numbers & Time"),
  w("das Viertel", "quarter", "A1", "Numbers & Time"),
  w("der Tag", "day", "A1", "Numbers & Time"),
  w("die Woche", "week", "A1", "Numbers & Time"),
  w("heute", "today", "A1", "Numbers & Time"),
  w("morgen", "tomorrow", "A1", "Numbers & Time"),
  // family
  w("die Familie", "family", "A1", "Family"),
  w("die Mutter", "mother", "A1", "Family"),
  w("der Vater", "father", "A1", "Family"),
  w("die Schwester", "sister", "A1", "Family"),
  w("der Bruder", "brother", "A1", "Family"),
  w("das Kind", "child", "A1", "Family"),
  w("die Eltern", "parents", "A1", "Family"),
  w("verheiratet", "married", "A1", "Family"),
  w("ledig", "single (unmarried)", "A1", "Family"),
  w("groß", "tall / big", "A1", "Family"),
  // food
  w("das Essen", "food", "A1", "Food"),
  w("das Brot", "bread", "A1", "Food"),
  w("das Wasser", "water", "A1", "Food"),
  w("der Saft", "juice", "A1", "Food"),
  w("die Milch", "milk", "A1", "Food"),
  w("das Frühstück", "breakfast", "A1", "Food"),
  w("essen", "to eat", "A1", "Food"),
  w("trinken", "to drink", "A1", "Food"),
  w("möchten", "would like", "A1", "Food"),
  w("schmecken", "to taste (good)", "A1", "Food"),
  // home
  w("die Wohnung", "apartment", "A1", "Home"),
  w("das Zimmer", "room", "A1", "Home"),
  w("das Bett", "bed", "A1", "Home"),
  w("der Tisch", "table", "A1", "Home"),
  w("der Stuhl", "chair", "A1", "Home"),
  w("die Lampe", "lamp", "A1", "Home"),
  w("die Küche", "kitchen", "A1", "Home"),
  w("das Bad", "bathroom", "A1", "Home"),
  w("das Fenster", "window", "A1", "Home"),
  w("die Tür", "door", "A1", "Home"),
  // daily routine
  w("aufstehen", "to get up", "A1", "Daily Routine"),
  w("frühstücken", "to have breakfast", "A1", "Daily Routine"),
  w("arbeiten", "to work", "A1", "Daily Routine"),
  w("lernen", "to learn", "A1", "Daily Routine"),
  w("kochen", "to cook", "A1", "Daily Routine"),
  w("schlafen", "to sleep", "A1", "Daily Routine"),
  w("der Morgen", "morning", "A1", "Daily Routine"),
  w("der Abend", "evening", "A1", "Daily Routine"),
  w("jeden Tag", "every day", "A1", "Daily Routine"),
  w("zuerst", "first (of all)", "A1", "Daily Routine"),
  // clothing
  w("das T-Shirt", "t-shirt", "A1", "Clothing"),
  w("die Hose", "pants", "A1", "Clothing"),
  w("die Jacke", "jacket", "A1", "Clothing"),
  w("die Schuhe", "shoes", "A1", "Clothing"),
  w("tragen", "to wear", "A1", "Clothing"),
  w("rot", "red", "A1", "Clothing"),
  w("blau", "blue", "A1", "Clothing"),
  w("grün", "green", "A1", "Clothing"),
  w("schwarz", "black", "A1", "Clothing"),
  w("weiß", "white", "A1", "Clothing"),
  // weather
  w("das Wetter", "weather", "A1", "Weather"),
  w("die Sonne", "sun", "A1", "Weather"),
  w("der Regen", "rain", "A1", "Weather"),
  w("der Schnee", "snow", "A1", "Weather"),
  w("warm", "warm", "A1", "Weather"),
  w("kalt", "cold", "A1", "Weather"),
  w("der Sommer", "summer", "A1", "Weather"),
  w("der Winter", "winter", "A1", "Weather"),
  w("es ist heiß", "it is hot", "A1", "Weather"),
  w("es regnet", "it is raining", "A1", "Weather"),
  // transport
  w("der Bus", "bus", "A1", "Transport"),
  w("der Zug", "train", "A1", "Transport"),
  w("das Auto", "car", "A1", "Transport"),
  w("das Fahrrad", "bicycle", "A1", "Transport"),
  w("fahren", "to drive / to go (by vehicle)", "A1", "Transport"),
  w("gehen", "to go / to walk", "A1", "Transport"),
  w("links", "left", "A1", "Transport"),
  w("rechts", "right", "A1", "Transport"),
  w("geradeaus", "straight ahead", "A1", "Transport"),
  w("der Bahnhof", "train station", "A1", "Transport"),
  // shopping basics
  w("kaufen", "to buy", "A1", "Shopping"),
  w("der Preis", "price", "A1", "Shopping"),
  w("der Euro", "euro", "A1", "Shopping"),
  w("teuer", "expensive", "A1", "Shopping"),
  w("billig", "cheap", "A1", "Shopping"),
  w("das Geld", "money", "A1", "Shopping"),
  w("die Tüte", "bag", "A1", "Shopping"),
  w("im Angebot", "on sale", "A1", "Shopping"),
  w("die Größe", "size", "A1", "Shopping"),
  w("nehmen", "to take", "A1", "Shopping"),
  // body & health
  w("der Kopf", "head", "A1", "Health"),
  w("der Bauch", "belly", "A1", "Health"),
  w("der Zahn", "tooth", "A1", "Health"),
  w("das Fieber", "fever", "A1", "Health"),
  w("krank", "sick", "A1", "Health"),
  w("gesund", "healthy", "A1", "Health"),
  w("der Arzt", "doctor", "A1", "Health"),
  w("die Schmerzen", "pain / aches", "A1", "Health"),
  w("müde", "tired", "A1", "Health"),
  w("Gute Besserung", "get well soon", "A1", "Health"),
  // hobbies
  w("das Hobby", "hobby", "A1", "Hobbies"),
  w("spielen", "to play", "A1", "Hobbies"),
  w("lesen", "to read", "A1", "Hobbies"),
  w("hören", "to listen", "A1", "Hobbies"),
  w("schwimmen", "to swim", "A1", "Hobbies"),
  w("reisen", "to travel", "A1", "Hobbies"),
  w("die Musik", "music", "A1", "Hobbies"),
  w("der Sport", "sports", "A1", "Hobbies"),
  w("gerne", "gladly / with pleasure", "A1", "Hobbies"),
  w("die Freizeit", "free time", "A1", "Hobbies"),

  /* ───────── A2 ───────── */
  // past tense
  w("gemacht", "made / done (did)", "A2", "Past Stories"),
  w("gegangen", "went / gone", "A2", "Past Stories"),
  w("gesehen", "seen", "A2", "Past Stories"),
  w("gegessen", "ate / eaten", "A2", "Past Stories"),
  w("gehört", "heard", "A2", "Past Stories"),
  w("gestern", "yesterday", "A2", "Past Stories"),
  w("letzte Woche", "last week", "A2", "Past Stories"),
  w("vor zwei Tagen", "two days ago", "A2", "Past Stories"),
  w("das Wochenende", "weekend", "A2", "Past Stories"),
  w("erzählen", "to tell (a story)", "A2", "Past Stories"),
  // dative case everyday phrases
  w("das Geschenk", "gift", "A2", "Dative Phrases"),
  w("die Freundin", "(female) friend", "A2", "Dative Phrases"),
  w("helfen", "to help", "A2", "Dative Phrases"),
  w("danken", "to thank", "A2", "Dative Phrases"),
  w("gehören", "to belong", "A2", "Dative Phrases"),
  w("mit dem Bus", "by bus", "A2", "Dative Phrases"),
  w("zu Hause", "at home", "A2", "Dative Phrases"),
  w("bei der Arbeit", "at work", "A2", "Dative Phrases"),
  w("nach dem Essen", "after the meal", "A2", "Dative Phrases"),
  w("von meiner Familie", "from my family", "A2", "Dative Phrases"),
  // comparisons
  w("besser", "better", "A2", "Comparisons"),
  w("schneller", "faster", "A2", "Comparisons"),
  w("größer", "bigger", "A2", "Comparisons"),
  w("teurer", "more expensive", "A2", "Comparisons"),
  w("als", "than", "A2", "Comparisons"),
  w("am liebsten", "(like) the most", "A2", "Comparisons"),
  w("mehr", "more", "A2", "Comparisons"),
  w("weniger", "less", "A2", "Comparisons"),
  w("genauso", "just as / the same", "A2", "Comparisons"),
  w("anders als", "different from", "A2", "Comparisons"),
  // health A2
  w("die Erkältung", "cold (illness)", "A2", "Health & Body"),
  w("der Schnupfen", "runny nose", "A2", "Health & Body"),
  w("der Husten", "cough", "A2", "Health & Body"),
  w("die Grippe", "flu", "A2", "Health & Body"),
  w("das Rezept", "prescription", "A2", "Health & Body"),
  w("die Versicherung", "insurance", "A2", "Health & Body"),
  w("der Termin", "appointment", "A2", "Health & Body"),
  w("sich erkälten", "to catch a cold", "A2", "Health & Body"),
  w("sich ausruhen", "to rest", "A2", "Health & Body"),
  w("ansteckend", "contagious", "A2", "Health & Body"),
  // work A2
  w("das Büro", "office", "A2", "Work"),
  w("die Besprechung", "meeting", "A2", "Work"),
  w("der Chef", "boss", "A2", "Work"),
  w("die Überstunde", "overtime", "A2", "Work"),
  w("der Urlaub", "vacation / leave", "A2", "Work"),
  w("die Bewerbung", "job application", "A2", "Work"),
  w("der Lebenslauf", "CV / résumé", "A2", "Work"),
  w("verdienen", "to earn", "A2", "Work"),
  w("die E-Mail", "email", "A2", "Work"),
  w("anrufen", "to call (by phone)", "A2", "Work"),
  // holidays
  w("der Feiertag", "public holiday", "A2", "Holidays & Trips"),
  w("die Reise", "trip", "A2", "Holidays & Trips"),
  w("das Hotel", "hotel", "A2", "Holidays & Trips"),
  w("der Strand", "beach", "A2", "Holidays & Trips"),
  w("die Sehenswürdigkeit", "sight / attraction", "A2", "Holidays & Trips"),
  w("packen", "to pack", "A2", "Holidays & Trips"),
  w("fliegen", "to fly", "A2", "Holidays & Trips"),
  w("besichtigen", "to visit / sightsee", "A2", "Holidays & Trips"),
  w("das Gepäck", "luggage", "A2", "Holidays & Trips"),
  w("das Andenken", "souvenir", "A2", "Holidays & Trips"),
  // phone calls
  w("der Anruf", "phone call", "A2", "Phone Calls"),
  w("am Apparat", "speaking (on the phone)", "A2", "Phone Calls"),
  w("besetzt", "busy (line)", "A2", "Phone Calls"),
  w("zurückrufen", "to call back", "A2", "Phone Calls"),
  w("die Nachricht", "message", "A2", "Phone Calls"),
  w("die Mailbox", "voicemail", "A2", "Phone Calls"),
  w("erreichbar", "reachable", "A2", "Phone Calls"),
  w("die Uhrzeit", "time of day", "A2", "Phone Calls"),
  w("absagen", "to cancel", "A2", "Phone Calls"),
  w("verschieben", "to postpone", "A2", "Phone Calls"),
  // invitations
  w("die Einladung", "invitation", "A2", "Invitations"),
  w("vorschlagen", "to suggest", "A2", "Invitations"),
  w("annehmen", "to accept", "A2", "Invitations"),
  w("ablehnen", "to decline", "A2", "Invitations"),
  w("die Feier", "celebration", "A2", "Invitations"),
  w("die Party", "party", "A2", "Invitations"),
  w("mitbringen", "to bring along", "A2", "Invitations"),
  w("sich freuen auf", "to look forward to", "A2", "Invitations"),
  w("passen", "to suit / to fit", "A2", "Invitations"),
  w("leider", "unfortunately", "A2", "Invitations"),
  // shopping deep dive
  w("anprobieren", "to try on", "A2", "Shopping Plus"),
  w("umtauschen", "to exchange", "A2", "Shopping Plus"),
  w("die Quittung", "receipt", "A2", "Shopping Plus"),
  w("das Sonderangebot", "special offer", "A2", "Shopping Plus"),
  w("die Garantie", "warranty", "A2", "Shopping Plus"),
  w("die Kasse", "checkout / till", "A2", "Shopping Plus"),
  w("sparen", "to save (money)", "A2", "Shopping Plus"),
  w("der Kunde", "customer", "A2", "Shopping Plus"),
  w("der Einkauf", "purchase", "A2", "Shopping Plus"),
  w("die Kleidung", "clothes", "A2", "Shopping Plus"),
  // feelings & opinions
  w("glücklich", "happy", "A2", "Feelings"),
  w("traurig", "sad", "A2", "Feelings"),
  w("wütend", "angry", "A2", "Feelings"),
  w("aufgeregt", "excited", "A2", "Feelings"),
  w("zufrieden", "satisfied", "A2", "Feelings"),
  w("die Meinung", "opinion", "A2", "Feelings"),
  w("das stimmt", "that's right", "A2", "Feelings"),
  w("finden", "to find / to think", "A2", "Feelings"),
  w("denken", "to think", "A2", "Feelings"),
  w("fühlen", "to feel", "A2", "Feelings"),
];

export const VOCAB_LEVELS = ["A1", "A2", "B1"] as const;

export function topicsForLevel(level: string): string[] {
  return [...new Set(VOCAB.filter((v) => v.level === level).map((v) => v.topic))];
}

export function wordsFor(level: string, topic: string | "All"): VocabWord[] {
  return VOCAB.filter((v) => v.level === level && (topic === "All" || v.topic === topic));
}

export function vocabId(word: VocabWord): string {
  return `${word.level}/${word.topic}/${word.de}`;
}

export function findWord(id: string): VocabWord | undefined {
  const [level, topic, de] = id.split("/");
  return getAllWords().find((v) => v.level === level && v.topic === topic && v.de === de);
}

/* ── Extended library: merges seed words with generated packs (public/vocab/*.json) ── */

let generated: VocabWord[] = [];
let loaded = false;
const listeners: (() => void)[] = [];

export function getAllWords(): VocabWord[] {
  const seen = new Set<string>();
  const out: VocabWord[] = [];
  for (const v of [...VOCAB, ...generated]) {
    const key = `${v.de.toLowerCase()}|${v.level}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(v);
    }
  }
  return out;
}

/** Client: fetch generated vocab packs (if present) and merge them in. Call once. */
export async function loadGeneratedVocab(): Promise<void> {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  for (const lvl of ["A1", "A2", "B1"]) {
    try {
      const res = await fetch(`/vocab/${lvl}.json`);
      if (res.ok) {
        const arr = (await res.json()) as VocabWord[];
        for (const v of arr) v.level = lvl as VocabWord["level"];
        generated.push(...arr);
      }
    } catch {
      /* pack not generated yet — fine */
    }
  }
  listeners.forEach((fn) => fn());
}

export function onVocabLoaded(fn: () => void) {
  listeners.push(fn);
}

