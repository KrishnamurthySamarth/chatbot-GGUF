import faiss
from sklearn.preprocessing import normalize
import numpy as np
from sentence_transformers import CrossEncoder, SentenceTransformer

class FaissStore():
    def __init__(self):
        
        self.chunk_size = 1500
        self.overlap = 200
        self.chunks = []
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        self.re_ranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

    def _create_document_chunk(self, text_corpus):
        
        i = 0
        while i < len(text_corpus):
            j = min(i + self.chunk_size , len(text_corpus))
            self.chunks.append(text_corpus[i:j])
            i += self.chunk_size - self.overlap
    
    def insert_documents(self):
        
        self._create_document_chunk("/pdfs/text_from_pdf")
        text_embeddings = self.embedder.encode(self.chunks, convert_to_numpy=True)
        normalized_embeddings = normalize(text_embeddings, norm='l2')
        dimension = text_embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dimension)
        self.index.add(normalized_embeddings)
    
    def search_store(self, query, top_k=10):
        
        query_embedding = self.embedder.encode([query], convert_to_numpy=True)
        normalized_embedding = normalize(query_embedding, norm="l2")
        
        scores, indices = self.index.search(normalized_embedding, top_k)

        results = []
        for i, idx in enumerate(indices[0]):
            results.append({
                "score": float(scores[0][i]),
                "text": self.chunk_texts[idx],
                "index": int(idx)
            })

        return results

    def clear_store(self):
        pass
        
    def store_status(self):
        pass
        
    def _re_ranking(self):
        pass