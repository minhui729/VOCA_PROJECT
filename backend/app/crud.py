# backend/app/crud.py

from sqlalchemy.orm import Session, selectinload, subqueryload
from sqlalchemy import select
from typing import List
from sqlalchemy import func
import random
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
    # 단어장, 단어, 할당된 학생 정보를 한 번에 로드하도록 수정 (성능 개선)
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

def delete_wordbook(db: Session, wordbook_id: int):
    """
    ID를 기준으로 단어장을 삭제합니다.
    """
    # 삭제할 단어장 객체를 가져옵니다.
    db_wordbook = get_wordbook(db, wordbook_id=wordbook_id)
    
    if db_wordbook:
        # 데이터베이스에서 객체를 삭제합니다.
        db.delete(db_wordbook)
        # 변경 사항을 커밋합니다.
        db.commit()
    
    # 삭제된 객체 정보를 반환합니다 (필요시 사용).
    return db_wordbook

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

# ✨ 퀴즈를 위한 단어 목록을 가져오는 함수 (오류 수정: 하나만 남김)
def get_words_for_quiz(db: Session, wordbook_id: int) -> List[models.Word]:
    """
    특정 단어장에 속한 모든 단어 목록을 퀴즈용으로 조회합니다.
    """
    wordbook = get_wordbook(db, wordbook_id=wordbook_id)
    if not wordbook:
        return []
    return wordbook.words

# ✨ 퀴즈 질문을 생성하는 로직 함수 (새로 추가)
def generate_quiz(words: List[models.Word]) -> List[schemas.QuizQuestion]:
    """
    단어 목록을 받아 객관식/주관식 퀴즈 질문 목록을 생성합니다.
    """
    if not words:
        return []

    num_questions = max(1, len(words) // 2)
    selected_words = random.sample(words, num_questions)

    questions: List[schemas.QuizQuestion] = []
    all_meanings = [w.meaning for w in words]

    for word in selected_words:
        # 단어가 4개 미만이면 주관식만, 그 이상이면 50% 확률로 문제 유형 결정
        question_type = 'written'
        if len(words) >= 4 and random.random() > 0.5:
            question_type = 'multiple_choice'

        if question_type == 'multiple_choice':
            correct_answer = word.meaning
            # 정답을 제외한 나머지 뜻 중에서 3개의 오답 선택
            wrong_choices_pool = [m for m in all_meanings if m != correct_answer]
            wrong_choices = random.sample(wrong_choices_pool, min(3, len(wrong_choices_pool)))
            
            choices = wrong_choices + [correct_answer]
            random.shuffle(choices)

            questions.append(schemas.MultipleChoiceQuestion(
                question=f"다음 영단어의 뜻은? '{word.text}'",
                answer=correct_answer,
                choices=choices
            ))
        else: # 'written'
            questions.append(schemas.WrittenQuestion(
                question=f"다음 뜻을 가진 영단어는? '{word.meaning}'",
                answer=word.text
            ))
    
    random.shuffle(questions) # 최종 문제 순서 섞기
    return questions


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

def create_test_result(db: Session, result: schemas.TestResultCreate, student_id: int):
    """
    학생의 시험 결과를 데이터베이스에 저장합니다.
    """
    # SQLAlchemy 모델 객체를 생성합니다.
    db_result = models.TestResult(
        score=result.score,
        test_id=result.test_id,
        student_id=student_id,
        submitted_at=func.now() # 현재 시간을 제출 시간으로 기록
    )
    db.add(db_result)
    db.commit()
    db.refresh(db_result)
    return db_result

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

# ✨ [신규] 학생 학습 통계 계산 함수
def get_student_stats(db: Session, student_id: int) -> schemas.StudentStats:
    """
    특정 학생의 학습 통계 데이터를 계산합니다.
    """
    # 학생의 모든 시험 결과를 날짜순으로 가져옵니다.
    # Test, Wordbook 테이블과 JOIN하여 단어장 제목도 함께 가져옵니다.
    results = db.query(models.TestResult).join(models.Test).join(models.Wordbook)\
        .filter(models.TestResult.student_id == student_id)\
        .order_by(models.TestResult.submitted_at)\
        .options(selectinload(models.TestResult.test).selectinload(models.Test.wordbook))\
        .all()

    if not results:
        return schemas.StudentStats(wordbook_stats=[], daily_scores=[])

    # 1. 단어장별 평균 점수 계산
    wordbook_scores = {}
    for result in results:
        title = result.test.wordbook.title
        if title not in wordbook_scores:
            wordbook_scores[title] = []
        wordbook_scores[title].append(result.score)
    
    wordbook_stats = []
    for title, scores in wordbook_scores.items():
        avg = sum(scores) / len(scores)
        wordbook_stats.append(schemas.WordbookStat(wordbook_title=title, average_score=avg))

    # 2. 날짜별 점수 기록 생성
    daily_scores = [
        schemas.DailyScore(date=result.submitted_at.date(), score=result.score)
        for result in results
    ]

    return schemas.StudentStats(
        wordbook_stats=wordbook_stats,
        daily_scores=daily_scores
    )