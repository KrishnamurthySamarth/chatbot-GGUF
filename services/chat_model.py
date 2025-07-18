from llama_cpp import Llama
from dotenv import load_dotenv
import os
from services.vector_stores import FaissStore

load_dotenv()
class ChatPhi():
    
    def __init__(self, store):
        self.llm = Llama(
                model_path=os.getenv("model_path"),
                n_ctx=4000,
                n_threads=12,
                n_batch=1024,
                use_mmap=True,
                use_mlock=True, 
            )
        self.store = store

    def get_response(self, query : str, re_rank : bool):
        
        intial_content = self.store.search_store(query=query)
        
        if re_rank:
            re_rank_context = self.store.re_ranking(query=query, initial_results=intial_content)
            context = re_rank_context[:2]
        else:
            intial_content.sort(key=lambda x:x["score"], reverse=True)
            context = intial_content[:2]
            
            
        for chunk in self.llm(
            f"<|user|>\nUse context to answer below question : {context} /n Question : {query}<|end|>\n<|assistant|>", 
            max_tokens=500, 
            temperature=0, 
            stream=True
            ):
            print(chunk["choices"][0]["text"], end="", flush=True)
