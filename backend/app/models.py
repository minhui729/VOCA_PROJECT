# backend/app/models.py

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Table,
    Enum as SQLAlchemyEnum
)
from sqlalchemy.orm import relationship
import enum
from .database import Base

class UserRole(enum.Enum):
    student = "student"
    teacher = "teacher"

student_wordbook_association = Table(
    "student_wordbook_association",
    Base.metadata,
    Column("student_id", Integer, ForeignKey("users.id"), primary_key=True),
    Column("wordbook_id", Integer, ForeignKey("wordbooks.id"), primary_key=True),
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(SQLAlchemyEnum(UserRole), nullable=False, default=UserRole.student)
    created_wordbooks = relationship("Wordbook", back_populates="owner")
    assigned_wordbooks = relationship(
        "Wordbook",
        secondary=student_wordbook_association,
        back_populates="students"
    )
    test_results = relationship("TestResult", back_populates="student")

class Wordbook(Base):
    __tablename__ = "wordbooks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="created_wordbooks")
    words = relationship("Word", back_populates="wordbook", cascade="all, delete-orphan")
    students = relationship(
        "User",
        secondary=student_wordbook_association,
        back_populates="assigned_wordbooks"
    )
    # ✨ Wordbook이 여러 Test를 가질 수 있도록 관계를 정의합니다.
    tests = relationship("Test", back_populates="wordbook")

class Word(Base):
    __tablename__ = "words"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, index=True, nullable=False)
    meaning = Column(String, nullable=False)
    part_of_speech = Column(String, nullable=True)
    example_sentence = Column(String, nullable=True)
    wordbook_id = Column(Integer, ForeignKey("wordbooks.id"), nullable=False)
    wordbook = relationship("Wordbook", back_populates="words")

class Test(Base):
    __tablename__ = "tests"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    wordbook_id = Column(Integer, ForeignKey("wordbooks.id"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    results = relationship("TestResult", back_populates="test")
    # ✨ Test가 하나의 Wordbook에 속하도록 관계를 정의합니다. (이 부분이 중요)
    wordbook = relationship("Wordbook", back_populates="tests")

class TestResult(Base):
    __tablename__ = "test_results"
    id = Column(Integer, primary_key=True, index=True)
    score = Column(Float, nullable=False)
    test_id = Column(Integer, ForeignKey("tests.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    submitted_at = Column(DateTime(timezone=True))
    test = relationship("Test", back_populates="results")
    student = relationship("User", back_populates="test_results")
