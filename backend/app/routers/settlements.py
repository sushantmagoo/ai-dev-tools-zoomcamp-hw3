from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, models
from ..database import get_db

router = APIRouter(tags=["settlements"])


@router.post("/settlements", response_model=models.Settlement, status_code=201)
def create_settlement(payload: models.CreateSettlementRequest, db: Session = Depends(get_db)) -> dict:
    return crud.settle_pair(db, payload.fromId, payload.toId)
