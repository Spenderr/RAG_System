from typing import List, Optional, Dict
from pydantic import BaseModel


class AssignDocRequest(BaseModel):
    org_id: str
    folder: Optional[str] = None
    tags: List[str] = []
    doc_type: Optional[str] = None


class MoveFolderRequest(BaseModel):
    folder: str


class RenameDocRequest(BaseModel):
    new_name: str


class CreateNoteRequest(BaseModel):
    title: str
    content: str
    org_id: Optional[str] = None
    folder: Optional[str] = None
    tags: Optional[List[str]] = []
    format_with_ai: Optional[bool] = False
    doc_type: Optional[str] = "note"


class BatchAnalyzeRequest(BaseModel):
    filenames: List[str]


class BatchCommitRequest(BaseModel):
    org_id: Optional[str] = None
    org_name: Optional[str] = None
    folder: Optional[str] = None
    tags: Optional[List[str]] = []
    file_renames: Dict[str, str] = {}


class BatchDeleteRequest(BaseModel):
    filenames: List[str]


class BatchMoveRequest(BaseModel):
    filenames: List[str]
    target_org_id: Optional[str] = None
    target_folder: Optional[str] = None

