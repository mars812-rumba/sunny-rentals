import { winterGuideEditorial, winterGuideSlug } from "@/content/winter-guide";
import { carOrTaxiEnglish } from "@/content/car-or-taxi-guide";

interface EditorialTranslation {
  image?: string;
  title: string;
  description: string;
  content: string;
  imageAlt: string;
  imageCaption: string;
}
interface BlogEditorial {
  updatedAt?: string;
  image?: string;
  ru?: Partial<EditorialTranslation>;
  en?: EditorialTranslation;
}

export const blogEditorial: Record<string, BlogEditorial> = {
  "car-or-taxi-phuket": {
    image: "/images/articles/car-or-taxi-phuket-vs.webp",
    ru: {
      imageAlt: "Сравнение такси и самостоятельной аренды автомобиля на Пхукете",
    },
    en: carOrTaxiEnglish,
  },
  [winterGuideSlug]: winterGuideEditorial,
  "choose-car-rental-phuket-reviews": {
    image: "/images/articles/choosing-a-rental-phuket.webp",
    ru: {
      description: "Как читать свежие отзывы о прокате на Пхукете, оценивать ответы компании и заранее уточнять депозит, страховку и условия возврата машины.",
      imageAlt: "Ключ от автомобиля и блокнот для планирования поездки на фоне побережья Пхукета",
      imageCaption: "Тематическая иллюстрация, созданная с помощью ИИ; не фотография нашей выдачи автомобиля.",
    },
    en: {
      title: "How to choose a Phuket car rental company using reviews",
      description: "What to look for in recent reviews, how to read a rental company's replies and which questions to settle before booking a car in Phuket.",
      imageAlt: "A car key and travel notebook on a table overlooking the Phuket coastline",
      imageCaption: "AI-generated editorial illustration, not a photograph of an actual Sunny handover.",
      content: `When choosing a car rental company in Phuket, look for recent, detailed reviews, recurring situations and the company's replies. An average rating is a useful starting point, but it does not explain how a vehicle return or a deposit dispute is handled. At Sunny Rentals, we suggest using reviews to build a list of questions to settle before booking.

## First, check who the review is about

Match the company name, website, contact details and collection location. A review of another branch or an intermediary may tell you little about the rental company you will sign with.

Separate the booking platform from the rental company's work. Convenient online payment does not describe the vehicle handover. Equally, a complaint about an app does not necessarily concern the rental staff.

If a listing combines several services, look specifically for car rental experiences. Good reviews for excursions or accommodation do not demonstrate the quality of a car rental service.

## Check the travel date, not just the posting date

Start with recent months, then read older reviews for comparison. This is a practical way to browse, not a fixed expiry date: a detailed account of an older dispute may still suggest a useful question.

When both dates are given, distinguish the rental date from the review date. Someone may have posted several months after travelling. Consider the circumstances too: a late-night airport collection and a daytime hotel handover are different situations.

Check whether the same problem appears in more recent reviews. One old incident and several similar recent reports deserve different attention. However, a lack of new complaints does not prove that a problem was resolved.

## Look for specifics on both sides

A review is more useful when it explains what was agreed before payment, what happened during the rental and how the situation ended. The rental length, handover location, nature of the issue and outcome help you judge whether it resembles your own trip.

A short compliment conveys an overall impression but says little about refunds or disputed charges. An angry complaint without context also leaves too much unknown.

The author's history, photographs and details can add context. Neither a new profile nor the absence of pictures proves that a review is fake. A single piece of writing cannot reliably establish authenticity.

## Notice recurring situations

Group your observations around a few practical questions:

- Did the agreed handover time and location match what happened?
- Did the car match its description?
- Were payments clear before booking?
- How was the deposit returned?
- Did the customer receive a meaningful response to a question?

Read positive and negative reviews. Several independent, detailed accounts of the same situation offer more grounds for a question than a general comment about good service.

Check that you are not reading one incident on several platforms. Identical photographs, dates and circumstances may indicate a repost rather than separate events. Counting those as independent complaints would be misleading.

## Read the company's reply to the end

A useful response addresses the issue: the company explains its position, refers to agreed terms or describes a proposed solution. Courtesy matters, but a generic thank-you beneath a detailed complaint does little to clarify what happened.

Look for a follow-up from the author. An invitation to discuss an issue is not evidence that it was resolved. An updated review explaining the outcome gives you more information.

When the parties contradict each other, you do not need to decide who is at fault from a comment thread. Turn the dispute into a question for your own booking: which contract term applies, what supports a deduction and who confirms the conditions? The absence of a public response does not prove fault either, but it leaves a question unanswered.

## What to ask before booking

After reading reviews, prepare a short list of specific questions. These are useful starting points:

- Who will be named as the lessor in the agreement, and who receives payment?
- Can you read the terms for the selected car in advance?
- Which amounts are rental charges, a booking advance and a refundable deposit?
- How is the deposit returned, and what may justify a deduction?
- Which insurance cover, exclusions and excess apply?
- How are the collection and return locations, times and charges agreed?

Ask for an explanation that applies to your trip. A general description is less useful than written confirmation for your selected vehicle and dates. Compare it with the agreement before paying, and resolve discrepancies beforehand.

## Apply the same checks to our rental service

You should apply the same checks to Sunny Rentals. Start with our [rental terms](/en/rental-terms/) and compare them with the questions raised by the reviews you have read.

We return the car deposit after inspecting the vehicle for damage. The fuel level on return must match the level at collection. Check the agreement for the refund method and possible deductions; our [deposit guide](/en/deposit/) explains the purpose of this amount. A booking advance, a refundable deposit and an insurance excess are different things.

You have a sounder basis for choosing when you know who you are signing with, have answers to the important questions and can see that promises match the written terms. A high rating complements those checks.

Once the essential questions are settled, browse [our car catalogue](/en/cars/) to choose a suitable vehicle for your trip.`,
    },
  },
};
