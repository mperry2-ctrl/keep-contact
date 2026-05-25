from functools import lru_cache
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
from .config import settings

bearer = HTTPBearer()


@lru_cache(maxsize=1)
def _get_jwks() -> dict:
    url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    response = httpx.get(url, timeout=10)
    response.raise_for_status()
    return response.json()


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    token = credentials.credentials
    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")

        if alg == "HS256":
            key = settings.supabase_jwt_secret
        else:
            jwks = _get_jwks()
            kid = header.get("kid")
            key = next((k for k in jwks["keys"] if k.get("kid") == kid), None)
            if not key:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown signing key")

        payload = jwt.decode(token, key, algorithms=[alg], options={"verify_aud": False})
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return {"id": user_id, "email": payload.get("email", "")}
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
