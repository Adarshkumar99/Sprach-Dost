/**
 * Exam simulator data — Goethe / TELC / ÖSD formats × A1 / A2 / B1.
 * Every exam walks through 4 parts: Lesen (read), Hören (listen),
 * Schreiben (write, AI-graded) and Sprechen (speak, keyword + AI-graded).
 */

export type ExamFormatId = "goethe" | "telc" | "osd";
export type ExamLevel = "A1" | "A2" | "B1";

export type Mcq = { q: string; options: string[]; answer: number };

export type LesenPart = {
  kind: "lesen";
  title: string;
  instructionsEn: string;
  text: string;
  questions: Mcq[];
};
export type HorenPart = {
  kind: "horen";
  title: string;
  instructionsEn: string;
  scriptDe: string; // read aloud via TTS — never shown before answering
  questions: Mcq[];
};
export type SchreibenPart = {
  kind: "schreiben";
  title: string;
  instructionsEn: string;
  promptDe: string;
  promptEn: string;
  wordTarget: number;
  bullets: string[]; // required points, fed to the AI grader
};
export type SprechenTask = {
  id: string;
  title: string;
  instructionsEn: string;
  promptDe: string;
  keywords: string[];
  minWords: number;
};
export type SprechenPart = {
  kind: "sprechen";
  title: string;
  instructionsEn: string;
  tasks: SprechenTask[];
};

export type ExamPart = LesenPart | HorenPart | SchreibenPart | SprechenPart;

export type ExamFormat = {
  id: ExamFormatId;
  label: string;
  tagline: string;
  levels: ExamLevel[];
  parts: Record<ExamLevel, ExamPart[]>;
};

export const EXAM_FORMAT_META: { id: ExamFormatId; label: string; tagline: string }[] = [
  { id: "goethe", label: "Goethe-Institut", tagline: "Most popular for visas & universities" },
  { id: "telc", label: "telc GmbH", tagline: "Widely accepted, practical format" },
  { id: "osd", label: "ÖSD", tagline: "Austrian diploma, also accepted in Germany" },
];

export const EXAMS: ExamFormat[] = [
  /* ─────────────────────────── GOETHE ─────────────────────────── */
  {
    id: "goethe",
    label: "Goethe-Institut",
    tagline: "Most popular for visas & universities",
    levels: ["A1", "A2", "B1"],
    parts: {
      A1: [
        {
          kind: "lesen",
          title: "Lesen — Kursangebot",
          instructionsEn: "Read the notice and tap the right answer.",
          text: `KURSANGEBOT: Deutsch für Anfänger (A1)
Wann? Jeden Montag und Mittwoch, 18:00–19:30 Uhr
Wo? Volkshochschule, Raum 204, Hauptstraße 12
Kosten: 120 Euro für 10 Wochen
Anmeldung: bis 5. September im Büro (Zimmer 101) oder online
Bitte bringen Sie am ersten Tag Ihr Buch mit: "Momente A1".`,
          questions: [
            { q: "Wann ist der Kurs?", options: ["Am Morgen", "Am Nachmittag", "Am Abend", "Am Wochenende"], answer: 2 },
            { q: "Wo kann man sich anmelden?", options: ["Nur telefonisch", "Im Büro oder online", "Nur per Brief", "Bei der Lehrerin"], answer: 1 },
            { q: "Was müssen die Teilnehmer am ersten Tag mitbringen?", options: ["Ein Foto", "120 Euro", "Einen Stuhl", "Das Buch"], answer: 3 },
          ],
        },
        {
          kind: "horen",
          title: "Hören — Durchsage",
          instructionsEn: "Listen carefully — you can replay it up to 3 times.",
          scriptDe:
            "Achtung bitte, eine kurze Information. Das Schwimmbad bleibt heute wegen Reinigung geschlossen. Morgen öffnet das Schwimmbad wieder um zehn Uhr. Die Abendkurse finden heute statt. Vielen Dank.",
          questions: [
            { q: "Warum ist das Schwimmbad heute geschlossen?", options: ["Wegen Reinigung", "Wegen Reparatur", "Wegen eines Feiertags", "Wegen eines Unfalls"], answer: 0 },
            { q: "Wann öffnet das Schwimmbad morgen?", options: ["Um 8 Uhr", "Um 9 Uhr", "Um 10 Uhr", "Um 12 Uhr"], answer: 2 },
            { q: "Was ist heute mit den Abendkursen?", options: ["Sie fallen aus", "Sie finden statt", "Sie beginnen später", "Sie sind verschoben"], answer: 1 },
          ],
        },
        {
          kind: "schreiben",
          title: "Schreiben — Kurze Nachricht",
          instructionsEn: "Type a short German message. The AI examiner grades it.",
          promptDe:
            "Schreiben Sie eine kurze Nachricht an Ihren Lehrer, Herrn Müller. Sie sind krank und können morgen nicht zum Kurs kommen. Entschuldigen Sie sich.",
          promptEn: "Write a short note to your teacher Mr. Müller: you are sick and can't come to class tomorrow. Apologise.",
          wordTarget: 30,
          bullets: ["Begrüßung (Anrede)", "sagen, dass Sie krank sind", "Entschuldigung", "Gruß am Ende"],
        },
        {
          kind: "sprechen",
          title: "Sprechen — 3 Teile",
          instructionsEn: "Hear the examiner, speak your answer in German.",
          tasks: [
            {
              id: "g-a1-intro",
              title: "Teil 1 — Introduce yourself",
              instructionsEn: "Say who you are, where you live, your job/studies, and one hobby.",
              promptDe:
                "Stellen Sie sich bitte vor. Wie heißen Sie, woher kommen Sie, was machen Sie beruflich und was machen Sie gern?",
              keywords: ["ich", "heiße", "wohne", "komme", "bin", "arbeite", "studiere", "gern", "möchte"],
              minWords: 6,
            },
            {
              id: "g-a1-picture",
              title: "Teil 2 — Picture card",
              instructionsEn: "Describe what you see: who is there, what is happening.",
              promptDe: "Beschreiben Sie ein Bild. Was sehen Sie? Wer ist da? Was passiert?",
              keywords: ["das", "ist", "sind", "sehe", "zeigt", "mann", "frau", "kind"],
              minWords: 6,
            },
            {
              id: "g-a1-opinion",
              title: "Teil 3 — Opinion/advice",
              instructionsEn: "Say if it's a good idea and why / why not.",
              promptDe: "Ich möchte nach Deutschland ziehen. Was denken Sie? Gute Idee?",
              keywords: ["ich denke", "finde", "weil", "aber", "vielleicht", "meiner meinung"],
              minWords: 7,
            },
          ],
        },
      ],
      A2: [
        {
          kind: "lesen",
          title: "Lesen — E-Mail",
          instructionsEn: "Read the email and tap the right answer.",
          text: `Lieber Jonas,

wie geht es dir? Ich habe eine tolle Nachricht: Nächste Woche Samstag habe ich Geburtstag und ich mache eine Party auf dem Dach meines Hauses. Es beginnt um 19 Uhr. Wir grillen und hören Musik. Kannst du einen Salat mitbringen? Deine Schwester Lisa kommt auch.

Bitte schreib mir bis Freitag, ob du kommen kannst.

Viele Grüße
Maria`,
          questions: [
            { q: "Was feiert Maria?", options: ["Ihren neuen Job", "Ihren Geburtstag", "Ihre Prüfung", "Ihr neues Auto"], answer: 1 },
            { q: "Was soll Jonas mitbringen?", options: ["Musik", "Getränke", "Einen Salat", "Einen Kuchen"], answer: 2 },
            { q: "Bis wann soll Jonas antworten?", options: ["Bis Mittwoch", "Bis Donnerstag", "Bis Samstag", "Bis Freitag"], answer: 3 },
          ],
        },
        {
          kind: "horen",
          title: "Hören — Verkehrsfunk",
          instructionsEn: "Listen carefully — you can replay it up to 3 times.",
          scriptDe:
            "Guten Abend, hier ist der Verkehrsservice. Auf der Autobahn 8 gibt es heute Abend zwischen Stuttgart und Karlsruhe einen Stau von etwa fünf Kilometern. Bitte benutzen Sie die Umleitung über die Landstraße. Gegen 22 Uhr wird die Fahrbahn wieder frei sein.",
          questions: [
            { q: "Wo gibt es den Stau?", options: ["Auf der Autobahn 3", "Zwischen Stuttgart und Karlsruhe", "Bei München", "In der Stadt"], answer: 1 },
            { q: "Wie lang ist der Stau?", options: ["Etwa 2 Kilometer", "Etwa 5 Kilometer", "Etwa 10 Kilometer", "Etwa 50 Kilometer"], answer: 1 },
            { q: "Wann wird die Fahrbahn wieder frei?", options: ["Gegen 20 Uhr", "Gegen 21 Uhr", "Gegen 22 Uhr", "Gegen Mitternacht"], answer: 2 },
          ],
        },
        {
          kind: "schreiben",
          title: "Schreiben — E-Mail",
          instructionsEn: "Type a German email. The AI examiner grades it.",
          promptDe:
            "Deine Freundin Anna lädt dich zu einem Ausflug am Sonntag ein, aber du kannst nicht mitkommen. Schreib ihr eine E-Mail: Bedanke dich, sage warum du nicht kannst, mach einen Vorschlag für einen anderen Tag.",
          promptEn: "Your friend Anna invites you on a Sunday trip, but you can't come. Email her: thank her, say why you can't, suggest another day.",
          wordTarget: 50,
          bullets: ["Bedankung", "Absage mit Grund", "Vorschlag für einen anderen Tag", "Gruß am Ende"],
        },
        {
          kind: "sprechen",
          title: "Sprechen — 3 Teile",
          instructionsEn: "Hear the examiner, speak your answer in German.",
          tasks: [
            {
              id: "g-a2-past",
              title: "Teil 1 — Past experience",
              instructionsEn: "Tell us about something that happened recently in your life.",
              promptDe: "Erzählen Sie von einem Erlebnis letzte Woche. Was ist passiert?",
              keywords: ["gestern", "letzte woche", "war", "habe", "ging", "gegangen", "gemacht"],
              minWords: 8,
            },
            {
              id: "g-a2-compare",
              title: "Teil 2 — Compare options",
              instructionsEn: "Compare two things and say which you prefer.",
              promptDe: "Vergleichen Sie zwei Optionen. Zum Beispiel Stadt vs Dorf. Welche finden Sie besser?",
              keywords: ["lieber", "besser", "als", "weil", "aber", "deshalb"],
              minWords: 8,
            },
            {
              id: "g-a2-help",
              title: "Teil 3 — Ask for help",
              instructionsEn: "Your colleague is sick. Ask your boss for a favour or advice.",
              promptDe: "Mein Kollege ist krank. Können Sie mir helfen? Was soll ich tun?",
              keywords: ["können sie", "können", "helfen", "tut mir leid", "vielleicht", "wenn"],
              minWords: 6,
            },
          ],
        },
      ],
      B1: [
        {
          kind: "lesen",
          title: "Lesen — Forumsbeitrag",
          instructionsEn: "Read the forum post and tap the right answer.",
          text: `Forum: Leben in Deutschland
Beitrag von Nadia:

Ich wohne seit zwei Jahren in Leipzig und arbeite als Krankenschwester. Am Anfang war die Sprache mein größtes Problem. Ich habe jeden Tag 30 Minuten Podcast gehört und mit Kollegen nur Deutsch gesprochen. Nach sechs Monaten war es viel besser. Mein Tipp: Habt keine Angst vor Fehlern! Die Deutschen korrigieren euch selten, aber Übung ist alles. Wer täglich spricht, lernt schneller als wer nur Grammatikbücher liest.`,
          questions: [
            { q: "Was war Nadias größtes Problem am Anfang?", options: ["Die Arbeit", "Die Wohnung", "Die Sprache", "Das Wetter"], answer: 2 },
            { q: "Was hat sie jeden Tag gemacht?", options: ["Grammatik gelesen", "Podcast gehört", "Briefe geschrieben", "Filme gesehen"], answer: 1 },
            { q: "Was ist ihr Tipp?", options: ["Nur Grammatikbücher lesen", "In ein teures Gymnasium gehen", "Keine Angst vor Fehlern haben", "Weniger arbeiten"], answer: 2 },
          ],
        },
        {
          kind: "horen",
          title: "Hören — Mitarbeiteransage",
          instructionsEn: "Listen carefully — you can replay it up to 3 times.",
          scriptDe:
            "Liebe Kolleginnen und Kollegen, am Freitag findet um 14 Uhr im Konferenzraum 2 eine kurze Besprechung über die neuen Arbeitszeiten statt. Wer am Freitag Urlaub hat, meldet sich bitte bei Frau Berger im Personalbüro. Die Folien werden danach per E-Mail verschickt.",
          questions: [
            { q: "Wann findet die Besprechung statt?", options: ["Freitag, 9 Uhr", "Freitag, 14 Uhr", "Montag, 14 Uhr", "Freitag, 16 Uhr"], answer: 1 },
            { q: "Was müssen Mitarbeiter tun, die Urlaub haben?", options: ["Zu Hause bleiben", "Sich bei Frau Berger melden", "Die Folien schicken", "Einen neuen Termin nehmen"], answer: 1 },
            { q: "Wie bekommen die Mitarbeiter die Folien?", options: ["Per Post", "Im Konferenzraum", "Per E-Mail", "Beim nächsten Treffen"], answer: 2 },
          ],
        },
        {
          kind: "schreiben",
          title: "Schreiben — Anfrage",
          instructionsEn: "Type a German email. The AI examiner grades it.",
          promptDe:
            "Sie haben einen Deutschkurs bei der Sprachschule LinguaPlus gesehen und möchten sich anmelden. Schreiben Sie eine E-Mail an die Schule: Stellen Sie sich kurz vor, fragen Sie nach Kurszeiten und Preisen, fragen Sie, ob es einen Online-Kurs gibt.",
          promptEn: "You want to join a German course at LinguaPlus. Email the school: introduce yourself briefly, ask about times and prices, ask whether there is an online course.",
          wordTarget: 80,
          bullets: ["kurze Vorstellung", "Frage nach Kurszeiten", "Frage nach Preisen", "Frage nach Online-Kurs", "Gruß am Ende"],
        },
        {
          kind: "sprechen",
          title: "Sprechen — 3 Teile",
          instructionsEn: "Hear the examiner, speak your answer in German.",
          tasks: [
            {
              id: "g-b1-self",
              title: "Teil 1 — Über mich",
              instructionsEn: "Talk about yourself: origin, why German, your plans.",
              promptDe:
                "Erzählen Sie etwas über sich: Woher kommen Sie? Warum lernen Sie Deutsch? Was möchten Sie in Deutschland machen?",
              keywords: ["komme", "deutsch", "weil", "möchte", "lerne", "arbeite", "studiere"],
              minWords: 25,
            },
            {
              id: "g-b1-media",
              title: "Teil 2 — Thema: Medien",
              instructionsEn: "Talk about media in your life and give reasons.",
              promptDe:
                "Sprechen Sie über Medien in Ihrem Leben. Wie oft nutzen Sie Handy und Internet? Sind Medien wichtig? Warum?",
              keywords: ["nutze", "handy", "internet", "wichtig", "weil", "jeden tag", "oft"],
              minWords: 30,
            },
            {
              id: "g-b1-plan",
              title: "Teil 3 — Gemeinsam planen",
              instructionsEn: "Suggest a destination and discuss transport, cost and food.",
              promptDe:
                "Ihre Klasse möchte einen Ausflug machen. Schlagen Sie ein Ziel vor und sprechen Sie über Transport, Kosten und Essen.",
              keywords: ["vorschlag", "könnten", "fahren", "kosten", "essen", "vielleicht"],
              minWords: 25,
            },
          ],
        },
      ],
    },
  },

  /* ─────────────────────────── TELC ─────────────────────────── */
  {
    id: "telc",
    label: "telc GmbH",
    tagline: "Widely accepted, practical format",
    levels: ["A1", "A2", "B1"],
    parts: {
      A1: [
        {
          kind: "lesen",
          title: "Lesen — Schilder & Hinweise",
          instructionsEn: "Read the notices and tap the right answer.",
          text: `1. Bäckerei Sonnenhof: Montag bis Samstag von 7 bis 18 Uhr geöffnet, sonntags geschlossen.
2. Achtung: Der Aufzug im Museum ist seit Montag kaputt. Bitte benutzen Sie die Treppe.
3. Kino „Apollo": Studenten zahlen mit Ausweis nur 5 Euro.`,
          questions: [
            { q: "Wann kann man bei Sonnenhof Brot kaufen?", options: ["Mo–Sa, 7–18 Uhr", "Nur sonntags", "Nur am Nachmittag", "Rund um die Uhr"], answer: 0 },
            { q: "Was ist im Museum kaputt?", options: ["Die Tür", "Der Aufzug", "Die Treppe", "Das Licht"], answer: 1 },
            { q: "Was zahlen Studenten im Kino Apollo?", options: ["Nichts", "10 Euro", "5 Euro mit Ausweis", "15 Euro"], answer: 2 },
          ],
        },
        {
          kind: "horen",
          title: "Hören — Bahnhofsansage",
          instructionsEn: "Listen carefully — you can replay it up to 3 times.",
          scriptDe:
            "Liebe Fahrgäste, der Zug nach München fährt heute von Gleis 7 ab, nicht von Gleis 3. Der Zug hat etwa zehn Minuten Verspätung. Bitte prüfen Sie Ihre Fahrkarten. Gute Fahrt!",
          questions: [
            { q: "Von welchem Gleis fährt der Zug?", options: ["Gleis 3", "Gleis 5", "Gleis 7", "Gleis 10"], answer: 2 },
            { q: "Wie viel Verspätung hat der Zug?", options: ["Keine", "Etwa 10 Minuten", "Etwa 30 Minuten", "Eine Stunde"], answer: 1 },
            { q: "Was sollen die Fahrgäste prüfen?", options: ["Ihre Fahrkarten", "Das Gleis", "Die Uhr", "Ihr Gepäck"], answer: 0 },
          ],
        },
        {
          kind: "schreiben",
          title: "Schreiben — Postkarte",
          instructionsEn: "Type a short German postcard. The AI examiner grades it.",
          promptDe:
            "Schreiben Sie eine Postkarte an Ihre Familie in Indien. Sie sind jetzt in Berlin. Schreiben Sie: Wo wohnen Sie? Was gefällt Ihnen? Was machen Sie jeden Tag?",
          promptEn: "Write a postcard to your family in India. You are in Berlin now: where do you live, what do you like, what do you do every day?",
          wordTarget: 30,
          bullets: ["Gruß am Anfang", "Wohnort", "etwas, das gefällt", "Grußformel am Ende"],
        },
        {
          kind: "sprechen",
          title: "Sprechen — 3 Teile",
          instructionsEn: "Hear the examiner, speak your answer in German.",
          tasks: [
            {
              id: "t-a1-kontakt",
              title: "Teil 1 — Kontaktaufnahme",
              instructionsEn: "Answer the examiner's questions about yourself.",
              promptDe:
                "Guten Tag! Ich bin Frau Weber. Wie heißen Sie? Woher kommen Sie? Was machen Sie in Deutschland?",
              keywords: ["heiße", "komme", "wohne", "deutsch", "lerne", "arbeite"],
              minWords: 8,
            },
            {
              id: "t-a1-restaurant",
              title: "Teil 2 — Im Restaurant",
              instructionsEn: "Order food and a drink, then ask for the bill.",
              promptDe:
                "Sie sind im Restaurant. Bestellen Sie etwas zu essen und zu trinken, und fragen Sie nach der Rechnung.",
              keywords: ["möchte", "bitte", "zahlen", "rechnung", "danke", "wasse"],
              minWords: 6,
            },
            {
              id: "t-a1-wuensche",
              title: "Teil 3 — Wünsche",
              instructionsEn: "Politely ask your flatmate for a favour.",
              promptDe:
                "Sie wohnen in einer WG. Bitten Sie Ihren Mitbewohner höflich um etwas — zum Beispiel Musik leiser oder das Fenster aufzumachen.",
              keywords: ["bitte", "könntest", "könnten", "danke", "leiser", "fenster"],
              minWords: 5,
            },
          ],
        },
      ],
      A2: [
        {
          kind: "lesen",
          title: "Lesen — Elternbrief",
          instructionsEn: "Read the letter and tap the right answer.",
          text: `Liebe Frau Kaur,

Ihr Kind (Klasse 4b) schwimmt am 12. Mai mit der Schule im Hallenbad Süd. Die Fahrt kostet 4 Euro — bitte geben Sie das Geld bis 8. Mai Ihrem Kind mit. Badesachen und Handtuch nicht vergessen!

Bei Fragen kommen Sie am Mittwoch zwischen 8 und 9 Uhr in mein Büro.

Frau Lehmann, Klassenlehrerin`,
          questions: [
            { q: "Was macht die Klasse am 12. Mai?", options: ["Einen Ausflug ins Museum", "Schwimmen", "Ein Fußballspiel", "Eine Prüfung"], answer: 1 },
            { q: "Wie viel kostet die Fahrt?", options: ["Nichts", "2 Euro", "4 Euro", "8 Euro"], answer: 2 },
            { q: "Wann kann man Frau Lehmann sprechen?", options: ["Montag 8–9 Uhr", "Mittwoch 8–9 Uhr", "Mittwoch 17–18 Uhr", "Freitag 8–9 Uhr"], answer: 1 },
          ],
        },
        {
          kind: "horen",
          title: "Hören — Studioinformation",
          instructionsEn: "Listen carefully — you can replay it up to 3 times.",
          scriptDe:
            "Willkommen im Fitnessstudio Vital! Das Studio ist montags bis freitags von 7 bis 22 Uhr geöffnet, samstags bis 20 Uhr und sonntags von 9 bis 14 Uhr. Kurse wie Yoga und Zumba sind im Preis enthalten. Handtücher bekommen Sie an der Rezeption. Viel Spaß beim Training!",
          questions: [
            { q: "Wann öffnet das Studio sonntags?", options: ["7–22 Uhr", "9–14 Uhr", "Bis 20 Uhr", "Gar nicht"], answer: 1 },
            { q: "Sind Kurse im Preis enthalten?", options: ["Ja, alle", "Nur Yoga", "Nur Zumba", "Nein"], answer: 0 },
            { q: "Wo bekommt man Handtücher?", options: ["Im Kursraum", "An der Rezeption", "In der Umkleide", "Nirgendwo"], answer: 1 },
          ],
        },
        {
          kind: "schreiben",
          title: "Schreiben — Dankes-E-Mail",
          instructionsEn: "Type a German email. The AI examiner grades it.",
          promptDe:
            "Ihr Chef, Herr Braun, hat Ihnen geholfen, einen Termin beim Arzt zu bekommen. Schreiben Sie ihm eine kurze E-Mail: Bedanken Sie sich, sagen Sie, dass der Termin geklappt hat, laden Sie ihn zum Kaffee ein.",
          promptEn: "Your boss Mr. Braun helped you get a doctor's appointment. Email him: thank him, say the appointment worked out, invite him for coffee.",
          wordTarget: 50,
          bullets: ["Bedankung", "Termin hat geklappt", "Einladung zum Kaffee", "Gruß am Ende"],
        },
        {
          kind: "sprechen",
          title: "Sprechen — 3 Teile",
          instructionsEn: "Hear the examiner, speak your answer in German.",
          tasks: [
            {
              id: "t-a2-urlaub",
              title: "Teil 1 — Letzter Urlaub",
              instructionsEn: "Talk about your last holiday or weekend: where, what you did.",
              promptDe:
                "Erzählen Sie von Ihrem letzten Urlaub oder Wochenende: Wo waren Sie? Was haben Sie gemacht?",
              keywords: ["war", "habe", "besucht", "gegangen", "schön", "wetter", "gefahren"],
              minWords: 12,
            },
            {
              id: "t-a2-problem",
              title: "Teil 2 — Problem beschreiben",
              instructionsEn: "Describe the problem and say what you will do.",
              promptDe:
                "Sie haben ein Problem mit Ihrer Wohnung — zum Beispiel die Heizung ist kaputt. Beschreiben Sie das Problem und sagen Sie, was Sie tun wollen.",
              keywords: ["problem", "kaputt", "muss", "reparieren", "rufen", "heizung"],
              minWords: 10,
            },
            {
              id: "t-a2-feier",
              title: "Teil 3 — Gemeinsam planen",
              instructionsEn: "Plan a party together: food, guests, time.",
              promptDe: "Planen Sie mit Ihrem Partner eine Feier: Was essen wir? Wen laden wir ein? Wann?",
              keywords: ["könnten", "vorschlag", "einladen", "essen", "uhr", "vielleicht"],
              minWords: 10,
            },
          ],
        },
      ],
      B1: [
        {
          kind: "lesen",
          title: "Lesen — Newsletter",
          instructionsEn: "Read the newsletter and tap the right answer.",
          text: `Newsletter der Stadtverwaltung:

Ab dem 1. Juni gilt in der Innenstadt neues Parken: Die ersten 30 Minuten sind kostenlos, danach zahlen Sie 1,50 Euro pro Stunde. Anwohner mit Wohnkarte parken weiterhin frei. Die Tickets können Sie an Automaten oder per App bezahlen. Der Kundenservice informiert: Die Automaten akzeptieren keine Münzen über 2 Euro.`,
          questions: [
            { q: "Wie lange parken Sie kostenlos?", options: ["10 Minuten", "30 Minuten", "60 Minuten", "Gar nicht"], answer: 1 },
            { q: "Was gilt für Anwohner mit Wohnkarte?", options: ["Sie zahlen 1,50 Euro", "Sie parken frei", "Sie nutzen nur die App", "Sie dürfen nicht parken"], answer: 1 },
            { q: "Welche Münzen akzeptieren die Automaten nicht?", options: ["1-Euro-Münzen", "2-Euro-Münzen", "Münzen über 2 Euro", "Keine Münzen"], answer: 2 },
          ],
        },
        {
          kind: "horen",
          title: "Hören — Kundenservice",
          instructionsEn: "Listen carefully — you can replay it up to 3 times.",
          scriptDe:
            "Guten Tag, hier spricht die Kundenservice-Abteilung der Stadtwerke. Wegen Wartungsarbeiten ist am Dienstag zwischen 8 und 12 Uhr das warme Wasser in Ihrem Stadtteil abgestellt. Wir bitten um Entschuldigung. Für Notfälle erreichen Sie unseren Notdienst rund um die Uhr unter der kostenlosen Nummer 0800 555 0100.",
          questions: [
            { q: "Wann gibt es kein warmes Wasser?", options: ["Dienstag 8–12 Uhr", "Dienstag 12–18 Uhr", "Donnerstag 8–12 Uhr", "Den ganzen Dienstag"], answer: 0 },
            { q: "Warum gibt es kein warmes Wasser?", options: ["Wegen eines Unfalls", "Wegen Wartungsarbeiten", "Wegen eines Streiks", "Wegen Bauarbeiten"], answer: 1 },
            { q: "Wie erreicht man den Notdienst?", options: ["Nur per E-Mail", "Rund um die Uhr, kostenlos", "Nur werktags", "Nur vor Ort"], answer: 1 },
          ],
        },
        {
          kind: "schreiben",
          title: "Schreiben — Beschwerde",
          instructionsEn: "Type a German email. The AI examiner grades it.",
          promptDe:
            "Sie waren letzte Woche im Hotel „Seeblick\" und sind nicht zufrieden. Schreiben Sie eine E-Mail an das Hotel: Sagen Sie, wann Sie da waren, beschreiben Sie zwei Probleme, bitten Sie um eine Entschädigung.",
          promptEn: "You stayed at Hotel Seeblick last week and are not happy. Email the hotel: when you stayed, two problems, ask for compensation.",
          wordTarget: 80,
          bullets: ["Zeitraum des Aufenthalts", "zwei Probleme", "Bitte um Entschädigung", "Gruß am Ende"],
        },
        {
          kind: "sprechen",
          title: "Sprechen — 3 Teile",
          instructionsEn: "Hear the examiner, speak your answer in German.",
          tasks: [
            {
              id: "t-b1-vorstellung",
              title: "Teil 1 — Vorstellung",
              instructionsEn: "Introduce yourself: job/studies and your plans in Germany.",
              promptDe:
                "Stellen Sie sich vor und erzählen Sie von Ihrem Beruf oder Studium und Ihren Plänen in Deutschland.",
              keywords: ["arbeite", "studiere", "plane", "möchte", "deutsch", "zukunft"],
              minWords: 25,
            },
            {
              id: "t-b1-gesundheit",
              title: "Teil 2 — Thema: Gesundes Leben",
              instructionsEn: "Present briefly: what do you do for your health?",
              promptDe: "Präsentieren Sie kurz das Thema „Gesundes Leben\": Was machen Sie für Ihre Gesundheit?",
              keywords: ["gesund", "sport", "esse", "schlafe", "wichtig", "bewegung"],
              minWords: 25,
            },
            {
              id: "t-b1-diskussion",
              title: "Teil 3 — Diskussion",
              instructionsEn: "Discuss pros and cons with your partner.",
              promptDe:
                "Diskutieren Sie mit Ihrem Partner: Sollte man in der Stadt ein Auto haben? Sammeln Sie Vor- und Nachteile.",
              keywords: ["finde", "einerseits", "andererseits", "weil", "meinung", "nachteil", "vorteil"],
              minWords: 20,
            },
          ],
        },
      ],
    },
  },

  /* ─────────────────────────── ÖSD ─────────────────────────── */
  {
    id: "osd",
    label: "ÖSD",
    tagline: "Austrian diploma, also accepted in Germany",
    levels: ["A1", "A2", "B1"],
    parts: {
      A1: [
        {
          kind: "lesen",
          title: "Lesen — Wohnungsanzeige",
          instructionsEn: "Read the advert and tap the right answer.",
          text: `Wohnung zu vermieten in Wien, 16. Bezirk
2 Zimmer, Küche, Bad, 55 m², 3. Stock mit Lift
Miete: 650 Euro pro Monat + Strom
Ab dem 1. März frei
Besichtigung: jeden Dienstag um 17 Uhr
Telefon: 01 234 56 78 (Herr Gruber)`,
          questions: [
            { q: "Wie viel kostet die Miete?", options: ["55 Euro", "650 Euro", "765 Euro", "1.650 Euro"], answer: 1 },
            { q: "Wann ist die Wohnung frei?", options: ["Ab dem 1. Jänner", "Ab dem 1. März", "Ab dem 16. März", "Sofort"], answer: 1 },
            { q: "Wann kann man die Wohnung besichtigen?", options: ["Dienstag, 17 Uhr", "Dienstag, 7 Uhr", "Jeden Tag", "Nur am Wochenende"], answer: 0 },
          ],
        },
        {
          kind: "horen",
          title: "Hören — Hotelansage",
          instructionsEn: "Listen carefully — you can replay it up to 3 times.",
          scriptDe:
            "Grüß Gott im Hotel Danube! Das Frühstück gibt es von 7 bis 10 Uhr im Erdgeschoss. Ihr Zimmer bitte bis 11 Uhr am Abreisetag freimachen. WLAN ist kostenlos, das Passwort steht auf Ihrer Zimmerkarte. Wir wünschen einen schönen Aufenthalt!",
          questions: [
            { q: "Bis wann gibt es Frühstück?", options: ["Bis 8 Uhr", "Bis 9 Uhr", "Bis 10 Uhr", "Bis 11 Uhr"], answer: 2 },
            { q: "Bis wann muss man das Zimmer freimachen?", options: ["Bis 10 Uhr", "Bis 11 Uhr", "Bis 12 Uhr", "Bis 14 Uhr"], answer: 1 },
            { q: "Wo steht das WLAN-Passwort?", options: ["An der Rezeption", "Auf der Zimmerkarte", "Auf dem Frühstückstisch", "Im Aufzug"], answer: 1 },
          ],
        },
        {
          kind: "schreiben",
          title: "Schreiben — Kurze Notiz",
          instructionsEn: "Type a short German note. The AI examiner grades it.",
          promptDe:
            "Schreiben Sie eine kurze Notiz an Ihre Chefin, Frau Maier: Sie kommen morgen eine Stunde später, weil Sie zum Arzt müssen.",
          promptEn: "Write a short note to your boss Ms. Maier: you'll arrive an hour late tomorrow because you have a doctor's appointment.",
          wordTarget: 25,
          bullets: ["Anrede", "Grund (Arzt)", "Uhrzeit / später", "Gruß am Ende"],
        },
        {
          kind: "sprechen",
          title: "Sprechen — 3 Teile",
          instructionsEn: "Hear the examiner, speak your answer in German.",
          tasks: [
            {
              id: "o-a1-vorstellen",
              title: "Teil 1 — Vorstellen",
              instructionsEn: "Greet the examiner and introduce yourself: name, country, city, language.",
              promptDe: "Guten Tag! Begrüßen Sie mich und stellen Sie sich vor: Name, Land, Wohnort, Sprache.",
              keywords: ["guten tag", "heiße", "komme", "wohne", "spreche", "ich"],
              minWords: 6,
            },
            {
              id: "o-a1-fragen",
              title: "Teil 2 — Fragen stellen",
              instructionsEn: "Ask the examiner questions: name, origin, coffee.",
              promptDe:
                "Stellen Sie mir jetzt Fragen: Wie ich heiße, woher ich komme und ob ich Kaffee trinke.",
              keywords: ["wie", "heißen", "woher", "kommen", "trinken", "kaffee"],
              minWords: 4,
            },
            {
              id: "o-a1-bitten",
              title: "Teil 3 — Bitten",
              instructionsEn: "Politely ask for something and say thanks.",
              promptDe: "Bitten Sie mich um etwas: ein Glas Wasser, Hilfe oder die Rechnung.",
              keywords: ["bitte", "möchte", "könnte", "danke", "wasser", "rechnung"],
              minWords: 4,
            },
          ],
        },
      ],
      A2: [
        {
          kind: "lesen",
          title: "Lesen — Umfrage",
          instructionsEn: "Read the survey results and tap the right answer.",
          text: `Kundenumfrage Einzelhandel (Ergebnisse, 500 Personen):
62 % kaufen am liebsten im Einkaufszentrum, weil alles an einem Ort ist.
21 % bestellen im Internet — vor allem junge Leute unter 30.
Nur 17 % gehen in kleine Läden. Grund: zu teuer.
72 % wünschen sich längere Öffnungszeiten am Samstag.`,
          questions: [
            { q: "Wo kaufen die meisten Leute am liebsten?", options: ["Im Internet", "In kleinen Läden", "Im Einkaufszentrum", "Auf dem Markt"], answer: 2 },
            { q: "Wer bestellt vor allem online?", options: ["Leute unter 30", "Leute über 60", "Familien mit Kindern", "Alle gleich"], answer: 0 },
            { q: "Was wünschen sich 72 %?", options: ["Billigere Preise", "Längere Öffnungszeiten am Samstag", "Mehr kleine Läden", "Bessere Qualität"], answer: 1 },
          ],
        },
        {
          kind: "horen",
          title: "Hören — Museumsansage",
          instructionsEn: "Listen carefully — you can replay it up to 3 times.",
          scriptDe:
            "Meine Damen und Herren, willkommen im Museum für moderne Kunst. Die Führung auf Deutsch beginnt in zehn Minuten im ersten Stock und dauert etwa eine Stunde. Sie kostet 3 Euro zusätzlich zur Eintrittskarte. Fotografieren ist nur ohne Blitz erlaubt. Die Führung beginnt bei dem blauen Bild von Paul Klee.",
          questions: [
            { q: "Wann beginnt die Führung?", options: ["Sofort", "In 10 Minuten", "In einer Stunde", "Um 15 Uhr"], answer: 1 },
            { q: "Was kostet die Führung zusätzlich?", options: ["Nichts", "1 Euro", "3 Euro", "10 Euro"], answer: 2 },
            { q: "Wo beginnt die Führung?", options: ["Im Erdgeschoss", "Beim blauen Bild von Klee", "Am Eingang", "Im ersten Stock bei der Kasse"], answer: 1 },
          ],
        },
        {
          kind: "schreiben",
          title: "Schreiben — E-Mail",
          instructionsEn: "Type a German email. The AI examiner grades it.",
          promptDe:
            "Ihre Freundin lädt Sie zum Wandern ein. Schreiben Sie eine E-Mail: Sagen Sie, dass Sie gern mitkommen, fragen Sie, was Sie mitbringen sollen, und fragen Sie, wann und wo Sie sich treffen.",
          promptEn: "Your friend invites you hiking. Email: say you'd love to come, ask what to bring, ask when and where to meet.",
          wordTarget: 50,
          bullets: ["Zusage", "Frage nach Sachen zum Mitbringen", "Frage nach Treffpunkt & Zeit", "Gruß am Ende"],
        },
        {
          kind: "sprechen",
          title: "Sprechen — 3 Teile",
          instructionsEn: "Hear the examiner, speak your answer in German.",
          tasks: [
            {
              id: "o-a2-familie",
              title: "Teil 1 — Meine Familie",
              instructionsEn: "Talk about your family: people, jobs, time together.",
              promptDe:
                "Erzählen Sie über Ihre Familie: Wie viele Personen sind das? Was machen sie beruflich? Verbringen Sie viel Zeit zusammen?",
              keywords: ["familie", "bruder", "schwester", "eltern", "arbeitet", "zusammen", "studiert"],
              minWords: 12,
            },
            {
              id: "o-a2-alltag",
              title: "Teil 2 — Mein Alltag",
              instructionsEn: "Describe a normal day: morning, work, evening.",
              promptDe:
                "Beschreiben Sie Ihren Alltag: Wann stehen Sie auf? Wie kommen Sie zur Arbeit? Was machen Sie abends?",
              keywords: ["stehe auf", "fahre", "arbeit", "abends", "koche", "uhr"],
              minWords: 12,
            },
            {
              id: "o-a2-absagen",
              title: "Teil 3 — Höflich absagen",
              instructionsEn: "Politely decline and suggest an alternative.",
              promptDe:
                "Ich möchte Sie zu einem Bier einladen. Sagen Sie höflich, dass Sie nicht können, und schlagen Sie eine Alternative vor.",
              keywords: ["leider", "nicht", "lieber", "vielleicht", "danke", "kaffee"],
              minWords: 8,
            },
          ],
        },
      ],
      B1: [
        {
          kind: "lesen",
          title: "Lesen — Mitarbeiterzeitschrift",
          instructionsEn: "Read the article and tap the right answer.",
          text: `Auszug aus der Mitarbeiterzeitschrift:

„Mobiles Arbeiten wird bei uns zur Regel: Ab Juli dürfen alle Beschäftigten bis zu zwei Tage pro Woche von zu Hause arbeiten. Voraussetzung ist eine Vereinbarung mit der Führungskraft. Für neue Mitarbeiter gilt in den ersten drei Monaten Anwesenheit im Büro, damit die Einarbeitung leichter fällt. Meetings mit Kunden finden grundsätzlich im Büro oder online statt.\"`,
          questions: [
            { q: "Wie viele Tage Homeoffice sind möglich?", options: ["Einen Tag", "Bis zu zwei Tage", "Drei Tage", "Die ganze Woche"], answer: 1 },
            { q: "Was gilt für neue Mitarbeiter?", options: ["Sofort Homeoffice", "Erste 3 Monate im Büro", "Nur online Meetings", "Keine Kundenkontakt"], answer: 1 },
            { q: "Wo finden Kundentreffen statt?", options: ["Zu Hause", "Nur online", "Im Büro oder online", "In einem Café"], answer: 2 },
          ],
        },
        {
          kind: "horen",
          title: "Hören — Uni-Info",
          instructionsEn: "Listen carefully — you can replay it up to 3 times.",
          scriptDe:
            "Liebe Studierende, ich wende mich an alle, die ihre Bachelorarbeit im Sommersemester schreiben. Die Anmeldung läuft bis 15. März über das Online-Portal. Später eingereichte Themen können nur im Wintersemester bearbeitet werden. Zusätzlich biete ich jeden Donnerstag von 16 bis 17 Uhr eine Sprechstunde an, Raum 3.12 — eine Anmeldung ist nicht nötig.",
          questions: [
            { q: "Bis wann muss man sich anmelden?", options: ["Bis 5. März", "Bis 15. März", "Bis 15. Mai", "Bis Semesterende"], answer: 1 },
            { q: "Was passiert bei später Anmeldung?", options: ["Gar nichts", "Bearbeitung erst im Wintersemester", "Ablehnung", "Extra-Gebühr"], answer: 1 },
            { q: "Wann ist die Sprechstunde?", options: ["Dienstag 16–17 Uhr", "Donnerstag 16–17 Uhr", "Donnerstag 14–15 Uhr", "Jeden Tag"], answer: 1 },
          ],
        },
        {
          kind: "schreiben",
          title: "Schreiben — Kursanfrage",
          instructionsEn: "Type a German email. The AI examiner grades it.",
          promptDe:
            "Sie möchten an einem zweiwöchigen Sprachkurs in München teilnehmen. Schreiben Sie an das Sprachinstitut: Warum möchten Sie den Kurs machen? Fragen Sie nach einer Unterkunft und bitten Sie um das Anmeldeformular.",
          promptEn: "You want to join a two-week language course in Munich. Email the institute: why you want the course, ask about accommodation, ask for the registration form.",
          wordTarget: 80,
          bullets: ["Grund für den Kurs", "Frage nach Unterkunft", "Bitte um Anmeldeformular", "Gruß am Ende"],
        },
        {
          kind: "sprechen",
          title: "Sprechen — 3 Teile",
          instructionsEn: "Hear the examiner, speak your answer in German.",
          tasks: [
            {
              id: "o-b1-beruf",
              title: "Teil 1 — Ausbildung & Beruf",
              instructionsEn: "Talk about your education and career path.",
              promptDe:
                "Sprechen Sie über Ihre Ausbildung und Ihren Berufsweg: Was haben Sie gelernt? Was machen Sie jetzt?",
              keywords: ["habe", "gelernt", "studiert", "arbeite", "seit", "beruf"],
              minWords: 25,
            },
            {
              id: "o-b1-umwelt",
              title: "Teil 2 — Thema: Umwelt",
              instructionsEn: "What do you do for the environment? What could cities do?",
              promptDe:
                "Thema „Umwelt\": Was tun Sie persönlich für die Umwelt? Was könnten Städte besser machen?",
              keywords: ["umwelt", "müll", "fahrrad", "könnte", "öffentlich", "energie", "plastik"],
              minWords: 25,
            },
            {
              id: "o-b1-termin",
              title: "Teil 3 — Termin verschieben",
              instructionsEn: "Call, apologise and arrange a new appointment.",
              promptDe:
                "Sie müssen einen wichtigen Termin verschieben. Rufen Sie an, entschuldigen Sie sich und machen Sie einen neuen Termin aus.",
              keywords: ["verschieben", "leid", "termin", "möglich", "nächsten", "könnten"],
              minWords: 15,
            },
          ],
        },
      ],
    },
  },
];

export function getExam(id: ExamFormatId, level: ExamLevel) {
  const format = EXAMS.find((f) => f.id === id);
  if (!format) return null;
  return { format, level, parts: format.parts[level] };
}
