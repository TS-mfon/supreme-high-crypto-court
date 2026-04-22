import json


VALID_CASE_TEXT = (
    "A DeFi protocol should publish verifiable collateral policy updates and allow "
    "tokenholders to dispute model-driven risk changes on-chain."
)


def _mock_panel(score=70, is_crypto_case=True):
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

    return {
        "is_crypto_case": is_crypto_case,
        "crypto_relevance_reason": "The filing is clearly about DeFi risk controls and on-chain governance.",
        "evaluations": evaluations,
    }


def test_submit_case_persists_case(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/supreme_high_crypto_court.py")
    direct_vm.sender = direct_alice
    direct_vm.mock_llm(r"(?s).*Supreme High Crypto Court.*", json.dumps(_mock_panel(score=75)))

    case_id = contract.submit_case(VALID_CASE_TEXT)

    stored = contract.get_case(case_id)
    assert case_id == 0
    assert stored["case_id"] == 0
    assert stored["submitter"] == direct_alice.as_hex
    assert stored["case_text"] == VALID_CASE_TEXT
    assert stored["final_score"] == 75
    assert stored["verdict"] == "APPROVED"
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
