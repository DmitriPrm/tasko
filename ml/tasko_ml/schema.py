"""Что модель знает о задаче в момент прогноза.

Один и тот же набор полей приходит и при обучении (из истории в базе), и при прогнозе
(от бэкенда). Всё здесь известно на момент создания задачи: фактическая длительность,
дата завершения и будущие статусы сюда не попадают (защита от утечки данных, п. 7.4 спецификации).
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

TaskType = Literal["TASK", "FEATURE", "BUG", "RESEARCH"]
TaskPriority = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class TaskInput(BaseModel):
	"""Сырые сведения о задаче и её окружении на момент прогноза."""

	type: TaskType = "TASK"
	priority: TaskPriority = "MEDIUM"
	title: str = ""
	description: str = ""
	created_at: str = Field(description="ISO-время создания задачи (момент прогноза)")
	deadline_at: str | None = Field(default=None, description="ISO-время срока, если он задан")
	planned_start_at: str | None = None
	is_subtask: bool = False
	tags_count: int = 0
	blocked_by_count: int = Field(default=0, description="Сколько задач блокируют эту на момент прогноза")
	# Исполнитель: только по задачам, завершённым ДО момента прогноза. Имя и email не используются
	has_assignee: bool = False
	assignee_active_tasks: int = 0
	assignee_done_count: int = 0
	assignee_avg_duration_hours: float | None = None
	assignee_overdue_rate: float | None = None
	# Проект: агрегаты по прошлым задачам этого же проекта
	project_done_count: int = 0
	project_avg_duration_hours: float | None = None
	project_overdue_rate: float | None = None


#: Категориальные и числовые признаки, которые получает модель (результат features.build_features)
CATEGORICAL_FEATURES = ["type", "priority"]
NUMERIC_FEATURES = [
	"title_len",
	"description_len",
	"description_words",
	"has_deadline",
	"deadline_horizon_hours",
	"has_planned_start",
	"planned_start_offset_hours",
	"created_weekday",
	"created_hour",
	"is_subtask",
	"tags_count",
	"blocked_by_count",
	"has_assignee",
	"assignee_active_tasks",
	"assignee_done_count",
	"assignee_avg_duration_hours",
	"assignee_overdue_rate",
	"project_done_count",
	"project_avg_duration_hours",
	"project_overdue_rate",
]
FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES
