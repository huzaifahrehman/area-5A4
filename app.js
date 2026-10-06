import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  update,
  runTransaction,
  push,
  onValue,
  query,
  orderByChild,
  equalTo
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBWm61W_ooUuhsWeRWSIvqne30A_HrGONs",
  authDomain: "area-17688.firebaseapp.com",
  databaseURL: "https://area-17688-default-rtdb.firebaseio.com",
  projectId: "area-17688",
  storageBucket: "area-17688.firebasestorage.app",
  messagingSenderId: "1095855929846",
  appId: "1:1095855929846:web:04a32120c2d7e52965afd7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

let currentUser = null;
let userData = null;
let currentSettings = {};
let currentPayment = null;
let residentPaymentLoaded = false;
let residentPaymentRecords = {};
let adminUsers = {};
let adminPayments = {};
let adminCurrentFees = [];
let adminComplaints = {};
let residentComplaints = {};
let announcements = {};
let adminResidentEntries = [];
let unsubscribeListeners = [];
let reminderTimer = null;
let cleanupTimer = null;
let cleanupInitialTimer = null;
let cleanupInProgress = false;
let activeBillingPeriodKey = null;
let language = localStorage.getItem('mohalla-language') || 'en';
const sourceTextNodes = new WeakMap();
const sourcePlaceholders = new WeakMap();

const translations = {
  'Mohalla Committee': { ur: 'محلہ کمیٹی', roman: 'Mohalla Committee' },
  'Community portal': { ur: 'کمیونٹی پورٹل', roman: 'Community portal' },
  'YOUR NEIGHBOURHOOD, CONNECTED': { ur: 'آپ کے محلے کا رابطہ', roman: 'Aap ke mohallay ka rabta' },
  'Welcome to your Mohalla portal.': { ur: 'آپ کے محلہ پورٹل میں خوش آمدید۔', roman: 'Apne Mohalla portal mein khush aamdeed.' },
  'Check your monthly committee fee, follow community issues, and stay connected with your committee.': { ur: 'ماہانہ فیس دیکھیں، محلے کے مسائل کی پیش رفت جانیں، اور کمیٹی سے رابطے میں رہیں۔', roman: 'Mahina fee dekhein, mohallay ke masail ki progress jaanain, aur committee se rabtay mein rahain.' },
  'Simple sign-in with your house number': { ur: 'صرف گھر کے نمبر سے آسان لاگ اِن', roman: 'Sirf ghar ke number se asaan login' },
  'MEMBER ACCESS': { ur: 'رہائشی رسائی', roman: 'Rehaishi access' },
  'Sign in': { ur: 'لاگ اِن کریں', roman: 'Login karein' },
  'Residents: enter only your house number and password. We add @area17688.com automatically.': { ur: 'رہائشی صرف گھر نمبر اور پاس ورڈ درج کریں۔ @area17688.com خود شامل ہو جائے گا۔', roman: 'Rehaishi sirf ghar number aur password likhein. @area17688.com khud lag jayega.' },
  'House number': { ur: 'گھر نمبر', roman: 'Ghar number' },
  'Password': { ur: 'پاس ورڈ', roman: 'Password' },
  'Committee admins may sign in with their admin email.': { ur: 'کمیٹی ایڈمن اپنے ایڈمن ای میل سے لاگ اِن کریں۔', roman: 'Committee admin apni admin email se login karein.' },
  'Need help or forgot your password? Call ': { ur: 'مدد چاہیے یا پاس ورڈ بھول گئے؟ کال کریں ', roman: 'Madad chahiye ya password bhool gaye? Call karein ' },
  '0340 1244638': { ur: '0340 1244638', roman: '0340 1244638' },
  'New to the portal?': { ur: 'نئے صارف ہیں؟', roman: 'Portal par naye hain?' },
  'Create an account': { ur: 'اکاؤنٹ بنائیں', roman: 'Account banayein' },
  'JOIN YOUR MOHALLA': { ur: 'اپنے محلے میں شامل ہوں', roman: 'Apne mohallay mein shamil hon' },
  'Create your account': { ur: 'اپنا اکاؤنٹ بنائیں', roman: 'Apna account banayein' },
  'Your name': { ur: 'آپ کا نام', roman: 'Aap ka naam' },
  'Mobile number': { ur: 'موبائل نمبر', roman: 'Mobile number' },
  'Already registered?': { ur: 'پہلے سے رجسٹرڈ ہیں؟', roman: 'Pehle se registered hain?' },
  'Back to sign in': { ur: 'لاگ اِن پر واپس', roman: 'Login par wapas' },
  'Sign out': { ur: 'لاگ آؤٹ', roman: 'Logout' },
  'RESIDENT PORTAL': { ur: 'رہائشی پورٹل', roman: 'Rehaishi portal' },
  'Resident': { ur: 'رہائشی', roman: 'Rehaishi' },
  'Overview': { ur: 'جائزہ', roman: 'Jaiza' },
  'Monthly fees': { ur: 'ماہانہ فیس', roman: 'Mahina fees' },
  'My complaints': { ur: 'میری شکایات', roman: 'Meri shikayaat' },
  'Settings': { ur: 'ترتیبات', roman: 'Settings' },
  'THIS MONTH': { ur: 'اس ماہ', roman: 'Is mah' },
  'Monthly committee fee': { ur: 'ماہانہ کمیٹی فیس', roman: 'Mahina committee fee' },
  'Pay this month’s fee': { ur: 'اس ماہ کی فیس ادا کریں', roman: 'Is mah ki fee ada karein' },
  'Report a community issue': { ur: 'محلے کا مسئلہ رپورٹ کریں', roman: 'Mohallay ka masla report karein' },
  'Your complaint updates': { ur: 'آپ کی شکایات کی تازہ معلومات', roman: 'Aap ki shikayaat ki taaza maloomat' },
  'See all': { ur: 'سب دیکھیں', roman: 'Sab dekhein' },
  'Community notices': { ur: 'کمیونٹی اعلانات', roman: 'Community elanaat' },
  'Pay your Mohalla committee fee': { ur: 'محلہ کمیٹی کی فیس ادا کریں', roman: 'Mohalla committee ki fee ada karein' },
  'Transaction / reference ID': { ur: 'ٹرانزیکشن / حوالہ نمبر', roman: 'Transaction / hawala number' },
  'Payment screenshot': { ur: 'ادائیگی کا اسکرین شاٹ', roman: 'Payment ka screenshot' },
  'Your sending phone number': { ur: 'آپ کا بھیجنے والا فون نمبر', roman: 'Aap ka payment bhejne wala phone number' },
  'Send for admin verification': { ur: 'ایڈمن کی تصدیق کے لیے بھیجیں', roman: 'Admin ki tasdeeq ke liye bhejein' },
  'Past monthly fees': { ur: 'گزشتہ ماہانہ فیس', roman: 'Pichli mahina fees' },
  'Report an issue': { ur: 'مسئلہ رپورٹ کریں', roman: 'Masla report karein' },
  'Issue type': { ur: 'مسئلے کی قسم', roman: 'Maslay ki qisam' },
  'What happened and where?': { ur: 'کیا ہوا اور کہاں؟', roman: 'Kya hua aur kahan?' },
  'Photo of the issue': { ur: 'مسئلے کی تصویر', roman: 'Maslay ki tasveer' },
  'Add a clear photo from your camera or gallery. The image is resized before saving.': { ur: 'کیمرے یا گیلری سے واضح تصویر شامل کریں۔ محفوظ کرنے سے پہلے تصویر کا سائز کم ہوگا۔', roman: 'Camera ya gallery se saaf tasveer lagayein. Save se pehle tasveer ka size kam hoga.' },
  'My complaints': { ur: 'میری شکایات', roman: 'Meri shikayaat' },
  'Recent complaint updates': { ur: 'حالیہ شکایات کی پیش رفت', roman: 'Haliya shikayaat ki progress' },
  'Your complaint updates will appear here.': { ur: 'آپ کی شکایات کی پیش رفت یہاں نظر آئے گی۔', roman: 'Aap ki shikayaat ki progress yahan nazar aaye gi.' },
  'YOUR COMPLAINTS': { ur: 'آپ کی شکایات', roman: 'Aap ki shikayaat' },
  'YOUR REPORTS': { ur: 'آپ کی رپورٹس', roman: 'Aap ki reports' },
  'Only you and the committee admin can see your complaint details and photos.': { ur: 'آپ کی شکایت کی تفصیل اور تصاویر صرف آپ اور کمیٹی ایڈمن دیکھ سکتے ہیں۔', roman: 'Aap ki complaint ki tafseel aur tasveer sirf aap aur committee admin dekh sakte hain.' },
  'Submit complaint': { ur: 'شکایت جمع کریں', roman: 'Shikayat jama karein' },
  'Language and reminders': { ur: 'زبان اور یاددہانیاں', roman: 'Zaban aur reminders' },
  'Portal language': { ur: 'پورٹل کی زبان', roman: 'Portal ki zaban' },
  'Monthly fee reminder': { ur: 'ماہانہ فیس کی یاددہانی', roman: 'Mahina fee reminder' },
  'Enable reminders': { ur: 'یاددہانی فعال کریں', roman: 'Reminder chalu karein' },
  'COMMITTEE PORTAL': { ur: 'کمیٹی پورٹل', roman: 'Committee portal' },
  'Admin dashboard': { ur: 'ایڈمن ڈیش بورڈ', roman: 'Admin dashboard' },
  'Administrator': { ur: 'منتظم', roman: 'Administrator' },
  'Complaints': { ur: 'شکایات', roman: 'Shikayaat' },
  'Households': { ur: 'گھرانے', roman: 'Gharanay' },
  'Fee review': { ur: 'فیس کا جائزہ', roman: 'Fee ka jaiza' },
  'News': { ur: 'خبریں', roman: 'Khabrein' },
  'Registered households': { ur: 'رجسٹرڈ گھرانے', roman: 'Registered gharanay' },
  'Search by house number, owner, or phone': { ur: 'گھر نمبر، مالک یا فون سے تلاش کریں', roman: 'Ghar number, malik ya phone se talash karein' },
  'Search households': { ur: 'گھرانے تلاش کریں', roman: 'Gharanay talash karein' },
  'Monthly fee review': { ur: 'ماہانہ فیس کا جائزہ', roman: 'Mahina fee ka jaiza' },
  'Awaiting review': { ur: 'جائزے کے منتظر', roman: 'Jaizay ke muntazir' },
  'This month by household': { ur: 'اس ماہ گھرانوں کی فیس', roman: 'Is mah gharanon ki fee' },
  'Payment history': { ur: 'ادائیگی کی تاریخ', roman: 'Payment history' },
  'SHARE AN UPDATE': { ur: 'اپ ڈیٹ شیئر کریں', roman: 'Update share karein' },
  'Post a community notice': { ur: 'کمیونٹی اعلان شائع کریں', roman: 'Community elaan publish karein' },
  'Title': { ur: 'عنوان', roman: 'Unwan' },
  'Information': { ur: 'معلومات', roman: 'Maloomat' },
  'Publish notice': { ur: 'اعلان شائع کریں', roman: 'Elaan publish karein' },
  'NOTICEBOARD': { ur: 'اعلاناتی بورڈ', roman: 'Noticeboard' },
  'Published notices': { ur: 'شائع شدہ اعلانات', roman: 'Shaya shuda elanaat' },
  'Choose a language': { ur: 'زبان منتخب کریں', roman: 'Zaban chunein' },
  'English': { ur: 'انگریزی', roman: 'English' },
  'Water supply': { ur: 'پانی کی فراہمی', roman: 'Pani ki farahmi' },
  'Garbage / sanitation': { ur: 'کچرا / صفائی', roman: 'Kachra / safai' },
  'Sewerage / drainage': { ur: 'سیوریج / نکاسی', roman: 'Sewerage / nikasi' },
  'Streetlight': { ur: 'اسٹریٹ لائٹ', roman: 'Street light' },
  'Roads / pathways': { ur: 'سڑکیں / راستے', roman: 'Sarkein / rastay' },
  'Other': { ur: 'دیگر', roman: 'Doosra' },
  'pending': { ur: 'زیرِ التوا', roman: 'Pending' },
  'in progress': { ur: 'کام جاری ہے', roman: 'Kaam jaari hai' },
  'solved': { ur: 'حل ہو گیا', roman: 'Hal ho gaya' },
  'paid': { ur: 'ادا شدہ', roman: 'Ada shuda' },
  'unpaid': { ur: 'غیر ادا شدہ', roman: 'Ada nahi hui' },
  'rejected': { ur: 'مسترد', roman: 'Mustarad' },
  'Payment due': { ur: 'فیس واجب الادا', roman: 'Fee ada karni hai' },
  'Verify and approve': { ur: 'تصدیق کر کے منظور کریں', roman: 'Tasdeeq karke manzoor karein' },
  'Reject': { ur: 'مسترد کریں', roman: 'Mustarad karein' },
  'View screenshot': { ur: 'اسکرین شاٹ دیکھیں', roman: 'Screenshot dekhein' },
  'View complaint photo': { ur: 'شکایت کی تصویر دیکھیں', roman: 'Complaint ki tasveer dekhein' },
  'Open full-size photo': { ur: 'مکمل سائز کی تصویر کھولیں', roman: 'Full-size tasveer kholein' },
  'Preparing photo…': { ur: 'تصویر تیار ہو رہی ہے…', roman: 'Tasveer tayyar ho rahi hai…' },
  'Open full-size screenshot': { ur: 'مکمل سائز کا اسکرین شاٹ کھولیں', roman: 'Full-size screenshot kholein' },
  'Start work': { ur: 'کام شروع کریں', roman: 'Kaam shuru karein' },
  'Mark solved': { ur: 'حل شدہ نشان لگائیں', roman: 'Hal shuda mark karein' },
  'Reminders enabled': { ur: 'یاددہانی فعال ہے', roman: 'Reminder chalu hai' },
  'No payment notices are waiting for verification.': { ur: 'تصدیق کے لیے کوئی ادائیگی منتظر نہیں۔', roman: 'Tasdeeq ke liye koi payment intezar mein nahi.' },
  'There are no payment records yet.': { ur: 'ابھی ادائیگی کا کوئی ریکارڈ نہیں۔', roman: 'Abhi payment ka koi record nahi.' },
  'No complaints have been submitted.': { ur: 'ابھی کوئی شکایت جمع نہیں ہوئی۔', roman: 'Abhi koi shikayat jama nahi hui.' },
  'No community updates yet.': { ur: 'ابھی کمیونٹی کی کوئی تازہ اطلاع نہیں۔', roman: 'Abhi community ki koi update nahi.' },
  'Unpaid': { ur: 'غیر ادا شدہ', roman: 'Ada nahi hui' },
  'Total': { ur: 'کل', roman: 'Kul' },
  'Paid:': { ur: 'ادا شدہ:', roman: 'Ada shuda:' },
  'Collected:': { ur: 'وصول شدہ:', roman: 'Wasool shuda:' },
  'Waiting for review:': { ur: 'جائزے کے منتظر:', roman: 'Jaizay ke muntazir:' },
  'Rejected:': { ur: 'مسترد:', roman: 'Mustarad:' },
  'Unpaid:': { ur: 'غیر ادا شدہ:', roman: 'Ada nahi hui:' },
  'Total:': { ur: 'کل:', roman: 'Kul:' },
  'pending:': { ur: 'زیرِ التوا:', roman: 'Pending:' },
  'in progress:': { ur: 'کام جاری:', roman: 'Kaam jaari:' },
  'solved:': { ur: 'حل شدہ:', roman: 'Hal shuda:' },
  'Paid this month': { ur: 'اس ماہ ادا کر دی گئی', roman: 'Is mah ada ho gayi' },
  'Payment under review': { ur: 'ادائیگی کا جائزہ جاری ہے', roman: 'Payment ka jaiza jaari hai' },
  'Awaiting admin verification': { ur: 'ایڈمن کی تصدیق کا انتظار', roman: 'Admin ki tasdeeq ka intezar' },
  'Paid and verified': { ur: 'ادا شدہ اور تصدیق شدہ', roman: 'Ada shuda aur tasdeeq shuda' },
  'Payment not verified': { ur: 'ادائیگی کی تصدیق نہیں ہوئی', roman: 'Payment ki tasdeeq nahi hui' },
  'Action needed': { ur: 'کارروائی درکار ہے', roman: 'Karwai darkar hai' },
  'Your Mohalla committee fee is due. Open the portal for payment information.': { ur: 'محلہ کمیٹی کی اس ماہ کی فیس واجب الادا ہے۔ ادائیگی کی معلومات کے لیے پورٹل کھولیں۔', roman: 'Mohalla committee ki is mah ki fee ada karein. Tafseel ke liye portal kholein.' },
  'No past fee payments are recorded yet.': { ur: 'ابھی تک گزشتہ فیس کی ادائیگی کا ریکارڈ موجود نہیں۔', roman: 'Abhi tak pichli fees ki payment ka record nahi.' },
  'There are no community notices yet.': { ur: 'ابھی کمیٹی کا کوئی اعلان نہیں۔', roman: 'Abhi committee ka koi elaan nahi.' },
  'No household matches that search.': { ur: 'اس تلاش سے کوئی گھرانہ نہیں ملا۔', roman: 'Is talash mein koi gharana nahi mila.' },
  'No resident profiles are registered yet.': { ur: 'ابھی کوئی رہائشی رجسٹرڈ نہیں۔', roman: 'Abhi koi rehaishi registered nahi.' },
  'Transaction ID:': { ur: 'ٹرانزیکشن نمبر:', roman: 'Transaction ID:' },
  'Copy account number': { ur: 'اکاؤنٹ نمبر کاپی کریں', roman: 'Account number copy karein' },
  'Copied': { ur: 'کاپی ہو گیا', roman: 'Copy ho gaya' },
  'Notice': { ur: 'اعلان', roman: 'Elaan' },
  'Needs review': { ur: 'جائزہ درکار ہے', roman: 'Jaiza darkar hai' },
  'Waiting for review': { ur: 'جائزے کے منتظر', roman: 'Jaizay ke muntazir' },
  'households': { ur: 'گھرانے', roman: 'Gharanay' },
  'No payment notice submitted for this month.': { ur: 'اس ماہ ادائیگی کی اطلاع جمع نہیں ہوئی۔', roman: 'Is mah payment ki ittila jama nahi hui.' },
  'Mohalla Committee Portal': { ur: 'محلہ کمیٹی پورٹل', roman: 'Mohalla Committee Portal' },
  'Use your name, house number, and phone. Your house number will be your username.': { ur: 'اپنا نام، گھر نمبر اور فون درج کریں۔ آپ کا گھر نمبر آپ کا یوزر نیم ہوگا۔', roman: 'Apna naam, ghar number aur phone dein. Ghar number hi aap ka username hoga.' },
  'Create a password': { ur: 'پاس ورڈ بنائیں', roman: 'Password banayein' },
  'Create account': { ur: 'اکاؤنٹ بنائیں', roman: 'Account banayein' },
  'Profile setup is incomplete': { ur: 'پروفائل کی ترتیب مکمل نہیں', roman: 'Profile setup mukammal nahi' },
  'Your login worked, but your portal profile was not found.': { ur: 'لاگ اِن ہو گیا، لیکن پورٹل پروفائل نہیں ملا۔', roman: 'Login ho gaya, lekin portal profile nahi mili.' },
  'Please contact the committee admin, then sign out and try again.': { ur: 'کمیٹی ایڈمن سے رابطہ کریں، پھر لاگ آؤٹ کر کے دوبارہ کوشش کریں۔', roman: 'Committee admin se rabta karein, logout karke dobara koshish karein.' },
  'Loading your portal…': { ur: 'پورٹل لوڈ ہو رہا ہے…', roman: 'Portal load ho raha hai…' },
  'Welcome, ': { ur: 'خوش آمدید، ', roman: 'Khush aamdeed, ' },
  'House ': { ur: 'گھر ', roman: 'Ghar ' },
  'Notices': { ur: 'اعلانات', roman: 'Elaanaat' },
  'Tell the committee about sanitation, roads, streetlights, and more.': { ur: 'صفائی، سڑکوں، اسٹریٹ لائٹس اور دیگر مسائل کے بارے میں کمیٹی کو بتائیں۔', roman: 'Safai, sarkon, streetlights aur doosray masail committee ko batayein.' },
  'Go to complaints': { ur: 'شکایات پر جائیں', roman: 'Shikayaat par jayein' },
  'RECENT ACTIVITY': { ur: 'حالیہ سرگرمی', roman: 'Haliya sargarmi' },
  'Your updates will appear here.': { ur: 'آپ کی تازہ معلومات یہاں نظر آئیں گی۔', roman: 'Aap ki updates yahan nazar ayengi.' },
  'FROM THE COMMITTEE': { ur: 'کمیٹی کی جانب سے', roman: 'Committee ki janib se' },
  'No news yet.': { ur: 'ابھی کوئی خبر نہیں۔', roman: 'Abhi koi khabar nahi.' },
  'MONTHLY CONTRIBUTION': { ur: 'ماہانہ چندہ', roman: 'Mahina chanda' },
  'Transfer the exact amount using one of the accounts below. Then submit your transaction ID so the admin can verify it.': { ur: 'نیچے دیے گئے اکاؤنٹ میں درست رقم بھیجیں، پھر ٹرانزیکشن نمبر جمع کریں تاکہ ایڈمن تصدیق کر سکے۔', roman: 'Neeche diye gaye account mein poori raqam bhejein, phir transaction ID dein taa-ke admin tasdeeq kar sake.' },
  'EasyPaisa / mobile account': { ur: 'ایزی پیسہ / موبائل اکاؤنٹ', roman: 'EasyPaisa / mobile account' },
  'Amount due': { ur: 'واجب الادا رقم', roman: 'Ada karne ki raqam' },
  'Amount paid': { ur: 'ادا شدہ رقم', roman: 'Ada shuda raqam' },
  'Amount submitted': { ur: 'جمع کرائی گئی رقم', roman: 'Jama karai gai raqam' },
  'Required': { ur: 'ضروری', roman: 'Lazmi' },
  'Optional': { ur: 'اختیاری', roman: 'Ikhtiyari' },
  'A clear screenshot helps the admin verify your payment. Images are resized before saving.': { ur: 'واضح اسکرین شاٹ ایڈمن کو ادائیگی کی تصدیق میں مدد دے گا۔ تصویر محفوظ کرنے سے پہلے چھوٹی کی جاتی ہے۔', roman: 'Saaf screenshot admin ko payment verify karne mein madad dega. Save se pehle image chhoti ki jayegi.' },
  'YOUR RECORD': { ur: 'آپ کا ریکارڈ', roman: 'Aap ka record' },
  'Loading payment history…': { ur: 'ادائیگی کی تاریخ لوڈ ہو رہی ہے…', roman: 'Payment history load ho rahi hai…' },
  'LET US KNOW': { ur: 'ہمیں بتائیں', roman: 'Hamein batayein' },
  'FOLLOW PROGRESS': { ur: 'پیش رفت دیکھیں', roman: 'Progress dekhein' },
  'Loading your complaints…': { ur: 'آپ کی شکایات لوڈ ہو رہی ہیں…', roman: 'Aap ki shikayaat load ho rahi hain…' },
  'Review community issues, households, and monthly payments.': { ur: 'محلے کے مسائل، گھرانوں اور ماہانہ ادائیگیوں کا جائزہ لیں۔', roman: 'Mohallay ke masail, gharanon aur mahina payments dekhein.' },
  'Open complaints': { ur: 'زیرِ کارروائی شکایات', roman: 'Khuli shikayaat' },
  'Payments to review': { ur: 'جائزے کے لیے ادائیگیاں', roman: 'Jaizay ke liye payments' },
  'Collected this month': { ur: 'اس ماہ وصول شدہ', roman: 'Is mah wasool hui' },
  'CURRENT BILLING PERIOD': { ur: 'موجودہ فیس کا مہینہ', roman: 'Maujooda billing period' },
  'Fee collection': { ur: 'فیس وصولی', roman: 'Fee wasooli' },
  'LATEST': { ur: 'تازہ ترین', roman: 'Taza tareen' },
  'Recent complaints': { ur: 'حالیہ شکایات', roman: 'Haliya shikayaat' },
  'COMMUNITY FOLLOW-UP': { ur: 'کمیونٹی کی پیروی', roman: 'Community follow-up' },
  'Complaint procedure': { ur: 'شکایت کی پیش رفت', roman: 'Shikayat ki progress' },
  'MEMBER DIRECTORY': { ur: 'اراکین کی فہرست', roman: 'Members ki fehrist' },
  'MANUAL VERIFICATION': { ur: 'دستی تصدیق', roman: 'Manual tasdeeq' },
  'Language preference is saved on this device. Resident profiles and names cannot be edited here.': { ur: 'زبان کی ترجیح اس ڈیوائس پر محفوظ ہوگی۔ یہاں رہائشی پروفائل یا نام تبدیل نہیں ہو سکتے۔', roman: 'Zaban ki preference is device par save hogi. Yahan rehaishi profile ya naam change nahi ho sakta.' },
  'Chrome reminder on the 8th when the portal is open, or when you next open it that month.': { ur: 'اگر پورٹل کھلا ہو تو ہر ماہ 8 تاریخ کو، ورنہ اس ماہ اگلی بار پورٹل کھولنے پر کروم یاددہانی دے گا۔', roman: 'Portal khula ho to har mah ki 8 tareekh ko, warna us mah dobara kholne par Chrome reminder dega.' },
  'Monthly reminder enabled on this device.': { ur: 'اس ڈیوائس پر ماہانہ یاددہانی فعال ہے۔', roman: 'Is device par mahina reminder chalu hai.' },
  'Your complaint was sent to the committee.': { ur: 'آپ کی شکایت کمیٹی کو بھیج دی گئی۔', roman: 'Aap ki shikayat committee ko bhej di gayi.' },
  'Payment details sent. The admin will review your transaction ID.': { ur: 'ادائیگی کی تفصیلات بھیج دی گئیں۔ ایڈمن ٹرانزیکشن نمبر دیکھے گا۔', roman: 'Payment ki tafseel bhej di. Admin transaction ID check karega.' },
  'Pay monthly fee': { ur: 'ماہانہ فیس ادا کریں', roman: 'Mahina fee ada karein' },
  'For example, L-559': { ur: 'مثال کے طور پر، L-559', roman: 'Misal ke taur par, L-559' },
  'Your password': { ur: 'آپ کا پاس ورڈ', roman: 'Aap ka password' },
  'Full name': { ur: 'پورا نام', roman: 'Poora naam' },
  '03XX XXXXXXX': { ur: '03XX XXXXXXX', roman: '03XX XXXXXXX' },
  'At least 6 characters': { ur: 'کم از کم 6 حروف', roman: 'Kam az kam 6 characters' },
  'Enter the ID from your payment confirmation': { ur: 'ادائیگی کی تصدیق والا نمبر درج کریں', roman: 'Payment confirmation wala ID likhein' },
  'Describe the issue and its location.': { ur: 'مسئلے اور اس کی جگہ کی تفصیل لکھیں۔', roman: 'Maslay aur us ki jagah batayein.' },
  'Add a street or landmark so the committee can find the issue.': { ur: 'گلی یا قریبی جگہ لکھیں تاکہ کمیٹی مسئلہ تلاش کر سکے۔', roman: 'Gali ya qareebi nishani batayein taa-ke committee masla dhoond sake.' },
  'For example, Water supply update': { ur: 'مثال: پانی کی فراہمی کی اطلاع', roman: 'Misal: Pani ki supply ki khabar' },
  'Write a helpful update for residents': { ur: 'رہائشیوں کے لیے مفید اطلاع لکھیں', roman: 'Rehaishiyon ke liye mufeed update likhein' },
  'That house number or password was not recognized.': { ur: 'گھر نمبر یا پاس ورڈ درست نہیں۔', roman: 'Ghar number ya password durust nahi.' },
  'An account already uses this house number. Sign in with the house number, or contact the admin if you need access restored.': { ur: 'اس گھر نمبر کا اکاؤنٹ پہلے سے موجود ہے۔ گھر نمبر سے لاگ اِن کریں یا مدد کے لیے ایڈمن سے رابطہ کریں۔', roman: 'Is ghar number ka account pehle se hai. Ghar number se login karein ya admin se rabta karein.' }
};

function tr(text) {
  return translations[text]?.[language] || text;
}

function basePhrase(text) {
  const match = text.match(/^(\s*)(.*?)(\s*)$/s);
  for (const [english, versions] of Object.entries(translations)) {
    if (versions.ur === match[2] || versions.roman === match[2]) return `${match[1]}${english}${match[3]}`;
  }
  return text;
}

function applyLanguage() {
  document.documentElement.lang = language === 'ur' ? 'ur' : 'en';
  document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!sourceTextNodes.has(node)) sourceTextNodes.set(node, basePhrase(node.nodeValue));
    const source = sourceTextNodes.get(node);
    const match = source.match(/^(\s*)(.*?)(\s*)$/s);
    const translated = tr(match[2]);
    node.nodeValue = `${match[1]}${translated}${match[3]}`;
  }
  document.querySelectorAll('[placeholder]').forEach((element) => {
    if (!sourcePlaceholders.has(element)) sourcePlaceholders.set(element, basePhrase(element.placeholder));
    element.placeholder = tr(sourcePlaceholders.get(element));
  });
  document.querySelectorAll('.language-select').forEach((select) => { select.value = language; });
}

function setLanguage(nextLanguage) {
  language = ['en', 'ur', 'roman'].includes(nextLanguage) ? nextLanguage : 'en';
  localStorage.setItem('mohalla-language', language);
  applyLanguage();
  const label = billingPeriod().label;
  const adminMonth = document.getElementById('adminBillingMonth');
  const feesMonth = document.getElementById('adminFeesMonth');
  const monthlyMonth = document.getElementById('adminMonthlyMonth');
  const residentMonth = document.getElementById('billingMonthLabel');
  if (adminMonth) adminMonth.textContent = label;
  if (feesMonth) feesMonth.textContent = label;
  if (monthlyMonth) monthlyMonth.textContent = label;
  if (residentMonth) residentMonth.textContent = label.toLocaleUpperCase();
  if (isAdmin()) renderAdminPortal();
  else if (currentUser && userData?.role === 'resident') {
    renderResidentPayment(currentPayment);
    renderResidentPaymentHistory(residentPaymentRecords);
    renderResidentAnnouncements();
    applyLanguage();
  }
}

document.querySelectorAll('.language-select').forEach((select) => {
  select.addEventListener('change', () => setLanguage(select.value));
});
applyLanguage();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((error) => {
    console.warn('Service worker could not be registered:', error);
  }));
}

function billingPeriod() {
  const now = new Date();
  return {
    key: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    label: now.toLocaleString(language === 'ur' ? 'ur-PK' : 'en-PK', { month: 'long', year: 'numeric' })
  };
}

function refreshBillingPeriod() {
  const period = billingPeriod();
  if (period.key === activeBillingPeriodKey) return;
  activeBillingPeriodKey = period.key;
  const residentLabel = document.getElementById('billingMonthLabel');
  if (residentLabel) residentLabel.textContent = period.label.toLocaleUpperCase();
  const adminLabel = document.getElementById('adminBillingMonth');
  const adminFeeLabel = document.getElementById('adminFeesMonth');
  const adminMonthlyLabel = document.getElementById('adminMonthlyMonth');
  if (adminLabel) adminLabel.textContent = period.label;
  if (adminFeeLabel) adminFeeLabel.textContent = period.label;
  if (adminMonthlyLabel) adminMonthlyLabel.textContent = period.label;
  if (userData?.role === 'resident') {
    currentPayment = residentPaymentRecords[`${currentUser.uid}_${period.key}`] || null;
    renderResidentPayment(currentPayment);
    renderResidentPaymentHistory(residentPaymentRecords);
  } else if (userData?.role === 'admin') {
    renderAdminPortal();
  }
}

// Firebase Email/Password needs an email internally. Residents never need to
// enter it: the same normalized house number maps to the same internal email.
function houseToInternalEmail(value) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, '-');
  return `${normalized}@area17688.com`;
}

function isAdmin() {
  return userData?.role === 'admin';
}

function showMessage(id, message = '', kind = 'error') {
  const element = document.getElementById(id);
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('success-message', kind === 'success' && Boolean(message));
}

function setAuthMode(mode) {
  document.getElementById('loginForm').classList.toggle('hidden', mode !== 'login');
  document.getElementById('registrationForm').classList.toggle('hidden', mode !== 'register');
  showMessage('loginMessage');
  showMessage('registrationMessage');
}

document.querySelectorAll('[data-show]').forEach((button) => {
  button.addEventListener('click', () => setAuthMode(button.dataset.show === 'registrationSection' ? 'register' : 'login'));
});

document.querySelectorAll('[data-tab]').forEach((button) => {
  button.addEventListener('click', () => showTab(button.dataset.tab));
});

function showTab(tabId) {
  const panel = document.getElementById(tabId);
  if (!panel) return;
  const dashboard = panel.closest('.portal');
  dashboard.querySelectorAll('.tab-panel').forEach((item) => item.classList.toggle('hidden', item !== panel));
  dashboard.querySelectorAll('.tab-button').forEach((item) => item.classList.toggle('active', item.dataset.tab === tabId));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function clearListeners() {
  unsubscribeListeners.forEach((unsubscribe) => unsubscribe());
  unsubscribeListeners = [];
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = null;
  if (cleanupTimer) clearInterval(cleanupTimer);
  cleanupTimer = null;
  if (cleanupInitialTimer) clearTimeout(cleanupInitialTimer);
  cleanupInitialTimer = null;
}

function listen(path, callback, options = {}) {
  const listenerRef = options.query ? options.query(ref(db, path)) : ref(db, path);
  const unsubscribe = onValue(listenerRef, (snapshot) => callback(snapshot.val()), (error) => {
    console.error(`Realtime Database read failed at ${path}:`, error);
    if (options.errorId) showMessage(options.errorId, `Could not load this information: ${error.message}`);
    else if (isAdmin() && path === 'announcements') showMessage('adminReadError', `Could not load or publish community notices: ${error.message}. Publish the updated database.rules.json to this Firebase project's Realtime Database Rules, then reload the portal.`);
    else if (isAdmin()) showMessage('adminReadError', `Some admin information could not be loaded: ${error.message}`);
  });
  unsubscribeListeners.push(unsubscribe);
}

function showOnly(sectionId) {
  ['authSection', 'profileError', 'loadingPanel', 'residentSection', 'adminSection'].forEach((id) => {
    document.getElementById(id).classList.toggle('hidden', id !== sectionId);
  });
  document.getElementById('logoutBtn').classList.toggle('hidden', !currentUser);
}

onAuthStateChanged(auth, async (user) => {
  clearListeners();
  currentUser = user;
  userData = null;
  currentPayment = null;
  if (!user) {
    showOnly('authSection');
    setAuthMode('login');
    return;
  }

  showOnly('loadingPanel');
  let profileSnapshot;
  try {
    // Registration creates the Auth account just before its profile. Retry the
    // profile read briefly so signup does not show a false missing-profile error.
    for (let attempt = 0; attempt < 8; attempt++) {
      profileSnapshot = await get(ref(db, `users/${user.uid}`));
      if (profileSnapshot.exists()) break;
      if (attempt < 7) await new Promise((resolve) => setTimeout(resolve, 300));
    }
  } catch (error) {
    showOnly('profileError');
    document.getElementById('profileErrorText').textContent = `Your account signed in, but the profile could not be loaded: ${error.message}`;
    return;
  }

  if (!profileSnapshot?.exists()) {
    showOnly('profileError');
    document.getElementById('profileErrorText').textContent = 'Your login worked, but no matching profile exists under users/{your Firebase UID}. Ask the committee admin to add or repair it.';
    return;
  }

  userData = profileSnapshot.val();
  if (userData.role === 'admin') {
    showOnly('adminSection');
    showTab('admin-overview');
    loadAdminPortal();
  } else if (userData.role === 'resident') {
    showOnly('residentSection');
    showTab('resident-home');
    loadResidentPortal();
  } else {
    showOnly('profileError');
    document.getElementById('profileErrorText').textContent = 'This profile does not have a valid portal role. Ask the committee admin to set its role to resident or admin.';
  }
});

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const loginButton = document.getElementById('loginSubmit');
  const identity = document.getElementById('loginHouse').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!identity || !password) return;
  loginButton.disabled = true;
  loginButton.textContent = 'Signing in…';
  showMessage('loginMessage');
  const email = identity.includes('@') ? identity.toLowerCase() : houseToInternalEmail(identity);
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    const message = ['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password'].includes(error.code)
      ? 'That house number or password was not recognized.'
      : error.code === 'auth/too-many-requests'
        ? 'Too many attempts. Please wait a little and try again.'
        : error.message;
    showMessage('loginMessage', message);
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = 'Sign in';
  }
});

document.getElementById('registrationForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.getElementById('registerSubmit');
  const name = document.getElementById('regName').value.trim();
  const houseNo = document.getElementById('regHouse').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPassword').value;
  if (!name || !houseNo || !phone || !password) return;
  if (houseNo.includes('@') || houseNo.toLowerCase() === 'admin') {
    showMessage('registrationMessage', 'Enter your house number only. The admin account is created separately.');
    return;
  }
  if (password.length < 6) {
    showMessage('registrationMessage', 'Choose a password with at least 6 characters.');
    return;
  }
  button.disabled = true;
  button.textContent = 'Creating account…';
  showMessage('registrationMessage');
  try {
    const credential = await createUserWithEmailAndPassword(auth, houseToInternalEmail(houseNo), password);
    await set(ref(db, `users/${credential.user.uid}`), {
      name,
      houseNo,
      phone,
      role: 'resident',
      createdAt: Date.now()
    });
  } catch (error) {
    const message = error.code === 'auth/email-already-in-use'
      ? 'An account already uses this house number. Sign in with the house number, or contact the admin if you need access restored.'
      : error.code === 'auth/weak-password'
        ? 'Choose a stronger password with at least 6 characters.'
        : error.message;
    showMessage('registrationMessage', message);
  } finally {
    button.disabled = false;
    button.textContent = 'Create account';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

document.getElementById('residentSearch').addEventListener('input', () => renderAdminResidentsFromCache());
document.getElementById('monthlyFeeSearch').addEventListener('input', () => renderCurrentMonthHouseholds());
document.getElementById('enableReminders').addEventListener('click', enableMonthlyReminders);
document.getElementById('announcementForm').addEventListener('submit', publishAnnouncement);

document.getElementById('copyPaymentAccount').addEventListener('click', async () => {
  const account = document.getElementById('accNum').textContent.trim();
  if (!account || account === 'Ask the committee admin') return;
  try {
    await navigator.clipboard.writeText(account);
    const button = document.getElementById('copyPaymentAccount');
    button.textContent = tr('Copied');
    setTimeout(() => { button.textContent = tr('Copy account number'); }, 1600);
  } catch {
    alert(`Committee payment account: ${account}`);
  }
});

function loadResidentPortal() {
  residentPaymentLoaded = false;
  activeBillingPeriodKey = billingPeriod().key;
  updateReminderButton();
  document.getElementById('resName').textContent = userData.name || 'Resident';
  document.getElementById('resHouse').textContent = userData.houseNo || '—';
  const { key, label } = billingPeriod();
  document.getElementById('billingMonthLabel').textContent = label.toUpperCase();

  listen('settings', (settings) => {
    currentSettings = settings || {};
    const amount = Number(currentSettings.monthlyCharge) || 300;
    document.getElementById('monthlyAmount').textContent = amount.toLocaleString();
    document.getElementById('homeMonthlyAmount').textContent = amount.toLocaleString();
    document.getElementById('accTitle').textContent = currentSettings.accountTitle || 'M. Faizan';
    document.getElementById('accNum').textContent = currentSettings.easypaisaAccount || '03003307099';
    document.getElementById('bankDetails').textContent = currentSettings.bankDetails || '';
    if (residentPaymentLoaded) renderResidentPayment(currentPayment);
  });
  listen('payments', (payments) => {
    residentPaymentRecords = payments || {};
    residentPaymentLoaded = true;
    renderResidentPayment(residentPaymentRecords[`${currentUser.uid}_${key}`] || null);
    renderResidentPaymentHistory(residentPaymentRecords);
    checkMonthlyReminder();
  }, {
    query: (databaseRef) => query(databaseRef, orderByChild('uid'), equalTo(currentUser.uid)),
    errorId: 'paymentMessage'
  });
  // Residents can see only their own complaints. The uid filter is required
  // by the Realtime Database rules and prevents the shared community feed.
  listen('complaints', (complaints) => {
    residentComplaints = complaints || {};
    renderResidentComplaints(residentComplaints);
  }, {
    query: (databaseRef) => query(databaseRef, orderByChild('uid'), equalTo(currentUser.uid)),
    errorId: 'complaintMessage'
  });
  listen('announcements', (items) => {
    announcements = items || {};
    renderResidentAnnouncements();
  });
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = setInterval(checkMonthlyReminder, 60 * 60 * 1000);
}

function statusBadge(status, label) {
  const badge = document.createElement('span');
  badge.className = `status-badge status-${status}`;
  badge.textContent = tr(label || status.replace('_', ' '));
  return badge;
}

function renderResidentPayment(payment) {
  currentPayment = payment || null;
  const { label } = billingPeriod();
  const statusBox = document.getElementById('paymentStatusBox');
  const homeStatus = document.getElementById('homePaymentStatus');
  const form = document.getElementById('paymentForm');
  const homePayButton = document.getElementById('homePayButton');
  homePayButton.classList.toggle('hidden', payment?.status === 'approved');
  const amount = Number(currentSettings.monthlyCharge) || 300;
  const amountState = payment?.status === 'approved' ? 'Amount paid' : payment?.status === 'pending' ? 'Amount submitted' : 'Amount due';
  document.getElementById('monthlyAmountLabel').textContent = tr(amountState);
  document.getElementById('monthlyAmount').textContent = (['approved', 'pending'].includes(payment?.status) ? Number(payment.amount) || amount : amount).toLocaleString();
  const statusLine = document.createElement('div');
  statusLine.className = 'status-line';

  if (!payment) {
    statusLine.append(statusBadge('unpaid', `Unpaid · ${label}`));
    statusBox.replaceChildren(statusLine);
    homeStatus.replaceChildren(statusBadge('unpaid', 'Payment due'));
    form.classList.remove('hidden');
    return;
  }

  if (payment.status === 'pending') {
    statusLine.append(statusBadge('pending', 'Awaiting admin verification'));
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent = `Transaction ${payment.trxId || 'submitted'} was sent for review. Your fee will show as paid after the admin verifies it.`;
    statusLine.append(note);
    statusBox.replaceChildren(statusLine);
    homeStatus.replaceChildren(statusBadge('pending', 'Payment under review'));
    form.classList.add('hidden');
    return;
  }

  if (payment.status === 'approved') {
    statusLine.append(statusBadge('paid', 'Paid and verified'));
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent = `${payment.month || label} fee received${payment.verifiedAt ? ` on ${new Date(payment.verifiedAt).toLocaleDateString()}` : ''}. Amount: Rs. ${(Number(payment.amount) || amount).toLocaleString()}.`;
    statusLine.append(note);
    statusBox.replaceChildren(statusLine);
    homeStatus.replaceChildren(statusBadge('paid', 'Paid this month'));
    if (payment.receipt) {
      const actions = document.createElement('div');
      actions.className = 'list-item-actions';
      actions.append(actionButton('Print receipt', () => printReceipt(payment.receipt)));
      statusBox.append(actions);
    }
    form.classList.add('hidden');
    return;
  }

  if (payment.status === 'rejected') {
    statusLine.append(statusBadge('rejected', 'Payment not verified'));
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent = payment.rejectionReason || 'Please check the transaction details and send the payment notice again.';
    statusLine.append(note);
    statusBox.replaceChildren(statusLine);
    homeStatus.replaceChildren(statusBadge('rejected', 'Action needed'));
    form.classList.remove('hidden');
    return;
  }

  statusLine.append(statusBadge('unpaid', `Unpaid · ${label}`));
  statusBox.replaceChildren(statusLine);
  homeStatus.replaceChildren(statusBadge('unpaid', 'Payment due'));
  form.classList.remove('hidden');
}

document.getElementById('proofImage').addEventListener('change', (event) => {
  const preview = document.getElementById('proofPreview');
  preview.replaceChildren();
  const file = event.target.files?.[0];
  if (!file) { preview.classList.add('hidden'); return; }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    event.target.value = '';
    showMessage('paymentMessage', 'Choose a JPG, PNG, or WebP image.');
    preview.classList.add('hidden');
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    event.target.value = '';
    showMessage('paymentMessage', 'That image is too large. Choose one smaller than 8 MB.');
    preview.classList.add('hidden');
    return;
  }
  const image = document.createElement('img');
  image.alt = 'Selected payment screenshot preview';
  image.src = URL.createObjectURL(file);
  const description = document.createElement('span');
  description.textContent = `Screenshot selected: ${file.name}`;
  preview.append(image, description);
  preview.classList.remove('hidden');
  showMessage('paymentMessage');
});

document.getElementById('cmpImage').addEventListener('change', (event) => {
  const preview = document.getElementById('cmpPreview');
  preview.replaceChildren();
  const file = event.target.files?.[0];
  if (!file) { preview.classList.add('hidden'); return; }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    event.target.value = '';
    showMessage('complaintMessage', 'Choose a JPG, PNG, or WebP image.');
    preview.classList.add('hidden');
    return;
  }
  if (file.size > 8 * 1024 * 1024) {
    event.target.value = '';
    showMessage('complaintMessage', 'That image is too large. Choose one smaller than 8 MB.');
    preview.classList.add('hidden');
    return;
  }
  const image = document.createElement('img');
  image.alt = 'Selected complaint photo preview';
  image.src = URL.createObjectURL(file);
  const description = document.createElement('span');
  description.textContent = `Photo selected: ${file.name}`;
  preview.append(image, description);
  preview.classList.remove('hidden');
  showMessage('complaintMessage');
});

async function compressImageToDataUrl(file) {
  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  let blob;
  for (let pass = 0; pass < 5; pass++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', Math.max(.48, .78 - pass * .08)));
    if (blob && blob.size <= 360 * 1024) break;
    scale *= .78;
  }
  bitmap.close();
  if (!blob || blob.size > 480 * 1024) throw new Error('Could not shrink the screenshot enough. Choose a smaller image.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected image.'));
    reader.readAsDataURL(blob);
  });
}

document.getElementById('paymentForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const transactionId = document.getElementById('trxIdInput').value.trim();
  const payerPhone = document.getElementById('payerPhoneInput').value.trim();
  const file = document.getElementById('proofImage').files?.[0];
  if (!payerPhone) return showMessage('paymentMessage', 'Enter the phone number you used to send the payment.');
  if (!transactionId) return showMessage('paymentMessage', 'Enter the transaction ID from your payment confirmation.');
  if (currentPayment && !['rejected'].includes(currentPayment.status)) {
    return showMessage('paymentMessage', 'A payment notice is already being reviewed for this month.');
  }

  const button = document.getElementById('paymentSubmit');
  button.disabled = true;
  button.textContent = file ? 'Preparing screenshot…' : 'Sending for review…';
  showMessage('paymentMessage');
  try {
    let proofImageDataUrl = null;
    if (file) proofImageDataUrl = await compressImageToDataUrl(file);
    const { key, label } = billingPeriod();
    const payment = {
      uid: currentUser.uid,
      houseNo: userData.houseNo,
      residentName: userData.name || 'Resident',
      month: label,
      amount: Number(currentSettings.monthlyCharge) || 300,
      payerPhone,
      trxId: transactionId,
      status: 'pending',
      submittedAt: Date.now(),
      proofAttached: Boolean(proofImageDataUrl)
    };
    const paymentKey = `${currentUser.uid}_${key}`;
    const writes = { [`payments/${paymentKey}`]: payment };
    if (proofImageDataUrl) {
      writes[`paymentProofs/${paymentKey}`] = {
        uid: currentUser.uid,
        imageDataUrl: proofImageDataUrl,
        imageType: 'image/jpeg',
        uploadedAt: Date.now()
      };
    } else if (currentPayment?.status === 'rejected' && currentPayment.proofAttached) {
      writes[`paymentProofs/${paymentKey}`] = null;
    }
    await update(ref(db), writes);
    document.getElementById('trxIdInput').value = '';
    document.getElementById('payerPhoneInput').value = '';
    document.getElementById('proofImage').value = '';
    document.getElementById('proofPreview').replaceChildren();
    document.getElementById('proofPreview').classList.add('hidden');
    showMessage('paymentMessage', 'Payment details sent. The admin will review your transaction ID.', 'success');
  } catch (error) {
    showMessage('paymentMessage', `Could not submit payment details: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = 'Send for admin verification';
  }
});

function createListItem(title, detail, status, statusLabel) {
  const item = document.createElement('article');
  item.className = 'list-item';
  const header = document.createElement('div');
  header.className = 'list-item-header';
  const heading = document.createElement('h3');
  heading.className = 'list-item-title';
  heading.textContent = title;
  header.append(heading, statusBadge(status, statusLabel));
  item.append(header);
  if (detail) {
    const meta = document.createElement('p');
    meta.className = 'list-item-meta';
    meta.textContent = detail;
    item.append(meta);
  }
  return item;
}

function renderResidentComplaints(complaints) {
  const entries = Object.values(complaints).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const fullList = document.getElementById('residentComplaintList');
  const recentList = document.getElementById('residentRecentComplaints');
  fullList.replaceChildren();
  recentList.replaceChildren();
  if (!entries.length) {
    fullList.innerHTML = '<div class="empty-state">No complaints have been submitted yet.</div>';
    recentList.innerHTML = '<div class="empty-state">Your complaint updates will appear here.</div>';
    return;
  }
  entries.forEach((complaint, index) => {
    const status = ['pending', 'in_progress', 'solved'].includes(complaint.status) ? complaint.status : 'pending';
    const detail = `${complaint.description || ''}${complaint.createdAt ? ` · Submitted ${new Date(complaint.createdAt).toLocaleDateString()}` : ''}`;
    const item = createListItem(complaint.category || 'Community issue', detail, status);
    fullList.append(item);
    if (index < 3) recentList.append(item.cloneNode(true));
  });
  applyLanguage();
}

function renderResidentPaymentHistory(payments) {
  const list = document.getElementById('residentPaymentHistory');
  list.replaceChildren();
  const records = Object.entries(payments)
    .map(([key, payment]) => ({ key, ...payment }))
    .sort((a, b) => paymentPeriodKey(b.key).localeCompare(paymentPeriodKey(a.key)));
  if (!records.length) {
    list.append(emptyState('No past fee payments are recorded yet.'));
    return;
  }
  records.forEach((payment) => {
    const status = payment.status === 'approved' ? 'paid' : payment.status;
    const detail = `Rs. ${(Number(payment.amount) || 0).toLocaleString()}${payment.trxId ? ` · Transaction ID: ${payment.trxId}` : ''}${payment.verifiedAt ? ` · Verified ${new Date(payment.verifiedAt).toLocaleDateString()}` : ''}`;
    const item = createListItem(payment.month || payment.key.slice(-7), detail, status, status);
    if (payment.status === 'approved' && payment.receipt) {
      const actions = document.createElement('div');
      actions.className = 'list-item-actions';
      actions.append(actionButton('Print receipt', () => printReceipt(payment.receipt)));
      item.append(actions);
    }
    list.append(item);
  });
  applyLanguage();
}

function paymentPeriodKey(key) {
  return String(key).match(/(\d{4}-\d{2})$/)?.[1] || String(key);
}

function renderResidentAnnouncements() {
  const items = Object.values(announcements).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const mainList = document.getElementById('residentNoticeList');
  const homeList = document.getElementById('residentHomeNotices');
  mainList.replaceChildren();
  homeList.replaceChildren();
  if (!items.length) {
    mainList.append(emptyState('There are no community notices yet.'));
    homeList.append(emptyState('There are no community notices yet.'));
    return;
  }
  items.forEach((notice, index) => {
    const item = createListItem(notice.title || 'Community notice', `${notice.body || ''}${notice.createdAt ? ` · ${new Date(notice.createdAt).toLocaleDateString()}` : ''}`, 'approved', 'Notice');
    mainList.append(item);
    if (index < 2) homeList.append(item.cloneNode(true));
  });
  applyLanguage();
}

document.getElementById('complaintForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const description = document.getElementById('cmpDesc').value.trim();
  if (!description) return showMessage('complaintMessage', 'Describe the issue and its location.');
  const file = document.getElementById('cmpImage').files?.[0];
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = file ? 'Preparing photo…' : 'Submitting…';
  try {
    const photoDataUrl = file ? await compressImageToDataUrl(file) : null;
    const complaintRef = push(ref(db, 'complaints'));
    const complaint = {
      uid: currentUser.uid,
      houseNo: userData.houseNo,
      residentName: userData.name || 'Resident',
      category: document.getElementById('cmpCategory').value,
      description,
      status: 'pending',
      createdAt: Date.now()
    };
    if (photoDataUrl) {
      complaint.photoDataUrl = photoDataUrl;
      complaint.photoType = 'image/jpeg';
      complaint.photoAttached = true;
    }
    await set(complaintRef, complaint);
    event.currentTarget.reset();
    document.getElementById('cmpPreview').replaceChildren();
    document.getElementById('cmpPreview').classList.add('hidden');
    showMessage('complaintMessage', 'Your complaint was sent to the committee.', 'success');
  } catch (error) {
    showMessage('complaintMessage', `Could not submit complaint: ${error.message}`);
  } finally {
    button.disabled = false;
    button.textContent = 'Submit complaint';
  }
});

function loadAdminPortal() {
  const { label } = billingPeriod();
  activeBillingPeriodKey = billingPeriod().key;
  document.getElementById('adminBillingMonth').textContent = label;
  document.getElementById('adminFeesMonth').textContent = label;
  document.getElementById('adminMonthlyMonth').textContent = label;
  listen('users', (value) => { adminUsers = value || {}; renderAdminPortal(); });
  listen('payments', (value) => { adminPayments = value || {}; renderAdminPortal(); });
  listen('complaints', (value) => {
    adminComplaints = value || {};
    renderAdminPortal();
    cleanupExpiredRecords();
  });
  listen('announcements', (value) => { announcements = value || {}; renderAdminPortal(); cleanupExpiredRecords(); });
  listen('settings', (value) => { currentSettings = value || {}; renderAdminPortal(); });
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = setInterval(refreshBillingPeriod, 60 * 60 * 1000);
  cleanupInitialTimer = setTimeout(cleanupExpiredRecords, 5000);
  cleanupTimer = setInterval(cleanupExpiredRecords, 12 * 60 * 60 * 1000);
}

async function cleanupExpiredRecords() {
  if (!isAdmin() || cleanupInProgress) return;
  const now = Date.now();
  const noticeCutoff = now - 3 * 24 * 60 * 60 * 1000;
  const complaintCutoff = now - 15 * 24 * 60 * 60 * 1000;
  const writes = {};

  Object.entries(announcements).forEach(([id, notice]) => {
    if (notice?.createdAt && notice.createdAt <= noticeCutoff) writes[`announcements/${id}`] = null;
  });
  Object.entries(adminComplaints).forEach(([id, complaint]) => {
    if (complaint?.status !== 'solved') return;
    const solvedAt = Number(complaint.solvedAt || complaint.updatedAt);
    if (solvedAt && solvedAt <= complaintCutoff) {
      writes[`complaints/${id}`] = null;
    }
  });
  Object.entries(adminPayments).forEach(([paymentKey, payment]) => {
    if (payment?.status === 'approved' && payment.proofAttached) {
      writes[`paymentProofs/${paymentKey}`] = null;
      writes[`payments/${paymentKey}/proofAttached`] = false;
    }
  });

  if (!Object.keys(writes).length) return;
  cleanupInProgress = true;
  try {
    await update(ref(db), writes);
    console.info('Expired notices and solved complaints were removed from Realtime Database.');
  } catch (error) {
    console.warn('Automatic record cleanup failed:', error);
    showMessage('adminReadError', `Could not clean up expired notices or solved complaints: ${error.message}`);
  } finally {
    cleanupInProgress = false;
  }
}

function renderAdminPortal() {
  const residents = Object.entries(adminUsers).filter(([, profile]) => profile && profile.role !== 'admin');
  residents.sort((a, b) => String(a[1].houseNo || '').localeCompare(String(b[1].houseNo || '')));
  const { key } = billingPeriod();
  const fees = residents.map(([uid, profile]) => ({
    uid,
    profile,
    payment: adminPayments[`${uid}_${key}`] || null
  }));
  const complaints = Object.entries(adminComplaints).map(([id, value]) => ({ id, ...value }));
  complaints.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const pendingComplaints = complaints.filter((item) => item.status === 'pending').length;
  const openComplaints = complaints.filter((item) => item.status === 'pending' || item.status === 'in_progress').length;
  const pendingFees = Object.entries(adminPayments)
    .filter(([, payment]) => payment?.status === 'pending')
    .map(([paymentKey, payment]) => ({
      paymentKey,
      payment,
      profile: adminUsers[payment.uid] || {}
    }));
  const paidFees = fees.filter((item) => item.payment?.status === 'approved').length;
  const collected = fees.filter((item) => item.payment?.status === 'approved')
    .reduce((sum, item) => sum + (Number(item.payment.amount) || 0), 0);

  document.getElementById('statHouseholds').textContent = residents.length;
  document.getElementById('statComplaints').textContent = openComplaints;
  document.getElementById('statPayments').textContent = pendingFees.length;
  document.getElementById('statCollected').textContent = `Rs. ${collected.toLocaleString()}`;
  document.getElementById('pendingComplaintNav').textContent = pendingComplaints;
  document.getElementById('pendingPaymentNav').textContent = pendingFees.length;
  document.getElementById('residentCount').textContent = `${residents.length} households`;

  renderAdminResidents(residents);
  renderAdminComplaints(complaints);
  renderAdminFeeReview(pendingFees);
  renderAdminFeeSummary(fees, pendingFees.length, paidFees);
  renderAdminPaymentHistory(adminPayments);
  renderRecentAdminComplaints(complaints.slice(0, 4));
  renderAdminAnnouncements();
  applyLanguage();
}

function renderAdminResidents(residents) {
  adminResidentEntries = residents;
  renderAdminResidentsFromCache();
}

function renderAdminResidentsFromCache() {
  const list = document.getElementById('adminResidentList');
  list.replaceChildren();
  const search = document.getElementById('residentSearch').value.trim().toLowerCase();
  const residents = adminResidentEntries.filter(([, profile]) => {
    const searchable = `${profile.houseNo || ''} ${profile.name || ''} ${profile.phone || ''}`.toLowerCase();
    return searchable.includes(search);
  });
  if (!residents.length) return list.append(emptyState(search ? 'No household matches that search.' : 'No resident profiles are registered yet.'));
  residents.forEach(([, resident]) => {
    list.append(createListItem(
      `${resident.name || 'Name not provided'} · House ${resident.houseNo || 'N/A'}`,
      `Mobile: ${resident.phone || 'Not provided'}${resident.createdAt ? ` · Joined ${new Date(resident.createdAt).toLocaleDateString()}` : ''}`,
      'approved', 'Resident'
    ));
  });
}

function renderAdminPaymentHistory(payments) {
  const list = document.getElementById('adminPaymentHistory');
  list.replaceChildren();
  const records = Object.entries(payments)
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0))
    .slice(0, 100);
  if (!records.length) return list.append(emptyState('There are no payment records yet.'));
  records.forEach((payment) => {
    const status = payment.status === 'approved' ? 'paid' : payment.status || 'unpaid';
    list.append(createListItem(
      `${payment.month || paymentPeriodKey(payment.key)} · House ${payment.houseNo || 'N/A'} · ${payment.residentName || 'Resident'}`,
      `Rs. ${(Number(payment.amount) || 0).toLocaleString()}${payment.payerPhone ? ` · Sending phone: ${payment.payerPhone}` : ''}${payment.trxId ? ` · Transaction ID: ${payment.trxId}` : ''}${payment.submittedAt ? ` · Submitted ${new Date(payment.submittedAt).toLocaleDateString()}` : ''}`,
      status, status
    ));
  });
}

function renderAdminAnnouncements() {
  const all = Object.entries(announcements)
    .map(([id, notice]) => ({ id, ...notice }))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const list = document.getElementById('adminNoticeList');
  const recent = document.getElementById('adminRecentNotices');
  list.replaceChildren();
  recent.replaceChildren();
  if (!all.length) {
    list.append(emptyState('No notices have been published yet.'));
    recent.append(emptyState('No community notices yet.'));
    return;
  }
  all.forEach((notice, index) => {
    const detail = `${notice.body || ''}${notice.createdAt ? ` · ${new Date(notice.createdAt).toLocaleDateString()}` : ''}`;
    const item = createListItem(notice.title || 'Community notice', detail, 'approved', 'Notice');
    list.append(item);
    if (index < 2) recent.append(item.cloneNode(true));
  });
}

async function publishAnnouncement(event) {
  event.preventDefault();
  if (!isAdmin()) return;
  const title = document.getElementById('announcementTitle').value.trim();
  const body = document.getElementById('announcementBody').value.trim();
  if (!title || !body) return showMessage('announcementMessage', 'Add both a title and information.');
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    await push(ref(db, 'announcements'), {
      title,
      body,
      createdAt: Date.now(),
      publishedBy: userData.name || currentUser.uid
    });
    event.currentTarget.reset();
    showMessage('announcementMessage', 'Notice published for residents.', 'success');
  } catch (error) {
    showMessage('announcementMessage', `Could not publish notice: ${error.message}`);
  } finally {
    button.disabled = false;
  }
}

async function enableMonthlyReminders() {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return showMessage('reminderMessage', 'This browser does not support portal notifications.');
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return showMessage('reminderMessage', 'Notifications are not enabled. You can change this in your browser settings.');
    updateReminderButton();
    showMessage('reminderMessage', tr('Monthly reminder enabled on this device.'), 'success');
    checkMonthlyReminder();
  } catch (error) {
    showMessage('reminderMessage', `Could not enable reminders: ${error.message}`);
  }
}

function updateReminderButton() {
  const button = document.getElementById('enableReminders');
  if (!button) return;
  const enabled = 'Notification' in window && Notification.permission === 'granted';
  button.textContent = tr(enabled ? 'Reminders enabled' : 'Enable reminders');
  button.disabled = enabled;
}

async function checkMonthlyReminder() {
  refreshBillingPeriod();
  if (!currentUser || !residentPaymentLoaded || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  if (now.getDate() < 8 || currentPayment?.status === 'approved' || currentPayment?.status === 'pending') return;
  const period = billingPeriod();
  const marker = `mohalla-fee-reminder:${currentUser.uid}:${period.key}`;
  if (localStorage.getItem(marker)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(tr('Monthly fee reminder'), {
      body: tr('Your Mohalla committee fee is due. Open the portal for payment information.'),
      icon: './icon-192.png',
      badge: './icon-192.png',
      tag: marker,
      data: { url: './index.html' }
    });
    localStorage.setItem(marker, 'sent');
  } catch (error) {
    console.warn('Monthly reminder could not be shown:', error);
  }
}

function renderAdminComplaints(complaints) {
  const list = document.getElementById('adminComplaintList');
  list.replaceChildren();
  const counts = { pending: 0, in_progress: 0, solved: 0 };
  complaints.forEach((item) => { if (counts[item.status] !== undefined) counts[item.status]++; });
  document.getElementById('complaintSummary').textContent =
    `${tr('Total:')} ${complaints.length} · ${counts.pending} ${tr('pending:')} ${counts.in_progress} ${tr('in progress:')} ${counts.solved} ${tr('solved:')}`;
  if (!complaints.length) return list.append(emptyState('No complaints have been submitted.'));

  complaints.forEach((complaint) => {
    const status = ['pending', 'in_progress', 'solved'].includes(complaint.status) ? complaint.status : 'pending';
    const item = createListItem(
      `${complaint.category || 'Community issue'} · House ${complaint.houseNo || 'N/A'}`,
      `${complaint.residentName || 'Resident'}${complaint.createdAt ? ` · ${new Date(complaint.createdAt).toLocaleString()}` : ''}\n${complaint.description || ''}`,
      status
    );
    const actions = document.createElement('div');
    actions.className = 'list-item-actions';
    if (complaint.photoDataUrl) actions.append(actionButton('View complaint photo', () => showComplaintPhoto(complaint, item)));
    if (status === 'pending') actions.append(actionButton('Start work', () => setComplaintStatus(complaint.id, 'in_progress')));
    if (status === 'in_progress') actions.append(actionButton('Mark solved', () => setComplaintStatus(complaint.id, 'solved')));
    if (actions.childElementCount) item.append(actions);
    list.append(item);
  });
}

function showComplaintPhoto(complaint, item) {
  if (item.querySelector('.complaint-photo-viewer')) return;
  const image = document.createElement('img');
  image.className = 'proof-preview-image';
  image.src = complaint.photoDataUrl;
  image.alt = `Photo attached to ${complaint.category || 'community issue'} complaint`;
  const link = document.createElement('a');
  link.className = 'proof-link';
  link.href = complaint.photoDataUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Open full-size photo';
  const wrapper = document.createElement('div');
  wrapper.className = 'proof-viewer complaint-photo-viewer';
  wrapper.append(image, link);
  item.append(wrapper);
}

function renderAdminFeeReview(pendingFees) {
  const list = document.getElementById('adminPaymentList');
  list.replaceChildren();
  if (!pendingFees.length) list.append(emptyState('No payment notices are waiting for verification.'));
  pendingFees.forEach(({ paymentKey, profile, payment }) => {
    const item = createListItem(
      `House ${profile.houseNo || payment.houseNo || 'N/A'} · ${profile.name || payment.residentName || 'Resident'}`,
      `Resident mobile: ${profile.phone || 'N/A'} · Sending mobile: ${payment.payerPhone || 'N/A'} · Rs. ${(Number(payment.amount) || 0).toLocaleString()} · Transaction ID: ${payment.trxId || 'Missing'} · ${payment.month || ''}\nSubmitted ${payment.submittedAt ? new Date(payment.submittedAt).toLocaleString() : 'date unavailable'}`,
      'pending', 'Needs review'
    );
    const actions = document.createElement('div');
    actions.className = 'list-item-actions';
    if (payment.proofAttached) actions.append(actionButton('View screenshot', () => showPaymentProof(payment.uid, paymentKey, item)));
    actions.append(
      actionButton('Verify and approve', () => approvePayment(paymentKey, payment)),
      actionButton('Reject', () => rejectPayment(paymentKey, payment), true)
    );
    item.append(actions);
    list.append(item);
  });
}

function renderAdminFeeSummary(fees, pendingCount, paidCount) {
  const rejected = fees.filter((item) => item.payment?.status === 'rejected').length;
  const unpaid = fees.length - paidCount - pendingCount - rejected;
  const collected = fees.filter((item) => item.payment?.status === 'approved')
    .reduce((sum, item) => sum + (Number(item.payment.amount) || 0), 0);
  const summary = `${tr('Households')}: ${fees.length} · ${tr('Paid:')} ${paidCount} · ${tr('Collected:')} Rs. ${collected.toLocaleString()} · ${tr('Waiting for review:')} ${pendingCount} · ${tr('Rejected:')} ${rejected} · ${tr('Unpaid:')} ${unpaid}`;
  document.getElementById('feeSummary').textContent = summary;
  document.getElementById('feeSummaryFull').textContent = summary;
  document.getElementById('monthlyFeeSummary').textContent = summary;
  adminCurrentFees = fees;
  renderCurrentMonthHouseholds();
}

function renderCurrentMonthHouseholds() {
  const list = document.getElementById('adminAllFees');
  if (!list) return;
  list.replaceChildren();
  const search = document.getElementById('monthlyFeeSearch').value.trim().toLowerCase();
  const fees = adminCurrentFees.filter(({ profile, payment }) => {
    const status = payment?.status === 'approved' ? 'paid'
      : payment?.status === 'pending' ? 'pending'
        : payment?.status === 'rejected' ? 'rejected' : 'unpaid';
    return `${profile.houseNo || ''} ${profile.name || ''} ${profile.phone || ''} ${status}`.toLowerCase().includes(search);
  });
  if (!fees.length) return list.append(emptyState(search ? 'No household matches this search.' : 'No resident households to display.'));
  fees.forEach(({ profile, payment }) => {
    const status = payment?.status === 'approved' ? 'paid'
      : payment?.status === 'pending' ? 'pending'
        : payment?.status === 'rejected' ? 'rejected' : 'unpaid';
    const details = payment
      ? `Mobile: ${profile.phone || 'N/A'} · Rs. ${(Number(payment.amount) || 0).toLocaleString()}${payment.trxId ? ` · Transaction ID: ${payment.trxId}` : ''}${payment.rejectionReason ? ` · Reason: ${payment.rejectionReason}` : ''}`
      : 'No payment notice submitted for this month.';
    list.append(createListItem(`House ${profile.houseNo || 'N/A'} · ${profile.name || 'Resident'}`, details, status));
  });
}

function renderRecentAdminComplaints(complaints) {
  const list = document.getElementById('adminRecentComplaints');
  list.replaceChildren();
  if (!complaints.length) return list.append(emptyState('No community updates yet.'));
  complaints.forEach((complaint) => {
    const status = ['pending', 'in_progress', 'solved'].includes(complaint.status) ? complaint.status : 'pending';
    list.append(createListItem(
      `${complaint.category || 'Community issue'} · House ${complaint.houseNo || 'N/A'}`,
      `${complaint.residentName || 'Resident'}${complaint.createdAt ? ` · ${new Date(complaint.createdAt).toLocaleDateString()}` : ''}`,
      status
    ));
  });
}

function emptyState(text) {
  const element = document.createElement('div');
  element.className = 'empty-state';
  element.textContent = text;
  return element;
}

function actionButton(label, callback, danger = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `button button-small${danger ? ' button-danger' : ' button-outline'}`;
  button.textContent = label;
  button.addEventListener('click', callback);
  return button;
}

async function showPaymentProof(uid, paymentKey, item) {
  if (item.querySelector('.proof-preview-image')) return;
  try {
    const proofSnapshot = await get(ref(db, `paymentProofs/${paymentKey}`));
    if (!proofSnapshot.exists()) return alert('The screenshot record is no longer available.');
    const proof = proofSnapshot.val();
    const image = document.createElement('img');
    image.className = 'proof-preview-image';
    image.src = proof.imageDataUrl;
    image.alt = 'Resident payment screenshot';
    const link = document.createElement('a');
    link.className = 'proof-link';
    link.href = proof.imageDataUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open full-size screenshot';
    const wrapper = document.createElement('div');
    wrapper.className = 'proof-viewer';
    wrapper.append(image, link);
    item.append(wrapper);
  } catch (error) {
    alert(`Could not load payment screenshot: ${error.message}`);
  }
}

async function setComplaintStatus(id, status) {
  if (!isAdmin()) return;
  try {
    const updatedAt = Date.now();
    await update(ref(db), {
      [`complaints/${id}/status`]: status,
      [`complaints/${id}/updatedAt`]: updatedAt,
      [`complaints/${id}/solvedAt`]: status === 'solved' ? updatedAt : null
    });
  } catch (error) {
    alert(`Could not update complaint: ${error.message}`);
  }
}

async function approvePayment(paymentKey, payment) {
  if (!isAdmin()) return;
  if (!payment.trxId || payment.trxId === 'N/A') return alert('This payment has no transaction ID to verify.');
  const confirmed = confirm(`Have you checked transaction ${payment.trxId} and confirmed Rs. ${payment.amount} was received for ${payment.month}?\n\nChoose OK only after verifying the transfer in your EasyPaisa, JazzCash, or bank account.`);
  if (!confirmed) return;
  try {
    const monthKey = receiptPeriodKey(payment, paymentKey);
    const counterResult = await runTransaction(ref(db, `settings/receiptCounters/${monthKey}`), (value) => (Number(value) || 0) + 1, { applyLocally: false });
    if (!counterResult.committed) throw new Error('Could not reserve this month’s receipt number. Please try again.');
    const slipNo = String(counterResult.snapshot.val()).padStart(4, '0');
    const generatedAt = Date.now();
    const receipt = {
      slipNo, receiptId: `${monthKey}-${slipNo}`, month: payment.month || monthKey, generatedAt,
      amount: Number(payment.amount) || 0, residentName: payment.residentName || 'Resident', houseNo: payment.houseNo || '—',
      committeeName: currentSettings.committeeName || 'MOHALLA COMMITTEE',
      committeeArea: currentSettings.committeeArea || 'SECTOR 5-A/4, NORTH KARACHI',
      receiverName: 'M. Faizan', accountTitle: currentSettings.accountTitle || 'M. Faizan',
      easypaisaAccount: currentSettings.easypaisaAccount || '03003307099'
    };
    const paymentResult = await runTransaction(ref(db, `payments/${paymentKey}`), (current) => {
      if (!current || current.status !== 'pending' || current.uid !== payment.uid
        || String(current.trxId || '') !== String(payment.trxId || '')
        || Number(current.submittedAt) !== Number(payment.submittedAt)
        || Number(current.amount) !== Number(payment.amount)
        || String(current.month || '') !== String(payment.month || '')) return;
      return { ...current, status: 'approved', verifiedAt: generatedAt, verifiedBy: userData.name || currentUser.uid, proofAttached: false, receipt };
    }, { applyLocally: false });
    if (!paymentResult.committed) throw new Error('The payment changed or is no longer pending. Refresh the fee review and check its status.');
    let proofRemoved = true;
    try {
      await update(ref(db), { [`paymentProofs/${paymentKey}`]: null });
    } catch (proofError) {
      proofRemoved = false;
      console.error('Payment approved, but screenshot cleanup failed:', proofError);
    }
    showMessage('adminReadError', proofRemoved
      ? `Payment approved. Receipt ${slipNo} is ready to print. The uploaded screenshot was deleted.`
      : `Payment approved and receipt ${slipNo} is ready to print, but the screenshot could not be deleted.`, 'success');
  } catch (error) {
    showMessage('adminReadError', `Could not approve payment: ${error.message || 'Unknown error'}`);
    console.error('Payment approval failed:', { code: error.code, detail: error.message, paymentKey });
  }
}

function receiptPeriodKey(payment, paymentKey) {
  const keyMonth = String(paymentKey).match(/_(\d{4}-\d{2})$/)?.[1];
  if (keyMonth) return keyMonth;
  const monthLabel = String(payment.month || '').match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthLabel) {
    const monthNumber = new Date(`${monthLabel[1]} 1, ${monthLabel[2]}`).getMonth() + 1;
    if (monthNumber >= 1 && monthNumber <= 12) return `${monthLabel[2]}-${String(monthNumber).padStart(2, '0')}`;
  }
  const submittedAt = Number(payment.submittedAt);
  if (Number.isFinite(submittedAt) && submittedAt > 0) {
    const date = new Date(submittedAt);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  throw new Error('This payment has no valid month. Refresh the fee review or contact the administrator.');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function printReceipt(receipt) {
  document.getElementById('receiptPrintRoot')?.remove();
  const generatedDate = new Date(receipt.generatedAt || Date.now()).toLocaleDateString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  const amount = Number(receipt.amount || 0).toLocaleString('en-PK');
  const root = document.createElement('section');
  root.id = 'receiptPrintRoot';
  root.className = 'receipt-overlay';
  root.setAttribute('aria-label', 'Printable fee receipt');
  root.innerHTML = `<div class="receipt-toolbar"><strong>Fee receipt ${escapeHtml(receipt.slipNo || '0001')}</strong><div><button type="button" class="button button-primary" data-receipt-print>Print / Save PDF</button><button type="button" class="button button-quiet" data-receipt-close>Close</button></div></div><article class="receipt-paper"><header class="receipt-head"><div class="receipt-seal">MC</div><div><h1>${escapeHtml(receipt.committeeName || 'MOHALLA COMMITTEE')}</h1><p>${escapeHtml(receipt.committeeArea || 'SECTOR 5-A/4, NORTH KARACHI')}</p></div><div class="receipt-ident"><b>RECEIPT NO. ${escapeHtml(receipt.slipNo || '0001')}</b><br>Date: ${escapeHtml(generatedDate)}</div></header><div class="receipt-contacts"><span>Chairman: Kamran Shah · 0321-3444121</span><span>Vice Chairman: Adnan Manzar · 0300-8200967</span><span>President: Adnan Shah · 0310-3012739</span></div><div class="receipt-tagline">MONTHLY COMMUNITY FEE · PAYMENT VERIFIED</div><section class="receipt-fields"><div class="receipt-field"><span>Name</span><b>${escapeHtml(receipt.residentName)}</b></div><div class="receipt-field"><span>House / Flat / Shop No.</span><b>${escapeHtml(receipt.houseNo)}</b></div><div class="receipt-field"><span>For the month of</span><b>${escapeHtml(receipt.month)}</b></div><div class="receipt-amount">Rs. ${escapeHtml(amount)}/-</div></section><div class="receipt-sign">Receiver’s sign / name <span>${escapeHtml(receipt.receiverName || 'M. Faizan')}</span></div><footer class="receipt-footer"><div><strong>EasyPaisa # ${escapeHtml(receipt.easypaisaAccount || '—')}</strong><br><small>Account holder: ${escapeHtml(receipt.accountTitle || 'M. Faizan')}</small></div><small>Slip ${escapeHtml(receipt.receiptId || receipt.slipNo)} · Generated ${escapeHtml(generatedDate)}</small></footer></article>`;
  document.body.append(root);
  document.body.classList.add('receipt-preview-open');
  root.querySelector('[data-receipt-print]').addEventListener('click', () => window.print());
  root.querySelector('[data-receipt-close]').addEventListener('click', () => {
    document.body.classList.remove('receipt-preview-open');
    root.remove();
  });
  window.addEventListener('afterprint', () => document.body.classList.remove('receipt-preview-open'), { once: true });
}

async function rejectPayment(paymentKey, payment) {
  if (!isAdmin()) return;
  const confirmed = confirm(`Reject transaction ${payment.trxId || ''} for House ${payment.houseNo || 'N/A'}? The resident will be asked to check the transaction details and submit again.`);
  if (!confirmed) return;
  try {
    await update(ref(db, `payments/${paymentKey}`), {
      status: 'rejected',
      rejectionReason: 'Transaction could not be verified. Please check the ID and submit again.',
      rejectedAt: Date.now(),
      rejectedBy: userData.name || currentUser.uid
    });
    showMessage('adminReadError', 'Payment rejected. The resident can now correct the details and resubmit.', 'success');
  } catch (error) {
    showMessage('adminReadError', `Could not reject payment: ${error.message}`);
  }
}
