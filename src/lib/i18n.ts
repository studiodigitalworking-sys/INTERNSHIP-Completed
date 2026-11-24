import { cookies } from "next/headers";

export type Lang = "en" | "hi";

const dict = {
  home: { en: "Home", hi: "होम" },
  programmes: { en: "Programmes", hi: "कार्यक्रम" },
  howItWorks: { en: "How it works", hi: "प्रक्रिया" },
  colleges: { en: "For colleges", hi: "कॉलेजों के लिए" },
  organisations: { en: "For organisations", hi: "संस्थाओं के लिए" },
  jobs: { en: "Jobs", hi: "नौकरियाँ" },
  verify: { en: "Verify certificate", hi: "प्रमाणपत्र सत्यापन" },
  faq: { en: "FAQ", hi: "सामान्य प्रश्न" },
  contact: { en: "Contact", hi: "संपर्क" },
  login: { en: "Log in", hi: "लॉग इन" },
  register: { en: "Register", hi: "पंजीकरण" },
  dashboard: { en: "Dashboard", hi: "डैशबोर्ड" },
  logout: { en: "Log out", hi: "लॉग आउट" },
  heroTitle: { en: "Learn · Build · Work · Get certified · Get hired", hi: "सीखें · बनाएं · काम करें · प्रमाणित हों · नौकरी पाएं" },
  heroSub: {
    en: "Supervised, evidence-based internships for students of Mithila and Bihar — with real attendance, real work logs and QR-verifiable certificates.",
    hi: "मिथिला और बिहार के विद्यार्थियों के लिए पर्यवेक्षित, साक्ष्य-आधारित इंटर्नशिप — वास्तविक उपस्थिति, कार्य लॉग और QR-सत्यापन योग्य प्रमाणपत्र के साथ।",
  },
  browse: { en: "Browse programmes", hi: "कार्यक्रम देखें" },
  apply: { en: "Apply now", hi: "अभी आवेदन करें" },
  search: { en: "Search", hi: "खोजें" },
  myApplications: { en: "Applications", hi: "आवेदन" },
  myLearning: { en: "Learning", hi: "पढ़ाई" },
  liveClasses: { en: "Live classes", hi: "लाइव कक्षाएँ" },
  exams: { en: "Exams", hi: "परीक्षाएँ" },
  assignments: { en: "Assignments", hi: "असाइनमेंट" },
  logbook: { en: "Logbook", hi: "लॉगबुक" },
  payments: { en: "Payments", hi: "भुगतान" },
  certificates: { en: "Certificates", hi: "प्रमाणपत्र" },
  support: { en: "Support", hi: "सहायता" },
  profile: { en: "Profile", hi: "प्रोफ़ाइल" },
  notifications: { en: "Notifications", hi: "सूचनाएँ" },
  attendance: { en: "Attendance", hi: "उपस्थिति" },
  documents: { en: "Documents", hi: "दस्तावेज़" },
} as const;

export type DictKey = keyof typeof dict;

export function getLang(): Lang {
  return cookies().get("lang")?.value === "hi" ? "hi" : "en";
}
export function t(key: DictKey, lang: Lang = getLang()) {
  return dict[key][lang];
}
