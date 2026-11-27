"""Реестр версий моделей (аналог таблицы model_versions из спецификации, п. 7.5).

models/registry.json хранит для каждой версии алгоритм, дату обучения, размер выборки, метрики,
схему признаков, путь к файлу и признак active. Активной бывает одна модель каждого типа.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path

import joblib

from .schema import FEATURES

ModelType = str  # "duration" | "risk"


@dataclass
class ModelVersion:
	model_type: ModelType
	version: str
	algorithm: str
	trained_at: str
	sample_size: int
	metrics: dict
	artifact_path: str
	feature_schema: list[str] = field(default_factory=lambda: list(FEATURES))
	data_source: str = "db"
	is_active: bool = True


class Registry:
	def __init__(self, root: Path | str):
		self.root = Path(root)
		self.path = self.root / "registry.json"

	def versions(self) -> list[ModelVersion]:
		if not self.path.exists():
			return []
		return [ModelVersion(**item) for item in json.loads(self.path.read_text(encoding="utf-8"))]

	def active(self, model_type: ModelType) -> ModelVersion | None:
		return next((item for item in self.versions() if item.model_type == model_type and item.is_active), None)

	def save(self, model_type: ModelType, algorithm: str, model, *, sample_size: int, metrics: dict, data_source: str) -> ModelVersion:
		self.root.mkdir(parents=True, exist_ok=True)
		now = datetime.now(timezone.utc)
		version = f"{model_type}-{algorithm}-{now:%Y%m%d%H%M%S}"
		artifact = f"{version}.joblib"
		joblib.dump(model, self.root / artifact)

		items = self.versions()
		for item in items:
			if item.model_type == model_type:
				item.is_active = False
		entry = ModelVersion(
			model_type=model_type,
			version=version,
			algorithm=algorithm,
			trained_at=now.isoformat(),
			sample_size=sample_size,
			metrics=metrics,
			artifact_path=artifact,
			data_source=data_source,
		)
		items.append(entry)
		self.path.write_text(json.dumps([asdict(item) for item in items], ensure_ascii=False, indent=2), encoding="utf-8")
		return entry

	def load(self, entry: ModelVersion):
		return joblib.load(self.root / entry.artifact_path)
