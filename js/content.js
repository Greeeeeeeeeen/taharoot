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
        image: "assets/evidence/evidence2.jpg",
        text: "",
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
  witnesses: [
    { name: "עד 1", role: "תפקיד", photo: "assets/witnesses/witness1.jpg", video: "assets/video/witness1.mp4" },
    { name: "עד 2", role: "תפקיד", photo: "assets/witnesses/witness2.jpg", video: "assets/video/witness2.mp4" },
    { name: "עד 3", role: "תפקיד", photo: "assets/witnesses/witness3.jpg", video: "assets/video/witness3.mp4" },
    { name: "עד 4", role: "תפקיד", photo: "assets/witnesses/witness4.jpg", video: "assets/video/witness4.mp4" },
  ],
};
