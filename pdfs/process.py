import pymupdf4llm
import os

def get_text_from_pdf():
    path = os.path.join(os.getcwd(), "data", "pdf")
    md_text = pymupdf4llm.to_markdown(path)
    text_path = "/text_from_pdf"
    with open(text_path) as f:
        f.write(md_text)
    return text_path

