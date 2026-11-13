import { policy } from "@/lib/policy";
import { site } from "@/lib/site";
import type { ByLang, Faq } from "./types";

const { deliveryMinDays: min, deliveryMaxDays: max } = policy;
const days = site.returnDays;
const months = site.warrantyMonths;

export const FAQS: ByLang<Faq[]> = {
  en: [
    {
      question: "Are your phones PTA approved?",
      answer: "Many are, and some are not. The PTA status is shown on every phone's page and you choose it when you pick the phone, so you know before you order. You can also check any phone yourself: dial *#06# for the IMEI and send it by SMS to 8484.",
      link: { label: "How to check PTA status", href: "/journal/check-if-a-phone-is-pta-approved" },
    },
    {
      question: "How do I know what condition the phone is in?",
      answer: "Every phone has a grade: Fair, Good, Excellent or Premium. The product page explains what each grade means for the screen, the body and the battery, and shows the battery health.",
      link: { label: "The Trendz Promise", href: "/promise" },
    },
    { question: "What warranty do I get?", answer: `Every device has a ${months}-month warranty against hardware faults, counted from the day it is delivered.`, link: { label: "Warranty claims", href: "/help/warranty" } },
    { question: "Can I return a phone?", answer: `Yes. You have ${days} days from delivery to send it back, as long as it is the same phone, in the condition we sent it and signed out of your accounts.`, link: { label: "Returns & refunds", href: "/help/returns" } },
    { question: "How long does delivery take?", answer: `Most orders arrive in ${min} to ${max} working days after we confirm them by phone. Remote areas can take longer.`, link: { label: "Shipping & delivery", href: "/help/shipping" } },
    { question: "How can I pay?", answer: "Cash on delivery, bank transfer, Easypaisa, JazzCash or card. Checkout shows what is available today and the account details for advance payments.", link: { label: "Cash on delivery", href: "/help/cash-on-delivery" } },
    { question: "Why do you call me after I order?", answer: "To confirm your address and that the order is really yours. We dispatch only after this call, so please keep your phone on." },
    { question: "How do I track my order?", answer: "Open Track my order and enter your order number and the phone number you ordered with.", link: { label: "Track my order", href: "/orders" } },
    { question: "Can I cancel or change my order?", answer: "Yes, before it is dispatched: contact us with your order number. After dispatch you can refuse the parcel at the door or return it within the return period." },
    { question: "Is the phone locked to a previous owner?", answer: "No. We check every phone for Activation Lock, Find My and Google account locks before it is listed, and it is erased and ready for you to set up as new." },
    { question: "Can I trade in my old phone?", answer: "Yes. Tell us about your phone and we will make you an offer.", link: { label: "Trade in your device", href: "/trade-in" } },
  ],
  ur: [
    {
      question: "کیا آپ کے فون PTA اپروو ہیں؟",
      answer: "بہت سے ہیں اور کچھ نہیں۔ PTA کی حیثیت ہر فون کے صفحے پر لکھی ہوتی ہے اور فون چنتے وقت آپ اسے منتخب کرتے ہیں، اس لیے آرڈر سے پہلے ہی آپ کو معلوم ہوتا ہے۔ آپ خود بھی کسی بھی فون کو چیک کر سکتے ہیں: IMEI کے لیے *#06# ڈائل کریں اور اسے SMS کے ذریعے 8484 پر بھیجیں۔",
      link: { label: "PTA کی حیثیت کیسے چیک کریں", href: "/journal/check-if-a-phone-is-pta-approved" },
    },
    {
      question: "مجھے فون کی حالت کا کیسے پتہ چلے گا؟",
      answer: "ہر فون کا ایک گریڈ ہوتا ہے: Fair، Good، Excellent یا Premium۔ پروڈکٹ پیج بتاتا ہے کہ ہر گریڈ کا اسکرین، باڈی اور بیٹری کے لیے کیا مطلب ہے، اور بیٹری ہیلتھ بھی دکھاتا ہے۔",
      link: { label: "ٹرینڈز کا وعدہ", href: "/promise" },
    },
    { question: "مجھے کون سی وارنٹی ملتی ہے؟", answer: `ہر ڈیوائس پر ہارڈویئر کی خرابی کے خلاف ${months} ماہ کی وارنٹی ہے، جو ڈیلیوری کے دن سے شمار ہوتی ہے۔`, link: { label: "وارنٹی کلیم", href: "/help/warranty" } },
    { question: "کیا میں فون واپس کر سکتا ہوں؟", answer: `جی ہاں۔ ڈیلیوری سے ${days} دن کے اندر آپ فون واپس بھیج سکتے ہیں، بشرطیکہ وہی فون ہو، اسی حالت میں جس میں ہم نے بھیجا تھا اور آپ کے اکاؤنٹس سے سائن آؤٹ ہو۔`, link: { label: "واپسی اور ریفنڈ", href: "/help/returns" } },
    { question: "ڈیلیوری میں کتنا وقت لگتا ہے؟", answer: `زیادہ تر آرڈر فون پر کنفرم ہونے کے بعد ${min} سے ${max} ورکنگ دنوں میں پہنچ جاتے ہیں۔ دور دراز علاقوں میں زیادہ وقت لگ سکتا ہے۔`, link: { label: "شپنگ اور ڈیلیوری", href: "/help/shipping" } },
    { question: "میں ادائیگی کیسے کر سکتا ہوں؟", answer: "کیش آن ڈیلیوری، بینک ٹرانسفر، ایزی پیسہ، جاز کیش یا کارڈ۔ چیک آؤٹ پر آج دستیاب طریقے اور پیشگی ادائیگی کے لیے اکاؤنٹ کی تفصیل نظر آتی ہے۔", link: { label: "کیش آن ڈیلیوری", href: "/help/cash-on-delivery" } },
    { question: "آرڈر کے بعد آپ مجھے کال کیوں کرتے ہیں؟", answer: "آپ کا پتہ اور یہ کنفرم کرنے کے لیے کہ آرڈر واقعی آپ کا ہے۔ ہم اس کال کے بعد ہی روانہ کرتے ہیں، اس لیے براہِ کرم اپنا فون آن رکھیں۔" },
    { question: "میں اپنا آرڈر کیسے ٹریک کروں؟", answer: "میرا آرڈر ٹریک کریں کھولیں اور اپنا آرڈر نمبر اور وہ فون نمبر لکھیں جس سے آپ نے آرڈر دیا تھا۔", link: { label: "میرا آرڈر ٹریک کریں", href: "/orders" } },
    { question: "کیا میں آرڈر منسوخ یا تبدیل کر سکتا ہوں؟", answer: "جی ہاں، روانہ ہونے سے پہلے: اپنے آرڈر نمبر کے ساتھ ہم سے رابطہ کریں۔ روانہ ہونے کے بعد آپ دروازے پر پارسل لینے سے انکار کر سکتے ہیں یا واپسی کی مدت میں اسے واپس کر سکتے ہیں۔" },
    { question: "کیا فون پچھلے مالک کے اکاؤنٹ سے لاک ہے؟", answer: "نہیں۔ ہم لسٹ کرنے سے پہلے ہر فون کو Activation Lock، Find My اور گوگل اکاؤنٹ لاک کے لیے چیک کرتے ہیں، اور وہ ایریز ہوتا ہے تاکہ آپ اسے نئے فون کی طرح سیٹ اپ کر سکیں۔" },
    { question: "کیا میں اپنا پرانا فون ٹریڈ اِن کر سکتا ہوں؟", answer: "جی ہاں۔ ہمیں اپنے فون کے بارے میں بتائیں، ہم آپ کو پیشکش دیں گے۔", link: { label: "اپنی ڈیوائس ٹریڈ اِن کریں", href: "/trade-in" } },
  ],
};
