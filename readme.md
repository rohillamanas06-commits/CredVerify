# CredChain

**Blockchain-Anchored Credential Verification**

CredChain is a full-stack platform (FastAPI backend + React frontend) for issuing, sharing, and verifying digital credentials. Every credential's fingerprint is anchored on the Polygon blockchain, and every uploaded document passes through a multi-layer forensic check before it's issued.

---

## 📸 Screenshots

![](public/Screenshot%202026-07-02%20094015.png)
![](public/Screenshot%202026-07-02%20094050.png)
![](public/Screenshot%202026-07-02%20094224.png)
![](public/Screenshot%202026-07-02%20094128.png)
![](public/Screenshot%202026-07-02%20094140.png)


---

## 🌟 Key Features

* **Wallet Authentication:** Password-less login for institutions via MetaMask (`personal_sign`), backed by single-use, Redis-stored nonces to prevent signature replay.
* **Whitelisted Issuers:** Only institutions explicitly registered on-chain by a platform admin can issue credentials — there is no auto-registration path.
* **On-Chain Anchoring:** A canonical hash of each credential's core data (holder, issuer, type, title, date) is recorded immutably on the Polygon blockchain via the `CredentialRegistry` smart contract.
* **Document Forensics:** Uploaded documents are screened through three layers before issuance — file-signature/metadata checks, structural PDF analysis, and Gemini-assisted visual review — producing a combined confidence score rather than a single AI guess.
* **Responsive Dashboard:** A full-screen UI with role-based workflows for Issuers, Candidates, and Employers.

---

## 🔍 How Credential Verification Works

### 1. Issuance
An institution (already whitelisted on-chain) uploads a credential document. The backend:
- Runs it through the three-layer forensic check (metadata, PDF structure, Gemini visual analysis) and stores a confidence score.
- Computes a **canonical hash** from the credential's semantic data (holder name, institution, credential type, title, issue date) — not the raw file bytes, so a re-exported or re-compressed copy of the same document still verifies correctly.
- Writes that hash to the `CredentialRegistry` smart contract, along with the issuer's identity and a timestamp.
- Separately stores a raw SHA-256 hash of the uploaded file, used only to detect duplicate uploads.

### 2. Sharing
Candidates view their credentials on their dashboard and generate one-click share links for employers.

### 3. Verification
An employer can verify a credential three ways:
- **Share link** — resolves directly to the credential record.
- **Document hash** — paste the canonical hash to look it up.
- **File upload** — upload the original document; the backend hashes it and matches against stored file hashes. (Note: this path only matches an exact byte-for-byte copy of the originally issued file — use the share link or document hash if the file has been re-exported or re-compressed.)

### 4. The Cross-Check
Whichever path is used, the backend confirms three things against the `CredentialRegistry` and `IssuerRegistry` contracts:
* **Integrity:** Does this credential's hash exist on-chain?
* **Validity:** Has it been revoked by the issuer?
* **Authority:** Was it issued by a wallet that's a whitelisted institution on the network?

If all three pass, the credential is verified.

---

## 🏗️ Tech Stack

| Layer | Stack |
|---|---|
| Backend | FastAPI, SQLAlchemy (async), PostgreSQL (Neon), Redis |
| Auth | JWT (`python-jose`), bcrypt password hashing, MetaMask signature verification (`eth-account`) |
| AI | Google Gemini (`gemini-1.5-flash-latest`) for visual/semantic document review |
| Blockchain | Solidity contracts (`CredentialRegistry`, `IssuerRegistry`) on Polygon, deployed via Hardhat, accessed with `web3.py` |
| Frontend | React 19, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui components |
| Storage | Local disk (`uploads/`) — not currently backed by cloud object storage |

---

## ⚙️ Setup

### Backend
```bash
pip install -r requirements.txt
```

Create a `.env` file in the project root with:
```
APP_ENV=development          # set to "production" when deploying
SECRET_KEY=                  # JWT signing key
ADMIN_SECRET=                # required to call /admin/register-issuer
DATABASE_URL=                # Postgres connection string
REDIS_URL=redis://localhost:6379/0
GEMINI_API_KEY=
POLYGON_RPC_URL=
POLYGON_CHAIN_ID=80001       # Mumbai testnet by default
CONTRACT_ADDRESS=            # deployed CredentialRegistry address
ISSUER_REGISTRY_ADDRESS=     # deployed IssuerRegistry address
BACKEND_WALLET_PRIVATE_KEY=  # wallet used to send on-chain transactions
```

Run the API:
```bash
uvicorn backend:app --reload
```

### Smart Contracts
```bash
cd verifex-contracts
npm install
npx hardhat node          # local chain for development
npx hardhat run scripts/deploy.js --network <your-network>
```

### Frontend
```bash
npm install
npm run dev
```

---

## 🔐 Registering an Institution

There's no self-service or automatic issuer registration. A platform admin registers an institution's wallet explicitly:

```bash
curl -X POST http://localhost:8000/admin/register-issuer \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "0x...", "institution_name": "Example University", "admin_secret": "<ADMIN_SECRET>"}'
```

Only after this does `/auth/wallet-login` succeed for that wallet.

---

**Made with ❤️ by Manas Rohilla**