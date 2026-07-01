# CredChain

**Blockchain-Based Credential Management System**

CredChain is a full-stack platform (FastAPI backend + React frontend) for issuing, verifying, and managing digital credentials using blockchain technology and AI-powered fraud detection. 

---

## 🌟 Key Features

* **Wallet Authentication:** Secure, password-less login for institutions using MetaMask and Ethereum signatures (`personal_sign`).
* **On-Chain Anchoring:** Credential hashes are anchored to the Polygon blockchain, ensuring they are immutable and tamper-proof.
* **Responsive Dashboard:** A modern, full-screen UI with an animated sidebar and intuitive workflows for Issuers, Candidates, and Employers.
* **AI Fraud Detection:** Automated scanning of credentials to flag potential manipulation or anomalies.

---

## 🔍 How Credential Verification Works

CredChain ensures that credentials are authentic, untampered, and issued by legitimate institutions. Here is the step-by-step flow in simple terms:

### 1. Issuance (Anchoring the Truth)
When a trusted institution issues a credential, the system calculates a unique digital fingerprint (SHA-256 Hash) of the document. This hash—**not the private data itself**—is permanently recorded on the blockchain via a Smart Contract, along with the issuer's identity and a timestamp. 

### 2. Sharing 
Candidates can view their credentials on their dashboard and generate secure, one-click share links to send to employers.

### 3. Verification (Proving Authenticity)
When an employer wants to verify a credential, they can paste the share link, enter the hash, or simply upload the raw document file directly into the Verify portal.
* If a file is uploaded, the browser calculates its hash locally.

### 4. The Cross-Check
The backend takes the document hash and queries the Blockchain Smart Contract (`CredentialRegistry`). It confirms three critical things:
* **Integrity:** Does this exact hash exist on the blockchain? (If even a single pixel of the document was altered, the hashes won't match).
* **Validity:** Has the credential been revoked by the issuer?
* **Authority:** Is the issuer a recognized and whitelisted institution on the network?

If all checks pass, the credential is mathematically proven to be authentic!

---

**Made with ❤️ by Manas Rohilla**