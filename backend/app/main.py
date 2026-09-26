import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.db.session import engine
from app.db.base import Base
# Import all models to ensure metadata registration
import app.models
from app.api.routes import (
    auth_router,
    cameras_router,
    plates_router,
    alerts_router,
    analytics_router,
    blacklist_router,
    rto_router,
    ai_router,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cityapr")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized successfully.")
    yield
    logger.info("Shutting down CityAPR server...")
    await engine.dispose()

app = FastAPI(
    title="CityAPR — Chandigarh Traffic Intelligence & ANPR API",
    description="Smart India Hackathon Surveillance and ANPR Platform Backend",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
cors_origins = [str(origin) for origin in settings.CORS_ORIGINS] if isinstance(settings.CORS_ORIGINS, list) else [str(settings.CORS_ORIGINS)]
if "*" in cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Global Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    msg = errors[0].get("msg") if errors else "Invalid request data"
    loc = " -> ".join(str(l) for l in errors[0].get("loc", [])) if errors else ""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": f"{loc}: {msg}" if loc else msg}
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error. Please try again."}
    )

# Register API Routers
app.include_router(auth_router, prefix="/api")
app.include_router(cameras_router, prefix="/api")
app.include_router(plates_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(blacklist_router, prefix="/api")
app.include_router(rto_router, prefix="/api")
app.include_router(ai_router, prefix="/api/ai")

@app.get("/api/health", tags=["health"])
async def health_check():
    return {
        "status": "healthy",
        "system": "CityAPR",
        "city": "Chandigarh",
        "version": "1.0.0"
    }

@app.get("/", tags=["root"])
async def root():
    return {
        "message": "Welcome to CityAPR Traffic Intelligence API",
        "docs": "/docs",
        "health": "/api/health"
    }
