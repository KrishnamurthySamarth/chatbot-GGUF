from fastapi import FastAPI
from services.chat_model import ChatPhi
from pydantic import BaseModel

app = FastAPI()
model = ChatPhi()

class ChatRequest(BaseModel):
    message : str
    re_ranked : bool
    compare : bool
    

app.get("/chat")
def chatbot(request : ChatRequest):
    message = request.message
    re_ranked = request.re_ranked
    to_be_compared = request.compare
    
    

app.post("/process_pdf")
def pdf_process():
    pass
    