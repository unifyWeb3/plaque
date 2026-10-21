#!/usr/bin/env bash
# Pre-push security sweep for the Plaque repository.
#   bash scripts/security-sweep.sh
# Checks: no key material tracked, no 64-hex secrets that match our own credentials, no
# endpoint credentials, no third-party handles in the tracked tree, and a clean history scan.
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0

echo "== 1. tracked files that look like secrets =="
if git ls-files | grep -Ei '(^|/)(secrets?|\.env|.*\.(key|pem|keystore|mnemonic)|wallet\.json)$'; then
  echo "  FAIL"; fail=1
else
  echo "  ok: none"
fi

echo "== 2. ignored-but-present secret files =="
for f in secrets/*; do
  [ -f "$f" ] || continue
  perms=$(stat -c '%a' "$f")
  [ "$perms" = "600" ] || { echo "  FAIL: $f has mode $perms (expected 600)"; fail=1; }
  git check-ignore -q "$f" || { echo "  FAIL: $f is not gitignored"; fail=1; }
  echo "  ok: $f mode $perms, gitignored"
done

echo "== 3. 64-hex strings in tracked files, compared against our own credentials =="
cands=$(git grep -hoE '\b[0-9a-fA-F]{64}\b' -- . 2>/dev/null | sort -u | wc -l)
echo "  candidate 64-hex strings in tracked files: $cands"
leaked=0
for f in secrets/*.key secrets/*.seed; do
  [ -f "$f" ] || continue
  key=$(tr -d '\n' < "$f" | sed 's/^0x//')
  if git grep -qF "$key" -- . 2>/dev/null; then
    echo "  FAIL: the contents of $f appear in a tracked file"
    leaked=1
  fi
done
[ "$leaked" = "0" ] && echo "  ok: none of our credentials appear in the tracked tree"
[ "$leaked" = "1" ] && fail=1

echo "== 4. endpoint credentials / deployment secrets =="
if git grep -nEi '(api[_-]?key|secret[_-]?key|private[_-]?key|password|bearer |basic )[=:][[:space:]]*["'"'"'][A-Za-z0-9_-]{12,}' -- . 2>/dev/null; then
  echo "  FAIL: a hardcoded credential was found"
  fail=1
else
  echo "  ok: no hardcoded credentials"
fi
unexpected=$(git grep -hoE 'NEXT_PUBLIC_[A-Z_]+' -- . 2>/dev/null | sort -u | grep -vE 'NEXT_PUBLIC_(PLAQUE_CONTRACT|PORTALDOT_RPC|SPONSOR_URL)$')
if [ -n "$unexpected" ]; then
  echo "  FAIL: unexpected public variables: $unexpected"
  fail=1
else
  echo "  ok: only the documented public variables are used"
fi

echo "== 5. no third-party handles or repository identifiers in the tracked tree =="
# General rule: every github.com/<user> or x.com/<user> in the tracked tree must be this
# project's own identity. The researched profiles and projects are deliberately not named.
handles=$(git grep -hoE '(github\.com|x\.com|twitter\.com)/[A-Za-z0-9_.-]+' -- . 2>/dev/null \
  | sed -E 's#^(github\.com|x\.com|twitter\.com)/##' | sort -u \
  | grep -vE '^(unifyWeb3|oxunify|unify)$' \
  | grep -vE '^(features|about|pricing|docs|sponsors)$')
if [ -n "$handles" ]; then
  echo "  FAIL: third-party handle(s):"; echo "$handles" | sed 's/^/    /'
  fail=1
else
  echo "  ok: only this project's own identity is referenced"
fi

echo "== 6. history scan =="
if [ -d .git ]; then
  hist=$(git log --all --format=%H 2>/dev/null | wc -l)
  echo "  commits in the history: $hist"
  if git log --all -p 2>/dev/null | grep -qiE 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY'; then
    echo "  FAIL: a private key block appears in the history"
    fail=1
  else
    echo "  ok: no private key blocks in the history"
  fi
  if git log --all --format='%s%n%b' 2>/dev/null | grep -qiE 'seed|private key|mnemonic'; then
    echo "  note: a commit message mentions key material — check it"
  fi
fi

echo
if [ "$fail" = "0" ]; then echo "SECURITY SWEEP PASSED"; else echo "SECURITY SWEEP FAILED"; fi
exit "$fail"
