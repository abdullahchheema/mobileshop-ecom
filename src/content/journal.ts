import type { Article, ByLang } from "./types";

// The tech journal: practical guides for buyers and sellers of used and refurbished phones. Facts that depend on rules or portals which can change
// (PTA registration, fees) are described in general terms and point to the official source.

export const ARTICLES: ByLang<Article[]> = {
  en: [
    {
      slug: "check-if-a-phone-is-pta-approved",
      minutes: 3,
      title: "How to check if a phone is PTA approved",
      excerpt: "Two minutes and an IMEI number are all you need to know whether a phone is approved for Pakistani networks.",
      blocks: [
        {
          paragraphs: [
            "PTA approval means a phone's IMEI is registered with the Pakistan Telecommunication Authority, so it works on local networks. A phone that is not registered can be blocked. Checking takes two minutes, and you can do it for any phone, from any seller.",
          ],
        },
        {
          heading: "Step 1: find the IMEI",
          paragraphs: ["Dial *#06# on the phone. It shows a 15-digit IMEI. Dual-SIM phones show two. You can also find it in Settings, under About."],
        },
        {
          heading: "Step 2: check it with PTA",
          list: [
            "Send the 15-digit IMEI as an SMS to 8484. A small charge may apply.",
            "Or enter it on the PTA's Device Verification System (DVS) website, dvs.pta.gov.pk.",
            "Or use the DVS app on Android.",
          ],
          paragraphs: ["On a dual-SIM phone, check both IMEIs."],
        },
        {
          heading: "What the answer means",
          list: [
            "Compliant or PTA approved: the phone is registered and will work on Pakistani networks.",
            "Non-compliant or blocked: the phone is not registered, or has been blocked, and may not work on local networks.",
          ],
        },
        {
          heading: "What about non-PTA phones?",
          paragraphs: [
            "A non-PTA phone is often cheaper. It can usually be registered by paying the applicable duty and taxes, which changes the real cost. Rules, fees and portals change over time, so confirm the current process on the PTA's own site (dirbs.pta.gov.pk) before you decide.",
            "On our site, the PTA status is shown on every phone, and you can filter for PTA-approved phones only.",
          ],
          links: [{ label: "Browse phones", href: "/l/phones" }],
        },
      ],
    },
    {
      slug: "what-refurbished-means",
      minutes: 3,
      title: "Refurbished, used and new: what the labels mean",
      excerpt: "The word refurbished means different things to different sellers. Here is what to ask, so you know what you are buying.",
      blocks: [
        {
          paragraphs: ["Three words cover most of the phone market, and they are not as clear as they look."],
        },
        {
          heading: "New",
          paragraphs: ["Never used, in its original sealed box. It costs the most."],
        },
        {
          heading: "Used",
          paragraphs: ["Owned and used before. It is often sold as it is, with no checks and no warranty. The price is low because the risk is yours."],
        },
        {
          heading: "Refurbished",
          paragraphs: [
            "A used phone that has been inspected, tested, repaired where needed and cleaned, and is sold with a warranty. Done well, it is the safe way to pay less. But the word has no fixed meaning, so a seller can use it for almost anything.",
          ],
        },
        {
          heading: "Five questions to ask any seller",
          steps: [
            "Who inspected the phone, and what exactly was tested?",
            "What is the warranty, and who honours it?",
            "Can I return it, and for how long?",
            "Is the battery health stated?",
            "Is the PTA status stated, and is the phone free of any account lock?",
          ],
          paragraphs: ["If a seller cannot answer all five, think twice."],
          links: [{ label: "The Trendz Promise", href: "/promise" }],
        },
      ],
    },
    {
      slug: "eight-checks-before-buying-a-used-phone",
      minutes: 4,
      title: "Eight checks before you buy a used or refurbished phone",
      excerpt: "A short checklist that catches most problems, from locked accounts to tired batteries.",
      blocks: [
        {
          paragraphs: ["Whoever you buy from, run through these checks when the phone arrives. Most take under a minute."],
        },
        {
          heading: "1. PTA status and IMEI",
          paragraphs: ["Dial *#06#, note the IMEI and check it with PTA."],
          links: [{ label: "How to check PTA status", href: "/journal/check-if-a-phone-is-pta-approved" }],
        },
        {
          heading: "2. Account locks",
          paragraphs: [
            "An iPhone must start on the Hello screen, not on \"iPhone Locked to Owner\", and Find My must be off. An Android phone must not ask for the previous owner's Google account after a reset. A phone still tied to someone else's account is a brick.",
          ],
        },
        {
          heading: "3. Battery health",
          paragraphs: [
            "On an iPhone open Settings, Battery, Battery Health & Charging and read Maximum Capacity. Below about 80% Apple suggests a battery service, so that is the line many buyers draw. On Android, a battery test in the phone's care or diagnostics menu, or an app, gives an estimate.",
          ],
        },
        {
          heading: "4. Screen and body",
          paragraphs: ["Look at the screen with a white and a black background for dead pixels, marks and burn-in. Run a finger over every part of it to test touch. Check the frame and back for bends and cracks."],
        },
        {
          heading: "5. Cameras, sound and buttons",
          paragraphs: ["Take photos with the front and back cameras, record a short video, make a call on speaker, and press every button. Plug in the charger and make sure it charges."],
        },
        {
          heading: "6. SIM and network",
          paragraphs: ["Put in your SIM and check for signal and mobile data. On an iPhone, Settings, General, About should say there are no SIM restrictions: it is not locked to a carrier."],
        },
        {
          heading: "7. Face ID, fingerprint and sensors",
          paragraphs: ["Set up Face ID or a fingerprint. Rotate the screen and move the phone to check the sensors."],
        },
        {
          heading: "8. Warranty and returns, in writing",
          paragraphs: ["Know the warranty period and the return window before you pay, and keep the order number. If anything above fails, contact the seller straight away: the return period is short."],
          links: [
            { label: "Returns & refunds", href: "/help/returns" },
            { label: "Warranty claims", href: "/help/warranty" },
          ],
        },
      ],
    },
    {
      slug: "prepare-your-phone-for-trade-in",
      minutes: 3,
      title: "How to prepare your phone for trade-in or sale",
      excerpt: "Do these in the right order and your data goes with you, not with the phone.",
      blocks: [
        {
          paragraphs: ["Before a phone changes hands, it should hold none of your data and none of your accounts. The order matters, especially on iPhone."],
        },
        {
          heading: "1. Back up",
          paragraphs: ["Back up what you want to keep to iCloud, Google or your computer, and check the backup finished."],
        },
        {
          heading: "2. Sign out of your accounts",
          list: [
            "iPhone: Settings, tap your name, Sign Out. This turns off Find My and releases Activation Lock. Do this before erasing.",
            "Android: remove your Google account in Settings, under Accounts, before resetting. This switches off the protection that locks a phone to its last Google account. On Samsung phones remove the Samsung account too.",
          ],
        },
        {
          heading: "3. Unpair and remove",
          paragraphs: ["Unpair your watch, earbuds and other Bluetooth accessories. Remove cards from your wallet app."],
        },
        {
          heading: "4. Erase the phone",
          paragraphs: ["iPhone: Settings, General, Transfer or Reset iPhone, Erase All Content and Settings. Android: Settings, System, Reset options, Erase all data (factory reset)."],
        },
        {
          heading: "5. Take out the SIM and memory card",
          paragraphs: ["Remove both, and keep them."],
        },
        {
          heading: "Already handed it over?",
          paragraphs: ["If you forgot to sign out, you can still erase and remove the phone from your account at icloud.com/find for an iPhone, or from your Google account's device list for Android."],
          links: [{ label: "Trade in your device", href: "/trade-in" }],
        },
      ],
    },
  ],

  ur: [
    {
      slug: "check-if-a-phone-is-pta-approved",
      minutes: 3,
      title: "فون PTA اپروو ہے یا نہیں، کیسے چیک کریں",
      excerpt: "یہ جاننے کے لیے کہ فون پاکستانی نیٹ ورکس کے لیے منظور شدہ ہے، صرف دو منٹ اور ایک IMEI نمبر چاہیے۔",
      blocks: [
        {
          paragraphs: [
            "PTA اپروول کا مطلب ہے کہ فون کا IMEI پاکستان ٹیلی کمیونیکیشن اتھارٹی کے پاس رجسٹر ہے، اس لیے وہ مقامی نیٹ ورکس پر چلتا ہے۔ جو فون رجسٹر نہ ہو وہ بلاک ہو سکتا ہے۔ چیک کرنے میں دو منٹ لگتے ہیں، اور آپ یہ کسی بھی فروخت کنندہ کے کسی بھی فون کے لیے کر سکتے ہیں۔",
          ],
        },
        {
          heading: "پہلا مرحلہ: IMEI تلاش کریں",
          paragraphs: ["فون پر *#06# ڈائل کریں۔ یہ 15 ہندسوں کا IMEI دکھاتا ہے۔ دو سم والے فون دو دکھاتے ہیں۔ آپ اسے سیٹنگز میں About کے تحت بھی دیکھ سکتے ہیں۔"],
        },
        {
          heading: "دوسرا مرحلہ: PTA سے چیک کریں",
          list: [
            "15 ہندسوں کا IMEI SMS کے ذریعے 8484 پر بھیجیں۔ معمولی چارجز لگ سکتے ہیں۔",
            "یا اسے PTA کی ڈیوائس ویریفکیشن سسٹم (DVS) ویب سائٹ dvs.pta.gov.pk پر درج کریں۔",
            "یا اینڈرائیڈ پر DVS ایپ استعمال کریں۔",
          ],
          paragraphs: ["دو سم والے فون میں دونوں IMEI چیک کریں۔"],
        },
        {
          heading: "جواب کا مطلب",
          list: [
            "Compliant یا PTA approved: فون رجسٹر ہے اور پاکستانی نیٹ ورکس پر چلے گا۔",
            "Non-compliant یا blocked: فون رجسٹر نہیں ہے یا بلاک ہو چکا ہے، اور ممکن ہے مقامی نیٹ ورکس پر نہ چلے۔",
          ],
        },
        {
          heading: "نان PTA فون کا کیا؟",
          paragraphs: [
            "نان PTA فون اکثر سستا ہوتا ہے۔ اسے عموماً لاگو ڈیوٹی اور ٹیکس ادا کر کے رجسٹر کروایا جا سکتا ہے، جس سے اصل لاگت بدل جاتی ہے۔ اصول، فیس اور پورٹل وقت کے ساتھ بدلتے رہتے ہیں، اس لیے فیصلہ کرنے سے پہلے موجودہ طریقہ PTA کی اپنی سائٹ (dirbs.pta.gov.pk) پر دیکھ لیں۔",
            "ہماری سائٹ پر ہر فون کی PTA حیثیت لکھی ہوتی ہے، اور آپ صرف PTA اپروو شدہ فون فلٹر بھی کر سکتے ہیں۔",
          ],
          links: [{ label: "فون دیکھیں", href: "/l/phones" }],
        },
      ],
    },
    {
      slug: "what-refurbished-means",
      minutes: 3,
      title: "ری فربشڈ، استعمال شدہ اور نیا: ان الفاظ کا مطلب",
      excerpt: "ری فربشڈ کا لفظ مختلف فروخت کنندگان کے لیے مختلف معنی رکھتا ہے۔ یہ پوچھنے کی باتیں ہیں تاکہ آپ کو معلوم ہو کہ آپ کیا خرید رہے ہیں۔",
      blocks: [
        {
          paragraphs: ["فون کی مارکیٹ زیادہ تر تین الفاظ میں بٹی ہوئی ہے، اور وہ اتنے واضح نہیں جتنے لگتے ہیں۔"],
        },
        {
          heading: "نیا",
          paragraphs: ["کبھی استعمال نہیں ہوا، اپنے اصل سیل بند ڈبے میں۔ یہ سب سے مہنگا ہوتا ہے۔"],
        },
        {
          heading: "استعمال شدہ",
          paragraphs: ["پہلے کسی کی ملکیت میں رہا اور استعمال ہوا۔ اکثر جیسا ہے ویسا بیچا جاتا ہے، بغیر چیکنگ اور بغیر وارنٹی کے۔ قیمت اس لیے کم ہوتی ہے کہ خطرہ آپ کا ہے۔"],
        },
        {
          heading: "ری فربشڈ",
          paragraphs: [
            "ایسا استعمال شدہ فون جسے چیک کیا گیا، ٹیسٹ کیا گیا، جہاں ضرورت تھی مرمت کی گئی اور صاف کیا گیا، اور وارنٹی کے ساتھ بیچا جاتا ہے۔ اگر اچھی طرح کیا جائے تو یہ کم پیسوں میں محفوظ طریقہ ہے۔ لیکن اس لفظ کا کوئی مقررہ مطلب نہیں، اس لیے فروخت کنندہ اسے تقریباً ہر چیز کے لیے استعمال کر سکتا ہے۔",
          ],
        },
        {
          heading: "ہر فروخت کنندہ سے پوچھنے کے پانچ سوال",
          steps: [
            "فون کس نے چیک کیا، اور بالکل کیا ٹیسٹ ہوا؟",
            "وارنٹی کیا ہے، اور اسے کون پورا کرتا ہے؟",
            "کیا میں واپس کر سکتا ہوں، اور کتنی مدت تک؟",
            "کیا بیٹری ہیلتھ بتائی گئی ہے؟",
            "کیا PTA کی حیثیت بتائی گئی ہے، اور کیا فون کسی اکاؤنٹ لاک سے پاک ہے؟",
          ],
          paragraphs: ["اگر فروخت کنندہ پانچوں کا جواب نہ دے سکے تو دوبارہ سوچیں۔"],
          links: [{ label: "ٹرینڈز کا وعدہ", href: "/promise" }],
        },
      ],
    },
    {
      slug: "eight-checks-before-buying-a-used-phone",
      minutes: 4,
      title: "استعمال شدہ یا ری فربشڈ فون خریدنے سے پہلے آٹھ چیکس",
      excerpt: "ایک مختصر فہرست جو لاک اکاؤنٹس سے لے کر تھکی ہوئی بیٹریوں تک زیادہ تر مسائل پکڑ لیتی ہے۔",
      blocks: [
        {
          paragraphs: ["آپ جس سے بھی خریدیں، فون ملنے پر یہ چیکس کر لیں۔ زیادہ تر میں ایک منٹ سے کم لگتا ہے۔"],
        },
        {
          heading: "1۔ PTA کی حیثیت اور IMEI",
          paragraphs: ["*#06# ڈائل کریں، IMEI لکھ لیں اور اسے PTA سے چیک کریں۔"],
          links: [{ label: "PTA کی حیثیت کیسے چیک کریں", href: "/journal/check-if-a-phone-is-pta-approved" }],
        },
        {
          heading: "2۔ اکاؤنٹ لاک",
          paragraphs: [
            "آئی فون کو Hello اسکرین پر شروع ہونا چاہیے، \"iPhone Locked to Owner\" پر نہیں، اور Find My بند ہونا چاہیے۔ اینڈرائیڈ فون ری سیٹ کے بعد پچھلے مالک کا گوگل اکاؤنٹ نہیں مانگنا چاہیے۔ جو فون کسی اور کے اکاؤنٹ سے بندھا ہو وہ بیکار ہے۔",
          ],
        },
        {
          heading: "3۔ بیٹری ہیلتھ",
          paragraphs: [
            "آئی فون میں Settings، Battery، Battery Health & Charging کھول کر Maximum Capacity پڑھیں۔ تقریباً 80 فیصد سے کم پر ایپل بیٹری سروس تجویز کرتا ہے، اس لیے بہت سے خریدار یہی حد رکھتے ہیں۔ اینڈرائیڈ پر فون کے کیئر یا ڈائگنوسٹکس مینو میں بیٹری ٹیسٹ، یا کوئی ایپ، اندازہ دے دیتی ہے۔",
          ],
        },
        {
          heading: "4۔ اسکرین اور باڈی",
          paragraphs: ["اسکرین کو سفید اور کالے بیک گراؤنڈ پر دیکھیں تاکہ ڈیڈ پکسل، نشان اور برن اِن نظر آئیں۔ ٹچ ٹیسٹ کرنے کے لیے انگلی پوری اسکرین پر پھیریں۔ فریم اور پشت پر موڑ اور دراڑیں دیکھیں۔"],
        },
        {
          heading: "5۔ کیمرے، آواز اور بٹن",
          paragraphs: ["آگے اور پیچھے کے کیمرے سے تصاویر لیں، مختصر ویڈیو بنائیں، اسپیکر پر کال کریں اور ہر بٹن دبائیں۔ چارجر لگائیں اور دیکھیں کہ چارج ہو رہا ہے۔"],
        },
        {
          heading: "6۔ سم اور نیٹ ورک",
          paragraphs: ["اپنی سم ڈالیں اور سگنل اور موبائل ڈیٹا دیکھیں۔ آئی فون میں Settings، General، About میں لکھا ہونا چاہیے کہ کوئی SIM restrictions نہیں: یعنی وہ کسی کیریئر سے لاک نہیں۔"],
        },
        {
          heading: "7۔ Face ID، فنگر پرنٹ اور سینسرز",
          paragraphs: ["Face ID یا فنگر پرنٹ سیٹ اپ کریں۔ سینسرز چیک کرنے کے لیے اسکرین گھمائیں اور فون کو ہلائیں۔"],
        },
        {
          heading: "8۔ وارنٹی اور واپسی، تحریری طور پر",
          paragraphs: ["ادائیگی سے پہلے وارنٹی کی مدت اور واپسی کی مہلت جان لیں، اور آرڈر نمبر سنبھال کر رکھیں۔ اگر اوپر کی کوئی چیز ناکام ہو تو فوراً فروخت کنندہ سے رابطہ کریں: واپسی کی مدت مختصر ہوتی ہے۔"],
          links: [
            { label: "واپسی اور ریفنڈ", href: "/help/returns" },
            { label: "وارنٹی کلیم", href: "/help/warranty" },
          ],
        },
      ],
    },
    {
      slug: "prepare-your-phone-for-trade-in",
      minutes: 3,
      title: "ٹریڈ اِن یا فروخت کے لیے اپنا فون کیسے تیار کریں",
      excerpt: "انہیں صحیح ترتیب سے کریں تو آپ کا ڈیٹا آپ کے ساتھ جائے گا، فون کے ساتھ نہیں۔",
      blocks: [
        {
          paragraphs: ["فون کے ہاتھ بدلنے سے پہلے اس میں آپ کا کوئی ڈیٹا اور کوئی اکاؤنٹ نہیں ہونا چاہیے۔ ترتیب اہم ہے، خاص طور پر آئی فون پر۔"],
        },
        {
          heading: "1۔ بیک اپ لیں",
          paragraphs: ["جو رکھنا چاہتے ہیں اس کا بیک اپ iCloud، گوگل یا اپنے کمپیوٹر پر لے لیں، اور دیکھ لیں کہ بیک اپ مکمل ہو گیا۔"],
        },
        {
          heading: "2۔ اپنے اکاؤنٹس سے سائن آؤٹ کریں",
          list: [
            "آئی فون: Settings میں اپنے نام پر ٹیپ کریں، Sign Out۔ اس سے Find My بند ہوتا ہے اور Activation Lock ہٹ جاتا ہے۔ ایریز کرنے سے پہلے یہ کریں۔",
            "اینڈرائیڈ: ری سیٹ سے پہلے Settings میں Accounts کے تحت اپنا گوگل اکاؤنٹ ہٹا دیں۔ اس سے وہ تحفظ بند ہوتا ہے جو فون کو اس کے آخری گوگل اکاؤنٹ سے لاک رکھتا ہے۔ سام سنگ فون پر سام سنگ اکاؤنٹ بھی ہٹا دیں۔",
          ],
        },
        {
          heading: "3۔ ان پیئر کریں اور ہٹائیں",
          paragraphs: ["اپنی گھڑی، ایئر بڈز اور دیگر بلوٹوتھ ایکسیسریز ان پیئر کریں۔ والٹ ایپ سے کارڈ ہٹا دیں۔"],
        },
        {
          heading: "4۔ فون ایریز کریں",
          paragraphs: ["آئی فون: Settings، General، Transfer or Reset iPhone، Erase All Content and Settings۔ اینڈرائیڈ: Settings، System، Reset options، Erase all data (فیکٹری ری سیٹ)۔"],
        },
        {
          heading: "5۔ سم اور میموری کارڈ نکالیں",
          paragraphs: ["دونوں نکال لیں اور اپنے پاس رکھیں۔"],
        },
        {
          heading: "فون دے چکے ہیں؟",
          paragraphs: ["اگر سائن آؤٹ کرنا بھول گئے ہوں تو آئی فون کو icloud.com/find سے، یا اینڈرائیڈ کو اپنے گوگل اکاؤنٹ کی ڈیوائس لسٹ سے، اب بھی ایریز کر کے اپنے اکاؤنٹ سے ہٹا سکتے ہیں۔"],
          links: [{ label: "اپنی ڈیوائس ٹریڈ اِن کریں", href: "/trade-in" }],
        },
      ],
    },
  ],
};
