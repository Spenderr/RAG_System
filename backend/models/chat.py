from typing import List, Optional
from pydantic import BaseModel


class ChatMessage(BaseModel):
    message: str


class ExecuteActionRequest(BaseModel):
    action_type: str = "delete_confirmation"
    action_id: Optional[str] = None
    target_org_id: Optional[str] = None
    target_folder: Optional[str] = None
    target_filenames: List[str] = []
    delete_folder: bool = True

