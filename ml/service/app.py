"""FastAPI-сервис прогноза (п. 10.1 спецификации).

Сервис только отвечает на прогнозы по сохранённым моделям: он не ходит в базу, не обучает
модели на лету и не знает про пользователей. Бэкенд TASKO присылает сведения о задаче
(schema.TaskInput) и сохраняет ответ как TaskPrediction.

Запуск: uvicorn service.app:app --port 8001   (из папки ml/)
"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException

from tasko_ml.predictor import Predictor
from tasko_ml.registry import Registry
from tasko_ml.schema import TaskInput

MODELS_DIR = Path(os.environ.get("TASKO_MODELS_DIR", Path(__file__).resolve().parent.parent / "models"))

app = FastAPI(title="TASKO ML", version="0.1.0", description="Прогноз длительности задачи и риска срыва срока")
predictor = Predictor(Registry(MODELS_DIR))

NO_MODEL = "Нет обученной модели: запустите python -m tasko_ml.train"


@app.get("/health")
def health() -> dict:
	return {"status": "ok", "modelsLoaded": predictor.ready}


@app.get("/models/info")
def models_info() -> dict:
	return predictor.info()


@app.post("/models/reload")
def models_reload() -> dict:
	"""Подхватить модели, обученные после запуска сервиса."""
	predictor.reload()
	return predictor.info()


@app.post("/predict/duration")
def predict_duration(task: TaskInput) -> dict:
	result = predictor.predict_duration(task)
	if result is None:
		raise HTTPException(status_code=503, detail=NO_MODEL)
	return result


@app.post("/predict/risk")
def predict_risk(task: TaskInput) -> dict:
	result = predictor.predict_risk(task)
	if result is None:
		raise HTTPException(status_code=503, detail=NO_MODEL)
	return result


@app.post("/predict")
def predict(task: TaskInput) -> dict:
	"""Объединённый ответ: длительность, вероятность срыва, версии моделей и главные факторы."""
	if not predictor.ready:
		raise HTTPException(status_code=503, detail=NO_MODEL)
	return {
		**(predictor.predict_duration(task) or {"predictedDurationHours": None, "durationModelVersion": None}),
		**(predictor.predict_risk(task) or {"deadlineRiskProbability": None, "riskModelVersion": None}),
	}
