# RAG Ingestion Pipeline for Mon Valley Pollution Tracking System

This directory contains scripts and instructions for gathering, preprocessing, and indexing authoritative air quality, health, and Mon Valley–specific data sources for Retrieval-Augmented Generation (RAG) with Llama 3.

## **How It Works**
- Each script fetches or processes data from a specific public source (EPA, PurpleAir, OpenAQ, CDC, WHO, ACHD, PA DEP, ECHO, Census, etc.).
- Outputs are saved in `../rag_data/` as PDFs, CSVs, or text files, ready for indexing.
- You can add your own documents (PDFs, reports, CSVs) to `../rag_data/` for custom knowledge.
- When ready, use LlamaIndex or Haystack to build a vector index for RAG.

---

## **Scripts Overview**
- `ingest_epa.py` — EPA AirNow, NAAQS, Integrated Science Assessments
- `ingest_purpleair.py` — PurpleAir sensor data (Mon Valley focus)
- `ingest_openaq.py` — OpenAQ global air quality data
- `ingest_cdc.py` — CDC air pollution & health docs
- `ingest_who.py` — WHO air quality guidelines
- `ingest_achd.py` — Allegheny County Health Dept reports
- `ingest_padep.py` — PA DEP air quality data
- `ingest_echo.py` — EPA ECHO compliance/enforcement
- `ingest_local.py` — Local PDFs, reports, and your own data
- `ingest_news.py` — News/community stories (Mon Valley, Clairton, US Steel)
- `ingest_regulations.py` — EPA/ACHD/PA DEP regulations
- `ingest_census.py` — US Census/demographics
- `ingest_ejscreen.py` — EPA EJSCREEN environmental justice data
- `ingest_custom.py` — For any other sources you want to add

---

## **Manual Document Upload**
- Place any PDFs, CSVs, or text files you want indexed in `../rag_data/`.
- Example: `Mon Valley Pollution Tracking System Master Plan.pdf`

---

## **Quickstart: Run All Ingestion Scripts**

```sh
cd rag_ingest
python3 ingest_epa.py
python3 ingest_purpleair.py
python3 ingest_openaq.py
python3 ingest_cdc.py
python3 ingest_who.py
python3 ingest_achd.py
python3 ingest_padep.py
python3 ingest_echo.py
python3 ingest_local.py
python3 ingest_news.py
python3 ingest_regulations.py
python3 ingest_census.py
python3 ingest_ejscreen.py
python3 ingest_custom.py
```

---

## **Next Steps: Build the RAG Index**
- Use [LlamaIndex](https://www.llamaindex.ai/) or [Haystack](https://haystack.deepset.ai/) to index all files in `../rag_data/`.
- Connect your retriever to Ollama/Llama 3 for context-aware answers.

---

## **Adding New Sources**
- Add a new script (e.g., `ingest_newsource.py`) and update this README.
- Place new data in `../rag_data/`.

---

**Contact your AI/ML lead for help with advanced RAG setup or to automate ingestion from new APIs.**
