from llama_cpp import Llama
from dotenv import load_dotenv
import os
import time

load_dotenv()

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
        
    def get_response(self, query : str, context : str):
        for chunk in self.llm(
            f"<|user|>\nUse context to answer below question : {context} /n Question : {query}<|end|>\n<|assistant|>", 
            max_tokens=100, 
            temperature=0, 
            stream=True
            ):
            print(chunk["choices"][0]["text"], end="", flush=True)
