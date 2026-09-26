import json
import os
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./cityapr.db"
    SECRET_KEY: str = "cityapr-dev-secret-key-super-secure-change-in-prod-2025"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_HOURS: int = 8
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip().strip("'").strip('"')
            # Automatically adjust postgres:// and postgresql:// to use asyncpg
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
            
            # If there are query parameters in postgresql URL:
            if "?" in v and v.startswith("postgresql+asyncpg://"):
                base_part, query_part = v.split("?", 1)
                valid_params = []
                for param in query_part.split("&"):
                    if not param:
                        continue
                    if param.startswith("sslmode="):
                        valid_params.append("ssl=require")
                    elif param.startswith("ssl="):
                        valid_params.append(param)
                    elif param.startswith("timeout=") or param.startswith("command_timeout="):
                        valid_params.append(param)
                    # Exclude unsupported asyncpg params like channel_binding
                if valid_params:
                    dedup_params = list(dict.fromkeys(valid_params))
                    v = f"{base_part}?{'&'.join(dedup_params)}"
                else:
                    v = base_part
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.strip() == "*":
                return ["*"]
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
