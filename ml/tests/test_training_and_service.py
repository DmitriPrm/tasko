"""Конвейер целиком на синтетике: обучение → реестр → сервис отвечает прогнозом."""

import importlib

import pytest
from fastapi.testclient import TestClient

from tasko_ml.registry import Registry
from tasko_ml.train import run, time_split

TASK = {
	"type": "FEATURE",
	"priority": "HIGH",
	"title": "Экспорт отчёта",
	"description": "Нужно выгрузить отчёт в PDF",
	"created_at": "2026-03-02T10:00:00Z",
	"deadline_at": "2026-03-04T00:00:00Z",
	"has_assignee": True,
	"assignee_active_tasks": 4,
	"assignee_done_count": 30,
	"assignee_avg_duration_hours": 50,
	"assignee_overdue_rate": 0.4,
}


@pytest.fixture(scope="module")
def trained(tmp_path_factory):
	root = tmp_path_factory.mktemp("ml")
	result = run("synthetic", None, root / "models", root / "reports", n_synthetic=600)
	return root, result


def test_time_split_keeps_the_future_for_testing():
	import pandas as pd

	df = pd.DataFrame({"created_at": [f"2026-01-{day:02d}" for day in range(1, 21)]})
	split = time_split(df)
	assert split.train["created_at"].max() < split.valid["created_at"].min()
	assert split.valid["created_at"].max() < split.test["created_at"].min()


def test_training_saves_both_models_and_beats_the_baseline(trained):
	root, result = trained
	registry = Registry(root / "models")
	assert registry.active("duration") and registry.active("risk")
	assert (root / "reports").glob("experiment-*.md")
	assert result["duration"]["algorithm"] != "baseline-median"
	assert result["risk"]["algorithm"] != "baseline-prior"


def test_service_returns_a_full_prediction(trained, monkeypatch):
	root, _ = trained
	monkeypatch.setenv("TASKO_MODELS_DIR", str(root / "models"))
	app_module = importlib.reload(importlib.import_module("service.app"))
	client = TestClient(app_module.app)

	assert client.get("/health").json()["modelsLoaded"] is True
	body = client.post("/predict", json=TASK).json()
	assert body["predictedDurationHours"] > 0
	assert 0 <= body["deadlineRiskProbability"] <= 1
	assert body["durationModelVersion"].startswith("duration-")
	assert body["riskModelVersion"].startswith("risk-")
	assert 0 < len(body["topFactors"]) <= 3


def test_service_validates_input_and_reports_missing_models(tmp_path, monkeypatch):
	monkeypatch.setenv("TASKO_MODELS_DIR", str(tmp_path))
	app_module = importlib.reload(importlib.import_module("service.app"))
	client = TestClient(app_module.app)

	assert client.post("/predict", json={**TASK, "priority": "URGENT"}).status_code == 422
	response = client.post("/predict", json=TASK)
	assert response.status_code == 503
	assert "обученной модели" in response.json()["detail"]
