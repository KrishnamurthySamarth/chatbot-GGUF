import httpx
import asyncio
import json


class ChatPhi():
    
    def __init__(self, store):
        self.ollama_server = "http://localhost:11434/api/generate"
        self.store = store
        self.model = "rave"
    
    
    async def _send_request(self, query : str, context : str, label : str):
        
        prompt = f"<|user|>\nUse context to answer below question : {context} /n Question : {query}<|end|>\n<|assistant|>"
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": True
        }
        
        with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(self.ollama_server, json=payload)
            for line in response.iter_lines():
                if line:
                    try:
                        result = json.loads(line.decode("utf-8"))
                        chunk = result.get("response", "")
                        print(f"from {label} : {chunk}", end="", flush=True)
                    except json.JSONDecodeError as e:
                        print(f"[JSON error]: {e}")
    
    async def run_parallel(self, query : str):
        
        initial = self.store.search_store(query=query)
        re_ranked = self.store.re_ranking(query=query, initial_results=initial)

        ctx_plain = initial[:2]
        ctx_reranked = re_ranked[:2]
        
        t1 = self._send_request(query=query, context=ctx_plain, label="plain")
        t2 = self._send_request(query=query, context=ctx_reranked, label="re-ranked")
        result_plain, result_rerank = await asyncio.gather(t1, t2)
        return {**result_plain, **result_rerank}
    
    
