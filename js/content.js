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

  caseHeader: "תיק חקירה // עדויות",
  witnessesIntro: "לחצו על כל עד כדי לצפות בעדות שלו",
  statementTitlePrefix: "עדות: ",
  statementMissing: "העדות עדיין לא זמינה",
  watchedLabel: "נצפה",

  // Photos go in assets/witnesses/, statement videos in assets/video/.
  witnesses: [
    { name: "עד 1", role: "תפקיד", photo: "assets/witnesses/witness1.jpg", video: "assets/video/witness1.mp4" },
    { name: "עד 2", role: "תפקיד", photo: "assets/witnesses/witness2.jpg", video: "assets/video/witness2.mp4" },
    { name: "עד 3", role: "תפקיד", photo: "assets/witnesses/witness3.jpg", video: "assets/video/witness3.mp4" },
    { name: "עד 4", role: "תפקיד", photo: "assets/witnesses/witness4.jpg", video: "assets/video/witness4.mp4" },
  ],
};
