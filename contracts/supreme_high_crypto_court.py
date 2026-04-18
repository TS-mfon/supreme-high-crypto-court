# { "Depends": "py-genlayer:test" }

import json
from dataclasses import dataclass
from genlayer import *


ERROR_EXPECTED = "[EXPECTED]"
ERROR_LLM = "[LLM_ERROR]"

MIN_CASE_LENGTH = 50
MAX_CASE_LENGTH = 2000
SCORE_TOLERANCE = 12

JUDGE_IDS = (
    "vitalik_buterin",
    "gavin_wood",
    "sergey_nazarov",
    "anatoly_yakovenko",
    "eli_ben_sasson",
    "illia_polosukhin",
    "balaji_srinivasan",
    "changpeng_zhao",
)


@allow_storage
@dataclass
class CourtCase:
    case_id: u256
    submitter: Address
    case_text: str
    evaluations_json: str
    final_score: u256
    verdict: str
    created_at: str


def _verdict_for_score(score: int) -> str:
    if score >= 85:
        return "LANDMARK RULING"
    if score >= 70:
        return "APPROVED"
    if score >= 55:
        return "PROVISIONAL"
    if score >= 40:
        return "DISPUTED"
    if score >= 25:
        return "REJECTED"
    return "CONTEMPT OF CRYPTO COURT"


def _clamp_score(raw) -> int:
    try:
        value = int(round(float(str(raw).strip())))
    except (ValueError, TypeError):
        raise gl.vm.UserError(f"{ERROR_LLM} Non-numeric score: {raw}")
    if value < 0:
        return 0
    if value > 100:
        return 100
    return value


def _require_text(value, field_name: str) -> str:
    if value is None:
        raise gl.vm.UserError(f"{ERROR_LLM} Missing text field: {field_name}")
    return str(value).strip()


def _normalize_panel(raw: dict) -> dict:
    if not isinstance(raw, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} LLM returned non-object")

    is_crypto_case = raw.get("is_crypto_case")
    if not isinstance(is_crypto_case, bool):
        raise gl.vm.UserError(f"{ERROR_LLM} Missing boolean is_crypto_case")

    reason = _require_text(raw.get("crypto_relevance_reason", ""), "crypto_relevance_reason")
    evaluations = raw.get("evaluations")
    if not isinstance(evaluations, dict):
        raise gl.vm.UserError(f"{ERROR_LLM} Missing evaluations object")

    normalized_evaluations = {}
    for judge_id in JUDGE_IDS:
        judge_raw = evaluations.get(judge_id)
        if not isinstance(judge_raw, dict):
            raise gl.vm.UserError(f"{ERROR_LLM} Missing evaluation for {judge_id}")

        normalized_evaluations[judge_id] = {
            "score": _clamp_score(judge_raw.get("score")),
            "reasoning": _require_text(judge_raw.get("reasoning", ""), "reasoning")[:900],
            "key_point": _require_text(judge_raw.get("key_point", ""), "key_point")[:320],
            "verdict_word": _require_text(judge_raw.get("verdict_word", ""), "verdict_word")[:40],
        }

    total = 0
    for judge_id in JUDGE_IDS:
        total += normalized_evaluations[judge_id]["score"]
    final_score = int(round(total / len(JUDGE_IDS)))

    return {
        "is_crypto_case": is_crypto_case,
        "crypto_relevance_reason": reason[:320],
        "evaluations": normalized_evaluations,
        "final_score": final_score,
        "verdict": _verdict_for_score(final_score),
    }


def _panel_prompt(case_text: str) -> str:
    return f"""
You are the neutral analysis engine for Supreme High Crypto Court.
You are NOT the named people, and you must not claim they endorsed this result.
Evaluate the submitted case through public, observable thinking profiles of all 8 Web3 figures.

Case:
\"\"\"{case_text}\"\"\"

First decide whether the case is meaningfully about crypto, blockchain, Web3, DeFi, NFTs, DAOs,
cryptographic protocols, tokenomics, decentralized AI, digital assets, L2s, wallets, exchanges,
or related decentralized systems. Be generous for edge cases, but reject unrelated topics.

Use these condensed profiles derived from the court's web3 thinkers master cheat sheet:

1. vitalik_buterin: guardian of decentralized legitimacy. Values credible neutrality, public goods,
mechanism design, decentralization depth, cryptographic soundness, fairness, long-term sustainability.
Scores poorly for plutocracy, central shortcuts, weak technical grounding, and short-term hype.
Analytical, careful, nuanced, and public-goods oriented.

2. gavin_wood: infrastructure architect and philosophical engineer. Values sovereignty through code,
formal protocol correctness, permissionlessness, interoperability, and real decentralization.
Scores poorly for centralized theater, sloppy architecture, and political compromise disguised as Web3.
Precise, systems-level, technical, and skeptical.

3. sergey_nazarov: trust-minimized coordination strategist. Values verifiable data, oracle integrity,
hybrid smart contracts, institutional pathways, infrastructure completeness, and real-world integration.
Scores poorly for pure speculation, vague decentralization, and missing data-verification layers.
Methodical, market-aware, educational, and infrastructure-first.

4. anatoly_yakovenko: performance-first systems engineer. Values throughput, latency reduction,
hardware-aware scaling, pragmatic engineering, and permissionless global-scale usage.
Scores poorly for slow systems, governance drag, and theoretical purity that cannot serve real demand.
Direct, builder-focused, technical, and execution-heavy.

5. eli_ben_sasson: mathematician of proof-based trust. Values computational integrity, ZK proofs,
privacy, mathematical elegance, and provable correctness.
Scores poorly for trust assumptions, privacy leakage, inefficient verification, and hand-waving.
Academic, calm, proof-driven, and careful.

6. illia_polosukhin: AI-blockchain synthesizer. Values open-source AI, user-owned data, UX,
cross-domain synthesis, accessible onboarding, and user-owned intelligent agents.
Scores poorly for centralized AI capture, bad UX, and crypto complexity that blocks adoption.
Clear, future-oriented, collaborative, and research-plus-product minded.

7. balaji_srinivasan: network-state and exit-rights strategist. Values individual agency,
parallel institutions, censorship resistance, decentralized media, contrarian long bets, and internet-native sovereignty.
Scores poorly for legacy-system reform, permission-seeking, and regulation-first proposals.
Bold, conceptual, historical, provocative, and asymmetric-risk oriented.

8. changpeng_zhao: fast global operator. Values financial freedom, mass adoption, product velocity,
accessibility, inclusion, operational scale, and practical usefulness.
Scores poorly for academic purity without users, high-friction UX, and ideas that cannot ship.
Simple, direct, pragmatic, optimistic, and execution-first.

Return ONLY valid JSON with this exact shape:
{{
  "is_crypto_case": true,
  "crypto_relevance_reason": "short reason",
  "evaluations": {{
    "vitalik_buterin": {{"score": 0, "reasoning": "2 sentences", "key_point": "one point", "verdict_word": "one word"}},
    "gavin_wood": {{"score": 0, "reasoning": "2 sentences", "key_point": "one point", "verdict_word": "one word"}},
    "sergey_nazarov": {{"score": 0, "reasoning": "2 sentences", "key_point": "one point", "verdict_word": "one word"}},
    "anatoly_yakovenko": {{"score": 0, "reasoning": "2 sentences", "key_point": "one point", "verdict_word": "one word"}},
    "eli_ben_sasson": {{"score": 0, "reasoning": "2 sentences", "key_point": "one point", "verdict_word": "one word"}},
    "illia_polosukhin": {{"score": 0, "reasoning": "2 sentences", "key_point": "one point", "verdict_word": "one word"}},
    "balaji_srinivasan": {{"score": 0, "reasoning": "2 sentences", "key_point": "one point", "verdict_word": "one word"}},
    "changpeng_zhao": {{"score": 0, "reasoning": "2 sentences", "key_point": "one point", "verdict_word": "one word"}}
  }}
}}

Scores must be integers from 0 to 100. If the case is not crypto-related, set is_crypto_case to false
and score each profile 0 with a short reason explaining why the court lacks jurisdiction.
"""


class SupremeHighCryptoCourt(gl.Contract):
    owner: Address
    case_count: u256
    cases: TreeMap[u256, CourtCase]
    case_ids: DynArray[u256]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.case_count = 0

    def _analyze_case(self, case_text: str) -> dict:
        prompt = _panel_prompt(case_text)

        def leader_fn():
            raw = gl.nondet.exec_prompt(prompt, response_format="json")
            return _normalize_panel(raw)

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return False

            validator_result = leader_fn()
            leader_result = leaders_res.calldata

            if leader_result["is_crypto_case"] != validator_result["is_crypto_case"]:
                return False

            if _verdict_for_score(int(leader_result["final_score"])) != _verdict_for_score(int(validator_result["final_score"])):
                return False

            for judge_id in JUDGE_IDS:
                leader_score = int(leader_result["evaluations"][judge_id]["score"])
                validator_score = int(validator_result["evaluations"][judge_id]["score"])
                if abs(leader_score - validator_score) > SCORE_TOLERANCE:
                    return False

            return True

        return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

    @gl.public.write
    def submit_case(self, case_text: str) -> u256:
        cleaned = case_text.strip()
        if len(cleaned) < MIN_CASE_LENGTH:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Case must be at least 50 characters")
        if len(cleaned) > MAX_CASE_LENGTH:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Case must be 2000 characters or less")

        analysis = self._analyze_case(cleaned)
        if not analysis["is_crypto_case"]:
            reason = str(analysis["crypto_relevance_reason"])
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Court lacks crypto jurisdiction: {reason}")

        case_id = self.case_count
        evaluations_json = json.dumps(analysis["evaluations"], sort_keys=True)
        final_score = int(analysis["final_score"])
        verdict = str(analysis["verdict"])

        self.cases[case_id] = CourtCase(
            case_id=case_id,
            submitter=gl.message.sender_address,
            case_text=cleaned,
            evaluations_json=evaluations_json,
            final_score=final_score,
            verdict=verdict,
            created_at=str(gl.message.timestamp_unix),
        )
        self.case_ids.append(case_id)
        self.case_count = case_id + 1

        return case_id

    @gl.public.view
    def get_case(self, case_id: u256) -> dict:
        if case_id not in self.cases:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Case not found")

        court_case = self.cases[case_id]
        return {
            "case_id": court_case.case_id,
            "submitter": court_case.submitter.as_hex,
            "case_text": court_case.case_text,
            "evaluations": json.loads(court_case.evaluations_json),
            "final_score": court_case.final_score,
            "verdict": court_case.verdict,
            "created_at": court_case.created_at,
        }

    @gl.public.view
    def get_case_summary(self, case_id: u256) -> dict:
        if case_id not in self.cases:
            raise gl.vm.UserError(f"{ERROR_EXPECTED} Case not found")

        court_case = self.cases[case_id]
        preview = court_case.case_text
        if len(preview) > 140:
            preview = preview[:140] + "..."

        return {
            "case_id": court_case.case_id,
            "submitter": court_case.submitter.as_hex,
            "case_preview": preview,
            "final_score": court_case.final_score,
            "verdict": court_case.verdict,
            "created_at": court_case.created_at,
        }

    @gl.public.view
    def get_case_count(self) -> u256:
        return self.case_count

    @gl.public.view
    def get_recent_cases(self, limit: u256) -> list:
        count = int(self.case_count)
        requested = int(limit)
        if requested > 25:
            requested = 25

        results = []
        index = count - 1
        while index >= 0 and len(results) < requested:
            results.append(self.get_case_summary(index))
            index -= 1
        return results
