import faiss
from sklearn.preprocessing import normalize
from sentence_transformers import CrossEncoder, SentenceTransformer
import pickle
import os

class FaissStore():
    def __init__(self):
        
        self.chunk_size = 1500
        self.overlap = 200
        self.chunks = []
        self.embedder = SentenceTransformer("all-MiniLM-L6-v2")
        self.re_ranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
        self.index = None

    def _create_document_chunk(self, text_corpus):
        
        i = 0
        while i < len(text_corpus):
            j = min(i + self.chunk_size , len(text_corpus))
            self.chunks.append(text_corpus[i:j])
            i += self.chunk_size - self.overlap
        self._save_chunks()
    
    def _save_chunks(self, path="compute/chunks.pkl"):
        with open(path, "wb") as f:
            pickle.dump(self.chunks, f)
        print(f"Chunks saved to {path}")

    def load_chunks(self, path="compute/chunks.pkl"):
        with open(path, "rb") as f:
            self.chunks = pickle.load(f)
            print(f"Chunks loaded from {path}")
    
    def insert_documents(self, text_path = "data/text_from_pdf.txt"):
        
        with open(text_path, "r") as f:
            text = f.read()
            
        self._create_document_chunk(text)
        
        text_embeddings = self.embedder.encode(self.chunks, convert_to_numpy=True)
        normalized_embeddings = normalize(text_embeddings, norm='l2')
        dimension = text_embeddings.shape[1]
        self.index = faiss.IndexFlatIP(dimension)
        self.index.add(normalized_embeddings)
        self._save_index()
    
    def search_store(self, query, top_k=10):
        
        query_embedding = self.embedder.encode([query], convert_to_numpy=True)
        normalized_embedding = normalize(query_embedding, norm="l2")
        
        if not self.chunks:
            self.load_chunks()
        
        scores, indices = self.index.search(normalized_embedding, top_k)

        results = []
        for i, idx in enumerate(indices[0]):
            results.append({
                "score": float(scores[0][i]),
                "text": self.chunks[idx],
                "index": int(idx)
            })

        return results

    def clear_store(self):
        
        self.index = None
        self.chunks = []
        os.remove("compute/chunks.pkl")
        os.remove("compute/faiss.index")
        os.remove("data/text_from_pdf.txt")
        os.remove("data/uploaded.pdf")
        return {
            "message" : "Cleared"
        }
        
        
    def store_status(self):
        
        return {
            "vector_database" : "Faiss",
            "faiss_indexUsed" : bool(self.index),
            "index_size" : self.index.ntotal if self.index else 0
        }
    
    def _save_index(self, index_path="compute/faiss.index"):
        
        if self.index is not None:
            faiss.write_index(self.index, index_path)
    
    def load_index(self, index_path = "compute/faiss.index"):
        
        self.index = faiss.read_index(index_path)
        
    def re_ranking(self, query, initial_results):
        
        pairs = [[query, item["text"]] for item in initial_results]
        rerank_scores = self.re_ranker.predict(pairs)
        
        re_ranked = []
        for i, item in enumerate(initial_results):
            re_ranked.append(
                {
                    "text" : item["text"],
                    "index": item["index"],
                    "initial_score": item["score"],
                    "rerank_score": float(rerank_scores[i])
                }
            )
        re_ranked.sort(key=lambda x : x["rerank_score"], reverse=True)
        return re_ranked