# backend/app/schemas.py

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
# ✨ models.py의 UserRole Enum을 스키마에서도 사용하기 위해 import
from .models import UserRole 

# =================================================================
# 단어 관련 스키마
# =================================================================

class WordBase(BaseModel):
    text: str
    meaning: str
    part_of_speech: Optional[str] = None
    example_sentence: Optional[str] = None

class WordCreate(WordBase):
    pass

class Word(WordBase):
    id: int
    wordbook_id: int

    class Config:
        from_attributes = True

# =================================================================
# 단어장 관련 스키마
# =================================================================

class WordbookBase(BaseModel):
    title: str
    description: Optional[str] = None

# ✨ 단어장 업로드 시 학생 ID 목록을 함께 받도록 스키마 수정
class WordbookUpload(WordbookBase):
    words: List[WordCreate]
    student_ids: List[int]

class Wordbook(WordbookBase):
    id: int
    owner_id: int
    words: List[Word] = []

    class Config:
        from_attributes = True

# =================================================================
# 사용자 관련 스키마
# =================================================================

# ✨ UserBase에서 email 제거, username 추가
class UserBase(BaseModel):
    username: str
    name: str

# ✨ UserCreate에서 password 필드명 명확화
class UserCreate(UserBase):
    password: str
    role: UserRole # ✨ 역할도 생성 시 받을 수 있도록 추가

# ✨ 학생 목록 조회를 위한 간단한 스키마
class Student(BaseModel):
    id: int
    username: str
    name: str

    class Config:
        from_attributes = True

# ✨ User 응답 스키마에서 email 제거
class User(UserBase):
    id: int
    role: UserRole # ✨ 타입을 UserRole Enum으로 변경

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserPasswordUpdate(BaseModel):
    new_password: str

# =================================================================
# 시험 관련 스키마
# =================================================================

class TestBase(BaseModel):
    title: str

class TestCreate(TestBase):
    wordbook_id: int

class Test(TestBase):
    id: int
    wordbook_id: int
    creator_id: int

    class Config:
        from_attributes = True

# =================================================================
# ✨ 학습 리포트 관련 스키마 추가
# =================================================================
class TestResultForReport(BaseModel):
    score: float
    submitted_at: datetime

    class Config:
        from_attributes = True

class WordbookReport(BaseModel):
    id: int
    title: str
    average_score: Optional[float] = None
    test_results: List[TestResultForReport] = []

    class Config:
        from_attributes = True

class StudentReport(BaseModel):
    student_id: int
    student_name: str
    assigned_wordbooks_report: List[WordbookReport] = []
