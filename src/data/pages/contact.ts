/**
 * Copy for `/contact/`. Word for word from jenna-rhae-web-spark/src/routes/contact.tsx.
 * The mockup's "Form functionality added after approval" line is a build note and is not shipped.
 * The `form` messages (success, failure, no-JS, SMS consent) are not in the mockup. They are written to the
 * brief (no phone, "email info@jennarhae.com or book a call") and the SMS consent text needs human or legal review.
 */
import type { PageData } from "../types";

const page = {
  path: "/contact/",
  seo: {
    title: "Contact Jenna White | Christian Life Coach — JennaRhae",
    description:
      "Ready to take the first step? Book a free consultation with Jenna White — Christian life coach and Certified Biblical Counselor. Online nationwide and in-person in Kansas City, MO.",
    ogTitle: "Contact Jenna White | JennaRhae",
    ogDescription:
      "Book a free consultation with Jenna White. No pressure, no commitment — just an honest conversation.",
    ogImage: "hero-contact",
  },
  hero: {
    image: "hero-contact",
    imageAlt: "Hands around a warm coffee mug with an open journal — contact Jenna White",
    overlayOpacity: 45,
    eyebrow: "Get in Touch",
    title: "Let's Talk — Book Your Free Consultation",
    subtitleBold: "The first step is a conversation. No pressure. No commitment.",
    subtitle: "Just an honest talk about where you are and whether coaching together makes sense.",
    ctaLabel: "Book a Free Consultation Call",
    meta: [
      { icon: "mail", text: "info@jennarhae.com", mailto: true },
      { icon: "map-pin", text: "In-Person Available in Kansas City, MO" },
      { icon: "monitor", text: "Online — Available Nationwide" },
    ],
  },
  blocks: [
    { type: "booking" },
    { type: "lead-form" },
    {
      type: "notice",
      bg: "gold",
      text: "Sessions are available online nationwide and in-person throughout Kansas City, MO. Location details for in-person sessions are confirmed at booking.",
    },
    {
      type: "faq",
      bg: "cream",
      eyebrow: "Before You Reach Out",
      heading: "Common Questions",
      items: [
        {
          q: "What happens on the free consultation call?",
          a: "You and Jenna spend about 15-20 minutes talking through where you are, what you are carrying, and what you are hoping for. There is no sales pitch and no pressure. At the end, you will both have a clear sense of whether coaching together is the right next step.",
        },
        {
          q: "How quickly will Jenna respond to a message?",
          a: "Jenna does her best to respond to all inquiries promptly. For the fastest response, booking directly through the calendar is recommended.",
        },
        {
          q: "Do I have to commit to a coaching package to get started?",
          a: "No. The free consultation call is a no-commitment conversation. Coaching options and next steps are discussed after that call, based on what you actually need.",
        },
        {
          q: "Is the free consultation call in-person or online?",
          a: "Both options are available. If you are in Kansas City, MO and prefer to meet in person for your initial conversation, note that preference when booking and Jenna will confirm a local meeting place.",
        },
        {
          q: "What if I am not sure coaching is right for me?",
          a: "That is exactly what the free consultation call is for. You do not need to have clarity before you reach out — you just need to be willing to have an honest conversation. Jenna will help you figure out the rest.",
        },
      ],
    },
    {
      type: "final-cta",
      quote: "“You don't need to have it figured out. You just need to take one step.”",
      ctaLabel: "Book Your Free Consultation Call",
    },
  ],
  form: {
    eyebrow: "Contact Form",
    heading: "Send Jenna a Message",
    firstName: { label: "First Name", placeholder: "First name" },
    lastName: { label: "Last Name", placeholder: "Last name" },
    email: { label: "Email Address", placeholder: "you@email.com" },
    phone: { label: "Phone Number", optional: "(optional)", placeholder: "(optional)" },
    message: { label: "What brings you here?", placeholder: "Share as much or as little as you'd like..." },
    howHeard: {
      label: "How did you find Jenna?",
      placeholder: "Select an option",
      options: ["Google Search", "Instagram", "Referral", "Other"],
    },
    howHeardFieldLabel: "How did you find Jenna?",
    smsFieldLabel: "SMS consent",
    honeypotLabel: "Website",
    smsConsent: {
      lead: "I agree to receive text messages from JennaRhae at the phone number I provided. Message and data rates may apply. Reply STOP to opt out. Read our",
      links: [
        { label: "Privacy Policy", href: "/privacy/" },
        { label: "Terms of Service", href: "/terms/" },
        { label: "Text Messaging Terms", href: "/text-messaging-terms/" },
      ],
    },
    submit: "Send My Message",
    sending: "Sending...",
    success: "Thank you. Your message was sent.",
    invalid: "Please check the fields and try again.",
    unconfirmed: "We could not confirm that your message was sent. Your message is still here.",
    rateLimited: "Please wait a minute and try again.",
    notProduction: "This form only sends messages from jennarhae.com.",
    loading: "Form loading...",
    noscript: "This form needs JavaScript.",
    fallbackEmailLead: "You can also email",
    fallbackOr: "or",
    fallbackBookLabel: "book a call",
  },
} satisfies PageData;

export default page;
