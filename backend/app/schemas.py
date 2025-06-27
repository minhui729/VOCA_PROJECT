# backend/app/schemas.py

from pydantic import BaseModel
from typing import List, Optional

# =================================================================
# [수정] 단어장 관련 스키마 순서 및 내용 정리
# =================================================================

# 1. 가장 기초가 되는 WordbookBase를 먼저 정의합니다.
class WordbookBase(BaseModel):
    title: str
    description: Optional[str] = None

class WordCreate(BaseModel): # WordCreate를 WordBase 대신 사용
    text: str
    meaning: str
    part_of_speech: Optional[str] = None
    example_sentence: Optional[str] = None

class WordbookUploadRequest(BaseModel):
    title: str
    description: Optional[str] = None
    words: List[WordCreate] # 단어 목록을 리스트로 받음

# 3. 단어 관련 스키마들을 정의합니다.
class WordBase(BaseModel):
    text: str
    meaning: str

class WordCreate(WordBase):
    pass

class Word(WordBase):
    id: int
    wordbook_id: int

    class Config:
        from_attributes = True

# 4. 최종적으로 가장 복잡한 응답용 스키마 Wordbook을 정의합니다.
class Wordbook(WordbookBase):
    id: int
    owner_id: int
    words: List[Word] = []

    class Config:
        from_attributes = True

# =================================================================
# 사용자 관련 스키마 (이 부분은 이전과 동일)
# =================================================================

class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    initial_password: str

class User(UserBase):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None

class UserPasswordUpdate(BaseModel):
    new_password: str

# --- Test Schemas ---
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