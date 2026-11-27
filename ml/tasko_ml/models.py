"""Кандидаты для сравнения (п. 7.1–7.2): простой baseline, линейная модель, ансамбли деревьев.

CatBoost и LightGBM подключаются, если установлены (requirements-extra.txt).
"""

from __future__ import annotations

from collections.abc import Callable

import numpy as np
from sklearn.compose import ColumnTransformer, TransformedTargetRegressor
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor, RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from .schema import CATEGORICAL_FEATURES, NUMERIC_FEATURES


def _preprocess(scale: bool) -> ColumnTransformer:
	numeric_steps = [("impute", SimpleImputer(strategy="median", add_indicator=True))]
	if scale:
		numeric_steps.append(("scale", StandardScaler()))
	return ColumnTransformer(
		[
			("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES),
			("num", Pipeline(numeric_steps), NUMERIC_FEATURES),
		]
	)


def _pipeline(model, scale: bool = False) -> Pipeline:
	return Pipeline([("prep", _preprocess(scale)), ("model", model)])


def _log_target(model) -> TransformedTargetRegressor:
	"""Длительность сильно скошена вправо: учимся на log(1 + часы), отвечаем в часах."""
	return TransformedTargetRegressor(regressor=model, func=np.log1p, inverse_func=np.expm1)


def regression_candidates(seed: int = 42) -> dict[str, Callable[[], object]]:
	candidates: dict[str, Callable[[], object]] = {
		"baseline-median": lambda: _pipeline(DummyRegressor(strategy="median")),
		"ridge": lambda: _log_target(_pipeline(Ridge(alpha=1.0), scale=True)),
		"random-forest": lambda: _log_target(_pipeline(RandomForestRegressor(n_estimators=300, min_samples_leaf=3, random_state=seed, n_jobs=-1))),
		"hist-gradient-boosting": lambda: _log_target(_pipeline(HistGradientBoostingRegressor(random_state=seed))),
	}
	try:
		from lightgbm import LGBMRegressor

		candidates["lightgbm"] = lambda: _log_target(_pipeline(LGBMRegressor(n_estimators=400, learning_rate=0.05, random_state=seed, verbose=-1)))
	except ImportError:
		pass
	try:
		from catboost import CatBoostRegressor

		candidates["catboost"] = lambda: _log_target(_pipeline(CatBoostRegressor(iterations=500, random_seed=seed, verbose=False)))
	except ImportError:
		pass
	return candidates


def classification_candidates(seed: int = 42) -> dict[str, Callable[[], object]]:
	candidates: dict[str, Callable[[], object]] = {
		"baseline-prior": lambda: _pipeline(DummyClassifier(strategy="prior")),
		"logistic-regression": lambda: _pipeline(LogisticRegression(max_iter=2000, class_weight="balanced"), scale=True),
		"random-forest": lambda: _pipeline(
			RandomForestClassifier(n_estimators=300, min_samples_leaf=3, class_weight="balanced", random_state=seed, n_jobs=-1)
		),
		"hist-gradient-boosting": lambda: _pipeline(HistGradientBoostingClassifier(class_weight="balanced", random_state=seed)),
	}
	try:
		from lightgbm import LGBMClassifier

		candidates["lightgbm"] = lambda: _pipeline(
			LGBMClassifier(n_estimators=400, learning_rate=0.05, class_weight="balanced", random_state=seed, verbose=-1)
		)
	except ImportError:
		pass
	try:
		from catboost import CatBoostClassifier

		candidates["catboost"] = lambda: _pipeline(CatBoostClassifier(iterations=500, auto_class_weights="Balanced", random_seed=seed, verbose=False))
	except ImportError:
		pass
	return candidates
