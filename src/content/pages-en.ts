import { policy } from "@/lib/policy";
import { site } from "@/lib/site";
import type { Doc, PageKey } from "./types";

const { deliveryMinDays: min, deliveryMaxDays: max, refundWorkingDays: refund } = policy;
const days = site.returnDays;
const months = site.warrantyMonths;

export const pagesEn: Record<PageKey, Doc> = {
  shipping: {
    title: "Shipping & delivery",
    description: "How long delivery takes, what it costs and what to do when your parcel arrives.",
    intro: "We deliver across Pakistan by courier. Every order is confirmed by phone first, then dispatched with a tracking number.",
    blocks: [
      {
        heading: "How an order moves",
        steps: [
          "You place your order. The phone you chose is set aside for you straight away, so nobody else can buy it.",
          "We call you on the number you gave to confirm the order. Please keep your phone on.",
          "We pack the order, check it once more and hand it to the courier. Your order page then shows the courier and the tracking number.",
          "The courier delivers. You check the parcel and pay the rider if you chose cash on delivery.",
        ],
      },
      {
        heading: "Delivery time",
        paragraphs: [
          `Most orders reach you in ${min} to ${max} working days after we confirm them. Remote areas can take longer. Public holidays and courier delays are outside our control, but your tracking number always shows where the parcel is.`,
        ],
      },
      {
        heading: "Delivery charges",
        paragraphs: [
          "The charge depends on your province and the value of your order, and large orders ship free. The exact amount is shown at checkout before you confirm, and it does not change after you place the order.",
        ],
      },
      {
        heading: "When the parcel arrives",
        list: [
          "Check that the box is sealed and carries your name. If it looks opened or damaged, do not accept it: tell the rider and call us.",
          "Switch the phone on and dial *#06# to see its IMEI numbers. Note them down: they let us match your phone to our records if you ever need a return or a warranty claim.",
          "Check the screen, cameras and charging before the rider leaves, if the courier allows it. If it does not, you can still return the phone within the return period.",
        ],
      },
      {
        heading: "If you cannot take the delivery",
        paragraphs: [
          "The courier will try again or bring the parcel back to us. If you refuse a cash-on-delivery parcel, you pay nothing.",
          "If you paid in advance and then refuse the parcel or are not reachable, the price of the phone is refunded once the parcel is back with us and has been checked. The delivery charge you paid is not refunded, because the delivery was attempted.",
        ],
      },
      {
        heading: "Tracking and changes",
        paragraphs: [
          "Track your order with your order number and the phone number you ordered with. If you need to change the address or the phone number, tell us before the order is dispatched.",
        ],
        links: [{ label: "Track my order", href: "/orders" }],
      },
    ],
  },

  returns: {
    title: "Returns & refunds",
    description: `Send it back within ${days} days of delivery. What we accept, how to return and when you are refunded.`,
    intro: `Changed your mind, or something is not right? You have ${days} days from the day your parcel is delivered to send the phone back.`,
    blocks: [
      {
        heading: "What you can return",
        list: [
          `Any phone or accessory, within ${days} days of delivery.`,
          "It must be the same device we sent (the IMEI must match), in the condition we sent it, with its box, cable and everything that came with it.",
          "Phones must be signed out of your accounts (Apple Account and Find My, Google and Samsung accounts) and erased. A phone still locked to your account cannot be accepted.",
        ],
      },
      {
        heading: "What we cannot accept",
        list: [
          "Phones with cracks, dents, bends or liquid damage that happened after delivery.",
          "Phones that have been opened or repaired by anyone else.",
          `Returns after ${days} days. If the phone is faulty, use the warranty instead.`,
        ],
      },
      {
        heading: "How to return",
        steps: [
          "Contact us with your order number and the reason for the return.",
          "We tell you how and where to send the phone, and arrange a pickup where we can.",
          "When it arrives we check the IMEI, the condition and that it works.",
          "We refund you, or credit the value towards another phone if you prefer to exchange.",
        ],
      },
      {
        heading: "Refunds",
        paragraphs: [
          `Once the phone reaches us and passes the check, we send your refund within ${refund} working days. For prepaid orders it goes back the way you paid. For cash-on-delivery orders we send it to a bank account, Easypaisa or JazzCash account of your choice.`,
          "The delivery charge is not refunded when the parcel was delivered to you, unless the phone is faulty or not as described.",
        ],
      },
      {
        heading: "Return shipping",
        paragraphs: [
          "If the phone is faulty or not as described, we pay for the return courier. If you simply changed your mind, the courier cost of sending it back is yours.",
        ],
      },
      {
        heading: "Exchanges",
        paragraphs: ["Prefer another phone instead of a refund? Tell us when you contact us. The value of the phone you return is credited towards the new one."],
        links: [{ label: "Warranty claims", href: "/help/warranty" }],
      },
    ],
  },

  warranty: {
    title: "Warranty claims",
    description: `Every device has a ${months}-month warranty. What it covers, what it does not and how to claim.`,
    intro: `Every device we sell comes with a ${months}-month warranty, counted from the day it is delivered.`,
    blocks: [
      {
        heading: "What the warranty covers",
        paragraphs: ["Hardware faults that you did not cause, for example:"],
        list: [
          "Screen or touch problems that did not come from a knock or a drop",
          "Camera, speaker, microphone, charging port or button faults",
          "Wi-Fi, Bluetooth, SIM or network faults",
          "Face ID or fingerprint sensor faults",
          "A battery that fails abnormally early",
        ],
      },
      {
        heading: "What it does not cover",
        list: [
          "Cracks, dents, bends and other physical damage",
          "Liquid damage",
          "Repairs or opening by anyone other than us",
          "Software tampering such as jailbreaking or unofficial firmware",
          "Loss or theft",
          "Normal battery ageing. Capacity falls slowly with use. If the battery is far below the health stated on the product page, contact us.",
        ],
      },
      {
        heading: "How to make a claim",
        steps: [
          "Contact us with your order number, the phone's IMEI and a short description of the problem. A photo or video helps.",
          "We may ask you to try a simple fix first, or to send the phone to us.",
          "We check the phone.",
          "If the fault is covered, we repair it free of charge. If we cannot repair it, we replace it with an equivalent phone or refund you.",
        ],
      },
      {
        heading: "Before you send your phone",
        list: [
          "Back up your data. We are not responsible for data on a phone sent in for repair.",
          "Sign out of your Apple Account or Google account, and send it without your SIM card, memory card and case.",
        ],
      },
      {
        heading: "Your legal rights",
        paragraphs: ["This warranty is in addition to the rights you already have under the law. It does not replace them."],
        links: [{ label: "Returns & refunds", href: "/help/returns" }],
      },
    ],
  },

  cod: {
    title: "Cash on delivery",
    description: "Pay in cash when your phone arrives. How it works and what to check before you pay.",
    intro: "Pay in cash when your phone arrives. Nothing is paid in advance and you do not need a card.",
    blocks: [
      {
        heading: "How it works",
        steps: [
          "Choose Cash on Delivery at checkout and place your order.",
          "We call you to confirm the order. We always make this call before dispatching.",
          "The courier delivers the parcel.",
          "You pay the rider the amount shown on your order, which is the price of the phone plus delivery. Please have the exact amount ready.",
        ],
      },
      {
        heading: "Before you pay",
        list: [
          "Check the box is sealed and carries your name.",
          "Switch the phone on, dial *#06# for the IMEI, and look over the screen and cameras. Some couriers do not allow opening the parcel before payment. If yours does not, you can still return the phone within the return period.",
        ],
      },
      {
        heading: "If you do not want the parcel",
        paragraphs: ["Refuse it at the door and pay nothing. The courier brings it back to us."],
      },
      {
        heading: "Why we call you",
        paragraphs: [
          "The call confirms your address and that the order is really yours. If we cannot reach you after several tries, the order may be cancelled and the phone put back on sale.",
        ],
      },
      {
        heading: "Other ways to pay",
        paragraphs: [
          "Checkout shows the payment methods available today: bank transfer, Easypaisa, JazzCash or card, with the account details to pay into. Send the payment, enter the transaction reference if asked, and we confirm the payment before we dispatch.",
        ],
        links: [{ label: "Shipping & delivery", href: "/help/shipping" }],
      },
    ],
  },

  tradeIn: {
    title: "Trade in your device",
    description: "Tell us about your phone and we will make you an offer. How trade-in works and how to prepare your phone.",
    intro: "Upgrading? Tell us about your phone and we will make you an offer. Trade-in is handled by our team directly, not through the website.",
    blocks: [
      {
        heading: "How it works",
        steps: [
          "Send us the details: model, storage, colour, condition, battery health, whether it is PTA approved, and what comes with it. Photos of the front, the back and the screen switched on help a lot.",
          "We reply with an estimated offer.",
          "You bring or send us the phone. We inspect it and confirm the final price. If the phone matches your description, the price is the one we quoted.",
          "We pay you, or credit the value towards a phone from our store.",
        ],
      },
      {
        heading: "What affects the offer",
        list: ["Model and storage", "Screen and body condition", "Battery health", "PTA status", "Whether everything works", "Box and accessories", "Current demand for the model"],
      },
      {
        heading: "What we cannot buy",
        list: [
          "Phones that are still locked to an account (Apple Activation Lock, or Google account protection after a reset)",
          "Phones reported lost or stolen, or blocked on the network",
          "Phones with a missing or mismatched IMEI",
        ],
      },
      {
        heading: "Before you hand over your phone",
        list: [
          "Back up what you want to keep",
          "Sign out of your Apple Account first (this turns off Find My), then erase the phone",
          "On Android, remove your Google account (and Samsung account) before resetting",
          "Take out the SIM and memory card, and remove cards from your wallet app",
        ],
        links: [{ label: "Read the full guide", href: "/journal/prepare-your-phone-for-trade-in" }],
      },
      {
        heading: "Proof of ownership",
        paragraphs: ["We record the IMEI of every phone we buy and may ask to see your CNIC. This protects you and us from stolen phones."],
      },
    ],
  },

  about: {
    title: "About Trendz",
    description: "Trendz Mobile sells refurbished phones and tech that are checked, honestly graded and covered by a warranty, delivered across Pakistan.",
    intro: "Trendz Mobile sells refurbished phones and tech that have been checked, honestly graded and covered by a warranty, and delivers them anywhere in Pakistan.",
    blocks: [
      {
        heading: "What we do",
        paragraphs: [
          "We buy used phones and tech, inspect them, repair what needs repairing and sell them with a warranty. Every phone is described on its own page: its condition grade, battery health, PTA status and photos.",
        ],
      },
      {
        heading: "Why refurbished",
        paragraphs: ["A good refurbished phone costs much less than a new one and does the same job. And a phone that stays in use is a phone that is not thrown away."],
      },
      {
        heading: "How we keep it honest",
        list: [
          "Four plain condition grades (Fair, Good, Excellent, Premium) with a description of the screen, the body and the battery for each",
          "PTA status shown on every phone, so you know before you order whether it is approved for Pakistani networks",
          `A thorough inspection of up to ${site.inspectionPoints} points before a phone is listed`,
        ],
        links: [{ label: "The Trendz Promise", href: "/promise" }],
      },
      {
        heading: "Buying from us",
        list: [
          `${months}-month warranty on every device`,
          `${days}-day returns`,
          "Cash on delivery across Pakistan",
          "A phone call to confirm every order, so we know it is really yours",
        ],
      },
    ],
  },

  promise: {
    title: "The Trendz Promise",
    description: `Refurbished without the risk: a ${months}-month warranty, ${days}-day returns, an inspection before listing, honest grading and cash on delivery.`,
    intro: "Refurbished without the risk. This is what you can count on with every phone we sell.",
    blocks: [
      {
        heading: "Our promise",
        list: [
          `A ${months}-month warranty on every device`,
          `${days} days to send it back if you change your mind`,
          `Inspected before it is listed, up to ${site.inspectionPoints} checks`,
          "Honest condition grades, described in plain words",
          "PTA status stated on every phone",
          "Pay cash when it arrives",
        ],
        links: [
          { label: "Warranty claims", href: "/help/warranty" },
          { label: "Returns & refunds", href: "/help/returns" },
        ],
      },
      {
        heading: "What we check",
        paragraphs: [
          "Before a phone is listed we test the screen and touch, cameras, speakers and microphone, buttons, charging, Wi-Fi, Bluetooth and the network, the sensors and the battery. We check that it is not locked to a previous owner's account and that its IMEI is valid.",
        ],
      },
      {
        heading: "Condition grades",
        paragraphs: ["Every phone has one of these grades. The product page shows which, and what it means for that phone."],
      },
    ],
  },

  terms: {
    title: "Terms of service",
    description: "The terms that apply when you order from Trendz Mobile.",
    intro: `By placing an order on this website you agree to these terms. Please read them together with our pages on shipping, returns and warranty. Last reviewed ${policy.reviewed}.`,
    blocks: [
      {
        heading: "Who we are",
        paragraphs: [`This website is operated by ${site.name} ("we", "us"). You can reach us at ${site.supportEmail} or ${site.supportPhone}.`],
      },
      {
        heading: "Products and descriptions",
        paragraphs: [
          "We describe each phone as accurately as we can: its condition grade, storage, colour, PTA status and battery health. Photos show the model, and each phone's exact look matches its grade. Prices are in Pakistani rupees.",
        ],
      },
      {
        heading: "Orders",
        list: [
          "When you place an order, we set the phone aside for you. The order is not final until we confirm it with you by phone.",
          "We may cancel an order we cannot confirm, an order with an incorrect address or phone number, or if the phone turns out to be unavailable. If you paid, you are refunded in full.",
          "Prices and stock can change. The price you see at checkout is the price you pay.",
        ],
      },
      {
        heading: "Payment",
        paragraphs: [
          "You can pay by cash on delivery or by bank transfer, Easypaisa, JazzCash or card, as shown at checkout. For payments made in advance we confirm that the money has arrived before we dispatch.",
        ],
      },
      {
        heading: "Delivery, returns and warranty",
        paragraphs: ["Delivery, returns, refunds and warranty are governed by our pages on those topics, which form part of these terms."],
        links: [
          { label: "Shipping & delivery", href: "/help/shipping" },
          { label: "Returns & refunds", href: "/help/returns" },
          { label: "Warranty claims", href: "/help/warranty" },
        ],
      },
      {
        heading: "Your responsibilities",
        list: [
          "Give us correct details, and a phone number we can reach you on",
          "Sign out of your accounts and erase any phone you return or send for repair",
          "Do not use this website to place false or abusive orders",
        ],
      },
      {
        heading: "Our liability",
        paragraphs: [
          "We are responsible for selling you a phone that matches its description and works. Beyond that, and as far as the law allows, we are not liable for indirect or consequential losses. Nothing in these terms limits your rights under the law.",
        ],
      },
      {
        heading: "Law and changes",
        paragraphs: [
          "These terms are governed by the laws of Pakistan. We may update them from time to time; the version on this page when you place your order is the one that applies to that order.",
        ],
      },
    ],
  },

  privacy: {
    title: "Privacy policy",
    description: "What personal information we collect when you order, why, who we share it with and how to contact us about it.",
    intro: `We collect only what we need to deliver your order and look after you afterwards. Last reviewed ${policy.reviewed}.`,
    blocks: [
      {
        heading: "What we collect",
        list: [
          "When you order: your name, phone number, address, city and province, your email if you give one, any notes you add and, for advance payments, the transaction reference",
          "Your order history with us, and any messages you send us",
          "On your own device: your cart, the orders you placed from it and your language choice, stored in your browser. We do not use advertising or tracking cookies.",
        ],
      },
      {
        heading: "Why we use it",
        list: [
          "To confirm your order by phone, prepare it and deliver it",
          "To handle returns, refunds and warranty claims",
          "To answer your questions, and to keep our records as the law requires",
        ],
      },
      {
        heading: "Who we share it with",
        paragraphs: [
          "Courier companies get your name, phone number and address so they can deliver. Banks and payment services see the payment details you send them. We do not sell your information, and we do not share it for advertising.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: ["We keep order records for as long as we need them for warranty, returns, accounting and tax. After that we delete or anonymise them."],
      },
      {
        heading: "Keeping it safe",
        paragraphs: ["Our systems are access-controlled, orders are placed over a secure connection and we collect no card numbers on this website."],
      },
      {
        heading: "Your choices",
        paragraphs: [
          "You can ask what we hold about you, ask us to correct it, or ask us to delete it. We will do so unless we have to keep it by law, for example for accounting. You can clear your cart and saved orders at any time by clearing your browser data.",
        ],
      },
      {
        heading: "Contact us",
        paragraphs: [`Write to ${site.supportEmail} or call ${site.supportPhone} about your information. We may update this policy; the date at the top shows when it was last reviewed.`],
      },
    ],
  },
};
