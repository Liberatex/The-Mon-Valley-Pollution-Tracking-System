import os
import pandas as pd
import json
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, Document
from llama_index.llms.ollama import Ollama
from llama_index.readers.file import PDFReader

# Load EPA data
epa_path = '../rag_data/epa_aqs.json'
with open(epa_path, 'r') as f:
    epa_data = json.load(f)
    epa_docs = [Document(text=json.dumps(row), metadata={'source': 'epa_aqs'}) for row in epa_data.get('Data', [])]

# Load PurpleAir data
pa_path = '../rag_data/purpleair.csv'
pa_df = pd.read_csv(pa_path)
pa_docs = [Document(text=row.to_json(), metadata={'source': 'purpleair'}) for _, row in pa_df.iterrows()]

# Load PDF (Mon Valley Master Plan)
pdf_path = '../Mon Valley Pollution Tracking System Master Plan .pdf'
pdf_docs = []
if os.path.exists(pdf_path):
    pdf_reader = PDFReader()
    pdf_docs = pdf_reader.load_data(pdf_path)

# Combine all docs
all_docs = epa_docs + pa_docs + pdf_docs

# Build index
print(f"Indexing {len(all_docs)} documents...")
index = VectorStoreIndex.from_documents(all_docs)

# Set up Llama 3 via Ollama
llm = Ollama(model='llama3')

# Query loop
print("\nRAG demo ready! Type your question (or 'exit' to quit):")
while True:
    q = input('> ')
    if q.strip().lower() == 'exit':
        break
    response = index.as_query_engine(llm=llm).query(q)
    print(f"\nAnswer:\n{response}\n") 