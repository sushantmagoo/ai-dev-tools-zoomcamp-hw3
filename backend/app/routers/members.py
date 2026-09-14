from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models
from ..database import get_db

router = APIRouter(tags=["members"])


@router.get("/members", response_model=List[models.Member])
def list_members(db: Session = Depends(get_db)) -> List[dict]:
    return crud.list_members(db)


@router.get("/members/{person_id}/balances", response_model=List[models.BalanceRow])
def get_member_balances(person_id: str, db: Session = Depends(get_db)) -> List[dict]:
    if crud.get_member(db, person_id) is None:
        raise HTTPException(status_code=404, detail="No member exists with the given id.")
    return crud.get_balances(db, person_id)
