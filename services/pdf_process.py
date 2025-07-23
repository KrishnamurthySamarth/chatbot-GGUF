import pymupdf4llm
import os

def get_text_from_pdf(path):
    
    md_text = pymupdf4llm.to_markdown(path)
    text_dir = "data"
    os.makedirs(text_dir, exist_ok=True)
    file_path = os.path.join(text_dir, "text_from_pdf.txt")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(md_text)
    return file_path

