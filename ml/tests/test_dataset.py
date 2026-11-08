import pandas as pd

from tasko_ml.dataset import build_examples
from tasko_ml.features import build_features
from tasko_ml.schema import FEATURES

T = pd.Timestamp


def _task(**kw):
	base = {
		"project_id": "p1",
		"assignee_id": "u1",
		"parent_task_id": None,
		"title": "t",
		"description": "",
		"type": "TASK",
		"priority": "MEDIUM",
		"status": "DONE",
		"planned_start_at": None,
		"deadline_at": None,
		"actual_start_at": None,
		"completed_at": None,
		"tags_count": 0,
		"first_progress_at": None,
		"cancelled_at": None,
	}
	base.update(kw)
	return base


def test_targets_follow_the_specification():
	tasks = pd.DataFrame(
		[
			# 10 часов работы, закрыта в день срока → вовремя
			_task(id="a", created_at=T("2026-01-01T08:00Z"), actual_start_at=T("2026-01-02T08:00Z"), completed_at=T("2026-01-02T18:00Z"), deadline_at=T("2026-01-02T00:00Z")),
			# закрыта на следующий день после срока → просрочка
			_task(id="b", created_at=T("2026-01-01T08:00Z"), actual_start_at=T("2026-01-02T08:00Z"), completed_at=T("2026-01-03T10:00Z"), deadline_at=T("2026-01-02T00:00Z")),
			# отменённая задача — не обучающий пример
			_task(id="c", created_at=T("2026-01-01T08:00Z"), status="CANCELLED"),
		]
	)
	ex = build_examples(tasks).set_index("id")
	assert ex.loc["a", "duration_hours"] == 10
	assert ex.loc["a", "deadline_missed"] == 0
	assert ex.loc["b", "deadline_missed"] == 1
	assert pd.isna(ex.loc["c", "duration_hours"]) and pd.isna(ex.loc["c", "deadline_missed"])


def test_history_features_use_only_the_past():
	"""Задача, закрытая ПОСЛЕ создания текущей, не должна попасть в историю исполнителя."""
	tasks = pd.DataFrame(
		[
			_task(id="old", created_at=T("2026-01-01T00:00Z"), actual_start_at=T("2026-01-01T00:00Z"), completed_at=T("2026-01-02T00:00Z")),
			_task(id="later", created_at=T("2026-01-01T00:00Z"), actual_start_at=T("2026-01-01T00:00Z"), completed_at=T("2026-02-01T00:00Z")),
			_task(id="now", created_at=T("2026-01-10T00:00Z"), status="TODO"),
		]
	)
	row = build_examples(tasks).set_index("id").loc["now"]
	assert row["assignee_done_count"] == 1
	assert row["assignee_avg_duration_hours"] == 24
	# «later» ещё в работе на момент создания «now»
	assert row["assignee_active_tasks"] == 1


def test_features_have_a_stable_shape():
	frame = build_features([{"created_at": "2026-01-05T10:00:00Z", "deadline_at": "2026-01-07T00:00:00Z", "description": "два слова"}])
	assert list(frame.columns) == FEATURES
	assert frame.loc[0, "deadline_horizon_hours"] == 38
	assert frame.loc[0, "description_words"] == 2
	assert frame.loc[0, "created_weekday"] == 0
