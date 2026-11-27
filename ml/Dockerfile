FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY tasko_ml ./tasko_ml
COPY service ./service

# Модели монтируются томом: их обучают командой python -m tasko_ml.train
ENV TASKO_MODELS_DIR=/app/models
EXPOSE 8001
CMD ["uvicorn", "service.app:app", "--host", "0.0.0.0", "--port", "8001"]
