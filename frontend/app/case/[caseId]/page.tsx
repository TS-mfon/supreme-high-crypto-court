"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { judges, judgesById, type JudgeId } from "@/lib/judges";
import { useCourtCase } from "@/lib/hooks/useSupremeHighCryptoCourt";

function formatDate(value: string) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "Recorded on-chain";
  }
  return new Date(timestamp * 1000).toLocaleString();
}

export default function CasePage() {
  const params = useParams<{ caseId: string }>();
  const caseId = Number(params.caseId);
  const courtCase = useCourtCase(Number.isFinite(caseId) ? caseId : null);

  if (courtCase.isLoading) {
    return (
      <main className="court-shell verdict-shell">
        <div className="loading-chamber">
          <div className="seal">SHCC</div>
          <h1>The court record is being retrieved.</h1>
          <p>GenLayer is opening the docket.</p>
        </div>
      </main>
    );
  }

  if (courtCase.error || !courtCase.data) {
    return (
      <main className="court-shell verdict-shell">
        <div className="loading-chamber">
          <h1>Case not found.</h1>
          <p>{courtCase.error?.message ?? "The docket does not contain this case."}</p>
          <Link href="/">Return to court</Link>
        </div>
      </main>
    );
  }

  const data = courtCase.data;

  return (
    <main className="court-shell verdict-shell">
      <div className="court-topbar">
        <Link href="/">File another case</Link>
        <Link href="/archives">Public docket</Link>
      </div>

      <section className="verdict-header">
        <p className="eyebrow">Case #{data.case_id}</p>
        <h1>{data.verdict}</h1>
        <div className="score-medallion">
          <strong>{data.final_score}</strong>
          <span>/100</span>
        </div>
        <p>{formatDate(data.created_at)}</p>
      </section>

      <section className="case-transcript">
        <p className="eyebrow">Filed brief</p>
        <blockquote>{data.case_text}</blockquote>
      </section>

      <section className="verdict-grid" aria-label="Judge scores">
        {judges.map((judge) => {
          const evaluation = data.evaluations[judge.id as JudgeId];
          const score = evaluation?.score ?? 0;
          return (
            <article className="verdict-card" key={judge.id}>
              <div className="verdict-card-top">
                <div className="portrait-frame small">
                  <Image src={judge.image} alt={judge.name} fill sizes="96px" />
                </div>
                <div>
                  <p className="eyebrow">{judgesById[judge.id].bench}</p>
                  <h2>{judge.name}</h2>
                  <span>{evaluation?.verdict_word ?? "Filed"}</span>
                </div>
                <strong className="score-pill">{score}/100</strong>
              </div>
              <div className="score-bar" aria-hidden="true">
                <span style={{ width: `${score}%` }} />
              </div>
              <p className="key-point">{evaluation?.key_point ?? judge.profile}</p>
              <p>{evaluation?.reasoning ?? "No reasoning returned for this judge."}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
