#!/usr/bin/env python3
"""Full-schema validator for committed banks. Exit 1 on any error.

No arguments: discover and validate every content/<cert>/questions.json.
--cert <certId>: validate that one cert only.
--check-urls: additionally verify each docUrl still resolves (see below).

Everything cert-specific (id prefix, domain names) is read from each cert's
meta.json - no hardcoded prefix or domain set lives here. Schema rules that are
the same for every cert (difficulty/type vocab, option/answer counts, ASCII-only,
docUrl hosts) stay inline; docUrl hosts are validated per-vendor via meta.json's vendorSlug (VENDOR_DOC_HOSTS).

The default (schema-only) mode never touches the network so it stays fast and
deterministic for the constant local/CI runs. --check-urls is a purely additive
opt-in liveness gate: the host regex above proves a docUrl is well-formed but not
that the page still exists, and AWS reorganizes doc slugs constantly, soft-
redirecting a dead page to a guide-root landing page (a 301/302) rather than
404ing. The gate curls each unique docUrl's immediate response (no redirect
following) and fails on anything other than 200, catching both hard 404s and
those silent redirects before they ship.
"""
import argparse, json, re, sys, os, subprocess, shutil

CONTENT = os.environ.get("BANK_CONTENT_DIR") or os.path.join(os.path.dirname(__file__), "..", "content")
DIFF = {"easy", "medium", "hard"}
TYPES = {"single", "multi"}
# Allowed docUrl hosts per vendorSlug: citations must come from the certifying
# vendor's official documentation. Falls back to AWS for metas predating vendorSlug.
VENDOR_DOC_HOSTS = {
    "aws": ["docs.aws.amazon.com", "aws.amazon.com"],
    "databricks": ["docs.databricks.com", "www.databricks.com", "databricks.com"],
    "nvidia": ["docs.nvidia.com", "developer.nvidia.com", "www.nvidia.com", "nvidia.com"],
    "gcp": ["cloud.google.com", "support.google.com"],
}

# Always read from pipeline/, independent of BANK_CONTENT_DIR: the concept
# vocabulary is fixed per repo, not per validated content copy.
_ENUM_PATH = os.path.join(os.path.dirname(__file__), "concept_enums.json")
with open(_ENUM_PATH) as _f:
    CONCEPT_ENUM = json.load(_f)


def doc_re(vendor_slug):
    hosts = VENDOR_DOC_HOSTS.get(vendor_slug or "aws", VENDOR_DOC_HOSTS["aws"])
    return re.compile(r"^https://(" + "|".join(re.escape(h) for h in hosts) + r")/")


def validate_cert(cert_id):
    """Validate one cert's bank. Returns (question_count, [error strings])."""
    cert_dir = os.path.join(CONTENT, cert_id)
    meta_path = os.path.join(cert_dir, "meta.json")
    if not os.path.exists(meta_path):
        return 0, [f"missing meta.json for {cert_id}"]
    with open(meta_path) as f:
        meta = json.load(f)
    with open(os.path.join(cert_dir, "questions.json")) as f:
        data = json.load(f)

    id_prefix = meta.get("idPrefix")
    domains = {d["name"] for d in meta.get("domains", [])}
    # tag must agree with the question's domain: a mis-tagged question silently
    # corrupts per-domain readiness scoring, so the gate cross-validates the pair.
    name_to_tag = {d["name"]: d.get("tag") for d in meta.get("domains", [])}
    id_re = re.compile(rf"^{re.escape(id_prefix)}-\d{{4}}$") if id_prefix else None
    DOC = doc_re(meta.get("vendorSlug"))
    doc_hosts_msg = "/".join(VENDOR_DOC_HOSTS.get(meta.get("vendorSlug") or "aws", VENDOR_DOC_HOSTS["aws"]))

    errors, ids = [], set()
    if not id_prefix: errors.append("meta.json missing idPrefix")
    if not domains: errors.append("meta.json has no domains")
    if not data: errors.append("bank is empty")
    for i, q in enumerate(data):
        loc = f"[{i}]({q.get('id','?')})"
        for field in ("id", "domain", "tag", "type", "stem", "options", "correct", "explanation", "difficulty", "docUrl"):
            if field not in q: errors.append(f"{loc}: missing {field}")
        qid = q.get("id")
        if qid in ids: errors.append(f"{loc}: duplicate id")
        ids.add(qid)
        if id_re and not id_re.match(qid or ""): errors.append(f"{loc}: id must match {id_prefix}-NNNN")
        if q.get("domain") not in domains: errors.append(f"{loc}: bad domain")
        elif q.get("tag") != name_to_tag.get(q.get("domain")): errors.append(f"{loc}: tag {q.get('tag')!r} does not match domain's tag {name_to_tag.get(q.get('domain'))!r}")
        if q.get("difficulty") not in DIFF: errors.append(f"{loc}: bad difficulty {q.get('difficulty')!r}")
        if "concept" in q:
            allowed = CONCEPT_ENUM.get(q.get("domain"), [])
            if q["concept"] not in allowed:
                errors.append(f"{loc}: concept {q.get('concept')!r} not in enum for domain {q.get('domain')!r}")
        if q.get("type") not in TYPES: errors.append(f"{loc}: bad type {q.get('type')!r}")
        if not DOC.match(q.get("docUrl", "")): errors.append(f"{loc}: docUrl must be an official vendor docs URL ({doc_hosts_msg})")
        t, opts, corr = q.get("type"), q.get("options", []), q.get("correct", [])
        if t == "single" and (len(opts) != 4 or len(corr) != 1): errors.append(f"{loc}: single=4opts/1correct")
        if t == "multi" and (len(opts) != 5 or len(corr) != 2): errors.append(f"{loc}: multi=5opts/2correct")
        if any((not isinstance(c, int)) or c < 0 or c >= len(opts) for c in corr): errors.append(f"{loc}: correct index out of range")
        if len(set(corr)) != len(corr): errors.append(f"{loc}: duplicate correct index")
        for field in ("stem", "explanation", "tag"):
            if not str(q.get(field, "")).strip(): errors.append(f"{loc}: blank {field}")
        if any(not str(o).strip() for o in opts): errors.append(f"{loc}: blank option")
        if len(set(opts)) != len(opts): errors.append(f"{loc}: duplicate option text")
        blob = q.get("stem", "") + "".join(opts) + q.get("explanation", "")
        if any(ord(ch) > 127 for ch in blob): errors.append(f"{loc}: non-ASCII")
    by_id = {q.get("id"): q for q in data}
    for q in data:
        qid = q.get("id")
        if "excludedFromPractice" in q and not isinstance(q["excludedFromPractice"], bool):
            errors.append(f"{qid}: excludedFromPractice must be boolean")
        if q.get("excludedFromPractice") and not q.get("exclusionReason", "").strip():
            errors.append(f"{qid}: exclusion requires a reason")
        if q.get("supersededBy"):
            successor = by_id.get(q["supersededBy"])
            if not q.get("excludedFromPractice") or not successor or successor.get("excludedFromPractice") or successor.get("domain") != q.get("domain"):
                errors.append(f"{qid}: replacement must be an active question in the same domain")
    for domain in meta.get("domains", []):
        active = sum(q.get("domain") == domain["name"] and not q.get("excludedFromPractice") for q in data)
        if active < domain.get("mockCount", 0):
            errors.append(f"{domain['name']}: insufficient active questions for a full mock")
    return len(data), errors


def discover_certs():
    """Sorted list of cert ids under content/ that have a questions.json."""
    if not os.path.isdir(CONTENT):
        return []
    return sorted(
        name for name in os.listdir(CONTENT)
        if os.path.exists(os.path.join(CONTENT, name, "questions.json"))
    )


# Soft-404 title signature: some hosts serve dead pages as HTTP 200 with a
# "Page Not Found" body (found 2026-07-10: 36 dead genai-leader citations on
# cloud.google.com passed the status-only gate). Scanned against the first 16KB.
SOFT404_TITLE = re.compile(rb"<title[^>]*>[^<]{0,300}?(not[ \t]+found|page[ \t]+unavailable)", re.I)
# Hosts where a HEAD probe exposes the true 404 behind a soft-404 GET (dead
# cloud.google.com pages: GET 200, HEAD 404). Do NOT add support.google.com:
# its REAL pages answer HEAD 404 while GET 200 (verified 2026-07-10).
HEAD_TRUTH_HOSTS = {"cloud.google.com"}


def check_urls(cert_id):
    """Liveness-check every unique docUrl in one cert's bank. Returns [error strings].

    Three probes per URL, all on the immediate response with no redirect following
    (curl's default), so a 301/302 to a moved slug or guide-root reads as the
    failure it is:
    1. GET must return a direct 200.
    2. The body's <title> must not carry a not-found signature (soft-404 catch).
    3. On HEAD_TRUTH_HOSTS, a HEAD probe must also return 200.
    Requires curl on PATH and network access.
    """
    qpath = os.path.join(CONTENT, cert_id, "questions.json")
    if not os.path.exists(qpath):
        return [f"missing questions.json for {cert_id}"]
    if not shutil.which("curl"):
        return ["--check-urls requires curl on PATH, which was not found"]
    with open(qpath) as f:
        data = json.load(f)
    urls = sorted({q["docUrl"] for q in data if q.get("docUrl")})
    errors = []
    for url in urls:
        try:
            got = subprocess.run(
                ["curl", "-s", "-w", "\\n%{http_code}", "--max-time", "15", url],
                capture_output=True, timeout=25,
            )
        except subprocess.TimeoutExpired:
            errors.append(f"docUrl timed out after 25s: {url}")
            continue
        body, _, tail = got.stdout.rpartition(b"\n")
        code = tail.decode("ascii", "ignore").strip()
        if code != "200":
            errors.append(f"docUrl returned {code or 'no-response'} (want 200, no redirect): {url}")
            continue
        if SOFT404_TITLE.search(body[:16384]):
            errors.append(f"docUrl soft-404 (HTTP 200 but not-found title): {url}")
            continue
        host = url.split("/", 3)[2] if url.count("/") >= 3 else ""
        if host in HEAD_TRUTH_HOSTS:
            try:
                hcode = subprocess.run(
                    ["curl", "-s", "-I", "-o", os.devnull, "-w", "%{http_code}", "--max-time", "15", url],
                    capture_output=True, text=True, timeout=25,
                ).stdout.strip()
            except subprocess.TimeoutExpired:
                hcode = "timeout"
            if hcode != "200":
                errors.append(f"docUrl soft-404 (GET 200 but HEAD {hcode}): {url}")
    return errors


def main():
    ap = argparse.ArgumentParser(description="Validate committed question banks.")
    ap.add_argument("--cert", help="validate only this certId (default: all certs)")
    ap.add_argument("--check-urls", action="store_true",
                    help="also verify each unique docUrl returns HTTP 200 with no redirect "
                         "(opt-in; uses curl, requires network)")
    args = ap.parse_args()

    if args.cert:
        if not os.path.exists(os.path.join(CONTENT, args.cert, "questions.json")):
            print(f"error: no content/{args.cert}/questions.json", file=sys.stderr)
            sys.exit(1)
        certs = [args.cert]
    else:
        certs = discover_certs()
        if not certs:
            print("error: no content/*/questions.json found", file=sys.stderr)
            sys.exit(1)

    # Cross-cert guard: two certs sharing an idPrefix would collide invisibly to
    # the per-cert uniqueness check.
    prefixes = {}
    for cert_id in certs:
        mp = os.path.join(CONTENT, cert_id, "meta.json")
        if os.path.exists(mp):
            with open(mp) as f:
                pfx = json.load(f).get("idPrefix")
            if pfx and pfx in prefixes:
                print(f"error: idPrefix {pfx!r} shared by {prefixes[pfx]} and {cert_id}", file=sys.stderr)
                sys.exit(1)
            prefixes[pfx] = cert_id

    any_errors = False
    for cert_id in certs:
        count, errors = validate_cert(cert_id)
        print(f"{cert_id}: {count} questions; {len(errors)} errors")
        for e in errors:
            print(" X", e)
        any_errors = any_errors or bool(errors)
        if args.check_urls:
            url_errors = check_urls(cert_id)
            print(f"{cert_id}: {len(url_errors)} docUrl liveness errors")
            for e in url_errors:
                print(" X", e)
            any_errors = any_errors or bool(url_errors)
    sys.exit(1 if any_errors else 0)


if __name__ == "__main__":
    main()
