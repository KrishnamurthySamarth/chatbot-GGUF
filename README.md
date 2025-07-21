# pdf-chatbot-gguf

This is a tiny project where we use a local GGUF model via Ollama to build a chatbot that can talk to PDFs.  
We compare the results of basic RAG with and without re-ranking to see how much it actually improves the answers.

## What's RAG?

RAG (Retrieval-Augmented Generation) is a technique where we fetch relevant text chunks from documents and pass them to the model along with your question, so it can answer better.

## What's Re-ranking?

Re-ranking helps choose the best chunks from the retrieved ones by scoring them more smartly — usually using a smaller, faster model.

- [What is re-ranking?](https://huggingface.co/blog/re-ranking)
- [Re-ranking with CrossEncoder](https://www.sbert.net/examples/applications/retrieve_rerank/README.html)

---

## How to use this repo and start FastAPI

