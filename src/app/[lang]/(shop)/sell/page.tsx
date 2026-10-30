import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/i18n/link";
import {
  BadgePercentIcon,
  BanknoteIcon,
  CircleCheckIcon,
  ClipboardListIcon,
  PackageCheckIcon,
  ShieldCheckIcon,
  StoreIcon,
  TruckIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSellerForUser } from "@/lib/sellers";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sell on Trendz",
  description: "Reach buyers across Pakistan with your refurbished phones, laptops and tablets.",
};

const COMMISSION = "10%";

export default function SellPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-16 px-4 py-8 md:py-12">
      <section className="rounded-3xl bg-ink px-6 py-14 text-white md:px-14 md:py-20">
        <p className="font-semibold text-mango">For refurbishers and phone shops</p>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          Sell your refurbished devices to all of Pakistan
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-white/75">
          List from our catalog in minutes. We bring the buyers, handle cash on delivery and pay you every week.
        </p>
        <div className="mt-8">
          <Suspense fallback={<ApplyButton href="/sell/apply" label="Apply to sell" />}>
            <SellerCta />
          </Suspense>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-4">
        {[
          { icon: UsersIcon, title: "Buyers nationwide", text: "Your listings appear next to the best prices across the country." },
          { icon: BadgePercentIcon, title: `${COMMISSION} commission`, text: "Only on what you sell. No listing or monthly fees." },
          { icon: BanknoteIcon, title: "We collect the cash", text: "Cash on delivery is collected for you and paid out weekly." },
          { icon: ClipboardListIcon, title: "No product pages to write", text: "Pick the model, condition and color from our catalog." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title}>
            <Icon className="size-8 text-primary" />
            <p className="mt-3 font-semibold">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-6 text-2xl font-bold tracking-tight">How it works</h2>
        <ol className="grid gap-4 md:grid-cols-4">
          {[
            { icon: StoreIcon, title: "Apply", text: "Tell us about your shop. We review applications within 2 working days." },
            { icon: ClipboardListIcon, title: "List your stock", text: "Choose models from our catalog and set your price and stock." },
            { icon: TruckIcon, title: "Ship orders", text: "Confirm each order and hand it to your courier within 2 working days." },
            { icon: BanknoteIcon, title: "Get paid", text: "Earnings from delivered orders are paid to your bank every week." },
          ].map(({ icon: Icon, title, text }, i) => (
            <li key={title} className="rounded-2xl border p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <Icon className="size-5 text-muted-foreground" />
              </div>
              <p className="mt-4 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="standards" className="scroll-mt-40 rounded-3xl bg-mint p-6 md:p-10">
        <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ShieldCheckIcon className="size-7 text-primary" /> Seller quality standards
        </h2>
        <p className="mt-2 max-w-2xl text-foreground/75">
          Buyers trust Trendz because every seller follows the same rules. Sellers who don&apos;t can be suspended.
        </p>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {[
            "Grade every device honestly using the Trendz condition guide",
            "Run the full inspection checklist and wipe all personal data",
            "Offer at least a 12-month warranty and accept 15-day returns",
            "Confirm orders within 1 working day and ship within 2",
            "State PTA status correctly; never sell blocked or stolen devices",
            "Keep stock up to date so buyers never order something you don't have",
          ].map((rule) => (
            <li key={rule} className="flex gap-2 text-sm">
              <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" /> {rule}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-center rounded-3xl border p-10 text-center">
        <PackageCheckIcon className="size-10 text-primary" />
        <h2 className="mt-4 text-2xl font-bold tracking-tight">Ready to start selling?</h2>
        <p className="mt-2 text-muted-foreground">It takes about 5 minutes. Have your CNIC and bank details ready.</p>
        <div className="mt-6">
          <ApplyButton href="/sell/apply" label="Apply to sell" />
        </div>
      </section>
    </div>
  );
}

/** Changes the call to action for people who already applied or already sell. */
async function SellerCta() {
  const session = await getSession();
  const seller = session ? await getSellerForUser(session.user.id) : null;
  if (seller?.status === "APPROVED") return <ApplyButton href="/seller" label="Go to your seller dashboard" />;
  if (seller) return <ApplyButton href="/sell/status" label="Check your application" />;
  return <ApplyButton href="/sell/apply" label="Apply to sell" />;
}

function ApplyButton({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild size="lg" className="h-12 bg-lime px-8 text-base text-ink hover:bg-lime/90">
      <Link href={href}>{label}</Link>
    </Button>
  );
}
