from fastapi import FastAPI

app = FastAPI(title="ATA RAG Backend")

@app.get("/health")
def health():
    return {"status": "ok"}