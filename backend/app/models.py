# backend/app/models.py

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Enum as SQLAlchemyEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from sqlalchemy import Column, Integer, String, Boolean
from .database import Base

# 사용자 역할을 위한 Enum 정의 (학생, 선생님)
class UserRole(enum.Enum):
    student = "student"
    teacher = "teacher"

# 1. 사용자 모델 (User)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLAlchemyEnum(UserRole), nullable=False, default=UserRole.student)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # User와 Wordbook의 관계 설정 (한 명의 유저는 여러 단어장을 만들 수 있음)
    wordbooks = relationship("Wordbook", back_populates="owner")
    # User와 TestResult의 관계 설정 (한 명의 학생은 여러 시험 결과를 가질 수 있음)
    test_results = relationship("TestResult", back_populates="student")

# 2. 단어장 모델 (Wordbook)
class Wordbook(Base):
    __tablename__ = "wordbooks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True) # [추가] 설명 컬럼
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    owner = relationship("User", back_populates="wordbooks")
    words = relationship("Word", back_populates="wordbook", cascade="all, delete-orphan")
    
# 3. 단어 모델 (Word)
class Word(Base):
    __tablename__ = "words"

    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, index=True, nullable=False)
    meaning = Column(String, nullable=False)
    part_of_speech = Column(String, nullable=True)  # [추가] 품사
    example_sentence = Column(String, nullable=True) # [추가] 예문

    wordbook_id = Column(Integer, ForeignKey("wordbooks.id"), nullable=False)

    # Word와 Wordbook의 관계 설정 (단어는 하나의 단어장에 속함)
    wordbook = relationship("Wordbook", back_populates="words")

# 4. 시험 모델 (Test)
class Test(Base):
    __tablename__ = "tests"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    wordbook_id = Column(Integer, ForeignKey("wordbooks.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False) # 시험을 만든 사람 (선생님)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Test와 TestResult의 관계 설정 (하나의 시험은 여러 응시 결과를 가짐)
    results = relationship("TestResult", back_populates="test")

# 5. 시험 결과 모델 (TestResult)
class TestResult(Base):
    __tablename__ = "test_results"

    id = Column(Integer, primary_key=True, index=True)
    score = Column(Float, nullable=False)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # TestResult와 Test의 관계
    test = relationship("Test", back_populates="results")
    # TestResult와 User의 관계
    student = relationship("User", back_populates="test_results")