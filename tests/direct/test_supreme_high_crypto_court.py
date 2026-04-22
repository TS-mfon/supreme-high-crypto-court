import json


VALID_CASE_TEXT = (
    "A DeFi protocol should publish verifiable collateral policy updates and allow "
    "tokenholders to dispute model-driven risk changes on-chain."
)

AXES = {
    "innovation": 80,
    "execution": 60,
    "decentralization": 80,
    "adoption": 60,
    "strategic_fit": 80,
}


def _mock_panel(score=70, is_crypto_case=True, critical=False):
    judge_ids = (
        "vitalik_buterin",
        "gavin_wood",
        "sergey_nazarov",
        "anatoly_yakovenko",
        "eli_ben_sasson",
        "illia_polosukhin",
        "balaji_srinivasan",
        "changpeng_zhao",
    )
    evaluations = {}
    for judge_id in judge_ids:
        evaluations[judge_id] = {
            "score": score,
            "reasoning": f"{judge_id} reasoning about the case.",
            "key_point": f"{judge_id} key point",
            "verdict_word": "supportive",
        }
        if critical:
            evaluations[judge_id]["quantitative_axes"] = dict(AXES)

    return {
        "is_crypto_case": is_crypto_case,
        "crypto_relevance_reason": "The filing is clearly about DeFi risk controls and on-chain governance.",
        "evaluations": evaluations,
    }


def test_submit_case_persists_standard_case(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/supreme_high_crypto_court.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(r"(?s).*Supreme High Crypto Court.*", json.dumps(_mock_panel(score=80)))

    case_id = contract.submit_case(VALID_CASE_TEXT)

    stored = contract.get_case(case_id)
    assert case_id == 0
    assert stored["case_id"] == 0
    assert stored["submitter"].lower() == ("0x" + direct_alice.hex()).lower()
    assert stored["case_text"] == VALID_CASE_TEXT
    assert stored["analysis_mode"] == "standard"
    assert stored["final_score"] == 80
    assert stored["verdict"] == "APPROVED"
    assert stored["critical_summary"] is None
    assert stored["created_at"] == "0"


def test_submit_case_rejects_short_input(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/supreme_high_crypto_court.py")
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Case must be at least 50 characters"):
        contract.submit_case("too short for the court")


def test_submit_case_rejects_non_crypto_case(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/supreme_high_crypto_court.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(
        r"(?s).*Supreme High Crypto Court.*",
        json.dumps(_mock_panel(score=0, is_crypto_case=False)),
    )

    with direct_vm.expect_revert("Court lacks crypto jurisdiction"):
        contract.submit_case(VALID_CASE_TEXT)


def test_submit_critical_case_persists_quantitative_axes(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/supreme_high_crypto_court.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(
        r"(?s).*critical analysis engine.*",
        json.dumps(_mock_panel(score=60, critical=True)),
    )

    case_id = contract.submit_critical_case(VALID_CASE_TEXT)

    stored = contract.get_case(case_id)
    assert stored["analysis_mode"] == "critical"
    assert stored["final_score"] == 60
    assert stored["critical_summary"] == AXES
    assert stored["evaluations"]["vitalik_buterin"]["quantitative_axes"] == AXES


def test_get_case_summary_exposes_analysis_mode(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/supreme_high_crypto_court.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(
        r"(?s).*critical analysis engine.*",
        json.dumps(_mock_panel(score=60, critical=True)),
    )

    case_id = contract.submit_critical_case(VALID_CASE_TEXT)
    summary = contract.get_case_summary(case_id)

    assert summary["analysis_mode"] == "critical"
    assert summary["final_score"] == 60
