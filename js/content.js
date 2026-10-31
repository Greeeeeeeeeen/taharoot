/**
 * All game text lives here. Edit freely.
 * In "briefing", each "|" adds a dramatic pause while typing.
 */
const CONTENT = {
  startBadge: "סודי ביותר",
  title: "תיק חקירה",
  subtitle: "משטרה צבאית חוקרת",
  startButton: "התחל",

  videoSrc: "assets/video/intro.mp4",
  videoMissing: "הסרטון עדיין לא זמין",
  skipButton: "דלג",
  continueButton: "המשך",

  briefingHeader: "שידור מבצעי // חי",
  briefing:
    "אתם צוות חוקרים שבא לחקור את האירוע ולפענחו.|\n\n" +
    "במהלך פענוח התיק יוצגו בפניכם שאלות.|\n\n" +
    "על כל שלוש שאלות שתענו נכון -| תקבלו עוד ראיה לפיצוח התיק.||\n\n" +
    "סומכים עליכם.|\n" +
    "בהצלחה, חוקרים.",
  tapToSkip: "הקישו על המסך כדי לדלג",
  briefingNextButton: "פתחו את התיק",

  caseHeader: "תיק חקירה // פתוח",
  tabWitnesses: "עדויות",
  tabQuestions: "שאלות",
  tabEvidence: "ראיות",

  witnessesIntro: "לחצו על כל עד כדי לצפות בעדות שלו",
  statementTitlePrefix: "עדות: ",
  mediaMissing: "התוכן עדיין לא זמין",
  watchedLabel: "נצפה",

  questionProgress: "שאלה {n} מתוך {total}",
  correctFeedback: "נכון!",
  wrongFeedback: "תשובה שגויה. חזרו לעדויות או נסו שוב.",
  retryDelayMs: 3000,
  nextQuestionButton: "לשאלה הבאה",
  viewEvidenceButton: "לצפייה בראיה",
  allQuestionsDone: "עניתם על כל השאלות. המשיכו לחקור את הראיות.",

  evidenceIntro: "כל שלוש תשובות נכונות פותחות ראיה חדשה",
  evidenceUnlocked: "ראיה חדשה נפתחה!",
  evidenceLocked: "נעול",

  // Each set of questions unlocks its evidence when all are answered correctly.
  // "correct" is the index of the right option (0 = א, 1 = ב, 2 = ג, 3 = ד).
  // Evidence can have "image", "video" and/or "text".
  questionSets: [
    {
      evidence: {
        title: "ראיה 2 – נשיאת נשק",
        video: "assets/evidence/evidence1.mp4",
      },
      questions: [
        {
          text: "מהו כלל הבטיחות החשוב ביותר שיש להקפיד עליו גם כאשר נדמה שהנשק אינו טעון?",
          options: [
            "להתייחס לנשק כאל נשק טעון בכל מצב.",
            "להניח שאם לא השתמשו בו לאחרונה הוא אינו מסוכן.",
            "לסמוך על דבריו של מי שמסר את הנשק.",
            "להתייחס לנשק כאל מסוכן רק בזמן אימון.",
          ],
          correct: 0,
        },
        {
          text: "מדוע חשוב לשמור על כיוון בטוח של קנה הנשק?",
          options: [
            "כדי למנוע שריטות בנשק.",
            "כדי למנוע פגיעה באדם במקרה של פליטת כדור.",
            "כדי להקל על נשיאת הנשק.",
            "כדי לשמור על ניקיון הנשק.",
          ],
          correct: 1,
        },
        {
          text: "חייל מקבל נשק מחייל אחר. מה עליו לעשות?",
          options: [
            "להסתמך על כך שהחייל שמסר לו את הנשק כבר בדק אותו.",
            "להניח שהנשק תקין אם הוא נראה תקין מבחוץ.",
            "לפעול לפי נוהל קבלת הנשק והבדיקה שנלמד בצה\"ל, ולא להסתמך על הנחות.",
            "לבדוק רק אם הנשק טעון.",
          ],
          correct: 2,
        },
      ],
    },
  ],

  // Photos go in assets/witnesses/, statement videos in assets/video/.
  // "role" is optional. "desk" is the desk analysis findings.
  witnesses: [
    {
      name: 'איתן "בחור טוב" ברוס',
      photo: "assets/witnesses/witness1.jpg",
      video: "assets/video/witness1.mp4",
      desk: [
        'רישום פלילי: חשוד ברצח של הנמלה המפורסמת "מלכישוע", אך התיק נסגר עקב חוסר ראיות.',
        "עבר מפואר במשפחת הפשע של אפי הנמר.",
        "אוהב לאכול דייסה על דבש וגויאבות.",
      ],
    },
    {
      name: 'עידו "הקצין" רווה',
      photo: "assets/witnesses/witness2.jpg",
      video: "assets/video/witness2.mp4",
      desk: [
        "בעל דוקטורט בהיסטוריה של עצי הברוש של ארץ כנען העתיקה.",
        "שותה קפה עם חמש כפיות מלח.",
        "לא רצה להיות קצין, אבל אמא הכריחה אותו להיות אלוף.",
      ],
    },
    {
      name: 'רן "המלאך" מזרחי',
      photo: "assets/witnesses/witness3.jpg",
      video: "assets/video/witness3.mp4",
      desk: [
        "תרם את כל הכסף שלו לעניים.",
        "בעל בית תמחוי מצליח.",
        "בן אדם זהב. פשוט מלאך.",
      ],
    },
    {
      name: 'איתן "החננה" אנגרט',
      photo: "assets/witnesses/witness4.jpg",
      video: "assets/video/witness4.mp4",
      desk: [
        'סיים 5 יח"ל מתמטיקה בפעוטון.',
        "נולד ברוסיה, יודע שמונה שפות.",
        "זכה במקום שני בתחרות קוביה הונגרית באירופה.",
      ],
    },
    {
      name: 'אופיר "המלכה" אהרון כהן',
      photo: "assets/witnesses/witness5.jpg",
      video: "assets/video/witness5.mp4",
      desk: [
        "נצר לכתר המלוכה הבריטי.",
        "יש לה שומר ראש בשם ג'ורג'.",
        "לא שורדת שעה בלי תה נענע וקמומיל.",
      ],
    },
  ],

  tabDesk: "דסק",
  deskIntro: "בחרו עד כדי להעביר אותו לניתוח דסק",
  deskHeader: "ניתוח דסק // מסווג",
  deskVideo: "assets/video/desk.mp4",
  deskTeam: "הדסקאים האלופים דביר, ליהי והודיה על המקרה",
  deskDurationMs: 5500,
  deskProgressLabel: "מנתח נתונים... {p}%",
  deskResultLabel: "ממצאי ניתוח דסק",
  deskBackButton: "חזרה לרשימת העדים",
  deskDoneLabel: "נותח",
  // {name} is replaced with the witness name.
  deskLog: [
    "> מתחבר למאגר המודיעין המרכזי...",
    "> דביר: SELECT * FROM suspects WHERE name='{name}'",
    "> ליהי: מצליבה נתונים עם מאגר הנמלים הלאומי...",
    "> הודיה: עוקפת חומת אש [##########] OK",
    "> מוריד 400GB של מידע על {name}...",
    "> סורק את האינסטגרם של סבתא שלו...",
    "> ERROR 418: אני קומקום. מנסה שוב...",
    "> דביר: מישהו שתה לי את הקפה?!",
    "> מפענח הצפנה: 0x4D 0x50 0x43 0x49 0x44...",
    "> ליהי: מצאתי משהו!!",
    "> מכין דו\"ח סופי... [OK]",
  ],

  tabCaseFile: "תיק",
  caseFileIntro: "בנו את תיק החקירה. כל מה שתכתבו נשמר אוטומטית.",
  suspectTitle: "חשוד עיקרי",
  suspectLabel: "מי החשוד העיקרי?",
  suspectPlaceholder: "בחרו חשוד...",
  suspectOtherOption: "אחר",
  suspectOtherPlaceholder: "שם החשוד",
  suspectViolationsLabel: "עבירות החשוד",
  witnessStatementLabel: "תמצית העדות",
  witnessViolationsLabel: "עבירות שביצע העד",
  textPlaceholder: "כתבו כאן...",
  shareCaseFileButton: "שיתוף / העתקת התיק",
  copiedFeedback: "התיק הועתק. אפשר להדביק ולשלוח.",
  caseFileExportTitle: "תיק חקירה",
  noAnswer: "-",
};
