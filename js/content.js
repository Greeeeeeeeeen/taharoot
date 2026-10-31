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
  questionReward: "בדרך ל{title}",
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
        title: "ראיה 1",
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
    {
      evidence: {
        title: "ראיה 2 – נשיאת נשק",
        video: "assets/evidence/evidence2.mp4",
      },
      questions: [
        {
          text: "מהי האחריות המרכזית של חייל שנושא נשק?",
          options: [
            "לוודא שהנשק נראה מסודר.",
            "לשמור על הנשק, למנוע גישה בלתי מורשית אליו ולפעול לפי הנהלים.",
            "להעביר אותו לחבר כשלא נוח לו לשאת אותו.",
            "לשאת אותו רק כשהוא נמצא ליד מפקד.",
          ],
          correct: 1,
        },
        {
          text: "חייל נמצא בסביבה צפופה שבה יש אנשים רבים. מה חשוב במיוחד להקפיד עליו?",
          options: [
            "להסתובב במהירות כדי לא להפריע לאנשים.",
            "לאפשר לאנשים אחרים להזיז את הנשק אם הוא מפריע.",
            "להקפיד על כיוון בטוח של הקנה ועל כללי הנשיאה שנקבעו.",
            "להניח את הנשק במקום פנוי ללא צורך בהשגחה.",
          ],
          correct: 2,
        },
        {
          text: "חייל שם לב שהנשק שלו אינו נמצא במקום שבו השאיר אותו. מה עליו לעשות?",
          options: [
            "לחפש אותו לבד ולחכות לפני שמדווח.",
            "לשאול חברים אם ראו אותו.",
            "לדווח מיד למפקד ולפעול לפי נוהל אובדן נשק.",
            "להמתין עד סוף היום ולראות אם הנשק יימצא.",
          ],
          correct: 2,
        },
      ],
    },
    {
      evidence: {
        title: "ראיה 3 – בטיחות במטווח",
        video: "assets/evidence/evidence3.mp4",
      },
      questions: [
        {
          text: "במהלך מטווח חייל מבחין שמשהו אינו תקין בנשק שלו. מה עליו לעשות?",
          options: [
            "להמשיך בירי עד סוף המקצה.",
            "לעצור ולפעול לפי הוראות הבטיחות של המדריך והמפקד.",
            "לנסות לפתור את הבעיה בעצמו בלי לדווח.",
            "להחליף נשק עם חייל אחר.",
          ],
          correct: 1,
        },
        {
          text: "מה צריך לעשות כאשר נשמעת פקודת הפסקת אש במטווח?",
          options: [
            "לסיים קודם את מה שהחייל עושה.",
            "להמשיך אם עדיין נשארה תחמושת.",
            "לפעול מיד בהתאם לפקודה ולהוראות המפקד או מנהל המטווח.",
            "להמתין לראות מה עושים שאר החיילים.",
          ],
          correct: 2,
        },
        {
          text: "מדוע אסור להפר את הוראות הבטיחות של מנהל המטווח?",
          options: [
            "כי הדבר עלול ליצור סכנה ממשית ליורים ולסובבים אותם.",
            "כי הדבר גורם לעיכוב בלוח הזמנים בלבד.",
            "כי הדבר פוגע בציון האישי של החייל.",
            "כי רק המפקד רשאי להשתמש בנשק.",
          ],
          correct: 0,
        },
      ],
    },
    {
      evidence: {
        title: "ראיה 4 – אחסון ואחריות",
        video: "assets/evidence/evidence4.mp4",
      },
      questions: [
        {
          text: "מהי המטרה המרכזית של אחסון נשק בהתאם לנהלים?",
          options: [
            "לשמור על המראה החיצוני של הנשק.",
            "למנוע גישה בלתי מורשית ולצמצם סיכונים בטיחותיים.",
            "להקל על מציאת הנשק בלבד.",
            "לחסוך במקום באחסון.",
          ],
          correct: 1,
        },
        {
          text: "חייל מבחין שחברו מתנהל בניגוד לכללי הבטיחות בנשק. מה עליו לעשות?",
          options: [
            "להתעלם, כי כל אחד אחראי רק על הנשק שלו.",
            "להעיר לו רק אם המפקד נמצא בסביבה.",
            "לפעול למניעת הסכנה ולדווח בהתאם לנהלים.",
            "לצלם את האירוע ולשלוח לחברים.",
          ],
          correct: 2,
        },
        {
          text: "חייל מבחין בליקוי באמצעי האבטחה של מקום אחסון הנשק. מה עליו לעשות?",
          options: [
            "להתעלם אם הנשק עדיין נמצא במקום.",
            "לנסות לתקן את הליקוי בעצמו ללא אישור.",
            "לדווח מיד לגורם המוסמך ולפעול בהתאם להנחיות.",
            "לחכות לביקורת הבאה.",
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
  deskTeamPhoto: "assets/desk.jpg",
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
