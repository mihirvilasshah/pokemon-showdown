import type { Metadata } from "next";
import { HistoryView } from "@/components/pokedex/history-view";

export const metadata: Metadata = {
  title: "Battle History",
  description: "Your recent simulated battles, stored locally in your browser.",
};

export default function HistoryPage() {
  return (
    <div className="container py-10">
      <p className="eyebrow">Local only</p>
      <h1 className="font-display text-4xl font-black sm:text-5xl">Battle history</h1>
      <p className="mb-8 mt-2 max-w-2xl text-muted">
        Results are saved in your browser&apos;s local storage. Nothing is sent to a server, and no account is needed.
      </p>
      <HistoryView />
    </div>
  );
}
