"""Synthetic PostgreSQL migration-order rehearsal. Never use on hosted Supabase."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "ct15-cumulative-evidence"
OUT.mkdir(exist_ok=True)
assert os.environ.get("CI") == "true" and os.environ.get("CT15_DISPOSABLE_DB") == "yes"
# No target/credential overrides; this is the ephemeral Actions service only.
env = {k: v for k, v in os.environ.items() if not k.startswith("PG") and k not in ("DATABASE_URL", "SUPABASE_DB_URL")}
env["PGPASSWORD"] = "ct15-local-only"
env["PGCONNECT_TIMEOUT"] = "5"
command = ["psql", "-X", "-w", "-h", "127.0.0.1", "-p", "55415", "-U", "postgres", "-d", "ct15_disposable", "-v", "ON_ERROR_STOP=1"]
results = {"scope": "synthetic historical reconstruction; not hosted restore/auth/storage acceptance", "stages": [], "success": False}
def checkpoint():
    (OUT / "results.json").write_text(json.dumps(results, indent=2) + "\n")
def run(label, args, path=None):
    print("BEGIN " + label, flush=True)
    item = {"stage": label}
    if path:
        item["sha256"] = hashlib.sha256((ROOT / path).read_bytes()).hexdigest()
    results["stages"].append(item)
    checkpoint()
    try:
        p = subprocess.run(command + args, cwd=ROOT, env=env, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=90)
        (OUT / (str(len(results["stages"])).zfill(2) + ".log")).write_text(p.stdout)
        print(p.stdout, flush=True)
        item["exitCode"] = p.returncode
        item["ok"] = p.returncode == 0
        checkpoint()
        if p.returncode:
            raise RuntimeError("Rehearsal stopped at " + label)
        return p.stdout.strip()
    except subprocess.TimeoutExpired:
        item["ok"] = False
        item["timeout"] = True
        checkpoint()
        raise
def apply(path):
    run(path, ["-f", path], path)
try:
    fresh = run("fresh-db-guard", ["-Atc", "select current_database() || ':' || count(*) from pg_tables where schemaname='public'"])
    assert fresh == "ct15_disposable:0", fresh
    manifest = (ROOT / "docs/clear-talks/CT15_FORWARD_MIGRATION_MANIFEST.md").read_text()
    forward = re.findall(r"^\d+\. `(supabase/migrations/202611[^\x60]+\.sql)`$", manifest, re.M)
    actual = sorted(str(p.relative_to(ROOT)) for p in (ROOT / "supabase/migrations").glob("202611*.sql"))
    assert forward == actual and len(forward) == 48, "Forward manifest mismatch"
    assert forward[-2] == "supabase/migrations/20261128005941_ct16_poll_translations.sql"
    assert forward[-1] == "supabase/migrations/20261128030244_ct16_linked_poll_placements.sql"
    assert (ROOT / forward[-2]).read_bytes() == (ROOT / "supabase/staged/ct16_poll_translations.sql").read_bytes(), "Adopted poll migration differs from rehearsed source"
    assert (ROOT / forward[-1]).read_bytes() == (ROOT / "supabase/staged/ct16_linked_poll_placements.sql").read_bytes(), "Adopted linked placement migration differs from rehearsed source"
    apply("tests/fixtures/ct15-local-legacy-platform.sql")
    legacy = sorted(str(p.relative_to(ROOT)) for p in (ROOT / "supabase/migrations").glob("20260*.sql"))
    assert len(legacy) == 23
    omitted = {"20260830171808_dev_auth_bypass_policies.sql", "20260908_dev_editorial_profiles_update.sql"}
    for path in legacy:
        if Path(path).name in omitted:
            continue
        if Path(path).name == "20260902_create_comments.sql":
            apply("tests/fixtures/ct15-local-legacy-profile.sql")
        if Path(path).name == "20260908_editorial_profiles_editor_update.sql":
            apply("tests/fixtures/ct15-local-legacy-extras.sql")
        apply(path)
    apply("tests/fixtures/ct15-local-legacy-seed.sql")
    for path in forward:
        apply(path)
    apply("tests/ct15-cumulative-postgres.sql")
    apply("tests/ct16-story-types-postgres.sql")
    apply("tests/ct16-work-assignments-postgres.sql")
    apply("tests/ct16-work-overview-postgres.sql")
    apply("tests/ct16-editorial-privileges-postgres.sql")
    apply("tests/ct16-homepage-visibility-postgres.sql")
    apply("tests/ct16-poll-placements-postgres.sql")
    apply("tests/ct16-story-translations-postgres.sql")
    apply("tests/ct16-poll-translations-postgres.sql")
    apply("tests/ct16-catalog-security-postgres.sql")
    results["success"] = True
finally:
    checkpoint()
