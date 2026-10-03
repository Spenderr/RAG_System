import re
import urllib.parse
from datetime import datetime
from typing import List
from fastapi import APIRouter, HTTPException

from database import organizations_db, processed_documents, save_organizations
from models.organizations import (
    CreateOrgRequest,
    UpdateOrgRequest,
    FolderCreateRequest,
    FolderDeleteRequest,
)

router = APIRouter(prefix="/api/organizations", tags=["Organizations"])


async def _do_delete_folder(org_id: str, raw_folder_name: str):
    """Helper to remove a folder from an organization and un-assign its docs."""
    if org_id not in organizations_db["organizations"]:
        raise HTTPException(status_code=404, detail="Organization not found")

    target_folder = urllib.parse.unquote(raw_folder_name).strip()
    org = organizations_db["organizations"][org_id]

    if "folders" in org:
        org["folders"] = [
            f for f in org["folders"]
            if f.strip() != target_folder and urllib.parse.unquote(f).strip() != target_folder
        ]

    for filename, assignment in organizations_db["document_assignments"].items():
        if assignment.get("org_id") == org_id:
            curr_folder = assignment.get("folder", "")
            if curr_folder and (curr_folder.strip() == target_folder or urllib.parse.unquote(curr_folder).strip() == target_folder):
                assignment["folder"] = ""

    save_organizations()
    return {"status": "deleted", "folder": target_folder}


@router.get("")
async def get_organizations():
    """List all organizations with their document counts and sub-folders."""
    result = []
    for org_id, org in organizations_db["organizations"].items():
        folders_set = set(org.get("folders", []))
        for assignment in organizations_db["document_assignments"].values():
            if assignment.get("org_id") == org_id and assignment.get("folder"):
                folders_set.add(assignment["folder"])

        doc_count = sum(
            1 for assignment in organizations_db["document_assignments"].values()
            if assignment.get("org_id") == org_id
        )
        result.append({
            "id": org_id,
            "name": org["name"],
            "description": org.get("description", ""),
            "color": org.get("color", "#6366f1"),
            "tags": org.get("tags", []),
            "folders": sorted(list(folders_set)),
            "document_count": doc_count,
            "created_at": org.get("created_at", ""),
            "is_system": org.get("is_system", False),
        })
    return result


@router.post("")
async def create_organization(body: CreateOrgRequest):
    """Create a new organization."""
    org_id = re.sub(r'[^a-z0-9_]', '_', body.name.lower().strip())
    base_id = org_id
    counter = 1
    while org_id in organizations_db["organizations"]:
        org_id = f"{base_id}_{counter}"
        counter += 1

    organizations_db["organizations"][org_id] = {
        "name": body.name.strip(),
        "description": body.description.strip(),
        "color": body.color,
        "tags": body.tags,
        "folders": body.folders,
        "created_at": datetime.now().isoformat(),
        "is_system": False,
    }
    save_organizations()
    return {"id": org_id, "name": body.name.strip(), "status": "created"}


@router.put("/{org_id}")
async def update_organization(org_id: str, body: UpdateOrgRequest):
    """Update an organization's metadata or folders."""
    if org_id not in organizations_db["organizations"]:
        raise HTTPException(status_code=404, detail="Organization not found")
    org = organizations_db["organizations"][org_id]
    if body.name is not None:
        org["name"] = body.name.strip()
    if body.description is not None:
        org["description"] = body.description.strip()
    if body.color is not None:
        org["color"] = body.color
    if body.tags is not None:
        org["tags"] = body.tags
    if body.folders is not None:
        org["folders"] = body.folders
    save_organizations()
    return {"status": "updated", "id": org_id}


@router.post("/{org_id}/folders")
async def create_org_folder(org_id: str, body: FolderCreateRequest):
    """Create a new folder/portfolio inside an organization."""
    if org_id not in organizations_db["organizations"]:
        raise HTTPException(status_code=404, detail="Organization not found")
    org = organizations_db["organizations"][org_id]
    if "folders" not in org:
        org["folders"] = []
    folder_name = body.name.strip()
    if folder_name and folder_name not in org["folders"]:
        org["folders"].append(folder_name)
        save_organizations()
    return {"status": "created", "folder": folder_name, "folders": org["folders"]}


@router.delete("/{org_id}/folders/{folder_name:path}")
async def delete_org_folder_path(org_id: str, folder_name: str):
    """Delete a folder/portfolio from an organization via path param."""
    return await _do_delete_folder(org_id, folder_name)


@router.post("/{org_id}/folders/delete")
async def delete_org_folder_post(org_id: str, body: FolderDeleteRequest):
    """Delete a folder/portfolio from an organization via POST body."""
    return await _do_delete_folder(org_id, body.name)


@router.delete("/{org_id}")
async def delete_organization(org_id: str):
    """Delete an organization and reassign its docs to Unassigned."""
    if org_id not in organizations_db["organizations"]:
        raise HTTPException(status_code=404, detail="Organization not found")
    if org_id == "__unassigned__":
        raise HTTPException(status_code=400, detail="Cannot delete system organization")

    for filename, assignment in organizations_db["document_assignments"].items():
        if assignment.get("org_id") == org_id:
            assignment["org_id"] = "__unassigned__"
            assignment["folder"] = ""

    del organizations_db["organizations"][org_id]
    save_organizations()
    return {"status": "deleted"}


@router.get("/{org_id}/documents")
async def get_org_documents(org_id: str):
    """Get all documents in an organization with their folder/portfolio."""
    if org_id not in organizations_db["organizations"]:
        raise HTTPException(status_code=404, detail="Organization not found")

    docs = []
    for filename, assignment in organizations_db["document_assignments"].items():
        if assignment.get("org_id") == org_id:
            doc_info = processed_documents.get(filename, {})
            docs.append({
                "name": filename,
                "chunk_count": doc_info.get("chunk_count", 0),
                "char_count": doc_info.get("char_count", 0),
                "file_type": doc_info.get("file_type", filename.rsplit(".", 1)[-1].lower() if "." in filename else "unknown"),
                "folder": assignment.get("folder", ""),
                "tags": assignment.get("tags", []),
                "doc_type": assignment.get("doc_type", "other"),
                "assigned_at": assignment.get("assigned_at", ""),
                "auto_detected": assignment.get("auto_detected", False),
            })
    return docs
