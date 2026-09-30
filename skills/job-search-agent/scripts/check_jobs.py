#!/usr/bin/env python3
"""Conservative evidence gates for researched jobs. No fetching or applications."""
import argparse
from datetime import datetime, timezone, timedelta
import json
import math
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


def canonical_url(url):
    """Remove marketing tags, preserving requisition-identifying query strings."""
    parsed = urlsplit(url if isinstance(url, str) else "")
    if parsed.scheme not in {"https", "http"} or not parsed.netloc:
        return None
    query = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
             if not k.lower().startswith("utm_") and k.lower() not in
             {"gclid", "fbclid", "msclkid"}]
    return urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(),
                       parsed.path.rstrip("/"), urlencode(sorted(query)), parsed.fragment))


def identities(job):
    keys = set()
    company = str(job.get("company") or "").strip().casefold()
    req = str(job.get("requisition_id") or "").strip().casefold()
    if company and req:
        keys.add(("req", company, req))
    for url in [job.get("url"), *(job.get("alternate_urls") or [])]:
        canonical = canonical_url(url)
        if canonical:
            keys.add(("url", canonical))
    return keys


def timestamp(value):
    try:
        result = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return result if result.tzinfo else None
    except (AttributeError, TypeError, ValueError):
        return None


def positive_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value > 0


def has_text(value):
    return isinstance(value, str) and bool(value.strip())


def check_job(job, policy, history, now):
    """Unknowns stay in review; a score can never override a failed hard gate."""
    rejects, review, notes = [], [], []
    if not has_text(job.get("company")) or not has_text(job.get("title")):
        review.append("Missing employer or role title")
    keys = identities(job)
    applied = [old for old in history if old.get("status") in
               {"submitted", "applied", "interviewing", "offer", "rejected", "withdrawn"}]
    if any(keys & identities(old) for old in applied):
        return {"decision": "already_applied", "reasons": ["Application history matches this requisition or URL"], "notes": []}
    if any(keys & identities(old) for old in history if old.get("status") == "submission-uncertain"):
        review.append("Prior submission is uncertain; inspect confirmation/account history before retrying")
    if not canonical_url(job.get("url")):
        review.append("Missing valid direct posting URL")
    if job.get("posting_status") == "closed":
        rejects.append("Posting confirmed closed")
    elif job.get("posting_status") != "open":
        review.append("Posting is not confirmed open")
    verified = timestamp(job.get("verified_at"))
    age_limit = timedelta(hours=policy.get("verification_max_age_hours", 72))
    if verified is None or verified > now or now - verified > age_limit:
        review.append("Posting needs a current, timezone-aware verification timestamp")
    if not has_text(job.get("verification_source")):
        review.append("Missing source for current posting verification")
    gates = job.get("gates") or {}
    for name in ("location", "work_authorization", "qualifications"):
        gate = gates.get(name) or {}
        if gate.get("status") == "fail" and has_text(gate.get("evidence")):
            rejects.append(name + ": " + gate["evidence"])
        elif gate.get("status") != "pass" or not has_text(gate.get("evidence")):
            review.append(name + ": missing verified supporting evidence")
    floor = policy.get("minimum_base_usd")
    if floor is not None:
        if not positive_number(floor):
            raise ValueError("minimum_base_usd must be a positive number or null")
        pay = job.get("compensation") or {}
        low, high = pay.get("minimum"), pay.get("maximum")
        if not has_text(pay.get("source")):
            review.append("Missing compensation source")
        if pay.get("currency") != "USD" or pay.get("type") != "base":
            review.append("USD base pay is unverified; OTE, equity and total compensation do not establish base")
        elif pay.get("period") != "year" or job.get("employment_type") != "employee":
            review.append("Hourly/contract pay cannot establish guaranteed annual employee base")
            rate = low if positive_number(low) else high
            hours, weeks = pay.get("hours_per_week"), pay.get("weeks_per_year")
            if pay.get("period") == "hour" and all(positive_number(x) for x in (rate, hours, weeks)):
                notes.append(f"Illustrative gross annualization: USD {rate * hours * weeks:,.2f}; assumes {hours} hours/week and {weeks} paid weeks, not guaranteed base")
        elif (low is not None and not positive_number(low)) or (high is not None and not positive_number(high)) or (low is not None and high is not None and low > high):
            review.append("Invalid compensation range")
        elif high is not None and high < floor:
            rejects.append("Posted base maximum is below minimum base requirement")
        elif low is None or low < floor:
            review.append("Base range is missing or straddles the floor; verify attainable base")
    if not keys:
        review.append("No stable posting identity")
    return {"decision": "reject" if rejects else "review" if review else "eligible",
            "reasons": rejects + review, "notes": notes}


def evaluate(payload, now):
    if now.tzinfo is None:
        raise ValueError("now must include timezone")
    policy = payload.get("policy", {})
    floor = policy.get("minimum_base_usd")
    if floor is not None and not positive_number(floor):
        raise ValueError("minimum_base_usd must be a positive number or null")
    age = policy.get("verification_max_age_hours", 72)
    if not positive_number(age):
        raise ValueError("verification_max_age_hours must be a positive number")
    history = payload.get("history", [])
    results, seen = [], []
    for job in payload.get("jobs", []):
        keys = identities(job)
        result = check_job(job, policy, history, now)
        matches = [index for index, previous in enumerate(seen) if keys & previous]
        if matches:
            reason = "Duplicate batch identity: reconcile all records and reevaluate before use"
            for index in matches:
                if results[index]["decision"] == "eligible":
                    results[index]["decision"] = "review"
                if reason not in results[index]["reasons"]:
                    results[index]["reasons"].append(reason)
            if result["decision"] != "already_applied":
                result["original_decision"] = result["decision"]
                result["decision"] = "duplicate"
                result["reasons"].insert(0, reason)
        seen.append(keys)
        results.append({"company": job.get("company"), "title": job.get("title"), "url": job.get("url"), **result})
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="JSON research records; see references/record-schema.md")
    parser.add_argument("--now", help="Timezone-aware ISO timestamp for reproducible tests")
    args = parser.parse_args()
    now = timestamp(args.now) if args.now else datetime.now(timezone.utc)
    if now is None:
        parser.error("--now must be a timezone-aware ISO timestamp")
    try:
        print(json.dumps(evaluate(json.loads(args.input.read_text()), now), indent=2, allow_nan=False))
    except (ValueError, TypeError, KeyError, AttributeError, OSError) as error:
        parser.exit(2, f"Invalid research input: {error}\n")


if __name__ == "__main__":
    main()
