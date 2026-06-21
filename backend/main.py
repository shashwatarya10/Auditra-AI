from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from report_generator import generate_pdf

from pdf_parser import (
    extract_text_from_pdf,
    pdf_to_image
)

from llm_service import (
    analyze_invoice,
    analyze_invoice_image
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {
        "message": "Auditra Backend Running"
    }


@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...),
    language: str = Form("en")
):

    file_bytes = await file.read()

    filename = file.filename.lower()

    print(f"LANGUAGE: {language}")

    # IMAGE FILES
    if filename.endswith(
        (".jpg", ".jpeg", ".png")
    ):

        print("IMAGE DETECTED")
        print("SENDING TO GEMINI VISION")

        result = analyze_invoice_image(
            file_bytes,
            language
        )

        print("GEMINI RESPONSE RECEIVED")

        return result

    # PDF FILES
    text = extract_text_from_pdf(
        file_bytes
    )

    print("========== PDF TEXT ==========")
    print(text[:3000])
    print("========== END ==========")

    # TEXT PDF
    if text.strip():

        print("TEXT PDF DETECTED")

        result = analyze_invoice(
            text,
            language
        )

        return result

    # SCANNED PDF
    print("SCANNED PDF DETECTED")

    image_bytes = pdf_to_image(
        file_bytes
    )

    print("SENDING TO GEMINI VISION")

    result = analyze_invoice_image(
        image_bytes,
        language
    )

    print("GEMINI RESPONSE RECEIVED")

    return result

@app.post("/download-report")
async def download_report(data: dict):

    print("========== DOWNLOAD REQUEST ==========")
    print(data)
    print("======================================")

    result = data["result"]

    filename = "Auditra_Report.pdf"

    print("GENERATING PDF REPORT")

    generate_pdf(
        result,
        filename
    )

    print("PDF GENERATED SUCCESSFULLY")

    return FileResponse(
        path=filename,
        media_type="application/pdf",
        filename=filename
    )


