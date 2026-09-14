from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import crud, models
from ..database import get_db

router = APIRouter(tags=["expenses"])


@router.get("/expenses", response_model=List[models.Expense])
def list_expenses(db: Session = Depends(get_db)) -> List[dict]:
    return crud.list_expenses(db)


@router.post("/expenses", response_model=models.Expense, status_code=201)
def create_expense(payload: models.CreateExpenseRequest, db: Session = Depends(get_db)) -> dict:
    return crud.create_expense(
        db,
        title=payload.title,
        payer_id=payload.payerId,
        splits=[s.model_dump() for s in payload.splits],
        date=payload.date,
    )
