from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.analytics import (
    TrafficResponse,
    AnalyticsSummaryOut,
    CameraRankingResponse,
    HeatmapResponse
)
from app.services.analytics_service import (
    get_traffic_analytics,
    get_analytics_summary,
    get_camera_ranking,
    get_heatmap_data
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/traffic", response_model=TrafficResponse)
async def traffic_analytics(
    window: str = Query("hour", pattern="^(hour|15min|day|week|month|1d|1w|1m|last_hours)$", description="Aggregation window"),
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    db: AsyncSession = Depends(get_db)
):
    return await get_traffic_analytics(session=db, window=window, date_str=date)

@router.get("/summary", response_model=AnalyticsSummaryOut)
async def analytics_summary(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    db: AsyncSession = Depends(get_db)
):
    return await get_analytics_summary(session=db, date_str=date)

@router.get("/camera-ranking", response_model=CameraRankingResponse)
async def camera_ranking(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    limit: int = Query(10, ge=1, le=50, description="Max cameras to return"),
    db: AsyncSession = Depends(get_db)
):
    return await get_camera_ranking(session=db, date_str=date, limit=limit)

@router.get("/heatmap", response_model=HeatmapResponse)
async def heatmap_data(db: AsyncSession = Depends(get_db)):
    return await get_heatmap_data(session=db)
