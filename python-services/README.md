# Python Microservices

This directory contains specialized microservices written in Python to support the main CRM application.

## Services

-   `/nlp-service`: Extracts named entities from text using spaCy.
-   `/analysis-service`: A placeholder for complex financial analyses (e.g., deal similarity).

## Setup and Running

Each service is independent and has its own dependencies.

### 1. Install Dependencies

Navigate to each service's directory and install its requirements. It's highly recommended to use a virtual environment for each service.

**For the NLP Service:**
```bash
cd nlp-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Manually download the spaCy model
python -m spacy download en_core_web_lg
```

**For the Analysis Service:**
```bash
cd analysis-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Running a Service

Once dependencies are installed, you can run each service using `uvicorn`. From within the service's directory:

```bash
# This will start the service with auto-reload on port 8000
uvicorn main:app --reload
```

The NLP service will be available at `http://127.0.0.1:8000`.
The Analysis service, if run separately, will need to be on a different port (e.g., `--port 8001`).

You can access the auto-generated API documentation at `http://127.0.0.1:8000/docs`. 