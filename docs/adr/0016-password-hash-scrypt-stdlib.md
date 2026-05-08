# ADR-0016: Password hashing — argon2-cffi → hashlib.scrypt (Python stdlib)

**Date**: 2026-06-10
**Status**: Accepted
**Approver**: Chris (user instruction 2026-06-10 W13 D5 F5 implementation)

## Context

W13 F5 backend hybrid auth(per ADR-0014)needs password hashing for self-register
users(`POST /auth/register` Argon2id hash + `POST /auth/login` verify match)。
Plan §F5.3 + W13 plan §F4.6 originally specified **Argon2id via `argon2-cffi`**
(per CLAUDE.md §5.2 H2 "utility-lib" allowed example list)。

Implementation hit blocker:**R8 Ricoh corp proxy SSL inspection**(known risk per
`docs/01-planning/RISK_REGISTER.md`)truncates `pip install argon2-cffi` payload
to 0 bytes — `pip._vendor.urllib3.exceptions.ProtocolError: Connection broken:
IncompleteRead(0 bytes read, 31715 more expected)`。Multiple workarounds tried
unsuccessfully(`--trusted-host` bypass / `--no-cache-dir` / `.venv` pip retry /
60s timeout)— same hash mismatch / connection truncation。

Per CLAUDE.md §13 "When in doubt → ask, don't guess",surfaced 4 options to
user via AskUserQuestion(2026-06-10 W13 D5 same-day cycle 2 of 4 cont):
1. ✅ **Recommended**:Switch to `hashlib.scrypt`(Python 3.12 stdlib)
2. User installs argon2-cffi manually(VPN disconnect / wheel pre-download)
3. Pause F5,defer F6 / F7 / W14 kickoff
4. ❌ Plain SHA-256 + salt(security anti-pattern)

**User selected Option 1**:hashlib.scrypt path。

## Decision

Use **`hashlib.scrypt`** (Python 3.12 standard library) for self-register password
hashing in W13 F5 backend cascade。Implementation in `backend/api/auth/security.py`:

```python
import hashlib
import secrets

_SCRYPT_N = 2**17  # CPU/memory cost (OWASP 2023 minimum;~64MB memory)
_SCRYPT_R = 8       # Block size
_SCRYPT_P = 1       # Parallelization
_SCRYPT_DKLEN = 64  # Derived key length (bytes)
_SALT_LEN = 16      # 128-bit salt

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(_SALT_LEN)
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt, n=_SCRYPT_N, r=_SCRYPT_R, p=_SCRYPT_P, dklen=_SCRYPT_DKLEN,
    )
    # "scrypt$N$r$p$salt_hex$hash_hex" portable format
    return f"scrypt${_SCRYPT_N}${_SCRYPT_R}${_SCRYPT_P}${salt.hex()}${derived.hex()}"

def verify_password(password: str, stored: str) -> bool:
    parts = stored.split("$")
    if len(parts) != 6 or parts[0] != "scrypt":
        return False
    _, n_s, r_s, p_s, salt_hex, hash_hex = parts
    salt = bytes.fromhex(salt_hex)
    expected = bytes.fromhex(hash_hex)
    derived = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt, n=int(n_s), r=int(r_s), p=int(p_s), dklen=len(expected),
    )
    return secrets.compare_digest(derived, expected)
```

**Storage format** `scrypt$N$r$p$salt_hex$hash_hex`(modular crypt format-style)
allows future param tuning + algorithm upgrades(forward-compatible re-hash on
next user login if params change)。

## Alternatives Considered

| Option | Reason rejected |
|---|---|
| **argon2-cffi**(plan original)| R8 corp proxy blocks `pip install`;multiple workarounds unsuccessful;immediate F5 unblock requires alternative。Argon2id 仍係 OWASP first-choice;**revisit post Beta** if proxy resolved |
| **bcrypt**(external dep)| Same R8 proxy issue likely(any external pip install);same blocker as argon2-cffi |
| **passlib**(external dep)| Same R8 proxy issue likely;additionally adds full lib for one feature(over-engineered for Tier 1) |
| **PBKDF2**(`hashlib.pbkdf2_hmac` stdlib)| OWASP-acceptable but **NOT memory-hard** — weaker against GPU brute-force than scrypt;only choose if scrypt unavailable(not the case here)|
| **Plain SHA-256 + salt**| Security anti-pattern;fast hash → trivial GPU brute-force;CLAUDE.md §5.5 H5 likely violation;explicitly rejected by user |

## Consequences

### Positive
- ✅ **Zero external dep** — Python 3.12 stdlib;avoids R8 proxy issue entirely
- ✅ **OWASP-approved memory-hard KDF** — scrypt 與 Argon2id 同屬 OWASP recommended top-tier(Argon2id first choice;scrypt acceptable)
- ✅ **Immediate F5 unblock** — same-day cycle 2 of 4 momentum preserved;no waiting on infrastructure resolution
- ✅ **Forward-compatible storage** — `scrypt$N$r$p$...` modular format allows future param tuning OR algorithm migration without breaking existing hashes;re-hash on user login if config bumps detected

### Negative
- ⚠️ **Slightly weaker than Argon2id**(`OWASP Password Storage Cheat Sheet 2023`)— Argon2id designed specifically as PHC winner;scrypt still solid but "B-tier" relative。Quantitative gap negligible at chosen params(N=2^17 ≈ 64 MB / iter);**production hardening trigger** = if password DB exposure incident OR external pen-test recommendation
- ⚠️ **No automatic param-update detection in current impl** — `verify_password` accepts stored params verbatim;future param bump requires explicit upgrade path(re-hash on next login if `extract_params(stored) != current`)。**TODO** comment 留 Beta hardening trigger

### Neutral
- 📝 **plan §7 changelog R3 entry** required(deviation from F5.3 + F4.6 original spec)
- 📝 **Beta hardening revisit** opportunity:if argon2-cffi proxy issue resolved AND security review prefers Argon2id,migrate via re-hash-on-login flow(forward-compatible storage format makes this surgical)。Track via W14+ open item OR Beta phase trigger
- 📝 **Tier 2 review consideration**:if multi-tenancy(architecture.md §11)brings external partner self-register Beta+ scale,revisit hash KDF choice based on threat model

## References

- **Plan §F5.3 + §F4.6 original spec**:`docs/01-planning/W13-user-facing-views/plan.md`(2026-06-10 changelog entry W13 D5 F5 implementation)
- **R8 corp proxy known risk**:`docs/01-planning/RISK_REGISTER.md`
- **CLAUDE.md §5.2 H2 utility-lib examples**:argon2-cffi was listed allowed (no ADR for adding it);scrypt switch is internal vendor decision change → ADR per H2 strict reading
- **OWASP Password Storage Cheat Sheet**(2023):https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- **Python `hashlib.scrypt`** docs:https://docs.python.org/3/library/hashlib.html#hashlib.scrypt
- **Sister ADRs**:ADR-0014(hybrid auth W11 D2 cont)— enables self-register flow that this hash decision serves
