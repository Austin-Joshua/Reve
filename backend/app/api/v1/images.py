import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.storage import storage_manager
from app.api.deps import get_current_user
from app.models.entities import User, Asset

router = APIRouter(prefix="/images", tags=["images"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    contents = await file.read()

    # Preflight image validation (magic bytes, dimensions, max size)
    is_valid, error_msg, meta = storage_manager.validate_image_file(contents)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "VALIDATION_INVALID_IMAGE", "message": error_msg},
        )

    # Save to storage abstraction
    saved = storage_manager.save_image(
        image_bytes=contents,
        filename=file.filename,
        mime_type=meta["mime_type"],
    )

    # Record in database with ownership
    asset = Asset(
        user_id=current_user.id,
        name=os.path.basename(file.filename or "uploaded_image"),
        asset_type="image",
        storage_url=saved["storage_url"],
        thumbnail_url=saved["thumbnail_url"],
        size_bytes=saved["file_size_bytes"],
        mime_type=saved["mime_type"],
        width=saved["width"],
        height=saved["height"],
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    return {
        "image_id": asset.id,
        "url": asset.storage_url,
        "thumbnail_url": asset.thumbnail_url,
        "width": asset.width,
        "height": asset.height,
        "size_bytes": asset.size_bytes,
        "mime_type": asset.mime_type,
    }


@router.get("/{image_id}")
async def get_image_metadata(
    image_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Asset).where(Asset.id == image_id, Asset.user_id == current_user.id)
    )
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "IMAGE_NOT_FOUND", "message": "Image asset not found or access denied"},
        )
    return {
        "id": asset.id,
        "name": asset.name,
        "url": asset.storage_url,
        "thumbnail_url": asset.thumbnail_url,
        "width": asset.width,
        "height": asset.height,
        "size_bytes": asset.size_bytes,
        "mime_type": asset.mime_type,
        "created_at": asset.created_at,
    }


@router.get("/file/{filename}")
async def serve_stored_image(filename: str):
    """
    Direct endpoint to serve locally saved raster images for ₹0 local development.
    Enforces strict path traversal protection using directory boundary containment.
    """
    safe_name = os.path.basename(filename)
    base_dir = storage_manager.local_dir.resolve()
    target_path = (storage_manager.local_dir / safe_name).resolve()

    # Enforce path containment
    if not str(target_path).startswith(str(base_dir)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "SECURITY_PATH_TRAVERSAL", "message": "Illegal path traversal detected."},
        )

    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=404, detail="Image file not found on disk")

    ext = safe_name.split(".")[-1].lower()
    media_type = "image/png" if ext == "png" else "image/jpeg"
    return FileResponse(str(target_path), media_type=media_type)
