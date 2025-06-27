from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from fastapi.middleware.cors import CORSMiddleware

from . import crud, models, schemas, security
from .database import get_db

from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta

# DB 테이블 생성 (앱 시작 시)
# 실제 프로덕션에서는 Alembic을 사용해야 함

app = FastAPI()

# ===================================================================
# CORS 설정 수정
# ===================================================================
# 개발 중에는 모든 출처를 허용하도록 와일드카드('*')를 사용하면
# CORS 관련 문제를 가장 확실하게 해결할 수 있습니다.
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ===================================================================


# --- Wordbook APIs ---
@app.get("/api/wordbooks/", response_model=List[schemas.Wordbook])
async def read_wordbooks_for_user(
    skip: int = 0, 
    limit: int = 100, 
    db: AsyncSession = Depends(get_db),
    # current_user는 여전히 필요합니다. (로그인한 사용자만 이 API를 호출할 수 있도록)
    current_user: models.User = Depends(security.get_current_user)
):
    # [수정] crud.get_wordbooks 함수 호출 시 user_id를 전달하지 않습니다.
    wordbooks = await crud.get_wordbooks(db, skip=skip, limit=limit)
    return wordbooks

# [새로운 핵심 API] 파일 업로드로 단어장을 생성하는 엔드포인트
@app.post("/api/wordbooks/upload/", response_model=schemas.Wordbook, status_code=201)
async def create_wordbook_by_upload(
    wordbook_data: schemas.WordbookUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    # 선생님만 단어장을 생성할 수 있도록 권한 체크
    if current_user.role != models.UserRole.teacher:
        raise HTTPException(status_code=403, detail="Only teachers can create wordbooks.")

    return await crud.create_wordbook_with_words(
        db=db, wb_data=wordbook_data, owner_id=current_user.id
    )

@app.get("/api/wordbooks/{wordbook_id}", response_model=schemas.Wordbook)
async def read_wordbook_details(
    wordbook_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    db_wordbook = await crud.get_wordbook(db, wordbook_id=wordbook_id)
    if db_wordbook is None:
        raise HTTPException(status_code=404, detail="Wordbook not found")

    return db_wordbook

# --- User APIs (이 부분을 새로 추가) ---
@app.get("/api/users/students/", response_model=List[schemas.User])
async def read_users(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(get_db)):
    users = await crud.get_users(db, skip=skip, limit=limit)
    return users

@app.post("/api/users/students/", response_model=schemas.User, status_code=201)
async def create_student_user(user_data: schemas.UserCreate, db: AsyncSession = Depends(get_db)):
    # 혹시 이메일이 중복되는지 확인
    db_user = await crud.get_user_by_email(db, email=user_data.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # crud.create_student 함수를 호출하여 학생을 생성합니다.
    return await crud.create_student(db=db, user_create_data=user_data.model_dump(), initial_password=user_data.initial_password)

@app.post("/api/token", response_model=schemas.Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: AsyncSession = Depends(get_db)
):
    # 1. 사용자 인증 시도
    user = await crud.authenticate_user(db, username=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # 2. 인증 성공 시, Access Token 생성
    access_token = security.create_access_token(
        data={"sub": user.username}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.delete("/api/users/students/{user_id}", response_model=schemas.User)
async def remove_user(user_id: int, db: AsyncSession = Depends(get_db)):
    deleted_user = await crud.delete_user(db=db, user_id=user_id)
    if deleted_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return deleted_user

@app.put("/api/users/students/{user_id}/password", response_model=schemas.User)
async def reset_user_password(
    user_id: int, 
    password_data: schemas.UserPasswordUpdate, 
    db: AsyncSession = Depends(get_db)
):
    updated_user = await crud.update_user_password(
        db=db, user_id=user_id, new_password=password_data.new_password
    )
    if updated_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user

@app.get("/api/users/me/", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(security.get_current_user)):
    return current_user

# --- Test APIs ---
@app.post("/api/tests/", response_model=schemas.Test, status_code=201)
async def create_new_test(
    test_data: schemas.TestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    # [핵심 권한 체크] 선생님만 시험을 생성할 수 있도록 함
    if current_user.role != models.UserRole.teacher:
        raise HTTPException(status_code=403, detail="Only teachers can create tests.")

    # 해당 단어장이 존재하는지, 그리고 본인이 소유한 단어장인지 확인 (선택사항이지만 추천)
    wordbook = await crud.get_wordbook(db, wordbook_id=test_data.wordbook_id)
    if not wordbook or wordbook.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Wordbook not found or you don't have permission.")

    return await crud.create_test(db=db, test=test_data, creator_id=current_user.id)