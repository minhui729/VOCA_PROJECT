# backend/app/crud.py

from sqlalchemy.orm import Session, selectinload, subqueryload
from sqlalchemy import select
from typing import List
from sqlalchemy import func

from . import models, schemas

# =================================================================
# 단어장 관련 CRUD
# =================================================================

def create_wordbook_for_students(db: Session, wordbook_data: schemas.WordbookUpload, teacher_id: int):
    db_wordbook = models.Wordbook(
        title=wordbook_data.title,
        description=wordbook_data.description,
        owner_id=teacher_id
    )
    db_words = [models.Word(**word.model_dump()) for word in wordbook_data.words]
    db_wordbook.words = db_words
    
    students_to_assign = db.query(models.User).filter(
        models.User.id.in_(wordbook_data.student_ids),
        models.User.role == models.UserRole.student
    ).all()

    db_wordbook.students.extend(students_to_assign)
    db.add(db_wordbook)
    db.commit()
    db.refresh(db_wordbook)
    return db_wordbook

def get_wordbook(db: Session, wordbook_id: int):
    # ✨ 단어장, 단어, 할당된 학생 정보를 한 번에 로드하도록 수정 (성능 개선)
    return db.query(models.Wordbook).options(
        selectinload(models.Wordbook.words),
        selectinload(models.Wordbook.students)
    ).filter(models.Wordbook.id == wordbook_id).first()

def get_wordbooks(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Wordbook).offset(skip).limit(limit).all()

def get_wordbooks_for_student(db: Session, student_id: int):
    """
    특정 학생 ID로 해당 학생에게 할당된 모든 단어장을 조회합니다.
    """
    student = db.query(models.User).options(
        selectinload(models.User.assigned_wordbooks)
        .selectinload(models.Wordbook.words)
    ).filter(models.User.id == student_id).first()
    
    if not student:
        return []
    
    return student.assigned_wordbooks

# =================================================================
# 사용자 관련 CRUD
# =================================================================
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()

def get_all_students(db: Session):
    return db.query(models.User).filter(models.User.role == models.UserRole.student).all()

def create_user(db: Session, user: schemas.UserCreate, hashed_password: str):
    db_user = models.User(
        username=user.username,
        name=user.name,
        hashed_password=hashed_password,
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_password(db: Session, user_id: int, new_hashed_password: str):
    db_user = get_user(db, user_id=user_id)
    if db_user:
        db_user.hashed_password = new_hashed_password
        db.commit()
        db.refresh(db_user)
        return db_user
    return None

def delete_user(db: Session, user_id: int):
    db_user = get_user(db, user_id=user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
        return db_user
    return None

# =================================================================
# 시험 관련 CRUD
# =================================================================

# ✨ 퀴즈를 위한 단어 목록을 가져오는 함수 추가
def get_words_for_quiz(db: Session, wordbook_id: int):
    """
    특정 단어장에 속한 모든 단어 목록을 퀴즈용으로 조회합니다.
    """
    wordbook = get_wordbook(db, wordbook_id=wordbook_id)
    if not wordbook:
        return None
    return wordbook.words


def create_test(db: Session, test: schemas.TestCreate, creator_id: int):
    db_test = models.Test(
        title=test.title,
        wordbook_id=test.wordbook_id,
        creator_id=creator_id
    )
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    return db_test

# =================================================================
# 학생 리포트 관련 CRUD
# =================================================================
def get_student_report(db: Session, student_id: int):
    student = db.query(models.User).options(
        subqueryload(models.User.assigned_wordbooks)
        .subqueryload(models.Wordbook.tests)
        .subqueryload(models.Test.results)
    ).filter(models.User.id == student_id).first()

    if not student:
        return None

    report = schemas.StudentReport(
        student_id=student.id,
        student_name=student.name,
        assigned_wordbooks_report=[]
    )

    for wb in student.assigned_wordbooks:
        all_results_for_wb = []
        for test in wb.tests:
            all_results_for_wb.extend(test.results)

        student_results = [res for res in all_results_for_wb if res.student_id == student_id]
        
        avg_score = None
        if student_results:
            total_score = sum(res.score for res in student_results)
            avg_score = total_score / len(student_results)

        sorted_results = sorted(student_results, key=lambda r: r.submitted_at, reverse=True)

        wb_report = schemas.WordbookReport(
            id=wb.id,
            title=wb.title,
            average_score=avg_score,
            test_results=[schemas.TestResultForReport.from_orm(res) for res in sorted_results]
        )
        report.assigned_wordbooks_report.append(wb_report)

    return report
