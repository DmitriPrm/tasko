"""Эксперимент: выборка → признаки → разбиение по времени → сравнение моделей → сохранение лучших.

Запуск:
	python -m tasko_ml.train --source db         # история из базы TASKO (DATABASE_URL)
	python -m tasko_ml.train --source synthetic  # проверка конвейера на синтетике

Выборка делится по дате создания задачи: 70% самых ранних — обучение, следующие 15% — выбор модели,
последние 15% — итоговая оценка. Так тест имитирует прогноз будущего по прошлому.
"""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
	accuracy_score,
	f1_score,
	mean_absolute_error,
	mean_squared_error,
	precision_score,
	r2_score,
	recall_score,
	roc_auc_score,
)

from .dataset import build_examples, load_raw_from_db, synthetic_tasks
from .features import build_features
from .models import classification_candidates, regression_candidates
from .predictor import reference_row
from .registry import Registry

ML_ROOT = Path(__file__).resolve().parent.parent
# joblib на Windows не может посчитать физические ядра и шумит предупреждением
os.environ.setdefault("LOKY_MAX_CPU_COUNT", str(os.cpu_count() or 1))
MIN_SAMPLES = 30


@dataclass
class Split:
	train: pd.DataFrame
	valid: pd.DataFrame
	test: pd.DataFrame


def time_split(df: pd.DataFrame, valid_share: float = 0.15, test_share: float = 0.15) -> Split:
	ordered = df.sort_values("created_at").reset_index(drop=True)
	n = len(ordered)
	test_start = int(n * (1 - test_share))
	valid_start = int(n * (1 - test_share - valid_share))
	return Split(ordered.iloc[:valid_start], ordered.iloc[valid_start:test_start], ordered.iloc[test_start:])


def regression_metrics(y_true, y_pred) -> dict:
	return {
		"MAE": float(mean_absolute_error(y_true, y_pred)),
		"RMSE": float(np.sqrt(mean_squared_error(y_true, y_pred))),
		"R2": float(r2_score(y_true, y_pred)) if len(y_true) > 1 else None,
	}


def classification_metrics(y_true, proba, threshold: float = 0.5) -> dict:
	pred = (proba >= threshold).astype(int)
	both_classes = len(set(y_true)) > 1
	return {
		"Precision": float(precision_score(y_true, pred, zero_division=0)),
		"Recall": float(recall_score(y_true, pred, zero_division=0)),
		"F1": float(f1_score(y_true, pred, zero_division=0)),
		"ROC_AUC": float(roc_auc_score(y_true, proba)) if both_classes else None,
		"Accuracy": float(accuracy_score(y_true, pred)),
	}


def _fit_and_compare(kind: str, data: pd.DataFrame, target: str) -> tuple[list[dict], str, object, dict]:
	split = time_split(data)
	x = {name: build_features(part) for name, part in vars(split).items()}
	y = {name: part[target].to_numpy() for name, part in vars(split).items()}
	if kind == "risk" and len(set(y["train"])) < 2:
		raise ValueError("В обучающей части все задачи одного класса (все вовремя или все с просрочкой)")

	candidates = regression_candidates() if kind == "duration" else classification_candidates()
	rows = []
	for name, factory in candidates.items():
		model = factory()
		model.fit(x["train"], y["train"])
		if kind == "duration":
			valid = regression_metrics(y["valid"], model.predict(x["valid"]))
			test = regression_metrics(y["test"], model.predict(x["test"]))
			score = valid["MAE"]  # меньше — лучше
		else:
			valid = classification_metrics(y["valid"], model.predict_proba(x["valid"])[:, 1])
			test = classification_metrics(y["test"], model.predict_proba(x["test"])[:, 1])
			auc = valid["ROC_AUC"]
			score = -(auc if auc is not None else valid["F1"])  # больше — лучше
		rows.append({"algorithm": name, "score": score, "valid": valid, "test": test})

	best = min(rows, key=lambda row: row["score"])
	# Итоговую модель дообучаем на train + valid: тест так и остаётся нетронутым
	final = candidates[best["algorithm"]]()
	seen = pd.concat([x["train"], x["valid"]])
	final.fit(seen, np.concatenate([y["train"], y["valid"]]))
	# Вместе с моделью храним «типичную» задачу — от неё считаются главные факторы прогноза
	bundle = {"model": final, "reference": reference_row(seen)}
	sizes = {"train": len(split.train), "valid": len(split.valid), "test": len(split.test)}
	return rows, best["algorithm"], bundle, {"test": best["test"], "valid": best["valid"], "split": sizes}


def _report_table(kind: str, rows: list[dict], best: str) -> str:
	if kind == "duration":
		head = "| Алгоритм | MAE, ч (valid) | MAE, ч (test) | RMSE, ч (test) | R² (test) |\n|---|---|---|---|---|"
		lines = [
			f"| {'**' + r['algorithm'] + '**' if r['algorithm'] == best else r['algorithm']} | {r['valid']['MAE']:.1f} | "
			f"{r['test']['MAE']:.1f} | {r['test']['RMSE']:.1f} | {_fmt(r['test']['R2'])} |"
			for r in rows
		]
	else:
		head = "| Алгоритм | ROC-AUC (valid) | ROC-AUC (test) | Precision | Recall | F1 |\n|---|---|---|---|---|---|"
		lines = [
			f"| {'**' + r['algorithm'] + '**' if r['algorithm'] == best else r['algorithm']} | {_fmt(r['valid']['ROC_AUC'])} | "
			f"{_fmt(r['test']['ROC_AUC'])} | {r['test']['Precision']:.2f} | {r['test']['Recall']:.2f} | {r['test']['F1']:.2f} |"
			for r in rows
		]
	return "\n".join([head, *lines])


def _fmt(value) -> str:
	return "—" if value is None else f"{value:.2f}"


def run(source: str, database_url: str | None, models_dir: Path, reports_dir: Path, n_synthetic: int = 1500) -> dict:
	if source == "db":
		if not database_url:
			raise SystemExit("Укажите DATABASE_URL или --db-url")
		tasks, deps = load_raw_from_db(database_url)
	else:
		tasks, deps = synthetic_tasks(n_synthetic)

	examples = build_examples(tasks, deps)
	registry = Registry(models_dir)
	report = [f"# Эксперимент {datetime.now(timezone.utc):%Y-%m-%d %H:%M} UTC", "", f"Источник данных: **{source}**, задач всего: {len(examples)}."]
	if source == "synthetic":
		report.append("\n> Синтетика — только проверка конвейера. Научные выводы по ней делать нельзя.")
	result: dict = {}

	plans = [
		("duration", "duration_hours", "Длительность (регрессия)"),
		("risk", "deadline_missed", "Риск срыва срока (классификация)"),
	]
	for kind, target, title in plans:
		data = examples[examples[target].notna()]
		report.append(f"\n## {title}\n\nОбучающих примеров: {len(data)}.")
		if len(data) < MIN_SAMPLES:
			msg = f"Мало данных: нужно хотя бы {MIN_SAMPLES} завершённых задач, есть {len(data)}. Модель не обучена."
			report.append(f"\n{msg}")
			result[kind] = {"skipped": msg}
			continue
		try:
			rows, best, model, metrics = _fit_and_compare(kind, data, target)
		except ValueError as error:
			report.append(f"\n{error}. Модель не обучена.")
			result[kind] = {"skipped": str(error)}
			continue
		entry = registry.save(kind, best, model, sample_size=len(data), metrics=metrics, data_source=source)
		report.append(f"\nРазбиение по времени: {metrics['split']}. Лучшая модель: **{best}** → `{entry.version}`.\n")
		report.append(_report_table(kind, rows, best))
		result[kind] = {"version": entry.version, "algorithm": best, "metrics": metrics}

	reports_dir.mkdir(parents=True, exist_ok=True)
	path = reports_dir / f"experiment-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}.md"
	path.write_text("\n".join(report) + "\n", encoding="utf-8")
	result["report"] = str(path)
	return result


def main() -> None:
	parser = argparse.ArgumentParser(description="Обучение моделей прогноза TASKO")
	parser.add_argument("--source", choices=["db", "synthetic"], default="db")
	parser.add_argument("--db-url", default=os.environ.get("DATABASE_URL"))
	parser.add_argument("--models-dir", type=Path, default=ML_ROOT / "models")
	parser.add_argument("--reports-dir", type=Path, default=ML_ROOT / "reports")
	parser.add_argument("--synthetic-size", type=int, default=1500)
	args = parser.parse_args()
	result = run(args.source, args.db_url, args.models_dir, args.reports_dir, args.synthetic_size)
	for kind in ("duration", "risk"):
		info = result[kind]
		print(f"{kind}: {info.get('version') or info.get('skipped')}")
	print(f"Отчёт: {result['report']}")


if __name__ == "__main__":
	main()
