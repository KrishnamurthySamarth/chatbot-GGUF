from fastapi import FastAPI, UploadFile, Form, File, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from services.chat_model import ChatPhi
from services.pdf_process import get_text_from_pdf
from services.vector_stores import FaissStore
from pydantic import BaseModel
import shutil
import os

app = FastAPI()
store = FaissStore()
model = ChatPhi(store=store)


templates = Jinja2Templates(directory="templates")

class ChatRequest(BaseModel):
    message : str
    re_ranked : bool
    compare : bool

@app.get("/", response_class=HTMLResponse)
def upload_form(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/chat")
def chatbot(request : ChatRequest):
    message = request.message
    re_ranked = request.re_ranked
    to_be_compared = request.compare 
    model.get_response(query=message, re_rank=re_ranked)
    
@app.post("/process_pdf")
def pdf_process(pdf_file: UploadFile = File(...)):
    upload_dir = "data"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, "uploaded.pdf")

    with open(file_path, "wb") as f:
        shutil.copyfileobj(pdf_file.file, f)
        
    print("extracting text")
    get_text_from_pdf("data/uploaded.pdf")
    print("Storing")
    store.insert_documents()
    