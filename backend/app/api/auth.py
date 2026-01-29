from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
import json
import hashlib
from pathlib import Path

router = APIRouter(prefix="/auth", tags=["auth"])

CONFIG_PATH = Path(__file__).parent.parent.parent.parent / "config.json"


def get_config():
    """Load config from file."""
    if not CONFIG_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Config file not found. Copy config.example.json to config.json"
        )
    with open(CONFIG_PATH) as f:
        return json.load(f)


def generate_token(password: str, revoke_timestamp: str) -> str:
    """Generate a token from password and timestamp."""
    combined = f"{password}:{revoke_timestamp}"
    return hashlib.sha256(combined.encode()).hexdigest()


class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    token: str
    revoke_timestamp: str


class VerifyRequest(BaseModel):
    token: str
    revoke_timestamp: str


class VerifyResponse(BaseModel):
    valid: bool
    revoke_timestamp: str | None = None


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest):
    """Authenticate with password and get a token."""
    config = get_config()
    
    if data.password != config["password"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password"
        )
    
    token = generate_token(config["password"], config["revoke_timestamp"])
    return LoginResponse(token=token, revoke_timestamp=config["revoke_timestamp"])


@router.post("/verify", response_model=VerifyResponse)
def verify(data: VerifyRequest):
    """Verify if a token is still valid."""
    config = get_config()
    
    # Check if revoke_timestamp has changed (all tokens revoked)
    if data.revoke_timestamp != config["revoke_timestamp"]:
        return VerifyResponse(valid=False, revoke_timestamp=config["revoke_timestamp"])
    
    # Verify the token
    expected_token = generate_token(config["password"], config["revoke_timestamp"])
    if data.token != expected_token:
        return VerifyResponse(valid=False, revoke_timestamp=config["revoke_timestamp"])
    
    return VerifyResponse(valid=True)


@router.get("/status")
def auth_status():
    """Check if auth is configured and get current revoke timestamp."""
    try:
        config = get_config()
        return {"configured": True, "revoke_timestamp": config["revoke_timestamp"]}
    except:
        return {"configured": False, "revoke_timestamp": None}
