"""Превращение сырых сведений о задаче в признаки модели. Используется и при обучении, и в сервисе."""

from __future__ import annotations

from collections.abc import Iterable

import numpy as np
import pandas as pd

from .schema import FEATURES, TaskInput

HOUR = pd.Timedelta(hours=1)


def _to_time(value: object) -> pd.Timestamp | None:
	if value is None or (isinstance(value, float) and np.isnan(value)):
		return None
	stamp = pd.Timestamp(value)
	if pd.isna(stamp):
		return None
	return stamp.tz_convert("UTC") if stamp.tzinfo else stamp.tz_localize("UTC")


def _row_features(item: dict) -> dict:
	created = _to_time(item["created_at"])
	deadline = _to_time(item.get("deadline_at"))
	planned = _to_time(item.get("planned_start_at"))
	description = item.get("description") or ""
	return {
		"type": item.get("type", "TASK"),
		"priority": item.get("priority", "MEDIUM"),
		"title_len": len(item.get("title") or ""),
		"description_len": len(description),
		"description_words": len(description.split()),
		"has_deadline": int(deadline is not None),
		"deadline_horizon_hours": (deadline - created) / HOUR if deadline is not None else np.nan,
		"has_planned_start": int(planned is not None),
		"planned_start_offset_hours": (planned - created) / HOUR if planned is not None else np.nan,
		"created_weekday": created.weekday(),
		"created_hour": created.hour,
		"is_subtask": int(bool(item.get("is_subtask"))),
		"tags_count": item.get("tags_count", 0),
		"blocked_by_count": item.get("blocked_by_count", 0),
		"has_assignee": int(bool(item.get("has_assignee"))),
		"assignee_active_tasks": item.get("assignee_active_tasks", 0),
		"assignee_done_count": item.get("assignee_done_count", 0),
		"assignee_avg_duration_hours": _nan(item.get("assignee_avg_duration_hours")),
		"assignee_overdue_rate": _nan(item.get("assignee_overdue_rate")),
		"project_done_count": item.get("project_done_count", 0),
		"project_avg_duration_hours": _nan(item.get("project_avg_duration_hours")),
		"project_overdue_rate": _nan(item.get("project_overdue_rate")),
	}


def _nan(value: object) -> float:
	return np.nan if value is None else float(value)


def build_features(items: Iterable[dict | TaskInput] | pd.DataFrame) -> pd.DataFrame:
	"""Таблица признаков в порядке schema.FEATURES. Пропуски остаются NaN — их заполняет пайплайн модели."""
	if isinstance(items, pd.DataFrame):
		records = items.to_dict("records")
	else:
		records = [item.model_dump() if isinstance(item, TaskInput) else dict(item) for item in items]
	return pd.DataFrame([_row_features(item) for item in records], columns=FEATURES)
