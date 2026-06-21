import fitz

def extract_text_from_pdf(pdf_bytes):

    doc = fitz.open(
        stream=pdf_bytes,
        filetype="pdf"
    )

    print("Pages:", len(doc))

    text = ""

    for i, page in enumerate(doc):
        page_text = page.get_text()

        print(f"Page {i+1} chars:", len(page_text))

        text += page_text

    return text

def pdf_to_image(pdf_bytes):

    doc = fitz.open(
        stream=pdf_bytes,
        filetype="pdf"
    )

    page = doc[0]

    pix = page.get_pixmap(
    matrix=fitz.Matrix(2, 2)
    )

    image_bytes = pix.tobytes("png")

    return image_bytes