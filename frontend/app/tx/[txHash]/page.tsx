"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { judges, judgesById, type JudgeId } from "@/lib/judges";
import { useCourtTransaction } from "@/lib/hooks/useSupremeHighCryptoCourt";
import type { RecoveredCourtCase, TransactionReceipt } from "@/lib/contracts/types";

function isObject(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function recoverCaseFromReceipt(receipt?: TransactionReceipt): RecoveredCourtCase | null {
  const leaderReceipts = Array.isArray(receipt?.consensus_data?.leader_receipt)
    ? receipt?.consensus_data?.leader_receipt
    : [];

  for (const leaderReceipt of leaderReceipts) {
    if (!isObject(leaderReceipt?.eq_outputs)) {
      continue;
    }

    for (const value of Object.values(leaderReceipt.eq_outputs)) {
      const payload = isObject(value) && "payload" in value ? value.payload : value;

      if (isObject(payload) && typeof payload.readable === "string") {
        const jsonText = extractJsonObject(payload.readable) ?? payload.readable;
        try {
          const parsed = JSON.parse(jsonText);
          if (isObject(parsed) && isObject(parsed.evaluations)) {
            return {
              case_id: null,
              case_text: "",
              evaluations: parsed.evaluations as Record<JudgeId, any>,
              final_score: Number(parsed.final_score ?? 0),
              verdict: String(parsed.verdict ?? "UNAVAILABLE"),
              created_at: "0",
              crypto_relevance_reason:
                parsed.crypto_relevance_reason === undefined
                  ? undefined
                  : String(parsed.crypto_relevance_reason),
              is_crypto_case:
                typeof parsed.is_crypto_case === "boolean" ? parsed.is_crypto_case : undefined,
            };
          }
        } catch {
          continue;
        }
      }
    }
  }

  return null;
}

function getRuntimeError(receipt?: TransactionReceipt): string | null {
  const leaderReceipts = Array.isArray(receipt?.consensus_data?.leader_receipt)
    ? receipt?.consensus_data?.leader_receipt
    : [];

  for (const leaderReceipt of leaderReceipts) {
    const stderr = leaderReceipt?.genvm_result?.stderr;
    if (typeof stderr === "string" && stderr.trim()) {
      return stderr.trim();
    }
  }

  return null;
}

function extractCaseText(receipt?: TransactionReceipt): string {
  const decoded = isObject(receipt?.txDataDecoded) ? receipt?.txDataDecoded : null;
  const callData = decoded && isObject(decoded.callData) ? decoded.callData : null;
  const callArgs = callData?.args;
  if (Array.isArray(callArgs) && typeof callArgs[0] === "string") {
    return callArgs[0];
  }
  return "";
}

export default function TransactionResultPage() {
  const params = useParams<{ txHash: string }>();
  const txHash = params.txHash;
  const transaction = useCourtTransaction(txHash);
  const recovered = recoverCaseFromReceipt(transaction.data);
  const runtimeError = getRuntimeError(transaction.data);
  const caseText = extractCaseText(transaction.data);
  const statusName = transaction.data?.statusName ?? "PENDING";
  const isThinking = ["PENDING", "PROPOSING", "COMMITTING", "REVEALING"].includes(statusName);

  if (transaction.isLoading && !transaction.data) {
    return (
      <main className="court-shell verdict-shell">
        <div className="loading-chamber">
          <div className="seal">SHCC</div>
          <h1>The jury is assembling.</h1>
          <p>The court is polling GenLayer for this transaction.</p>
        </div>
      </main>
    );
  }

  if (transaction.error && !transaction.data) {
    return (
      <main className="court-shell verdict-shell">
        <div className="loading-chamber">
          <h1>Transaction unavailable.</h1>
          <p>{transaction.error.message}</p>
          <Link href="/">Return to court</Link>
        </div>
      </main>
    );
  }

  if (!recovered) {
    return (
      <main className="court-shell verdict-shell">
        <div className="court-topbar">
          <Link href="/">File another case</Link>
          <Link href="/archives">Public docket</Link>
        </div>

        <div className="loading-chamber">
          <div className="seal">SHCC</div>
          <h1>{isThinking ? "The jury is deliberating." : "The record is incomplete."}</h1>
          <p>Transaction status: {statusName}</p>
          {runtimeError && <p className="error-text">{runtimeError.split("\n")[0]}</p>}
          <p className="muted-hash">{txHash}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="court-shell verdict-shell">
      <div className="court-topbar">
        <Link href="/">File another case</Link>
        <Link href="/archives">Public docket</Link>
      </div>

      <section className="verdict-header">
        <p className="eyebrow">Recovered from transaction</p>
        <h1>{recovered.verdict}</h1>
        <div className="score-medallion">
          <strong>{recovered.final_score}</strong>
          <span>/100</span>
        </div>
        <p>Transaction status: {statusName}</p>
      </section>

      <section className="case-transcript">
        <p className="eyebrow">Filed brief</p>
        <blockquote>{caseText || "The brief was recovered from the transaction receipt."}</blockquote>
      </section>

      {runtimeError && (
        <section className="case-transcript">
          <p className="eyebrow">Contract runtime error</p>
          <blockquote>{runtimeError.split("\n")[0]}</blockquote>
        </section>
      )}

      <section className="verdict-grid" aria-label="Judge scores">
        {judges.map((judge) => {
          const evaluation = recovered.evaluations[judge.id as JudgeId];
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
