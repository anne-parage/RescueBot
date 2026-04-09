FROM python:3.11-slim

WORKDIR /llm_service

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "llm_service:app", "--host", "0.0.0.0", "--port", "8001"]