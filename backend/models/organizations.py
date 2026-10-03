from typing import List, Optional
from pydantic import BaseModel


class CreateOrgRequest(BaseModel):
    name: str
    description: str = ""
    color: str = "#6366f1"
    tags: List[str] = []
    folders: List[str] = []


class UpdateOrgRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    tags: Optional[List[str]] = None
    folders: Optional[List[str]] = None


class FolderCreateRequest(BaseModel):
    name: str


class FolderDeleteRequest(BaseModel):
    name: str

