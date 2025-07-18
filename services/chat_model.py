from llama_cpp import Llama
from dotenv import load_dotenv
import os
from services.vector_stores import FaissStore

load_dotenv()
store = FaissStore()

class ChatPhi():
    
    def __init__(self):
        self.llm = Llama(
                model_path=os.getenv("model_path"),
                n_ctx=256,
                n_threads=12,
                n_batch=1024,
                use_mmap=True,
                use_mlock=True, 
            )

    def get_response(self, query : str, re_rank : bool):
        intial_content = store.search_store(query=query)
        context = store.re_ranker(intial_content)
        for chunk in self.llm(
            f"<|user|>\nUse context to answer below question : {context} /n Question : {query}<|end|>\n<|assistant|>", 
            max_tokens=500, 
            temperature=0, 
            stream=True
            ):
            print(chunk["choices"][0]["text"], end="", flush=True)
