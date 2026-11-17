import { CategoryId } from '../src/db/schema';

export interface FixtureSample {
  id: string;
  name: string;
  text: string;
  expectedPrimary: CategoryId;
  expectedCatsContain: CategoryId[];
  expectedSensitive: boolean;
  expectedEntitiesCheck?: {
    hasAccount?: boolean;
    hasAmount?: boolean;
    hasDate?: boolean;
    hasUrl?: boolean;
    hasCode?: boolean;
    hasPhone?: boolean;
    hasAddress?: boolean;
  };
}

export const TEST_FIXTURES: FixtureSample[] = [
  // 1. Bank Details - GTBank with Account Name
  {
    id: 'bank-gtb-1',
    name: 'GTBank account transfer details',
    text: `Here are my account details:
Bank: GTBank
Account Number: 0123456789
Account Name: CHUKWUEMEKA OBI
Please send the balance once you can.`,
    expectedPrimary: 'bank_details',
    expectedCatsContain: ['bank_details'],
    expectedSensitive: true,
    expectedEntitiesCheck: { hasAccount: true },
  },

  // 2. Bank Details - OPay
  {
    id: 'bank-opay-1',
    name: 'OPay transfer request',
    text: `Send the money to my OPay wallet:
OPay
8123456780
Acct Name: FATIMA BELLO
Thanks!`,
    expectedPrimary: 'bank_details',
    expectedCatsContain: ['bank_details'],
    expectedSensitive: true,
    expectedEntitiesCheck: { hasAccount: true },
  },

  // 3. Bank Details - Moniepoint
  {
    id: 'bank-moniepoint-1',
    name: 'Moniepoint business account',
    text: `Moniepoint MFB
Acc No: 5543219876
Name: BOLA AHMED VENTURES
Bank: Moniepoint`,
    expectedPrimary: 'bank_details',
    expectedCatsContain: ['bank_details'],
    expectedSensitive: true,
    expectedEntitiesCheck: { hasAccount: true },
  },

  // 4. Bank Details - Access Bank
  {
    id: 'bank-access-1',
    name: 'Access Bank account screenshot',
    text: `Access Bank
0029384756
BABATUNDE LAWAL
Account details for the wedding gift contribution`,
    expectedPrimary: 'bank_details',
    expectedCatsContain: ['bank_details'],
    expectedSensitive: true,
    expectedEntitiesCheck: { hasAccount: true },
  },

  // 5. Bank Details - Zenith Bank
  {
    id: 'bank-zenith-1',
    name: 'Zenith Bank account card',
    text: `Zenith Bank
2081928374
EMMANUEL ADEBAYO
Bank: Zenith`,
    expectedPrimary: 'bank_details',
    expectedCatsContain: ['bank_details'],
    expectedSensitive: true,
    expectedEntitiesCheck: { hasAccount: true },
  },

  // 6. Bank Details - Kuda Bank
  {
    id: 'bank-kuda-1',
    name: 'Kuda Bank MFB account',
    text: `Kuda Bank
Account number: 1102938475
Acct name: NNEKA OKEKE`,
    expectedPrimary: 'bank_details',
    expectedCatsContain: ['bank_details'],
    expectedSensitive: true,
    expectedEntitiesCheck: { hasAccount: true },
  },

  // 7. Bank Details - PalmPay
  {
    id: 'bank-palmpay-1',
    name: 'PalmPay transfer account',
    text: `PalmPay
9012345678
Account Name: YUSUF ALIYU
Bank: PalmPay`,
    expectedPrimary: 'bank_details',
    expectedCatsContain: ['bank_details'],
    expectedSensitive: true,
    expectedEntitiesCheck: { hasAccount: true },
  },

  // 8. Receipt - GTBank Transfer Successful
  {
    id: 'receipt-gtb-1',
    name: 'GTBank Transfer Receipt',
    text: `Transaction Receipt
Transfer Successful
Amount: ₦45,000.00
Beneficiary: CHIOMA NWACHUKWU
Reference: 2026031209384756
Date: 12/03/2026
Narration: House rent balance`,
    expectedPrimary: 'receipt',
    expectedCatsContain: ['receipt'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasAmount: true, hasDate: true },
  },

  // 9. Receipt - Moniepoint POS Receipt
  {
    id: 'receipt-moniepoint-1',
    name: 'Moniepoint POS Payment receipt',
    text: `Moniepoint POS
Payment Successful
Paid ₦8,500.00
Merchant: IKEJA FRESH MART
Date: 15/04/2026
Session ID: MNPT8392019482
Debit card transaction approved`,
    expectedPrimary: 'receipt',
    expectedCatsContain: ['receipt'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasAmount: true, hasDate: true },
  },

  // 10. Receipt - OPay Debit alert
  {
    id: 'receipt-opay-1',
    name: 'OPay Debit Alert receipt',
    text: `Debit Alert
You have sent ₦120,000.00 to ADESHINA TOPE.
Transaction Successful
Date: 2026-05-18
Transaction ID: OPAY92837461
Thank you for using OPay.`,
    expectedPrimary: 'receipt',
    expectedCatsContain: ['receipt'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasAmount: true, hasDate: true },
  },

  // 11. Receipt - Inflow / Credit Alert
  {
    id: 'receipt-credit-1',
    name: 'Bank Credit receipt',
    text: `Credit Notification
Your account has received ₦350,000.00
From: TECH GLOBAL LTD
Ref: TXN94839201
Date: 28/02/2026
Transaction successful`,
    expectedPrimary: 'receipt',
    expectedCatsContain: ['receipt'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasAmount: true, hasDate: true },
  },

  // 12. Receipt - USD Payment
  {
    id: 'receipt-usd-1',
    name: 'USD Transfer receipt',
    text: `Payment Receipt
Payment Successful
Amount: $150.00 paid to CLOUD HOSTING INC
Reference: PAY-992837
Date: 2026-06-10`,
    expectedPrimary: 'receipt',
    expectedCatsContain: ['receipt'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasAmount: true },
  },

  // 13. Chat - WhatsApp conversation
  {
    id: 'chat-whatsapp-1',
    name: 'WhatsApp chat with multiple timestamps',
    text: `Adanna
online
10:42 AM Are you almost at the office?
10:44 AM Yes, currently at Lekki toll gate
10:45 AM Alright, please bring the projector cables
Type a message`,
    expectedPrimary: 'chat',
    expectedCatsContain: ['chat'],
    expectedSensitive: false,
    expectedEntitiesCheck: {},
  },

  // 14. Chat - WhatsApp group conversation
  {
    id: 'chat-whatsapp-2',
    name: 'WhatsApp group discussion',
    text: `Family Group
typing...
08:15 PM Good evening everyone!
08:16 PM Good evening Uncle
08:18 PM Has anyone heard from Grandma today?
08:20 PM Yes, she called this afternoon
Forwarded message`,
    expectedPrimary: 'chat',
    expectedCatsContain: ['chat'],
    expectedSensitive: false,
    expectedEntitiesCheck: {},
  },

  // 15. Chat - Telegram conversation
  {
    id: 'chat-telegram-1',
    name: 'Telegram chat screenshot',
    text: `Dev Team Chat
last seen recently
14:10 The deployment failed on staging
14:12 Looking at the build logs now
14:15 Docker memory limit exceeded, fixing it
Reply to this message`,
    expectedPrimary: 'chat',
    expectedCatsContain: ['chat'],
    expectedSensitive: false,
    expectedEntitiesCheck: {},
  },

  // 16. Event - Wedding Invitation Flyer
  {
    id: 'event-wedding-1',
    name: 'Wedding celebration flyer',
    text: `THE WEDDING CEREMONY OF
Chidinma & Obinna
Date: 14th November 2026
Time: 10:00 AM
Venue: The Monarch Event Centre, Lekki, Lagos
RSVP: 08034567890
Join us as we celebrate our love!`,
    expectedPrimary: 'event',
    expectedCatsContain: ['event'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasDate: true, hasPhone: true },
  },

  // 17. Event - Tech Meetup
  {
    id: 'event-meetup-1',
    name: 'Lagos Tech Meetup flyer',
    text: `LAGOS TECH CONF 2026
Date: 15 October 2026
Starts: 10:00 am
Register now for free tickets
Venue: Landmark Centre, Victoria Island, Lagos
Location: VI, Lagos
Join us for keynotes and panels!`,
    expectedPrimary: 'event',
    expectedCatsContain: ['event'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasDate: true },
  },

  // 18. Event - Birthday Party
  {
    id: 'event-birthday-1',
    name: 'Birthday party invitation',
    text: `CELEBRATING KEMI AT 30!
Date: 25 July 2026
Time: 6:00 PM
Dress code: All White with a touch of gold
RSVP: 08123456789
Venue: Eko Hotel & Suites, Victoria Island`,
    expectedPrimary: 'event',
    expectedCatsContain: ['event'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasDate: true, hasPhone: true },
  },

  // 19. Address - House in Lekki Phase 1
  {
    id: 'address-lekki-1',
    name: 'Delivery address in Lekki',
    text: `Delivery details:
No 14 Admiralty Way, Lekki Phase 1, Lagos
Near Ebeano Supermarket
Call rider on arrival`,
    expectedPrimary: 'address',
    expectedCatsContain: ['address'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasAddress: true },
  },

  // 20. Address - Ikeja Commercial
  {
    id: 'address-ikeja-1',
    name: 'Office address in Ikeja',
    text: `Our Head Office:
24 Allen Avenue, Ikeja, Lagos
Opposite Oshopey Plaza`,
    expectedPrimary: 'address',
    expectedCatsContain: ['address'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasAddress: true },
  },

  // 21. Address - Plot in Abuja
  {
    id: 'address-abuja-1',
    name: 'Abuja residence address',
    text: `Send the package to:
Plot 512 Constitution Avenue, Central Business District, Abuja
Near Ministry of Finance`,
    expectedPrimary: 'address',
    expectedCatsContain: ['address'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasAddress: true },
  },

  // 22. Address - Yaba Street
  {
    id: 'address-yaba-1',
    name: 'Yaba tech hub address',
    text: `Interview Location:
10 Commercial Avenue, Sabo, Yaba, Lagos
Please arrive 15 minutes before time`,
    expectedPrimary: 'address',
    expectedCatsContain: ['address'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasAddress: true },
  },

  // 23. Link - Web article
  {
    id: 'link-article-1',
    name: 'Browser article bookmark',
    text: `Great read on distributed systems architecture:
https://engineering.stripe.com/scaling-databases
Check out the database sharding strategies section.`,
    expectedPrimary: 'link',
    expectedCatsContain: ['link'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasUrl: true },
  },

  // 24. Link - Portfolio & bio domain
  {
    id: 'link-domain-1',
    name: 'Portfolio website share',
    text: `Visit my new portfolio:
adebayo.dev/projects
Also available at adebayodesign.com.ng`,
    expectedPrimary: 'link',
    expectedCatsContain: ['link'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasUrl: true },
  },

  // 25. Link - Github Repo
  {
    id: 'link-github-1',
    name: 'GitHub repository link',
    text: `Here is the open source library repository:
https://github.com/facebook/react-native
Star the repo if you find it helpful!`,
    expectedPrimary: 'link',
    expectedCatsContain: ['link'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasUrl: true },
  },

  // 26. Code/OTP - Bank SMS OTP
  {
    id: 'code-otp-bank-1',
    name: 'Bank transaction OTP SMS',
    text: `Your OTP for the transaction is 492018. Do not share this code or your PIN with anyone including bank staff. Valid for 10 minutes.`,
    expectedPrimary: 'code',
    expectedCatsContain: ['code'],
    expectedSensitive: true,
    expectedEntitiesCheck: { hasCode: true },
  },

  // 27. Code/OTP - WhatsApp Verification
  {
    id: 'code-whatsapp-1',
    name: 'WhatsApp verification code',
    text: `WhatsApp code: 829-102.
You can also tap on this link to verify your phone number.`,
    expectedPrimary: 'code',
    expectedCatsContain: ['code'],
    expectedSensitive: true,
    expectedEntitiesCheck: { hasCode: true },
  },

  // 28. Code/OTP - Google Security Code
  {
    id: 'code-google-1',
    name: 'Google account security code',
    text: `Use verification code 392817 for Google account recovery. Never give this code to anyone.`,
    expectedPrimary: 'code',
    expectedCatsContain: ['code'],
    expectedSensitive: true,
    expectedEntitiesCheck: { hasCode: true },
  },

  // 29. Code/OTP - Login PIN / token
  {
    id: 'code-token-1',
    name: 'Login token confirmation',
    text: `Your one-time token is 772910 to confirm password reset.`,
    expectedPrimary: 'code',
    expectedCatsContain: ['code'],
    expectedSensitive: true,
    expectedEntitiesCheck: { hasCode: true },
  },

  // 30. ID Document - National Identity Number (NIN)
  {
    id: 'id-nin-1',
    name: 'National Identity Management Commission NIN slip',
    text: `FEDERAL REPUBLIC OF NIGERIA
NATIONAL IDENTITY MANAGEMENT COMMISSION
NIN: 48291049281
Date of birth: 14/05/1994
National Identity Card Slip`,
    expectedPrimary: 'id_document',
    expectedCatsContain: ['id_document'],
    expectedSensitive: true,
    expectedEntitiesCheck: {},
  },

  // 31. ID Document - Bank Verification Number (BVN)
  {
    id: 'id-bvn-1',
    name: 'BVN enrollment record',
    text: `CENTRAL BANK OF NIGERIA
BVN ENROLLMENT SLIP
BVN: 22194839201
Date of birth: 22/08/1990
National identity verification status: verified`,
    expectedPrimary: 'id_document',
    expectedCatsContain: ['id_document'],
    expectedSensitive: true,
    expectedEntitiesCheck: {},
  },

  // 32. ID Document - Driver's Licence
  {
    id: 'id-drivers-licence-1',
    name: "Federal Road Safety Driver's Licence",
    text: `FEDERAL ROAD SAFETY CORPS
DRIVER'S LICENCE
Licence No: FRSC-9283-92
Date of birth: 10/11/1988
Class: B
Nigeria Driver Licence`,
    expectedPrimary: 'id_document',
    expectedCatsContain: ['id_document'],
    expectedSensitive: true,
    expectedEntitiesCheck: {},
  },

  // 33. ID Document - International Passport
  {
    id: 'id-passport-1',
    name: 'Nigerian International Passport data page',
    text: `NIGERIA IMMIGRATION SERVICE
PASSPORT
Document: Passport A91827364
Date of birth: 05 Jan 1992
Nationality: Nigerian`,
    expectedPrimary: 'id_document',
    expectedCatsContain: ['id_document'],
    expectedSensitive: true,
    expectedEntitiesCheck: {},
  },

  // 34. Shopping - Jumia Product Page
  {
    id: 'shopping-jumia-1',
    name: 'Jumia product store page',
    text: `Apple iPhone 15 Pro Max 256GB - Natural Titanium
Price: ₦1,850,000.00
In stock
Add to cart
Buy now
Free delivery in Lagos
Checkout securely`,
    expectedPrimary: 'shopping',
    expectedCatsContain: ['shopping'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasAmount: true },
  },

  // 35. Shopping - Fashion Store
  {
    id: 'shopping-clothing-1',
    name: 'Clothing order page',
    text: `Men's Classic Linen Shirt
Price: ₦28,000.00
Size: XL
Colour: Sky Blue
In stock
Add to cart
Order now for next day delivery`,
    expectedPrimary: 'shopping',
    expectedCatsContain: ['shopping'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasAmount: true },
  },

  // 36. Shopping - Shoes checkout
  {
    id: 'shopping-shoes-1',
    name: 'Sneakers checkout screen',
    text: `Nike Air Jordan 1 Low
Price: ₦95,000.00
Size: 44
Colour: Black/White
Checkout
Standard delivery: ₦3,500.00`,
    expectedPrimary: 'shopping',
    expectedCatsContain: ['shopping'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasAmount: true },
  },

  // 37. Little Text - Meme with 5 words
  {
    id: 'little-meme-1',
    name: 'Short funny meme caption',
    text: `When Monday hits you`,
    expectedPrimary: 'little_text',
    expectedCatsContain: ['little_text'],
    expectedSensitive: false,
    expectedEntitiesCheck: {},
  },

  // 38. Little Text - Battery screenshot
  {
    id: 'little-battery-1',
    name: 'Battery percentage capture',
    text: `100% Charging`,
    expectedPrimary: 'little_text',
    expectedCatsContain: ['little_text'],
    expectedSensitive: false,
    expectedEntitiesCheck: {},
  },

  // 39. Other - Recipe note
  {
    id: 'other-recipe-1',
    name: 'Jollof rice ingredients note',
    text: `My special Jollof Rice Recipe:
Blend tomatoes, red bell peppers (tatashi), scotch bonnet (atarodo), and onions together.
Fry chopped onions in vegetable oil, add tomato paste and cook for 10 minutes until fragrant.
Pour in blended pepper mixture, add curry, thyme, bay leaves, and chicken stock. Cook until thick.`,
    expectedPrimary: 'other',
    expectedCatsContain: ['other'],
    expectedSensitive: false,
    expectedEntitiesCheck: {},
  },

  // 40. Other - Workout Routine
  {
    id: 'other-workout-1',
    name: 'Weekly gym exercise list',
    text: `Weekly Fitness Plan:
Chest and Triceps: Flat bench press 4x8, Incline dumbbell press 3x10, Dips 3x12.
Back and Biceps: Pull-ups 4x8, Barbell rows 4x10, Hammer curls 3x12.
Legs and Core: Squats 4x8, Romanian deadlifts 3x10, Planks 3x60s.
Drink plenty of water every morning!`,
    expectedPrimary: 'other',
    expectedCatsContain: ['other'],
    expectedSensitive: false,
    expectedEntitiesCheck: {},
  },

  // 41. Mixed - Chat with Bank details sent inside
  {
    id: 'mixed-chat-bank-1',
    name: 'WhatsApp message containing bank details',
    text: `10:30 AM Bro please send your message with details
10:31 AM Sure, here:
Bank: GTBank
Account Number: 0192837465
Account Name: TUNDE BAKARE
10:32 AM Thanks, making the transfer now`,
    expectedPrimary: 'bank_details',
    expectedCatsContain: ['bank_details', 'chat'],
    expectedSensitive: true,
    expectedEntitiesCheck: { hasAccount: true },
  },

  // 42. Mixed - Shopping page with link
  {
    id: 'mixed-shopping-link-1',
    name: 'Shopping link with price',
    text: `Check out this deal on https://konga.com/deals
Price: ₦65,000.00
Add to cart
Buy now
Checkout today for special discount!`,
    expectedPrimary: 'shopping',
    expectedCatsContain: ['shopping', 'link'],
    expectedSensitive: false,
    expectedEntitiesCheck: { hasAmount: true, hasUrl: true },
  },
];
