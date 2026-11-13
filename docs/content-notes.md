# Footer pages: what the owner should check before publishing

The help, policy and journal pages are written content, not code. They were drafted from what the store already promises (12-month
warranty, 15-day returns, cash on delivery, PTA status on every phone) and from public guidance, then written in English and Urdu.
They state business rules, so **someone who knows how the shop really works must read them once.** A lawyer should read the Terms and
the Privacy policy: they are sensible plain-language drafts for an online phone shop in Pakistan, not legal advice.

## Where things live

| What | File |
| --- | --- |
| Text of each page, English | `src/content/pages-en.ts` |
| Text of each page, Urdu | `src/content/pages-ur.ts` |
| Help center questions | `src/content/faq.ts` |
| Journal articles | `src/content/journal.ts` |
| Delivery days, refund days, review date | `src/lib/policy.ts` |
| Warranty months, return days, inspection points, **phone and email** | `src/lib/site.ts` |

`npm test` fails if the English and Urdu versions fall out of step, or a link points at a page that does not exist.

## Fill in first

- **Phone number and email** in `src/lib/site.ts` are still placeholders (`+92 300 0000000`, `support@example.com`). Every page shows them.
- Consider adding the business's legal name and address to the Terms (the law expects a seller's details to be disclosed).

## Rules the pages state: change any that are not true

| Rule | Where | Written as |
| --- | --- | --- |
| Delivery time | `policy.ts` | 2 to 5 working days after confirmation |
| Refund time | `policy.ts` | 7 working days after the returned phone passes the check |
| Return period / warranty | `site.ts` | 15 days / 12 months |
| Who pays return courier | Returns | Shop pays if faulty or not as described; customer pays if they changed their mind |
| Delivery charge on a return | Returns | Not refunded unless the phone is faulty or not as described |
| Refused parcel | Shipping | Cash on delivery: pay nothing. Prepaid: phone price refunded, delivery charge kept |
| Warranty exclusions | Warranty | Physical and liquid damage, outside repair, software tampering, loss, normal battery ageing |
| Every phone is checked for account locks before listing | FAQ, Promise | Stated as fact |
| CNIC and IMEI recorded on trade-in | Trade-in | May ask for CNIC; always records IMEI |
| Orders are confirmed by phone before dispatch; unreachable customers may be cancelled | Shipping, Cash on delivery, Terms | Matches how the ERP works |

The delivery charges and whether cash on delivery is on are **not** written in the text: the shipping page shows today's charges from the
ERP's settings, and the cash-on-delivery page warns if it has been switched off.

## Facts from public sources (check they are still current)

- PTA status can be checked by SMS of the 15-digit IMEI to 8484, on the DVS website (dvs.pta.gov.pk) or in the DVS app. Source: PTA's DIRBS FAQ
  (dirbs.pta.gov.pk). The articles do not quote fees or duty amounts because those change.
- Apple's battery guidance (service suggested below about 80% capacity), Activation Lock and the sign-out order before erasing are from Apple's and
  common seller guidance.
- Pakistan has no dedicated data-protection law in force yet (a draft bill exists); the Privacy policy follows good practice rather than a statute.
  Provincial consumer-protection laws apply to online sales. Confirm the current position with a Pakistani lawyer.
