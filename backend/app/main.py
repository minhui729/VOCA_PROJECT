# backend/app/main.py

from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List # <--- List가 import 되어 있는지 확인하세요.
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
import os

from . import crud, models, schemas, security
from .database import get_db

app = FastAPI()

# ===================================================================
# CORS 설정 (기존과 동일)
# ===================================================================
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
origins = [
    "http://localhost:3000",
    "https://localhost:3000",
    FRONTEND_URL,
]
if CORS_ORIGINS:
    origins.extend(CORS_ORIGINS)
origins = list(set(origins))
print(f"CORS Origins: {origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===================================================================
# 헬스 체크 엔드포인트 (기존과 동일)
# ===================================================================
@app.get("/")
def read_root():
    return {"message": "Vocabulary API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# ===================================================================
# 인증 및 사용자 관련 API (기존과 동일)
# ===================================================================
@app.post("/api/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    user = security.authenticate_user(db, username=form_data.username, password=form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = security.create_access_token(data={"sub": user.username})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "role": user.role,
        }
    }

@app.get("/api/users/me/", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(security.get_current_user)):
    return current_user

@app.get("/api/teacher/students/", response_model=List[schemas.Student])
def read_all_students(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_teacher)
):
    students = crud.get_all_students(db)
    return students

@app.post("/api/users/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_new_user(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user_data.username)
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")
    hashed_password = security.get_password_hash(user_data.password)
    return crud.create_user(db=db, user=user_data, hashed_password=hashed_password)

@app.delete("/api/users/{user_id}", response_model=schemas.User)
def delete_user_endpoint(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_teacher)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account.")
    deleted_user = crud.delete_user(db=db, user_id=user_id)
    if deleted_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return deleted_user

@app.put("/api/users/{user_id}/reset-password", response_model=schemas.User)
def reset_user_password(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_teacher)
):
    if user_id == current_user.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot reset your own password here.")
    new_temporary_password = "1234"
    hashed_password = security.get_password_hash(new_temporary_password)
    updated_user = crud.update_user_password(
        db=db, user_id=user_id, new_hashed_password=hashed_password
    )
    if updated_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return updated_user

# ===================================================================
# 단어장 관련 API
# ===================================================================

# ✨ 새로 추가된 부분 시작
@app.get("/api/wordbooks/", response_model=List[schemas.Wordbook])
def read_my_wordbooks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    """
    로그인한 사용자가 학생일 경우, 할당된 모든 단어장 목록을 반환합니다.
    """
    if current_user.role != 'student':
        return []
    
    wordbooks = crud.get_wordbooks_for_student(db=db, student_id=current_user.id)
    return wordbooks
# ✨ 새로 추가된 부분 끝

@app.post("/api/wordbooks/upload/", response_model=schemas.Wordbook, status_code=status.HTTP_201_CREATED)
def create_wordbook_by_upload(
    wordbook_data: schemas.WordbookUpload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_teacher)
):
    return crud.create_wordbook_for_students(
        db=db, wordbook_data=wordbook_data, teacher_id=current_user.id
    )

@app.get("/api/wordbooks/{wordbook_id}", response_model=schemas.Wordbook)
def read_wordbook_details(
    wordbook_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_user)
):
    db_wordbook = crud.get_wordbook(db, wordbook_id=wordbook_id)
    if db_wordbook is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wordbook not found")
    is_owner = db_wordbook.owner_id == current_user.id
    is_assigned_student = current_user in db_wordbook.students
    if not (is_owner or is_assigned_student):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    return db_wordbook

# ===================================================================
# 학생 리포트 API (기존과 동일)
# ===================================================================
@app.get("/api/students/{student_id}/report", response_model=schemas.StudentReport)
def get_student_report_endpoint(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(security.get_current_teacher)
):
    report = crud.get_student_report(db, student_id=student_id)
    if not report:
        raise HTTPException(status_code=404, detail="Student not found or no report available.")
    return report