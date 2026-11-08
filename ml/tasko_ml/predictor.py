"""Прогноз по активным моделям и объяснение: какие признаки сильнее всего сдвинули результат."""

from __future__ import annotations

import numpy as np
import pandas as pd

from .features import build_features
from .registry import Registry
from .schema import CATEGORICAL_FEATURES, FEATURES, TaskInput

#: Подписи признаков для интерфейса
FEATURE_LABELS = {
	"type": "Тип задачи",
	"priority": "Приоритет",
	"title_len": "Длина названия",
	"description_len": "Длина описания",
	"description_words": "Слов в описании",
	"has_deadline": "Есть срок",
	"deadline_horizon_hours": "Время до срока",
	"has_planned_start": "Есть плановый старт",
	"planned_start_offset_hours": "Отсрочка старта",
	"created_weekday": "День недели создания",
	"created_hour": "Час создания",
	"is_subtask": "Это подзадача",
	"tags_count": "Число тегов",
	"blocked_by_count": "Блокирующие задачи",
	"has_assignee": "Есть исполнитель",
	"assignee_active_tasks": "Загрузка исполнителя",
	"assignee_done_count": "Опыт исполнителя",
	"assignee_avg_duration_hours": "Обычная длительность у исполнителя",
	"assignee_overdue_rate": "Доля просрочек у исполнителя",
	"project_done_count": "Завершено в проекте",
	"project_avg_duration_hours": "Обычная длительность в проекте",
	"project_overdue_rate": "Доля просрочек в проекте",
}


def reference_row(features: pd.DataFrame) -> dict:
	"""«Типичная» задача обучающей выборки: медиана числовых, самое частое значение категорий."""
	ref = {}
	for column in FEATURES:
		values = features[column].dropna()
		if column in CATEGORICAL_FEATURES:
			ref[column] = values.mode().iat[0] if len(values) else None
		else:
			ref[column] = float(values.median()) if len(values) else np.nan
	return ref


def top_factors(predict, row: pd.DataFrame, reference: dict, limit: int = 3) -> list[dict]:
	"""Вклад признака = прогноз − прогноз, если этот признак заменить на типичное значение.

	value — значение признака у этой задачи (None — нет данных), чтобы интерфейс мог написать
	«Нет исполнителя» вместо «Есть исполнитель».
	"""
	base = float(predict(row)[0])
	impacts = []
	for column in FEATURES:
		value = row[column].iat[0]
		if pd.isna(value) and pd.isna(reference[column]):
			continue
		changed = row.copy()
		changed[column] = reference[column]
		impact = base - float(predict(changed)[0])
		if abs(impact) > 1e-9:
			impacts.append(
				{"feature": column, "label": FEATURE_LABELS[column], "impact": round(impact, 4), "value": _plain(value)}
			)
	return sorted(impacts, key=lambda item: abs(item["impact"]), reverse=True)[:limit]


def _plain(value: object) -> str | float | None:
	"""Значение признака для ответа: None вместо NaN, обычное число вместо numpy."""
	if value is None or pd.isna(value):
		return None
	if isinstance(value, str):
		return value
	return round(float(value), 4)


class Predictor:
	def __init__(self, registry: Registry):
		self.registry = registry
		self.reload()

	def reload(self) -> None:
		self.duration_entry = self.registry.active("duration")
		self.risk_entry = self.registry.active("risk")
		self.duration = self.registry.load(self.duration_entry) if self.duration_entry else None
		self.risk = self.registry.load(self.risk_entry) if self.risk_entry else None

	@property
	def ready(self) -> bool:
		return self.duration is not None or self.risk is not None

	def info(self) -> dict:
		def describe(entry):
			if not entry:
				return None
			return {
				"version": entry.version,
				"algorithm": entry.algorithm,
				"trainedAt": entry.trained_at,
				"sampleSize": entry.sample_size,
				"dataSource": entry.data_source,
				"metrics": entry.metrics.get("test"),
			}

		return {"duration": describe(self.duration_entry), "risk": describe(self.risk_entry)}

	def predict_duration(self, task: TaskInput, explain: bool = True) -> dict | None:
		if not self.duration:
			return None
		row = build_features([task])
		model = self.duration["model"]
		hours = max(0.0, float(model.predict(row)[0]))
		result = {"predictedDurationHours": round(hours, 1), "durationModelVersion": self.duration_entry.version}
		if explain:
			result["durationFactors"] = top_factors(model.predict, row, self.duration["reference"])
		return result

	def predict_risk(self, task: TaskInput, explain: bool = True) -> dict | None:
		if not self.risk:
			return None
		row = build_features([task])
		model = self.risk["model"]
		proba = lambda frame: model.predict_proba(frame)[:, 1]  # noqa: E731
		probability = float(np.clip(proba(row)[0], 0, 1))
		result = {"deadlineRiskProbability": round(probability, 4), "riskModelVersion": self.risk_entry.version}
		if explain:
			result["topFactors"] = top_factors(proba, row, self.risk["reference"])
		return result
