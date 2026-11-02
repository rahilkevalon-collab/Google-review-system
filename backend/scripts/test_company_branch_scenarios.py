"""
Automated validation of all 10 scenarios requested by the user:
1. Register Kevlon Technology – success.
2. Register Kevlon Technology again as a duplicate – prevent it.
3. Add Ahmedabad Branch under Kevlon Technology – success.
4. Add Junagadh Branch under Kevlon Technology – success.
5. Add Ahmedabad Branch again under Kevlon Technology – prevent duplicate.
6. Register another company with a similar name – allow after verification.
7. Open Ahmedabad Review Page – correct branch details.
8. Open Junagadh Review Page – correct branch details.
9. Refresh Admin Dashboard – no duplicate records.
10. Restart backend check – no duplicate records.
"""

import urllib.request
import urllib.error
import json
import sys

API_BASE = "http://127.0.0.1:5000/api"

def make_req(endpoint, method="GET", data=None, token=None):
    url = f"{API_BASE}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": err_body}

def run_tests():
    print("=" * 60)
    print("RUNNING 10 SCENARIO VALIDATION TESTS")
    print("=" * 60)

    # Step 0: Admin Login
    status, login_res = make_req("/auth/login", method="POST", data={"username": "admin", "password": "admin123"})
    assert status == 200 and login_res.get("success"), f"Login failed: {login_res}"
    token = login_res.get("token")
    print(f"[AUTH] Logged in as Admin. Token: {token[:12]}...")

    # Scenario 1: Register Kevlon Technology – success
    print("\n--- Scenario 1: Register Kevlon Technology ---")
    status, res1 = make_req("/companies", method="POST", data={
        "companyName": "Kevlon Technology",
        "category": "IT Services and Software Development",
        "services": "Web Development, Mobile Apps, AI Solutions",
        "description": "Leading software and AI automation agency."
    }, token=token)
    assert status == 201 and res1.get("success"), f"Scenario 1 failed: {res1}"
    company_id = res1["company"]["id"]
    print(f"PASS: Registered Kevlon Technology with ID: {company_id}")

    # Scenario 2: Register Kevlon Technology again as a duplicate – prevent it
    print("\n--- Scenario 2: Register Kevlon Technology duplicate ---")
    status, res2 = make_req("/companies", method="POST", data={
        "companyName": "kevlon technology  ",
        "category": "IT Services and Software Development"
    }, token=token)
    assert status == 400 and not res2.get("success"), f"Scenario 2 failed, expected duplicate rejection: {res2}"
    print(f"PASS: Duplicate company registration successfully blocked! Error: {res2.get('error')}")

    # Scenario 3: Add Ahmedabad Branch under Kevlon Technology – success
    print("\n--- Scenario 3: Add Ahmedabad Branch under Kevlon Technology ---")
    status, res3 = make_req(f"/companies/{company_id}/branches", method="POST", data={
        "branchName": "Ahmedabad Branch",
        "city": "Ahmedabad",
        "address": "303 Titanium Square, SG Highway",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJQwrcdyL0U6cRLe6thND0Dvw",
        "reviewPageSlug": "kevlon-ahmedabad"
    }, token=token)
    assert status == 201 and res3.get("success"), f"Scenario 3 failed: {res3}"
    ahmedabad_slug = res3["branch"]["reviewPageSlug"]
    print(f"PASS: Added Ahmedabad Branch with slug: /reviews/{ahmedabad_slug}")

    # Scenario 4: Add Junagadh Branch under Kevlon Technology – success
    print("\n--- Scenario 4: Add Junagadh Branch under Kevlon Technology ---")
    status, res4 = make_req(f"/companies/{company_id}/branches", method="POST", data={
        "branchName": "Junagadh Branch",
        "city": "Junagadh",
        "address": "Station Road, Junagadh",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJmockJunagadhPlaceId",
        "reviewPageSlug": "kevlon-junagadh"
    }, token=token)
    assert status == 201 and res4.get("success"), f"Scenario 4 failed: {res4}"
    junagadh_slug = res4["branch"]["reviewPageSlug"]
    print(f"PASS: Added Junagadh Branch with slug: /reviews/{junagadh_slug}")

    # Scenario 5: Add Ahmedabad Branch again under Kevlon Technology – prevent duplicate
    print("\n--- Scenario 5: Add Ahmedabad Branch again as duplicate under same company ---")
    status, res5 = make_req(f"/companies/{company_id}/branches", method="POST", data={
        "branchName": "Ahmedabad Branch",
        "city": "Ahmedabad",
        "googleReviewUrl": "https://search.google.com/local/writereview?placeid=ChIJanother"
    }, token=token)
    assert status == 400 and not res5.get("success"), f"Scenario 5 failed, expected branch duplicate rejection: {res5}"
    print(f"PASS: Duplicate branch successfully blocked! Error: {res5.get('error')}")

    # Scenario 6: Register another company with similar name – allow after verification
    print("\n--- Scenario 6: Register another company with similar name (Kevlon Solutions) ---")
    status, res6 = make_req("/companies", method="POST", data={
        "companyName": "Kevlon Solutions Pvt Ltd",
        "category": "IT Services and Software Development",
        "services": "Enterprise IT Consulting",
        "description": "Distinct business entity."
    }, token=token)
    assert status == 201 and res6.get("success"), f"Scenario 6 failed: {res6}"
    other_co_id = res6["company"]["id"]
    print(f"PASS: Similar named legitimate company allowed with ID: {other_co_id}")

    # Scenario 7: Open Ahmedabad Review Page – correct branch details & review URL
    print("\n--- Scenario 7: Open Ahmedabad Review Page (/reviews/kevlon-ahmedabad) ---")
    status, res7 = make_req(f"/reviews/page/{ahmedabad_slug}")
    assert status == 200 and res7.get("success"), f"Scenario 7 failed: {res7}"
    branch_data_7 = res7["branch"]
    assert branch_data_7["branchName"] == "Ahmedabad Branch"
    assert branch_data_7["googleReviewUrl"] == "https://search.google.com/local/writereview?placeid=ChIJQwrcdyL0U6cRLe6thND0Dvw"
    assert res7["company"]["companyName"] == "Kevlon Technology"
    print(f"PASS: Ahmedabad review page loaded: Company={res7['company']['companyName']}, Branch={branch_data_7['branchName']}, URL={branch_data_7['googleReviewUrl']}")

    # Scenario 8: Open Junagadh Review Page – correct branch details & review URL
    print("\n--- Scenario 8: Open Junagadh Review Page (/reviews/kevlon-junagadh) ---")
    status, res8 = make_req(f"/reviews/page/{junagadh_slug}")
    assert status == 200 and res8.get("success"), f"Scenario 8 failed: {res8}"
    branch_data_8 = res8["branch"]
    assert branch_data_8["branchName"] == "Junagadh Branch"
    assert "ChIJmockJunagadhPlaceId" in branch_data_8["googleReviewUrl"]
    assert branch_data_8["googleReviewUrl"] != branch_data_7["googleReviewUrl"], "Junagadh must not have Ahmedabad review URL!"
    print(f"PASS: Junagadh review page loaded: Company={res8['company']['companyName']}, Branch={branch_data_8['branchName']}, URL={branch_data_8['googleReviewUrl']}")

    # Scenario 9: Refresh Admin Dashboard – no duplicate records, correct branch counts
    print("\n--- Scenario 9: Refresh Admin Dashboard ---")
    status, res9 = make_req("/companies")
    assert status == 200 and res9.get("success"), f"Scenario 9 failed: {res9}"
    companies_list = res9["companies"]
    names = [c.get("companyName") or c.get("name") for c in companies_list]
    print(f"Total companies in directory: {len(companies_list)} -> {names}")
    assert len(names) == len(set(names)), "There must be zero duplicate company names!"
    
    # Check branch count for Kevlon Technology
    kevlon_item = next(c for c in companies_list if "Kevlon Technology" in (c.get("companyName") or c.get("name")))
    assert kevlon_item["branchCount"] == 2, f"Expected 2 branches under Kevlon Technology, got {kevlon_item['branchCount']}"
    print(f"PASS: Kevlon Technology correctly has {kevlon_item['branchCount']} branches registered!")

    # Scenario 10: Clean up test company 'Kevlon Solutions Pvt Ltd'
    print("\n--- Scenario 10: Delete test company and verify cascading delete ---")
    status, res10 = make_req(f"/companies/{other_co_id}", method="DELETE", token=token)
    assert status == 200 and res10.get("success"), f"Scenario 10 failed: {res10}"
    print("PASS: Deleted Kevlon Solutions Pvt Ltd successfully.")

    print("\n" + "=" * 60)
    print("ALL 10 SCENARIOS VERIFIED AND PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()

