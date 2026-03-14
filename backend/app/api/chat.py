from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import json
from pathlib import Path
import sys
import httpx

from app.logger import get_logger

router = APIRouter(prefix="/api/chat", tags=["chat"])
log = get_logger("listabob.chat")

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"


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

    # Build item context string
    context_lines = []
    for col_name, value in request.item_context.items():
        context_lines.append(f"  {col_name}: {value}")
    item_context_str = "\n".join(context_lines)

    # Use configurable system prompt or default
    DEFAULT_SYSTEM_PROMPT = (
        "You are a helpful assistant. The user is asking about a specific item "
        "from their list management app.\n\n"
        "List: {list_name}\n"
        "Item data:\n{item_context_str}\n\n"
        "Answer the user's questions about this item. Be concise and helpful. "
        "If the user asks something unrelated to the item, you can still help "
        "but keep the item context in mind."
    )
    prompt_template = config.get("gemini_system_prompt") or DEFAULT_SYSTEM_PROMPT
    system_instruction = prompt_template.replace(
        "{list_name}", request.list_name
    ).replace(
        "{item_context_str}", item_context_str
    )

    # Build Gemini REST payload
    # All messages except the last go into contents history
    contents = []
    for msg in request.messages[:-1]:
        role = "user" if msg.role == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg.content}]})

    last_message = request.messages[-1].content if request.messages else ""
    contents.append({"role": "user", "parts": [{"text": last_message}]})

    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": contents,
        "generationConfig": {"candidateCount": 1},
    }

    log.info(
        "CHAT REQUEST  list=%r  model=%s  history_turns=%d",
        request.list_name, model_name, len(contents) - 1,
    )
    log.debug("SYSTEM PROMPT:\n%s", system_instruction)
    log.debug("USER MESSAGE:\n%s", last_message)

    url = f"{GEMINI_BASE_URL}/models/{model_name}:generateContent"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, params={"key": api_key}, json=payload)

        if resp.status_code == 400:
            detail = resp.json().get("error", {}).get("message", "Bad request")
            log.error("CHAT ERROR 400  model=%s  detail=%s", model_name, detail)
            raise HTTPException(status_code=400, detail=detail)

        if resp.status_code == 401 or resp.status_code == 403:
            log.error("CHAT ERROR auth  model=%s  status=%d", model_name, resp.status_code)
            raise HTTPException(status_code=401, detail="Invalid Gemini API key. Please check your key in System Settings.")

        if resp.status_code != 200:
            error_msg = resp.text[:300]
            log.error("CHAT ERROR %d  model=%s  body=%s", resp.status_code, model_name, error_msg)
            raise HTTPException(status_code=500, detail=f"Gemini API error ({resp.status_code}): {error_msg}")

        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]

        log.info("CHAT RESPONSE  model=%s  chars=%d", model_name, len(text))
        log.debug("ASSISTANT RESPONSE:\n%s", text)

        return ChatResponse(message=text, model=model_name)

    except httpx.TimeoutException:
        log.error("CHAT TIMEOUT  model=%s", model_name)
        raise HTTPException(status_code=504, detail="Request to Gemini timed out.")
    except httpx.RequestError as e:
        log.error("CHAT NETWORK ERROR  model=%s  error=%s", model_name, str(e))
        raise HTTPException(status_code=502, detail=f"Network error reaching Gemini: {str(e)}")


@router.get("/models", response_model=list[GeminiModelInfo])
async def list_gemini_models():
    """List available Gemini models."""
    config = get_config()
    api_key = config.get("gemini_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API key not configured.")

    url = f"{GEMINI_BASE_URL}/models"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params={"key": api_key})

        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Failed to list models: {resp.text[:200]}")

        data = resp.json()
        models = []
        for m in data.get("models", []):
            if "generateContent" in m.get("supportedGenerationMethods", []):
                model_id = m["name"].replace("models/", "")
                models.append(GeminiModelInfo(
                    id=model_id,
                    name=m.get("displayName") or model_id,
                ))
        return models

    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Network error: {str(e)}")


class CompletionRequest(BaseModel):
    list_name: str
    item_context: dict  # column_name -> value for all existing data
    target_column: str
    column_type: str
    column_config: dict | None = None  # e.g. {"choices": [...]} for choice columns
    model: str | None = None


class CompletionResponse(BaseModel):
    value: str | None
    model: str


@router.post("/complete", response_model=CompletionResponse)
async def complete_column_value(request: CompletionRequest):
    """Use AI to determine the value for a specific column on an item."""
    config = get_config()
    api_key = config.get("gemini_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API key not configured. Please set it in System Settings.")

    model_name = request.model or config.get("gemini_model") or "gemini-2.0-flash"

    # Build item context
    context_lines = []
    for col_name, value in request.item_context.items():
        context_lines.append(f"  {col_name}: {value}")
    item_context_str = "\n".join(context_lines)

    # Build choice hints if applicable
    choice_hint = ""
    if request.column_type in ("choice", "multiple_choice") and request.column_config:
        choices = request.column_config.get("choices", [])
        if choices:
            choice_hint = f"- Known options for this column: {', '.join(str(c) for c in choices)}\n"
            choice_hint += "  You may also suggest a new option if none of the existing ones fit.\n"

    system_instruction = (
        "You are a data completion assistant. The user has a list called "
        f"\"{request.list_name}\" with items that have various columns.\n\n"
        "Your job is to determine the most likely value for a specific column "
        "based on the other data in the item.\n\n"
        "Rules:\n"
        "- Respond with ONLY the value, nothing else. No explanation, no quotes, no prefix.\n"
        "- If you cannot determine the value with reasonable confidence, respond with exactly: UNKNOWN\n"
        f"- The column type is \"{request.column_type}\", so respond with an appropriate value for that type.\n"
        "- For date/datetime types, use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS).\n"
        "- For boolean types, respond with true or false.\n"
        "- For number/currency types, respond with just the number.\n"
        "- For rating types, respond with a number.\n"
        "- For multiple_choice types, respond with a comma-separated list of values (e.g. Action,Drama,Thriller).\n"
        + choice_hint
    )

    user_message = (
        f"Here is an item from the list \"{request.list_name}\":\n"
        f"{item_context_str}\n\n"
        f"What should the value of \"{request.target_column}\" be?"
    )

    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": user_message}]}],
        "generationConfig": {"candidateCount": 1, "temperature": 0.1},
    }

    log.info(
        "COMPLETION REQUEST  list=%r  column=%r  model=%s",
        request.list_name, request.target_column, model_name,
    )
    log.debug("COMPLETION CONTEXT:\n%s", item_context_str)

    url = f"{GEMINI_BASE_URL}/models/{model_name}:generateContent"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, params={"key": api_key}, json=payload)

        if resp.status_code == 401 or resp.status_code == 403:
            raise HTTPException(status_code=401, detail="Invalid Gemini API key.")

        if resp.status_code != 200:
            error_msg = resp.text[:300]
            log.error("COMPLETION ERROR %d  model=%s  body=%s", resp.status_code, model_name, error_msg)
            raise HTTPException(status_code=500, detail=f"Gemini API error ({resp.status_code})")

        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"].strip()

        log.info("COMPLETION RESPONSE  column=%r  value=%r  model=%s", request.target_column, text, model_name)

        if text.upper() == "UNKNOWN":
            return CompletionResponse(value=None, model=model_name)

        return CompletionResponse(value=text, model=model_name)

    except httpx.TimeoutException:
        log.error("COMPLETION TIMEOUT  model=%s", model_name)
        raise HTTPException(status_code=504, detail="Request to Gemini timed out.")
    except httpx.RequestError as e:
        log.error("COMPLETION NETWORK ERROR  model=%s  error=%s", model_name, str(e))
        raise HTTPException(status_code=502, detail=f"Network error: {str(e)}")


class TargetColumnInfo(BaseModel):
    name: str
    column_type: str
    config: dict | None = None  # e.g. {"choices": [...]} for choice/multiple_choice


class ItemCompletionRequest(BaseModel):
    list_name: str
    item_context: dict  # column_name -> value
    target_columns: list[TargetColumnInfo]
    model: str | None = None
    additional_prompt: str | None = None


class ItemCompletionResponse(BaseModel):
    values: dict[str, str | list[str] | None]  # column_name -> value (list for multiple_choice)
    model: str


@router.post("/complete-item", response_model=ItemCompletionResponse)
async def complete_item_columns(request: ItemCompletionRequest):
    """Use AI to fill multiple columns on a single item."""
    config = get_config()
    api_key = config.get("gemini_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API key not configured. Please set it in System Settings.")

    if not request.target_columns:
        raise HTTPException(status_code=400, detail="No target columns provided.")

    model_name = request.model or config.get("gemini_model") or "gemini-2.0-flash"

    # Build item context
    context_lines = []
    for col_name, value in request.item_context.items():
        context_lines.append(f"  {col_name}: {value}")
    item_context_str = "\n".join(context_lines)

    # Build column descriptions
    col_descriptions = []
    for tc in request.target_columns:
        desc = f'- "{tc.name}" (type: {tc.column_type})'
        if tc.column_type == "choice" and tc.config and tc.config.get("choices"):
            choices = tc.config["choices"]
            desc += f'\n  Valid options: {", ".join(str(c) for c in choices)}'
            desc += "\n  You may also suggest a new option if none of the existing ones fit."
        elif tc.column_type == "multiple_choice" and tc.config and tc.config.get("choices"):
            choices = tc.config["choices"]
            desc += f'\n  Valid options: {", ".join(str(c) for c in choices)}'
            desc += "\n  Return a JSON array of strings. You may suggest new options if needed."
        elif tc.column_type == "multiple_choice":
            desc += "\n  Return a JSON array of strings."
        elif tc.column_type in ("date", "datetime"):
            desc += "\n  Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)."
        elif tc.column_type == "boolean":
            desc += "\n  Use true or false."
        elif tc.column_type in ("number", "currency", "rating"):
            desc += "\n  Use a number."
        col_descriptions.append(desc)

    columns_str = "\n".join(col_descriptions)
    col_names = [tc.name for tc in request.target_columns]

    system_instruction = (
        f'You are a data completion assistant for a list called "{request.list_name}".\n\n'
        "Your job is to determine the most likely values for the specified columns "
        "based on the other data in the item.\n\n"
        "Target columns to fill:\n"
        f"{columns_str}\n\n"
        "Rules:\n"
        f"- Respond with ONLY a valid JSON object with keys: {col_names}\n"
        "- Use null (JSON null) for any column you cannot determine with reasonable confidence.\n"
        "- For multiple_choice columns, the value MUST be a JSON array of strings.\n"
        "- For all other columns, the value should be a single string, number, or boolean as appropriate.\n"
        "- No explanation, no markdown fences, no extra text — just the JSON object.\n"
    )

    if request.additional_prompt:
        system_instruction += f"\nAdditional instructions from the user:\n{request.additional_prompt}\n"

    user_message = (
        f'Here is an item from the list "{request.list_name}":\n'
        f"{item_context_str}\n\n"
        f"What should the values be for: {', '.join(col_names)}?"
    )

    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": user_message}]}],
        "generationConfig": {"candidateCount": 1, "temperature": 0.1},
    }

    log.info(
        "ITEM COMPLETION REQUEST  list=%r  columns=%r  model=%s",
        request.list_name, col_names, model_name,
    )
    log.debug("ITEM COMPLETION CONTEXT:\n%s", item_context_str)

    url = f"{GEMINI_BASE_URL}/models/{model_name}:generateContent"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, params={"key": api_key}, json=payload)

        if resp.status_code == 401 or resp.status_code == 403:
            raise HTTPException(status_code=401, detail="Invalid Gemini API key.")

        if resp.status_code != 200:
            error_msg = resp.text[:300]
            log.error("ITEM COMPLETION ERROR %d  model=%s  body=%s", resp.status_code, model_name, error_msg)
            raise HTTPException(status_code=500, detail=f"Gemini API error ({resp.status_code})")

        data = resp.json()
        raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()

        log.info("ITEM COMPLETION RESPONSE  model=%s  raw=%r", model_name, raw[:300])

        # Parse JSON object from the response
        try:
            import json as jsonlib
            clean = raw.strip()
            if clean.startswith("```"):
                clean = "\n".join(clean.split("\n")[1:])
            if clean.endswith("```"):
                clean = "\n".join(clean.split("\n")[:-1])
            parsed = jsonlib.loads(clean.strip())
            if not isinstance(parsed, dict):
                raise ValueError("Response is not a JSON object")

            # Normalise values
            result: dict[str, str | list[str] | None] = {}
            for tc in request.target_columns:
                val = parsed.get(tc.name)
                if val is None:
                    result[tc.name] = None
                elif tc.column_type == "multiple_choice":
                    if isinstance(val, list):
                        result[tc.name] = [str(v) for v in val]
                    elif isinstance(val, str):
                        # Try to parse as JSON array, otherwise split by comma
                        try:
                            arr = jsonlib.loads(val)
                            result[tc.name] = [str(v) for v in arr] if isinstance(arr, list) else [val]
                        except Exception:
                            result[tc.name] = [v.strip() for v in val.split(",") if v.strip()]
                    else:
                        result[tc.name] = [str(val)]
                else:
                    result[tc.name] = str(val)
        except Exception as parse_err:
            log.error("ITEM COMPLETION PARSE ERROR  raw=%r  err=%s", raw[:200], parse_err)
            raise HTTPException(status_code=500, detail=f"Could not parse model response as JSON object: {raw[:100]}")

        return ItemCompletionResponse(values=result, model=model_name)

    except httpx.TimeoutException:
        log.error("ITEM COMPLETION TIMEOUT  model=%s", model_name)
        raise HTTPException(status_code=504, detail="Request to Gemini timed out.")
    except httpx.RequestError as e:
        log.error("ITEM COMPLETION NETWORK ERROR  model=%s  error=%s", model_name, str(e))
        raise HTTPException(status_code=502, detail=f"Network error: {str(e)}")


class BatchCompletionRequest(BaseModel):
    list_name: str
    items: list[dict]  # each: { "item_context": {col_name: value, ...} }
    target_column: str
    column_type: str
    column_config: dict | None = None  # e.g. {"choices": [...]} for choice columns
    model: str | None = None


class BatchCompletionResponse(BaseModel):
    values: list[str | None]  # one entry per item, None = unknown
    model: str


@router.post("/complete-batch", response_model=BatchCompletionResponse)
async def complete_column_batch(request: BatchCompletionRequest):
    """Use AI to fill a column for multiple items in a single API call."""
    config = get_config()
    api_key = config.get("gemini_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Gemini API key not configured. Please set it in System Settings.")

    if not request.items:
        raise HTTPException(status_code=400, detail="No items provided.")

    model_name = request.model or config.get("gemini_model") or "gemini-2.0-flash"
    n = len(request.items)

    # Build choice hints if applicable
    choice_hint = ""
    if request.column_type in ("choice", "multiple_choice") and request.column_config:
        choices = request.column_config.get("choices", [])
        if choices:
            choice_hint = f"- Known options for this column: {', '.join(str(c) for c in choices)}\n"
            choice_hint += "  You may also suggest new options if none of the existing ones fit.\n"
    if request.column_type == "multiple_choice":
        choice_hint += "- For multiple_choice, return a comma-separated list of values (e.g. Action,Drama,Thriller) as a JSON string.\n"

    system_instruction = (
        f"You are a data completion assistant for a list called \"{request.list_name}\".\n\n"
        f"You will be given {n} item(s). For each one, determine the most likely value for "
        f"the \"{request.target_column}\" column (type: {request.column_type}).\n\n"
        "Rules:\n"
        f"- Respond with ONLY a valid JSON array of exactly {n} value(s), one per item, in order.\n"
        "- Use null (JSON null, not the string 'null') for any item where you cannot determine the value.\n"
        "- No explanation, no markdown fences, no extra text — just the JSON array.\n"
        "- For date/datetime types, use ISO format (YYYY-MM-DD).\n"
        "- For boolean types, use JSON true or false (not strings).\n"
        "- For number/currency/rating types, use a JSON number.\n"
        + choice_hint +
        f"Example for {n} item(s): {repr([None] * n).replace('None', 'null')}\n"
    )

    # Build the user message listing all items
    item_blocks = []
    for i, item in enumerate(request.items, 1):
        lines = [f"Item {i}:"]
        for col_name, value in item.get("item_context", {}).items():
            lines.append(f"  {col_name}: {value}")
        item_blocks.append("\n".join(lines))

    user_message = (
        f"Here are {n} items from \"{request.list_name}\".\n"
        f"What should the \"{request.target_column}\" value be for each one?\n\n"
        + "\n\n".join(item_blocks)
    )

    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"role": "user", "parts": [{"text": user_message}]}],
        "generationConfig": {"candidateCount": 1, "temperature": 0.1},
    }

    log.info(
        "BATCH COMPLETION REQUEST  list=%r  column=%r  batch_size=%d  model=%s",
        request.list_name, request.target_column, n, model_name,
    )
    log.debug("BATCH USER MESSAGE:\n%s", user_message)

    url = f"{GEMINI_BASE_URL}/models/{model_name}:generateContent"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, params={"key": api_key}, json=payload)

        if resp.status_code == 401 or resp.status_code == 403:
            raise HTTPException(status_code=401, detail="Invalid Gemini API key.")

        if resp.status_code != 200:
            error_msg = resp.text[:300]
            log.error("BATCH COMPLETION ERROR %d  model=%s  body=%s", resp.status_code, model_name, error_msg)
            raise HTTPException(status_code=500, detail=f"Gemini API error ({resp.status_code})")

        data = resp.json()
        raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()

        log.info("BATCH COMPLETION RESPONSE  column=%r  model=%s  raw=%r", request.target_column, model_name, raw[:200])

        # Parse the JSON array from the response
        try:
            import json as jsonlib
            # Strip markdown fences if the model adds them despite instructions
            clean = raw.strip()
            if clean.startswith("```"):
                clean = "\n".join(clean.split("\n")[1:])
            if clean.endswith("```"):
                clean = "\n".join(clean.split("\n")[:-1])
            values = jsonlib.loads(clean.strip())
            if not isinstance(values, list):
                raise ValueError("Response is not a JSON array")
            # Normalise: pad or trim to match n items, convert non-None to str
            values = values[:n] + [None] * max(0, n - len(values))
            normalised = [str(v) if v is not None else None for v in values]
        except Exception as parse_err:
            log.error("BATCH COMPLETION PARSE ERROR  raw=%r  err=%s", raw[:200], parse_err)
            raise HTTPException(status_code=500, detail=f"Could not parse model response as JSON array: {raw[:100]}")

        return BatchCompletionResponse(values=normalised, model=model_name)

    except httpx.TimeoutException:
        log.error("BATCH COMPLETION TIMEOUT  model=%s", model_name)
        raise HTTPException(status_code=504, detail="Request to Gemini timed out.")
    except httpx.RequestError as e:
        log.error("BATCH COMPLETION NETWORK ERROR  model=%s  error=%s", model_name, str(e))
        raise HTTPException(status_code=502, detail=f"Network error: {str(e)}")

