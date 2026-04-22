"use client";

import Link from "next/link";
import { getContractAddress } from "@/lib/genlayer/client";
import { useRecentCases } from "@/lib/hooks/useSupremeHighCryptoCourt";

function formatDate(value: string) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "On-chain";
  }
  return new Date(timestamp * 1000).toLocaleDateString();
}

export default function ArchivesPage() {
  const contractAddress = getContractAddress();
  const recentCases = useRecentCases(20);

  return (
    <main className="court-shell archive-shell">
      <div className="court-topbar">
        <Link href="/">Return to court</Link>
        <span>Public docket</span>
      </div>

      <section className="archive-header">
        <p className="eyebrow">Supreme High Crypto Court</p>
        <h1>Case archives</h1>
        <p>Recent crypto cases accepted by the court and recorded through GenLayer.</p>
      </section>

      {!contractAddress && <p className="notice wide">Contract address is not configured yet.</p>}
      {recentCases.isLoading && <p className="notice wide">The clerk is opening the docket.</p>}
      {recentCases.error && <p className="error-text wide">{recentCases.error.message}</p>}

      <section className="archive-list">
        {recentCases.data?.length === 0 && <p className="notice wide">No cases have been filed yet.</p>}
        {recentCases.data?.map((item) => (
          <Link className="archive-row" href={`/case/${item.case_id}`} key={item.case_id}>
            <span>#{item.case_id}</span>
            <div className="archive-verdict">
              <strong>{item.verdict}</strong>
              <small>{item.analysis_mode === "critical" ? "Critical analysis" : "Standard verdict"}</small>
            </div>
            <p>{item.case_preview}</p>
            <em>{item.final_score}/100</em>
            <time>{formatDate(item.created_at)}</time>
          </Link>
        ))}
      </section>
    </main>
  );
}
