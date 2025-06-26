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

To run a service, you have two main options.

**Option 1: Activate Virtual Environment (Recommended)**

First, navigate to the service's directory and activate its virtual environment. This will add the service's dependencies, including `uvicorn`, to your shell's `PATH`.

```bash
# Example for the NLP service
cd python-services/nlp-service
source venv/bin/activate
```

Once the environment is active, run the service:
```bash
uvicorn main:app --reload
```

**Option 2: Direct Execution**

If you prefer not to activate the virtual environment, you can run the `uvicorn` executable directly from the `venv` directory. Make sure you are inside the correct service directory first.

```bash
# Example from within python-services/nlp-service/
./venv/bin/uvicorn main:app --reload
```

The NLP service will be available at `http://127.0.0.1:8000`.
The Analysis service, if run separately, will need to be on a different port (e.g., `--port 8001`).

You can access the auto-generated API documentation at `http://127.0.0.1:8000/docs`. 