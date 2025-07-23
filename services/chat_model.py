import httpx
import asyncio
import json


class ChatPhi():
    
    def __init__(self, store):
        self.ollama_server = "http://localhost:11434/api/generate"
        self.store = store
        self.model = "rave"
    
    
    async def _send_request(self, query : str, context : str, label : str):
        
        prompt = f"<|user|>\nUse context to answer below question : {context} \n Question : {query}<|end|>\n<|assistant|>"
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": True
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", self.ollama_server, json=payload) as response:
                    
                    if response.status_code != 200:
                        response_text = await response.aread()
                        return

                    async for line in response.aiter_lines():               
                        if line.strip():  
                            try:
                                result = json.loads(line)
                                
                                response_text = result.get("response", "")
                                if response_text:
                                    print(f"[yielding-{label}]: '{response_text}'")
                                    yield response_text
                                
                                if result.get("done", False):
                                    break
                                    
                            except json.JSONDecodeError as e:
                                print(f"JSON decode error [{label}]:", e)
                    
                    
        except Exception as e:
            import traceback
            traceback.print_exc()
    
    async def run_parallel(self, query : str):     
        
        initial = self.store.search_store(query=query)
        
        re_ranked = self.store.re_ranking(query=query, initial_results=initial)

        ctx_plain = initial[:2] if initial else []
        ctx_reranked = re_ranked[:2] if re_ranked else []
        
        plain_response = self._send_request(query=query, context=ctx_plain, label="plain")
        re_ranked_response = self._send_request(query=query, context=ctx_reranked, label="re-ranked")
        
        plain_text = ""
        rerank_text = ""
        
        done_plain = False
        done_rerank = False

        while not (done_plain and done_rerank):
            
            plain_chunk = ""
            rerank_chunk = ""
            
            if not done_plain:
                try:
                    plain_chunk = await asyncio.wait_for(plain_response.__anext__(), timeout=2.0)
                    plain_text += plain_chunk
                except StopAsyncIteration:
                    done_plain = True
                except asyncio.TimeoutError:
                    print("Plain response timeout")
                except Exception as e:
                    done_plain = True

            if not done_rerank:
                try:
                    rerank_chunk = await asyncio.wait_for(re_ranked_response.__anext__(), timeout=2.0)
                    rerank_text += rerank_chunk
                    
                except StopAsyncIteration:
                    done_rerank = True
                except asyncio.TimeoutError:
                    print("Rerank response timeout")
                except Exception as e:
                    done_rerank = True

            if not plain_chunk and not rerank_chunk:
                await asyncio.sleep(0.1)
                continue

            result = {
                "plain": plain_text,
                "re-ranked": rerank_text
            }
            yield result
        