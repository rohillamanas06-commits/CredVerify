"""
CredVerify Backend — AI + Blockchain Credential Verification System
Single-file FastAPI backend

Stack:
  - FastAPI + SQLAlchemy (async) + PostgreSQL
  - Gemini AI (document parsing + fraud detection)
  - Polygon blockchain (Web3.py)
  - AWS S3 (document storage)
  - Redis (verification result cache)
  - JWT auth (candidates/employers) + Wallet signature auth (institutions)
"""

import os
import uuid
import json
import hashlib
import secrets
import enum
from datetime import datetime, timedelta
from typing import Optional, Any


# ── Web framework ──────────────────────────────────────────────────────────────
from fastapi import (
    FastAPI, Depends, HTTPException, status,
    UploadFile, File, Request, BackgroundTasks
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# ── Pydantic ───────────────────────────────────────────────────────────────────
from pydantic import BaseModel, EmailStr, ConfigDict
from pydantic_settings import BaseSettings

# ── Auth / crypto ──────────────────────────────────────────────────────────────
from jose import JWTError, jwt
from passlib.context import CryptContext
from eth_account import Account
from eth_account.messages import encode_defunct

# ── Database ───────────────────────────────────────────────────────────────────
from sqlalchemy import (
    Column, String, DateTime, Boolean, Float,
    ForeignKey, Text, Integer, Enum as SAEnum, select, update
)
from sqlalchemy.engine import make_url
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, relationship

# ── AWS S3 ─────────────────────────────────────────────────────────────────────
import boto3
from botocore.exceptions import ClientError

# ── Gemini AI ──────────────────────────────────────────────────────────────────
import google.generativeai as genai

# ── Blockchain ─────────────────────────────────────────────────────────────────
from web3 import Web3
from web3.middleware.proof_of_authority import ExtraDataToPOAMiddleware as geth_poa_middleware

# ── Redis ──────────────────────────────────────────────────────────────────────
import redis.asyncio as aioredis

# ── Misc ───────────────────────────────────────────────────────────────────────
from dotenv import load_dotenv

load_dotenv()


# ══════════════════════════════════════════════════════════════════════════════
# CONFIG
# ══════════════════════════════════════════════════════════════════════════════

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")

    APP_ENV: str = "development"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str
    REDIS_URL: str = "redis://localhost:6379/0"

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "ap-south-1"
    S3_BUCKET_NAME: str = ""

    GEMINI_API_KEY: str

    POLYGON_RPC_URL: str
    POLYGON_CHAIN_ID: int = 80001  # Mumbai testnet default
    CONTRACT_ADDRESS: str
    ISSUER_REGISTRY_ADDRESS: str
    BACKEND_WALLET_PRIVATE_KEY: str


settings = Settings()


def _async_database_url(database_url: str) -> str:
    url = make_url(database_url)
    if url.drivername in ("postgresql", "postgres"):
        url = url.set(drivername="postgresql+asyncpg")
    # Strip ALL query params — SSL passed via connect_args instead
    url = url.set(query={})
    return str(url)

# ══════════════════════════════════════════════════════════════════════════════
# DATABASE
# ══════════════════════════════════════════════════════════════════════════════
engine = create_async_engine(
    "postgresql+asyncpg://",
    echo=settings.APP_ENV == "development",
    pool_size=10,
    max_overflow=20,
    connect_args={
        "host": "ep-late-flower-ap1jp7o1-pooler.c-7.us-east-1.aws.neon.tech",
        "database": "neondb",
        "user": "neondb_owner",
        "password": "npg_7jYM0KNRhoOP",
        "ssl": "require",
    },
)
AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
class Base(DeclarativeBase):
    pass


# ── Enums ──────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    institution = "institution"
    candidate = "candidate"
    employer = "employer"


class CredentialStatus(str, enum.Enum):
    active = "active"
    revoked = "revoked"
    expired = "expired"


class VerificationResult(str, enum.Enum):
    verified = "verified"
    mismatch = "mismatch"
    flagged = "flagged"
    pending = "pending"


# ── Models ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    role = Column(SAEnum(UserRole), nullable=False)
    name = Column(String(255), nullable=False)
    wallet_address = Column(String(42), unique=True, nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    credentials_issued = relationship("Credential", foreign_keys="Credential.institution_id", back_populates="institution")
    credentials_received = relationship("Credential", foreign_keys="Credential.candidate_id", back_populates="candidate")
    share_links = relationship("ShareLink", back_populates="candidate")


class Credential(Base):
    __tablename__ = "credentials"
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    institution_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    candidate_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    credential_type = Column(String(100), nullable=False)
    title = Column(String(255), nullable=False)
    issue_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=True)
    s3_key = Column(String(500), nullable=False)
    s3_url = Column(String(1000), nullable=True)
    document_hash = Column(String(64), nullable=False, index=True)
    tx_hash = Column(String(66), nullable=True)
    block_number = Column(Integer, nullable=True)
    on_chain = Column(Boolean, default=False)
    ai_confidence = Column(Float, nullable=True)
    ai_fraud_flag = Column(Boolean, default=False)
    ai_extracted_data = Column(Text, nullable=True)
    status = Column(SAEnum(CredentialStatus), default=CredentialStatus.active)
    revocation_reason = Column(Text, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    institution = relationship("User", foreign_keys=[institution_id], back_populates="credentials_issued")
    candidate = relationship("User", foreign_keys=[candidate_id], back_populates="credentials_received")
    share_links = relationship("ShareLink", back_populates="credential")
    verification_logs = relationship("VerificationLog", back_populates="credential")


class ShareLink(Base):
    __tablename__ = "share_links"
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token = Column(String(64), unique=True, nullable=False, index=True)
    credential_id = Column(PGUUID(as_uuid=True), ForeignKey("credentials.id"), nullable=False)
    candidate_id = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=True)
    access_count = Column(Integer, default=0)
    max_access = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    credential = relationship("Credential", back_populates="share_links")
    candidate = relationship("User", back_populates="share_links")


class VerificationLog(Base):
    __tablename__ = "verification_logs"
    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    credential_id = Column(PGUUID(as_uuid=True), ForeignKey("credentials.id"), nullable=False)
    verified_by = Column(PGUUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    share_token = Column(String(64), nullable=True)
    result = Column(SAEnum(VerificationResult), nullable=False)
    chain_match = Column(Boolean, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    credential = relationship("Credential", back_populates="verification_logs")


# DB session dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ══════════════════════════════════════════════════════════════════════════════
# SECURITY / AUTH
# ══════════════════════════════════════════════════════════════════════════════

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    return decode_token(credentials.credentials)


def require_role(*roles: str):
    async def _check(user=Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail=f"Restricted to: {', '.join(roles)}")
        return user
    return _check


require_institution = require_role("institution")
require_candidate = require_role("candidate", "institution")
require_any = require_role("institution", "candidate", "employer")


def verify_wallet_signature(wallet_address: str, message: str, signature: str) -> bool:
    """Verify that a wallet signed a given message — used for institution auth."""
    try:
        msg = encode_defunct(text=message)
        recovered = Account.recover_message(msg, signature=signature)
        return recovered.lower() == wallet_address.lower()
    except Exception:
        return False


# ══════════════════════════════════════════════════════════════════════════════
# LOCAL FILE STORAGE (S3 not used — kept off for dev/demo to avoid AWS dependency)
# ══════════════════════════════════════════════════════════════════════════════

LOCAL_UPLOAD_DIR = "uploads"
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)

async def upload_to_s3(file_bytes: bytes, key: str, content_type: str) -> str:
    safe_key = key.replace("/", "_")
    path = os.path.join(LOCAL_UPLOAD_DIR, safe_key)
    with open(path, "wb") as f:
        f.write(file_bytes)
    return key

def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    safe_key = key.replace("/", "_")
    return f"http://localhost:8000/uploads/{safe_key}"



def compute_sha256(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()


# ══════════════════════════════════════════════════════════════════════════════
# GEMINI AI
# ══════════════════════════════════════════════════════════════════════════════

genai.configure(api_key=settings.GEMINI_API_KEY)
gemini_model = genai.GenerativeModel("gemini-1.5-flash")


async def ai_analyze_document(file_bytes: bytes, mime_type: str) -> dict:
    """
    Send document to Gemini for:
    1. Entity extraction (name, institution, date, credential type)
    2. Fraud detection (inconsistencies, edit artifacts)
    3. Confidence score
    Returns a dict with extracted_data, fraud_flag, confidence
    """
    prompt = """
    You are a credential verification AI. Analyze this document and return a JSON object with:
    {
      "extracted": {
        "holder_name": "full name on document",
        "institution_name": "issuing institution",
        "credential_type": "degree/certificate/diploma/etc",
        "credential_title": "exact title e.g. B.Tech Computer Science",
        "issue_date": "YYYY-MM-DD or null",
        "expiry_date": "YYYY-MM-DD or null"
      },
      "fraud_indicators": [
        "list any suspicious observations here, empty array if none"
      ],
      "confidence": 0.95,
      "fraud_flag": false,
      "notes": "any other observations"
    }

    Fraud indicators to look for:
    - Inconsistent fonts or font sizes
    - Pixelation or blurring around text (sign of editing)
    - Misaligned text blocks
    - Unusual metadata inconsistencies
    - Generic or suspicious institution names
    - Date inconsistencies

    Respond with ONLY the JSON object, no markdown, no explanation.
    """

    try:
        image_part = {"mime_type": mime_type, "data": file_bytes}
        response = gemini_model.generate_content([prompt, image_part])
        raw = response.text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw.strip())
        return result
    except Exception as e:
        # Fail gracefully — don't block credential issuance
        return {
            "extracted": {},
            "fraud_indicators": [],
            "confidence": None,
            "fraud_flag": False,
            "notes": f"AI analysis failed: {str(e)}",
        }


# ══════════════════════════════════════════════════════════════════════════════
# BLOCKCHAIN (Polygon)
# ══════════════════════════════════════════════════════════════════════════════

# Minimal ABI for CredentialRegistry contract
CREDENTIAL_REGISTRY_ABI = [
    {
        "inputs": [
            {"internalType": "bytes32", "name": "credentialHash", "type": "bytes32"},
            {"internalType": "address", "name": "issuer", "type": "address"},
            {"internalType": "string", "name": "credentialId", "type": "string"},
        ],
        "name": "issueCredential",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [
            {"internalType": "bytes32", "name": "credentialHash", "type": "bytes32"},
            {"internalType": "string", "name": "reason", "type": "string"},
        ],
        "name": "revokeCredential",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "credentialHash", "type": "bytes32"}],
        "name": "verifyCredential",
        "outputs": [
            {"internalType": "bool", "name": "exists", "type": "bool"},
            {"internalType": "bool", "name": "isRevoked", "type": "bool"},
            {"internalType": "address", "name": "issuer", "type": "address"},
            {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]

# Minimal ABI for IssuerRegistry contract
ISSUER_REGISTRY_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "issuer", "type": "address"}],
        "name": "isRegisteredIssuer",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"internalType": "address", "name": "issuer", "type": "address"}],
        "name": "registerIssuer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

w3 = Web3(Web3.HTTPProvider(settings.POLYGON_RPC_URL))
w3.middleware_onion.inject(geth_poa_middleware, layer=0)

credential_contract = w3.eth.contract(
    address=Web3.to_checksum_address(settings.CONTRACT_ADDRESS),
    abi=CREDENTIAL_REGISTRY_ABI,
)
issuer_contract = w3.eth.contract(
    address=Web3.to_checksum_address(settings.ISSUER_REGISTRY_ADDRESS),
    abi=ISSUER_REGISTRY_ABI,
)

backend_account = Account.from_key(settings.BACKEND_WALLET_PRIVATE_KEY)


def _send_transaction(fn) -> dict:
    """Build, sign, and send a contract transaction. Returns receipt."""
    nonce = w3.eth.get_transaction_count(backend_account.address)
    tx = fn.build_transaction({
        "chainId": settings.POLYGON_CHAIN_ID,
        "gas": 200000,
        "gasPrice": w3.eth.gas_price,
        "nonce": nonce,
    })
    signed = w3.eth.account.sign_transaction(tx, private_key=settings.BACKEND_WALLET_PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
    return receipt


def blockchain_issue_credential(document_hash: str, issuer_address: str, credential_id: str) -> dict:
    """Write credential hash to Polygon. Returns tx_hash and block_number."""
    try:
        hash_bytes = bytes.fromhex(document_hash)
        fn = credential_contract.functions.issueCredential(
            hash_bytes,
            Web3.to_checksum_address(issuer_address),
            credential_id,
        )
        receipt = _send_transaction(fn)
        return {
            "success": True,
            "tx_hash": receipt["transactionHash"].hex(),
            "block_number": receipt["blockNumber"],
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def blockchain_revoke_credential(document_hash: str, reason: str) -> dict:
    """Revoke a credential on-chain."""
    try:
        hash_bytes = bytes.fromhex(document_hash)
        fn = credential_contract.functions.revokeCredential(hash_bytes, reason)
        receipt = _send_transaction(fn)
        return {
            "success": True,
            "tx_hash": receipt["transactionHash"].hex(),
            "block_number": receipt["blockNumber"],
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def blockchain_verify_credential(document_hash: str) -> dict:
    """Read-only check on Polygon. Returns exists, isRevoked, issuer, timestamp."""
    try:
        hash_bytes = bytes.fromhex(document_hash)
        exists, is_revoked, issuer, timestamp = credential_contract.functions.verifyCredential(hash_bytes).call()
        return {
            "success": True,
            "exists": exists,
            "is_revoked": is_revoked,
            "issuer": issuer,
            "timestamp": timestamp,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def blockchain_is_registered_issuer(wallet_address: str) -> bool:
    """Check if wallet is a whitelisted institution on-chain."""
    try:
        return issuer_contract.functions.isRegisteredIssuer(
            Web3.to_checksum_address(wallet_address)
        ).call()
    except Exception:
        return False


# ══════════════════════════════════════════════════════════════════════════════
# REDIS CACHE
# ══════════════════════════════════════════════════════════════════════════════

redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return redis_client


VERIFY_CACHE_TTL = 300  # 5 minutes


async def cache_verification_result(doc_hash: str, result: dict):
    r = await get_redis()
    await r.setex(f"verify:{doc_hash}", VERIFY_CACHE_TTL, json.dumps(result))


async def get_cached_verification(doc_hash: str) -> Optional[dict]:
    r = await get_redis()
    cached = await r.get(f"verify:{doc_hash}")
    return json.loads(cached) if cached else None


# ══════════════════════════════════════════════════════════════════════════════
# SCHEMAS (Pydantic request / response models)
# ══════════════════════════════════════════════════════════════════════════════

# ── Auth ───────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class WalletLoginRequest(BaseModel):
    """Institution login via MetaMask wallet signature."""
    wallet_address: str
    message: str       # nonce message that was signed
    signature: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str


# ── Credentials ────────────────────────────────────────────────────────────────

class IssueCredentialRequest(BaseModel):
    candidate_email: EmailStr
    credential_type: str
    title: str
    issue_date: datetime
    expiry_date: Optional[datetime] = None


class CredentialResponse(BaseModel):
    id: str
    credential_type: str
    title: str
    issue_date: datetime
    expiry_date: Optional[datetime]
    document_hash: str
    on_chain: bool
    tx_hash: Optional[str]
    ai_confidence: Optional[float]
    ai_fraud_flag: bool
    status: str
    institution_name: str
    candidate_name: str
    created_at: datetime


class RevokeRequest(BaseModel):
    reason: str


# ── Share links ────────────────────────────────────────────────────────────────

class CreateShareLinkRequest(BaseModel):
    credential_id: str
    expires_in_hours: Optional[int] = 72
    max_access: Optional[int] = None


class ShareLinkResponse(BaseModel):
    token: str
    share_url: str
    expires_at: Optional[datetime]


# ── Verification ───────────────────────────────────────────────────────────────

class VerificationResponse(BaseModel):
    result: str
    chain_match: Optional[bool]
    ai_confidence: Optional[float]
    is_revoked: bool
    credential: Optional[dict]
    verified_at: datetime


# ══════════════════════════════════════════════════════════════════════════════
# FASTAPI APP
# ══════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="CredVerify API",
    description="AI + Blockchain Credential Verification System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.staticfiles import StaticFiles
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created")
    print(f"✅ Blockchain connected: {w3.is_connected()}")


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES — AUTH
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/auth/register", response_model=TokenResponse, tags=["Auth"])
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a candidate or employer with email + password."""
    if body.role == UserRole.institution:
        raise HTTPException(400, "Institutions must register via wallet. Use /auth/wallet-login.")

    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(400, "Email already registered.")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        name=body.name,
        role=body.role,
    )
    db.add(user)
    await db.flush()

    token = create_access_token({"sub": str(user.id), "role": body.role.value, "email": body.email})
    return TokenResponse(access_token=token, role=body.role.value, user_id=str(user.id))


@app.post("/auth/login", response_model=TokenResponse, tags=["Auth"])
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Login with email + password."""
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash or ""):
        raise HTTPException(401, "Invalid credentials.")
    if not user.is_active:
        raise HTTPException(403, "Account disabled.")

    token = create_access_token({"sub": str(user.id), "role": user.role.value, "email": user.email})
    return TokenResponse(access_token=token, role=user.role.value, user_id=str(user.id))


@app.post("/auth/wallet-login", response_model=TokenResponse, tags=["Auth"])
async def wallet_login(body: WalletLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Institution login via MetaMask wallet signature.
    Frontend: sign a nonce message with MetaMask, send wallet_address + message + signature.
    """
    if not verify_wallet_signature(body.wallet_address, body.message, body.signature):
        raise HTTPException(401, "Invalid wallet signature.")

    # Check if wallet is a registered issuer on-chain
    if not blockchain_is_registered_issuer(body.wallet_address):
        raise HTTPException(403, "Wallet is not a registered issuer on-chain.")

    result = await db.execute(select(User).where(User.wallet_address == body.wallet_address.lower()))
    user = result.scalar_one_or_none()

    if not user:
        # Auto-create institution account on first wallet login
        user = User(
            email=f"{body.wallet_address.lower()}@wallet.credverify",
            name=f"Institution {body.wallet_address[:8]}",
            role=UserRole.institution,
            wallet_address=body.wallet_address.lower(),
        )
        db.add(user)
        await db.flush()

    token = create_access_token({"sub": str(user.id), "role": "institution", "wallet": body.wallet_address})
    return TokenResponse(access_token=token, role="institution", user_id=str(user.id))


@app.get("/auth/nonce/{wallet_address}", tags=["Auth"])
async def get_nonce(wallet_address: str):
    """
    Returns a message for the wallet to sign.
    Frontend calls this first, then passes result to MetaMask for signing.
    """
    nonce = secrets.token_hex(16)
    message = f"Sign in to CredVerify\nWallet: {wallet_address}\nNonce: {nonce}\nTimestamp: {datetime.utcnow().isoformat()}"
    return {"message": message}


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES — CREDENTIALS
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/credentials/issue", tags=["Credentials"])
async def issue_credential(
    background_tasks: BackgroundTasks,
    credential_type: str,
    title: str,
    issue_date: str,
    candidate_email: str,
    file: UploadFile = File(...),
    expiry_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_institution),
):
    """
    Institution issues a credential.
    Steps: upload doc → S3, hash it, AI analyze, write hash to Polygon.
    """
    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "File too large. Max 10MB.")

    # 1. Find candidate
    result = await db.execute(select(User).where(User.email == candidate_email))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(404, f"Candidate with email {candidate_email} not found.")

    # 2. Get issuer
    result = await db.execute(select(User).where(User.id == uuid.UUID(current_user["sub"])))
    institution = result.scalar_one_or_none()

    # 3. Hash document
    doc_hash = compute_sha256(file_bytes)

    # 4. Check for duplicate
    existing = await db.execute(select(Credential).where(Credential.document_hash == doc_hash))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "This exact document has already been issued.")

    # 5. Upload to S3
    s3_key = f"credentials/{institution.id}/{candidate.id}/{doc_hash[:16]}_{file.filename}"
    await upload_to_s3(file_bytes, s3_key, file.content_type or "application/octet-stream")

    # 6. AI analysis
    ai_result = await ai_analyze_document(file_bytes, file.content_type or "image/jpeg")

    # 7. Save credential to DB first (pending on-chain)
    cred = Credential(
        institution_id=institution.id,
        candidate_id=candidate.id,
        credential_type=credential_type,
        title=title,
        issue_date=datetime.fromisoformat(issue_date),
        expiry_date=datetime.fromisoformat(expiry_date) if expiry_date else None,
        s3_key=s3_key,
        document_hash=doc_hash,
        ai_confidence=ai_result.get("confidence"),
        ai_fraud_flag=ai_result.get("fraud_flag", False),
        ai_extracted_data=json.dumps(ai_result),
        on_chain=False,
    )
    db.add(cred)
    await db.flush()
    cred_id = str(cred.id)

    # 8. Write to Polygon in background (non-blocking)
    background_tasks.add_task(
        _write_to_blockchain,
        cred_id=cred_id,
        doc_hash=doc_hash,
        issuer_wallet=institution.wallet_address or backend_account.address,
    )

    return {
        "credential_id": cred_id,
        "document_hash": doc_hash,
        "on_chain": False,
        "on_chain_status": "pending — writing to Polygon in background",
        "ai_confidence": ai_result.get("confidence"),
        "ai_fraud_flag": ai_result.get("fraud_flag"),
        "ai_extracted": ai_result.get("extracted"),
        "fraud_indicators": ai_result.get("fraud_indicators"),
    }


async def _write_to_blockchain(cred_id: str, doc_hash: str, issuer_wallet: str):
    """Background task: write credential hash to Polygon, update DB."""
    result = blockchain_issue_credential(doc_hash, issuer_wallet, cred_id)
    async with AsyncSessionLocal() as db:
        if result["success"]:
            await db.execute(
                update(Credential)
                .where(Credential.id == uuid.UUID(cred_id))
                .values(
                    on_chain=True,
                    tx_hash=result["tx_hash"],
                    block_number=result["block_number"],
                )
            )
        await db.commit()


@app.get("/credentials/mine", tags=["Credentials"])
async def get_my_credentials(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_candidate),
):
    """Candidate: list all credentials issued to me."""
    result = await db.execute(
        select(Credential, User)
        .join(User, Credential.institution_id == User.id)
        .where(Credential.candidate_id == uuid.UUID(current_user["sub"]))
    )
    rows = result.all()
    return [_format_credential(cred, institution) for cred, institution in rows]


@app.get("/credentials/issued", tags=["Credentials"])
async def get_issued_credentials(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_institution),
):
    """Institution: list all credentials I have issued."""
    result = await db.execute(
        select(Credential, User)
        .join(User, Credential.candidate_id == User.id)
        .where(Credential.institution_id == uuid.UUID(current_user["sub"]))
    )
    rows = result.all()
    return [_format_credential(cred, candidate=candidate) for cred, candidate in rows]


@app.post("/credentials/{credential_id}/revoke", tags=["Credentials"])
async def revoke_credential(
    credential_id: str,
    body: RevokeRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_institution),
):
    """Institution revokes a credential — updates DB and Polygon."""
    result = await db.execute(
        select(Credential).where(
            Credential.id == uuid.UUID(credential_id),
            Credential.institution_id == uuid.UUID(current_user["sub"]),
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(404, "Credential not found or not yours.")
    if cred.status == CredentialStatus.revoked:
        raise HTTPException(400, "Already revoked.")

    # Revoke on-chain
    chain_result = blockchain_revoke_credential(cred.document_hash, body.reason)

    cred.status = CredentialStatus.revoked
    cred.revocation_reason = body.reason
    cred.revoked_at = datetime.utcnow()

    return {
        "revoked": True,
        "credential_id": credential_id,
        "chain_result": chain_result,
    }


@app.get("/credentials/{credential_id}/document", tags=["Credentials"])
async def get_document_url(
    credential_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_any),
):
    """Get a 1-hour presigned S3 URL for the credential document."""
    result = await db.execute(select(Credential).where(Credential.id == uuid.UUID(credential_id)))
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(404, "Credential not found.")

    user_id = uuid.UUID(current_user["sub"])
    if current_user["role"] not in ("institution",) and cred.candidate_id != user_id:
        raise HTTPException(403, "Not authorized to access this document.")

    url = get_presigned_url(cred.s3_key)
    return {"url": url, "expires_in": 3600}


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES — SHARE LINKS
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/share-links", response_model=ShareLinkResponse, tags=["Share"])
async def create_share_link(
    body: CreateShareLinkRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_candidate),
):
    """Candidate creates a shareable link for one of their credentials."""
    result = await db.execute(
        select(Credential).where(
            Credential.id == uuid.UUID(body.credential_id),
            Credential.candidate_id == uuid.UUID(current_user["sub"]),
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(404, "Credential not found or not yours.")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=body.expires_in_hours) if body.expires_in_hours else None

    link = ShareLink(
        token=token,
        credential_id=cred.id,
        candidate_id=uuid.UUID(current_user["sub"]),
        expires_at=expires_at,
        max_access=body.max_access,
    )
    db.add(link)

    return ShareLinkResponse(
        token=token,
        share_url=f"/verify/link/{token}",
        expires_at=expires_at,
    )


@app.get("/share-links/mine", tags=["Share"])
async def get_my_share_links(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_candidate),
):
    """Candidate: list all their active share links."""
    result = await db.execute(
        select(ShareLink).where(
            ShareLink.candidate_id == uuid.UUID(current_user["sub"]),
            ShareLink.is_active == True,
        )
    )
    links = result.scalars().all()
    return [
        {
            "id": str(l.id),
            "token": l.token,
            "credential_id": str(l.credential_id),
            "expires_at": l.expires_at,
            "access_count": l.access_count,
            "max_access": l.max_access,
        }
        for l in links
    ]


@app.delete("/share-links/{token}", tags=["Share"])
async def deactivate_share_link(
    token: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_candidate),
):
    """Candidate deactivates a share link."""
    result = await db.execute(
        select(ShareLink).where(
            ShareLink.token == token,
            ShareLink.candidate_id == uuid.UUID(current_user["sub"]),
        )
    )
    link = result.scalar_one_or_none()
    if not link:
        raise HTTPException(404, "Share link not found.")
    link.is_active = False
    return {"deactivated": True}


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES — VERIFICATION (PUBLIC)
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/verify/link/{token}", tags=["Verify"])
async def verify_by_link(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint — employer pastes share link, gets full verification result.
    No auth required.
    """
    result = await db.execute(select(ShareLink).where(ShareLink.token == token))
    link = result.scalar_one_or_none()

    if not link or not link.is_active:
        raise HTTPException(404, "Share link not found or inactive.")
    if link.expires_at and datetime.utcnow() > link.expires_at:
        raise HTTPException(410, "Share link has expired.")
    if link.max_access and link.access_count >= link.max_access:
        raise HTTPException(410, "Share link has reached maximum access count.")

    # Increment access count
    link.access_count += 1

    # Get credential
    cred_result = await db.execute(
        select(Credential, User, User)
        .join(User, Credential.institution_id == User.id)
        .where(Credential.id == link.credential_id)
    )
    row = cred_result.first()
    if not row:
        raise HTTPException(404, "Credential not found.")

    cred = row[0]
    institution = row[1]

    verification = await _run_verification(cred, db)

    # Log it
    log = VerificationLog(
        credential_id=cred.id,
        share_token=token,
        result=verification["result"],
        chain_match=verification["chain_match"],
        ai_confidence=cred.ai_confidence,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)

    return {
        **verification,
        "credential": _format_credential(cred, institution),
    }


@app.get("/verify/hash/{document_hash}", tags=["Verify"])
async def verify_by_hash(
    document_hash: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Verify a credential by its document SHA-256 hash.
    Checks both DB and Polygon.
    """
    cached = await get_cached_verification(document_hash)
    if cached:
        return {**cached, "cached": True}

    result = await db.execute(
        select(Credential, User)
        .join(User, Credential.institution_id == User.id)
        .where(Credential.document_hash == document_hash)
    )
    row = result.first()

    if not row:
        # Still check chain — credential might exist on-chain without DB record
        chain = blockchain_verify_credential(document_hash)
        return {
            "result": "mismatch",
            "chain_match": chain.get("exists", False),
            "in_database": False,
            "is_revoked": chain.get("is_revoked", False),
            "verified_at": datetime.utcnow(),
        }

    cred, institution = row
    verification = await _run_verification(cred, db)

    # Cache result
    await cache_verification_result(document_hash, verification)

    log = VerificationLog(
        credential_id=cred.id,
        result=verification["result"],
        chain_match=verification["chain_match"],
        ai_confidence=cred.ai_confidence,
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)

    return {
        **verification,
        "credential": _format_credential(cred, institution),
    }


async def _run_verification(cred: Credential, db: AsyncSession) -> dict:
    """Core verification logic — checks DB status + Polygon."""
    is_revoked = cred.status == CredentialStatus.revoked
    chain = blockchain_verify_credential(cred.document_hash)

    chain_match = chain.get("exists", False) and not chain.get("is_revoked", False)

    if is_revoked or chain.get("is_revoked"):
        result = VerificationResult.mismatch
    elif cred.ai_fraud_flag:
        result = VerificationResult.flagged
    elif chain_match:
        result = VerificationResult.verified
    else:
        result = VerificationResult.pending

    return {
        "result": result.value,
        "chain_match": chain_match,
        "is_revoked": is_revoked or chain.get("is_revoked", False),
        "ai_confidence": cred.ai_confidence,
        "ai_fraud_flag": cred.ai_fraud_flag,
        "on_chain": cred.on_chain,
        "tx_hash": cred.tx_hash,
        "verified_at": datetime.utcnow().isoformat(),
    }


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES — MISC
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "CredChain API - Blockchain Credential Verification",
        "docs": "http://localhost:8000/docs",
        "version": "1.0.0"
    }


@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "blockchain_connected": w3.is_connected(),
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/credentials/{credential_id}/logs", tags=["Credentials"])
async def get_verification_logs(
    credential_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_institution),
):
    """Institution sees all verification events for a credential they issued."""
    result = await db.execute(
        select(VerificationLog)
        .where(VerificationLog.credential_id == uuid.UUID(credential_id))
        .order_by(VerificationLog.created_at.desc())
    )
    logs = result.scalars().all()
    return [
        {
            "id": str(l.id),
            "result": l.result,
            "chain_match": l.chain_match,
            "ip_address": l.ip_address,
            "verified_at": l.created_at,
        }
        for l in logs
    ]


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _format_credential(cred: Credential, institution: Optional[User] = None, candidate: Optional[User] = None) -> dict:
    return {
        "id": str(cred.id),
        "credential_type": cred.credential_type,
        "title": cred.title,
        "issue_date": cred.issue_date.isoformat(),
        "expiry_date": cred.expiry_date.isoformat() if cred.expiry_date else None,
        "document_hash": cred.document_hash,
        "on_chain": cred.on_chain,
        "tx_hash": cred.tx_hash,
        "ai_confidence": cred.ai_confidence,
        "ai_fraud_flag": cred.ai_fraud_flag,
        "status": cred.status.value,
        "institution_name": institution.name if institution else None,
        "candidate_name": candidate.name if candidate else None,
        "created_at": cred.created_at.isoformat(),
    }


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend:app", host="127.0.0.1", port=8000, reload=True)