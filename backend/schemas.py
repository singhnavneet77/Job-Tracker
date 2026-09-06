from pydantic import BaseModel, EmailStr
from typing import Optional
import datetime as dt
from models import ApplicationStatus


# ---------- Auth ----------
class SignupIn(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True


# ---------- Profile ----------
class ProfileIn(BaseModel):
    full_name: Optional[str] = ""
    email: Optional[str] = ""
    phone: Optional[str] = ""
    location: Optional[str] = ""
    linkedin_url: Optional[str] = ""
    portfolio_url: Optional[str] = ""
    github_url: Optional[str] = ""
    headline: Optional[str] = ""
    summary: Optional[str] = ""
    skills: Optional[str] = ""
    experience_years: Optional[float] = 0
    resume_text: Optional[str] = ""


class ProfileOut(ProfileIn):
    id: int

    class Config:
        from_attributes = True


# ---------- Job Applications ----------
class JobApplicationIn(BaseModel):
    company: str
    title: str
    location: Optional[str] = ""
    job_url: Optional[str] = ""
    salary: Optional[str] = ""
    source: Optional[str] = "manual"
    description: Optional[str] = ""
    status: Optional[ApplicationStatus] = ApplicationStatus.saved
    notes: Optional[str] = ""


class JobApplicationUpdate(BaseModel):
    company: Optional[str] = None
    title: Optional[str] = None
    location: Optional[str] = None
    job_url: Optional[str] = None
    salary: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = None


class JobApplicationOut(JobApplicationIn):
    id: int
    created_at: dt.datetime
    updated_at: dt.datetime

    class Config:
        from_attributes = True


# ---------- LinkedIn Optimizer ----------
class LinkedInInput(BaseModel):
    headline: Optional[str] = ""
    about: Optional[str] = ""
    skills: Optional[str] = ""          # comma separated
    target_role: Optional[str] = ""     # e.g. "Machine Learning Engineer"


class LinkedInSuggestion(BaseModel):
    category: str
    issue: str
    suggestion: str


class LinkedInReport(BaseModel):
    overall_score: int
    section_scores: dict
    suggestions: list[LinkedInSuggestion]
    optimized_headline: str
    keyword_gaps: list[str]
