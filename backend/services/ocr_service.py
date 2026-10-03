import base64
from pathlib import Path
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI


async def extract_text_from_image(file_path: Path) -> str:
    """
    Extract and transcribe text, numbers, tables, and content from images
    using GPT-4o-mini Vision (Multimodal OCR).
    """
    try:
        ext = file_path.suffix.lower().lstrip(".")
        mime_type = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"

        with open(file_path, "rb") as image_file:
            base64_image = base64.b64encode(image_file.read()).decode("utf-8")

        llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        message = HumanMessage(
            content=[
                {
                    "type": "text",
                    "text": (
                        "Transcribe and extract all text, data, numbers, headers, and tables from this image accurately. "
                        "If there are tables, receipts, or invoices, format them cleanly using Markdown tables and bullet points. "
                        "Maintain the original language and phrasing. Return ONLY the transcribed content without introduction or commentary."
                    ),
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{mime_type};base64,{base64_image}",
                    },
                },
            ]
        )

        response = await llm.ainvoke([message])
        extracted = response.content.strip()
        return extracted if extracted else "No readable text detected in image."
    except Exception as e:
        print(f"[ocr_service] Error processing image {file_path}: {e}")
        return f"Error extracting text from image: {str(e)}"
