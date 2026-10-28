from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Criterion(StrictModel):
    description: str = Field(min_length=1, max_length=4000)
    points: int = Field(ge=1, le=100)
    evidence: str = Field(default="", max_length=2000)


class Task(StrictModel):
    area: Literal["I", "II", "III"]
    instruction: str = Field(min_length=1, max_length=4000)
    criteria: list[Criterion] = Field(default_factory=list, max_length=20)


class LanguageCriterion(StrictModel):
    description: str = Field(min_length=1, max_length=2000)
    points: int = Field(ge=1, le=100)


class Exam(StrictModel):
    title: str = Field(min_length=1, max_length=200)
    course: Literal["EF", "Q1 GK", "Q1 LK", "Q2 GK", "Q2 LK"] = "Q1 GK"
    duration: int = Field(default=135, ge=15, le=360)
    text_type: Literal["non-fiction", "fiction"] = "non-fiction"
    source_title: str = Field(default="", max_length=300)
    source_reference: str = Field(default="", max_length=2000)
    source_text: str = Field(default="", max_length=50000)
    focus: str = Field(default="", max_length=2000)
    aids: str = Field(default="Ein- und zweisprachiges Wörterbuch", max_length=1000)
    tasks: list[Task] = Field(default_factory=list, max_length=6)
    language_criteria: list[LanguageCriterion] = Field(default_factory=list, max_length=12)
    knowledge_ids: list[str] = Field(default_factory=list, max_length=20)
    generation_notes: str = Field(default="", max_length=5000)


class FormatProfile(StrictModel):
    name: str = Field(default="Arbeitsprofil · noch nicht mit NRW-Vorlage abgeglichen", min_length=1, max_length=200)
    font: Literal["Arial", "Calibri", "Times New Roman"] = "Arial"
    font_size: int = Field(default=11, ge=9, le=16)
    line_spacing: float = Field(default=1.5, ge=1, le=2)
    margin_cm: float = Field(default=2.5, ge=1.5, le=4)
    source_reference: str = Field(default="", max_length=2000)
    reviewed: bool = False
    version: int = Field(default=1, ge=1)

    @model_validator(mode="after")
    def review_needs_source(self):
        if self.reviewed and not self.source_reference:
            raise ValueError("Für ein geprüftes Formatprofil ist eine Referenzvorlage erforderlich.")
        return self


class KnowledgeInput(StrictModel):
    title: str = Field(min_length=1, max_length=200)
    kind: Literal["Regel", "Beispiel", "Hinweis"] = "Hinweis"
    content: str = Field(min_length=1, max_length=60000)
    reference: str = Field(default="", max_length=2000)
    reviewed: bool = False

    @model_validator(mode="after")
    def review_needs_source(self):
        if self.reviewed and not self.reference:
            raise ValueError("Geprüfte Wissenseinträge benötigen eine Quellenangabe.")
        return self


class GenerateRequest(StrictModel):
    exam: Exam


class GeneratedContent(StrictModel):
    tasks: list[Task] = Field(min_length=3, max_length=3)
    notes: str = Field(min_length=1, max_length=5000)

    @model_validator(mode="after")
    def check_areas(self):
        if [task.area for task in self.tasks] != ["I", "II", "III"]:
            raise ValueError("Die Aufgaben müssen die Anforderungsbereiche I, II und III abdecken.")
        if any(not task.criteria for task in self.tasks):
            raise ValueError("Jede Aufgabe benötigt Bewertungskriterien.")
        return self
