# backend/app/crud.py

from sqlalchemy.orm import Session, selectinload, subqueryload
from sqlalchemy import select
from typing import List
from sqlalchemy import func

# security 임포트를 제거하여 순환 참조를 해결합니다.
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
    # 단어장과 포함된 단어들을 함께 로딩 (Eager Loading)
    return db.query(models.Wordbook).options(
        selectinload(models.Wordbook.words)
    ).filter(models.Wordbook.id == wordbook_id).first()

def get_wordbooks(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Wordbook).offset(skip).limit(limit).all()

def get_wordbooks_for_student(db: Session, student_id: int):
    """
    특정 학생 ID로 해당 학생에게 할당된 모든 단어장을 조회합니다.
    (학생 리포트 함수에서 사용된 'assigned_wordbooks' 관계를 사용합니다.)
    """
    # User 모델에서 학생을 찾고, Eager Loading으로 단어장과 단어까지 함께 불러옵니다.
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

# create_user 함수가 해싱된 비밀번호를 직접 받도록 수정
def create_user(db: Session, user: schemas.UserCreate, hashed_password: str):
    db_user = models.User(
        username=user.username,
        name=user.name,
        hashed_password=hashed_password, # 미리 해싱된 비밀번호 사용
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# ✨ 해싱된 비밀번호를 받아와서 업데이트하도록 함수 수정
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
    # ✨ 올바른 관계를 사용하여 데이터를 한 번에 로드하도록 쿼리 수정
    student = db.query(models.User).options(
        subqueryload(models.User.assigned_wordbooks)
        .subqueryload(models.Wordbook.tests)  # Wordbook -> Test
        .subqueryload(models.Test.results)    # Test -> TestResult
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
        # ✨ Wordbook에 속한 모든 Test를 순회
        for test in wb.tests:
            # ✨ 각 Test에 속한 모든 Result를 추가
            all_results_for_wb.extend(test.results)

        # 해당 학생의 시험 결과만 필터링
        student_results = [res for res in all_results_for_wb if res.student_id == student_id]
        
        avg_score = None
        if student_results:
            total_score = sum(res.score for res in student_results)
            avg_score = total_score / len(student_results)

        # 최근 순으로 정렬하여 스키마 생성
        sorted_results = sorted(student_results, key=lambda r: r.submitted_at, reverse=True)

        wb_report = schemas.WordbookReport(
            id=wb.id,
            title=wb.title,
            average_score=avg_score,
            test_results=[schemas.TestResultForReport.from_orm(res) for res in sorted_results]
        )
        report.assigned_wordbooks_report.append(wb_report)

    return report