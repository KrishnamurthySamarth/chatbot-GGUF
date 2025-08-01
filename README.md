# PDF-Chatbot

<p align="center">
  <img src="assets/demo.gif" width="700"/>
</p>

This is a lightweight project that uses a local GGUF model through Ollama to build a chatbot that can answer questions based on the content of a PDF.  
The goal is to compare simple retrieval-augmented generation (RAG) with and without re-ranking, to evaluate how much re-ranking improves answer quality.

---

## What's RAG?

RAG (Retrieval-Augmented Generation) is a technique where we fetch relevant text chunks from documents and pass them to the model along with your question, so it can answer better.

---

## What's Re-ranking?

Re-ranking helps choose the best chunks from the retrieved ones by scoring them more smartly — usually using a smaller, faster model.

- [What is re-ranking?](https://huggingface.co/blog/re-ranking)
- [Re-ranking with CrossEncoder](https://www.sbert.net/examples/applications/retrieve_rerank/README.html)

---

## Tech-Stack

- Python
- Ollama
- FAISS (CPU version)
- Sentence Transformers:
   1. CrossEncoder for re-ranking
   2. MiniLM for embedding generation

---

## How to run the application

- Install [Ollama](https://ollama.com).
- Clone the repository.
- Create a directory named `model` within the project folder.
-  Download the `phi-3` 4K GGUF model file into the `model` directory.
-  Create a custom model by running:
   
   ```bash
   ollama create rave -f Modelfile_q4
*You can replace `rave` with your own name and change it in the UI*
- Test the model with
  
  ```bash
  ollama run rave

- Install Python dependencies

  ```bash
  pip install -r requirements.txt

- Start the server

  ```bash
  uvicorn server:app

---

## To be Notes before Testing the server

- A sample PDF is included. It is uploaded by default into the vector store.
- Clearing the database will remove all stored chunks and the vector index.
- There is no conversation memory. The model uses a 4K context window, so this project focuses only on comparing re-ranked results with plain retrieval.
- Multiple PDFs are not supported. Only one PDF can be uploaded at a time.

---

## Highlights

- Built entirely using open-source models.
- Responses are streamed from the local Ollama model.
- UI allows side-by-side comparison of basic retrieval vs re-ranked retrieval results.
