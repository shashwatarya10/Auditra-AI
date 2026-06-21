import google.generativeai as genai
import os
import json
from dotenv import load_dotenv
from PIL import Image
import io

load_dotenv()

genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)

# Fastest/cheapest first. Pro is the slowest model in this family and is
# overkill for a structured-extraction task — it's now the last-resort
# fallback only, not the default path.
MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
]

# Keep output tight. The JSON schema we ask for is small and bounded — the
# model doesn't need thousands of tokens of headroom, and every extra
# allowed token is extra latency if the model decides to use it.
GENERATION_CONFIG = {
    "temperature": 0.15,      # deterministic extraction, not creative writing
    "max_output_tokens": 1536,
    "response_mime_type": "application/json",  # ask Gemini to return raw JSON directly
}

# Per-call timeout (seconds). If a model is slow rather than erroring out,
# this forces a fast fail so we fall through to the next model instead of
# hanging on a stuck request.
REQUEST_TIMEOUT_SECONDS = 20

# Reuse model clients instead of constructing a new one on every call/loop
# iteration.
_MODEL_CACHE = {}


def _get_model(model_name):
    if model_name not in _MODEL_CACHE:
        _MODEL_CACHE[model_name] = genai.GenerativeModel(
            model_name,
            generation_config=GENERATION_CONFIG,
        )
    return _MODEL_CACHE[model_name]


def clean_json(text):

    text = text.replace("```json", "")
    text = text.replace("```", "")
    text = text.strip()

    start = text.find("{")
    end = text.rfind("}") + 1

    text = text[start:end]

    return json.loads(text)


def fallback_response():

    return {
        "risk_score": 0,
        "amount_at_risk": 0,
        "confidence_score": 0,
        "risk_level": "Unavailable",
        "summary": "AI service unavailable or quota exceeded.",
        "risk_breakdown": {
            "gst_risk": 0,
            "duplicate_risk": 0,
            "vendor_risk": 0,
            "compliance_risk": 0
        },
        "recommendations": [
            "Retry after a few minutes."
        ],
        "anomalies": []
    }


def _resize_image_for_model(image, max_dimension=1600):
    """
    Downscale large invoice scans before sending to Gemini. Invoice text
    stays legible well below typical phone-camera/scan resolution, and
    smaller images upload and process faster with no real accuracy loss
    for this use case.
    """
    width, height = image.size
    longest_side = max(width, height)

    if longest_side <= max_dimension:
        return image

    scale = max_dimension / float(longest_side)
    new_size = (int(width * scale), int(height * scale))

    return image.resize(new_size, Image.LANCZOS)


def generate_with_fallback(prompt, image=None):

    for model_name in MODELS:

        try:

            print(f"TRYING MODEL: {model_name}")

            model = _get_model(model_name)

            contents = [prompt, image] if image else prompt

            response = model.generate_content(
                contents,
                request_options={"timeout": REQUEST_TIMEOUT_SECONDS},
            )

            print(
                f"SUCCESS USING: {model_name}"
            )

            return response.text

        except Exception as e:

            print(
                f"FAILED MODEL: {model_name}"
            )

            print(str(e))

            continue

    return json.dumps(
        fallback_response()
    )


def analyze_invoice(
    invoice_text,
    language="en"
):

    prompt = f"""
You are Auditra AI.

Analyze the following invoice.

Detect:

- GST mismatches
- Duplicate charges
- Vendor fraud indicators
- Suspicious pricing
- Compliance risks
- Overbilling
- Missing information

Return all explanations in {language} language.

Return ONLY valid JSON. No markdown, no preamble, no explanation outside the JSON.

{{
  "risk_score": 0,
  "amount_at_risk": 0,
  "confidence_score": 0,
  "risk_level": "",
  "summary": "",

  "risk_breakdown": {{
    "gst_risk": 0,
    "duplicate_risk": 0,
    "vendor_risk": 0,
    "compliance_risk": 0
  }},

  "recommendations": [],

  "anomalies": [
    {{
      "severity": "",
      "issue": "",
      "reason": ""
    }}
  ]
}}

Invoice:

{invoice_text}
"""

    text = generate_with_fallback(
        prompt
    )

    print("========== GEMINI TEXT RESPONSE ==========")
    print(text)
    print("==========================================")

    return clean_json(text)


def analyze_invoice_image(
    image_bytes,
    language="en"
):

    image = Image.open(
        io.BytesIO(image_bytes)
    )

    image = _resize_image_for_model(image)

    prompt = f"""
You are Auditra AI.

Analyze this invoice image.

Detect:

- GST mismatches
- Duplicate charges
- Vendor fraud indicators
- Suspicious pricing
- Compliance risks
- Overbilling
- Missing information

Return all explanations in {language} language.

Return ONLY valid JSON. No markdown, no preamble, no explanation outside the JSON.

{{
  "risk_score": 0,
  "amount_at_risk": 0,
  "confidence_score": 0,
  "risk_level": "",
  "summary": "",

  "risk_breakdown": {{
    "gst_risk": 0,
    "duplicate_risk": 0,
    "vendor_risk": 0,
    "compliance_risk": 0
  }},

  "recommendations": [],

  "anomalies": [
    {{
      "severity": "",
      "issue": "",
      "reason": ""
    }}
  ]
}}
"""

    text = generate_with_fallback(
        prompt,
        image
    )

    print("========== GEMINI IMAGE RESPONSE ==========")
    print(text)
    print("===========================================")

    return clean_json(text)