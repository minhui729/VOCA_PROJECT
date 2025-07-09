# backend/app/crud.py

from sqlalchemy.orm import Session, selectinload, subqueryload
from sqlalchemy import select
from typing import List
from sqlalchemy import func
import logging # ✨ logging 모듈을 임포트합니다.

# ✨ 로그가 터미널에 잘 보이도록 기본 설정을 추가합니다.
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# security 임포트를 제거하여 순환 참조를 해결합니다.
from . import models, schemas

# =================================================================
# 단어장 관련 CRUD
# =================================================================

# ✨ 단어장 생성 시점 디버깅 (logging 사용)
def create_wordbook_for_students(db: Session, wordbook_data: schemas.WordbookUpload, teacher_id: int):
    logging.info(f"--- CREATE: Starting wordbook creation. Title: {wordbook_data.title} ---")
    logging.info(f"--- CREATE: Student IDs to assign: {wordbook_data.student_ids} ---")
    
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

    logging.info(f"--- CREATE: Found {len(students_to_assign)} student objects in DB. ---")
    if students_to_assign:
        for s in students_to_assign:
            logging.info(f"--- CREATE: Found student to assign -> ID: {s.id}, Name: {s.name} ---")

    db_wordbook.students.extend(students_to_assign)
    db.add(db_wordbook)
    db.commit()
    db.refresh(db_wordbook)

    logging.info(f"--- CREATE: Wordbook committed. Checking assigned students on refreshed object... ---")
    logging.info(f"--- CREATE: Number of students on wordbook object after commit: {len(db_wordbook.students)} ---")
    logging.info(f"--- CREATE: Wordbook creation process finished. ---\n")

    return db_wordbook

def get_wordbook(db: Session, wordbook_id: int):
    return db.query(models.Wordbook).options(
        selectinload(models.Wordbook.words)
    ).filter(models.Wordbook.id == wordbook_id).first()

def get_wordbooks(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Wordbook).offset(skip).limit(limit).all()

# ✨ 단어장 조회 시점 디버깅 (logging 사용)
def get_wordbooks_for_student(db: Session, student_id: int):
    logging.info(f"--- RETRIEVE: Searching for student with ID: {student_id} ---")
    
    student = db.query(models.User).options(
        selectinload(models.User.assigned_wordbooks)
        .selectinload(models.Wordbook.words)
    ).filter(models.User.id == student_id).first()
    
    if not student:
        logging.info(f"--- RETRIEVE: Student with ID {student_id} NOT FOUND. ---")
        return []
    
    logging.info(f"--- RETRIEVE: Student FOUND: {student.name} ---")
    logging.info(f"--- RETRIEVE: Checking assigned_wordbooks... ---")
    logging.info(f"--- RETRIEVE: Number of wordbooks found: {len(student.assigned_wordbooks)} ---")
    
    if student.assigned_wordbooks:
        for wb in student.assigned_wordbooks:
            logging.info(f"--- RETRIEVE: Found Wordbook -> ID: {wb.id}, Title: {wb.title} ---")
    
    logging.info(f"--- RETRIEVE: Wordbook retrieval process finished. ---\n")
    return student.assigned_wordbooks

# =================================================================
# (이하 다른 CRUD 함수들은 기존과 동일)
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
