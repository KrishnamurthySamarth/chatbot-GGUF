from fastapi import FastAPI, UploadFile, Form, File, Request
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from services.chat_model import ChatPhi
from services.pdf_process import get_text_from_pdf
from services.vector_stores import FaissStore
from pydantic import BaseModel
import shutil
import os
from fastapi.staticfiles import StaticFiles



app = FastAPI()
store = FaissStore()
model = ChatPhi(store=store)

templates = Jinja2Templates(directory="templates")
app.mount("/static", StaticFiles(directory="static"), name="static")

class ChatRequest(BaseModel):
    message : str

@app.get("/", response_class=HTMLResponse)
def upload_form(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/chat")
async def chatbot(request : ChatRequest):
    message = request.message
    return await model.run_parallel(query=message)
    
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
    