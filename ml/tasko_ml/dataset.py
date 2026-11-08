"""Обучающая выборка: выгрузка истории задач из PostgreSQL TASKO и синтетика для отладки.

Целевые переменные (п. 7.1–7.2 спецификации):
- duration_hours — от первого перехода «В работе» до «Готово»; только для задач DONE;
- deadline_missed — 1, если задача закрыта позже дня срока; только для DONE со сроком.
Срок в TASKO хранится как начало дня, поэтому закрытие в течение этого дня считается вовремя.

Признаки считаются на момент создания задачи: агрегаты по исполнителю и проекту берутся только
из задач, завершённых раньше, — так модель учится предсказывать будущее по прошлому.
"""

from __future__ import annotations

from urllib.parse import urlsplit, urlunsplit

import numpy as np
import pandas as pd

HOUR = pd.Timedelta(hours=1)
DAY = pd.Timedelta(days=1)

TASK_QUERY = """
SELECT
	t.id, t.project_id, t.assignee_id, t.parent_task_id, t.title, t.description,
	t.type::text AS type, t.priority::text AS priority, t.status::text AS status,
	t.planned_start_at, t.deadline_at, t.actual_start_at, t.completed_at, t.created_at,
	(SELECT count(*) FROM task_tags tt WHERE tt.task_id = t.id) AS tags_count,
	(SELECT min(h.changed_at) FROM task_status_history h
		WHERE h.task_id = t.id AND h.to_status = 'IN_PROGRESS') AS first_progress_at,
	(SELECT min(h.changed_at) FROM task_status_history h
		WHERE h.task_id = t.id AND h.to_status = 'CANCELLED') AS cancelled_at
FROM tasks t
"""

DEPENDENCY_QUERY = "SELECT target_task_id, created_at FROM task_dependencies WHERE type = 'BLOCKS'"


def _clean_url(url: str) -> str:
	"""Prisma добавляет ?schema=public — psycopg такой параметр не понимает."""
	parts = urlsplit(url)
	return urlunsplit((parts.scheme, parts.netloc, parts.path, "", ""))


def load_raw_from_db(database_url: str) -> tuple[pd.DataFrame, pd.DataFrame]:
	import psycopg

	with psycopg.connect(_clean_url(database_url)) as conn, conn.cursor() as cur:
		cur.execute(TASK_QUERY)
		tasks = pd.DataFrame(cur.fetchall(), columns=[col.name for col in cur.description])
		cur.execute(DEPENDENCY_QUERY)
		deps = pd.DataFrame(cur.fetchall(), columns=[col.name for col in cur.description])
	return tasks, deps


def _utc(series: pd.Series) -> pd.Series:
	return pd.to_datetime(series, utc=True)


def build_examples(tasks: pd.DataFrame, deps: pd.DataFrame | None = None) -> pd.DataFrame:
	"""Сырые входы TaskInput + целевые переменные для каждой задачи, без утечки будущего."""
	if tasks.empty:
		return pd.DataFrame()
	df = tasks.copy()
	for col in ["planned_start_at", "deadline_at", "actual_start_at", "completed_at", "created_at", "first_progress_at", "cancelled_at"]:
		df[col] = _utc(df[col]) if col in df else pd.NaT

	start = df["actual_start_at"].fillna(df["first_progress_at"])
	is_done = df["status"] == "DONE"
	duration = (df["completed_at"] - start) / HOUR
	df["duration_hours"] = duration.where(is_done & duration.gt(0))
	has_deadline = df["deadline_at"].notna() & df["completed_at"].notna()
	missed = (df["completed_at"] >= df["deadline_at"] + DAY).astype(float)
	df["deadline_missed"] = missed.where(is_done & has_deadline)
	# Когда задача перестала быть «активной»: закрыта или отменена
	df["finished_at"] = df["completed_at"].where(is_done, df["cancelled_at"])

	deps = deps if deps is not None else pd.DataFrame(columns=["target_task_id", "created_at"])
	dep_times = (
		deps.assign(created_at=_utc(deps["created_at"])).groupby("target_task_id")["created_at"].apply(list).to_dict()
		if not deps.empty
		else {}
	)

	rows = []
	for row in df.itertuples(index=False):
		moment = row.created_at
		assignee = _history(df, "assignee_id", row.assignee_id, moment) if _present(row.assignee_id) else None
		project = _history(df, "project_id", row.project_id, moment)
		rows.append(
			{
				"id": row.id,
				"type": row.type,
				"priority": row.priority,
				"title": row.title or "",
				"description": row.description or "",
				"created_at": moment.isoformat(),
				"deadline_at": row.deadline_at.isoformat() if pd.notna(row.deadline_at) else None,
				"planned_start_at": row.planned_start_at.isoformat() if pd.notna(row.planned_start_at) else None,
				"is_subtask": _present(row.parent_task_id),
				"tags_count": int(row.tags_count or 0),
				"blocked_by_count": sum(1 for at in dep_times.get(row.id, []) if at <= moment),
				"has_assignee": assignee is not None,
				"assignee_active_tasks": assignee["active"] if assignee else 0,
				"assignee_done_count": assignee["done"] if assignee else 0,
				"assignee_avg_duration_hours": assignee["avg_duration"] if assignee else None,
				"assignee_overdue_rate": assignee["overdue_rate"] if assignee else None,
				"project_done_count": project["done"],
				"project_avg_duration_hours": project["avg_duration"],
				"project_overdue_rate": project["overdue_rate"],
				"status": row.status,
				"duration_hours": row.duration_hours,
				"deadline_missed": row.deadline_missed,
			}
		)
	return pd.DataFrame(rows).sort_values("created_at").reset_index(drop=True)


def _present(value: object) -> bool:
	return value is not None and not (isinstance(value, float) and np.isnan(value))


def _history(df: pd.DataFrame, column: str, key: object, moment: pd.Timestamp) -> dict:
	"""Агрегаты по задачам того же исполнителя/проекта, известные к моменту moment."""
	same = df[df[column] == key]
	done_before = same[(same["status"] == "DONE") & (same["completed_at"] < moment)]
	durations = done_before["duration_hours"].dropna()
	missed = done_before["deadline_missed"].dropna()
	active = same[(same["created_at"] < moment) & (same["finished_at"].isna() | (same["finished_at"] > moment))]
	return {
		"done": int(len(done_before)),
		"active": int(len(active)),
		"avg_duration": float(durations.mean()) if len(durations) else None,
		"overdue_rate": float(missed.mean()) if len(missed) else None,
	}


def synthetic_tasks(n_tasks: int = 1500, seed: int = 7) -> tuple[pd.DataFrame, pd.DataFrame]:
	"""Правдоподобная синтетика той же формы, что и выгрузка из базы.

	Нужна только для проверки конвейера: научные выводы на ней делать нельзя (п. 7.5).
	Скрытые закономерности: тип и приоритет задают базовую длительность, у исполнителей разная
	скорость, загрузка и описание удлиняют работу, короткий горизонт срока чаще срывается.
	"""
	rng = np.random.default_rng(seed)
	start = pd.Timestamp("2025-01-01", tz="UTC")
	types = np.array(["TASK", "FEATURE", "BUG", "RESEARCH"])
	priorities = np.array(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
	base_hours = {"TASK": 16, "FEATURE": 40, "BUG": 10, "RESEARCH": 28}
	priority_factor = {"LOW": 1.25, "MEDIUM": 1.0, "HIGH": 0.85, "CRITICAL": 0.7}
	assignees = [f"user-{i}" for i in range(12)]
	speed = dict(zip(assignees, rng.lognormal(0, 0.35, len(assignees))))
	projects = [f"project-{i}" for i in range(6)]

	rows = []
	created = start
	for i in range(n_tasks):
		created = created + pd.Timedelta(hours=float(rng.exponential(8)))
		task_type = rng.choice(types, p=[0.4, 0.25, 0.25, 0.1])
		priority = rng.choice(priorities, p=[0.2, 0.45, 0.25, 0.1])
		assignee = rng.choice(assignees) if rng.random() > 0.08 else None
		description = " ".join(["слово"] * int(rng.integers(0, 120)))
		horizon_days = float(rng.choice([1, 2, 3, 5, 7, 10, 14, 21]))
		deadline = (created + pd.Timedelta(days=horizon_days)).normalize() if rng.random() > 0.2 else pd.NaT
		hours = base_hours[task_type] * priority_factor[priority] * (speed[assignee] if assignee else 1.4)
		hours *= 1 + len(description.split()) / 300
		hours *= float(rng.lognormal(0, 0.45))
		wait = pd.Timedelta(hours=float(rng.exponential(20)))
		outcome = rng.random()
		status = "DONE" if outcome < 0.82 else ("CANCELLED" if outcome < 0.9 else "IN_PROGRESS")
		actual_start = created + wait
		completed = actual_start + pd.Timedelta(hours=hours * 3) if status == "DONE" else pd.NaT  # рабочие часы → календарные
		rows.append(
			{
				"id": f"task-{i}",
				"project_id": rng.choice(projects),
				"assignee_id": assignee,
				"parent_task_id": f"task-{i - 1}" if i and rng.random() < 0.1 else None,
				"title": f"Задача {i}",
				"description": description,
				"type": task_type,
				"priority": priority,
				"status": status,
				"planned_start_at": pd.NaT,
				"deadline_at": deadline,
				"actual_start_at": actual_start,
				"completed_at": completed,
				"created_at": created,
				"tags_count": int(rng.integers(0, 4)),
				"first_progress_at": actual_start,
				"cancelled_at": created + wait if status == "CANCELLED" else pd.NaT,
			}
		)
	return pd.DataFrame(rows), pd.DataFrame(columns=["target_task_id", "created_at"])
