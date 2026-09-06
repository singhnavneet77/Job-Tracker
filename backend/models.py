import enum
import datetime as dt
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, ForeignKey, Enum, Float
)
from sqlalchemy.orm import relationship
from database import Base


class ApplicationStatus(str, enum.Enum):
    saved = "saved"
    applied = "applied"
    interview = "interview"
    offer = "offer"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    profile = relationship("Profile", back_populates="user", uselist=False,
                            cascade="all, delete-orphan")
    applications = relationship("JobApplication", back_populates="user",
                                 cascade="all, delete-orphan")


class Profile(Base):
    """The 'main profile' the extension reads from + writes back to."""
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    full_name = Column(String, default="")
    email = Column(String, default="")
    phone = Column(String, default="")
    location = Column(String, default="")
    linkedin_url = Column(String, default="")
    portfolio_url = Column(String, default="")
    github_url = Column(String, default="")
    headline = Column(String, default="")
    summary = Column(Text, default="")
    skills = Column(Text, default="")          # comma separated
    experience_years = Column(Float, default=0)
    resume_text = Column(Text, default="")      # plain-text resume for autofill / LLM

    user = relationship("User", back_populates="profile")


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    company = Column(String, default="")
    title = Column(String, default="")
    location = Column(String, default="")
    job_url = Column(String, default="")
    salary = Column(String, default="")         # free text: "₹12-16 LPA", "$120k-140k", etc.
    source = Column(String, default="manual")   # manual | extension
    description = Column(Text, default="")
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.saved)
    notes = Column(Text, default="")

    created_at = Column(DateTime, default=dt.datetime.utcnow)
    updated_at = Column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    user = relationship("User", back_populates="applications")
