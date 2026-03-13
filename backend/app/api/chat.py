from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from pathlib import Path
import sys

router = APIRouter(prefix="/api/chat", tags=["chat"])


def get_base_dir() -> Path:
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent
    return Path(__file__).parent.parent.parent.parent


def get_config():
    config_path = get_base_dir() / "config.json"
    if not config_path.exists():
        return {}
    with open(config_path, "r") as f:
        return json.load(f)


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class ChatRequest(BaseModel):
    list_name: str
    item_context: dict
    messages: list[ChatMessage]
    model: str | None = None


class ChatResponse(BaseModel):
    message: str
    model: str


class GeminiModelInfo(BaseModel):
    id: str
    name: str


@router.post("", response_model=ChatResponse)
async def chat_with_item(request: ChatRequest):
    """Send a chat message about a list item to Gemini."""
    config = get_config()
    api_key = config.get("gemini_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API key not configured. Please set it in System Settings.")

    model_name = request.model or config.get("gemini_model") or "gemini-2.0-flash"

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        # Build context about the item
        context_lines = [f"List: {request.list_name}"]
        for col_name, value in request.item_context.items():
            context_lines.append(f"  {col_name}: {value}")
        item_context_str = "\n".join(context_lines)

        system_instruction = (
            "You are a helpful assistant. The user is asking about a specific item from their list management app. "
            "Here is the item data:\n\n"
            f"{item_context_str}\n\n"
            "Answer the user's questions about this item. Be concise and helpful. "
            "If the user asks something unrelated to the item, you can still help but keep the item context in mind."
        )

        model = genai.GenerativeModel(
            model_name=model_name,
            system_instruction=system_instruction,
        )

        # Build conversation history for Gemini
        history = []
        for msg in request.messages[:-1]:  # All except the last (current) message
            role = "user" if msg.role == "user" else "model"
            history.append({"role": role, "parts": [msg.content]})

        chat = model.start_chat(history=history)

        # Send the latest user message
        last_message = request.messages[-1].content if request.messages else ""
        response = chat.send_message(last_message)

        return ChatResponse(
            message=response.text,
            model=model_name,
        )

    except ImportError:
        raise HTTPException(status_code=500, detail="google-generativeai package is not installed.")
    except Exception as e:
        error_msg = str(e)
        if "API_KEY_INVALID" in error_msg or "PERMISSION_DENIED" in error_msg:
            raise HTTPException(status_code=401, detail="Invalid Gemini API key. Please check your key in System Settings.")
        raise HTTPException(status_code=500, detail=f"Gemini API error: {error_msg}")


@router.get("/models", response_model=list[GeminiModelInfo])
async def list_gemini_models():
    """List available Gemini models."""
    config = get_config()
    api_key = config.get("gemini_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API key not configured.")

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)

        models = []
        for model in genai.list_models():
            if "generateContent" in (model.supported_generation_methods or []):
                model_id = model.name.replace("models/", "")
                models.append(GeminiModelInfo(
                    id=model_id,
                    name=model.display_name or model_id,
                ))
        return models

    except ImportError:
        raise HTTPException(status_code=500, detail="google-generativeai package is not installed.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list models: {str(e)}")
