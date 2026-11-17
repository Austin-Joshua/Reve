import os
import io
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from PIL import Image

from app.core.config import settings


class StorageManager:
    """
    Storage abstraction managing raster images, uploads, and thumbnails.
    Supports S3-compatible object storage (MinIO, AWS S3, Cloudflare R2)
    with automatic fallback to local filesystem storage for ₹0 zero-infrastructure development.
    """

    def __init__(self):
        self.endpoint_url = settings.S3_ENDPOINT_URL
        self.bucket = settings.S3_BUCKET
        self.access_key = settings.AWS_ACCESS_KEY_ID
        self.secret_key = settings.AWS_SECRET_ACCESS_KEY
        self.region = settings.AWS_REGION
        self.use_ssl = settings.S3_USE_SSL

        # Local storage directory fallback
        self.local_dir = Path(__file__).resolve().parents[2] / "uploads"
        self.local_dir.mkdir(parents=True, exist_ok=True)

    def is_s3_configured(self) -> bool:
        """Returns True if S3 / Cloudflare R2 credentials and bucket are configured."""
        return bool(
            self.endpoint_url
            and self.bucket
            and self.access_key
            and self.secret_key
            and self.access_key != "minioadmin"
        )

    def health_check(self) -> Dict[str, Any]:
        try:
            import boto3
            from botocore.config import Config
            s3 = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region,
                config=Config(connect_timeout=1, read_timeout=1, retries={"max_attempts": 0}),
            )
            s3.list_buckets()
            return {"status": "connected", "backend": "s3_compatible", "bucket": self.bucket}
        except Exception as e:
            # Report local storage availability
            return {
                "status": "connected",
                "backend": "local_filesystem",
                "path": str(self.local_dir),
                "s3_error": str(e),
            }

    def validate_image_file(
        self,
        file_bytes: bytes,
        max_size_bytes: int = 20 * 1024 * 1024,
    ) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
        """
        Validates magic bytes, format, file size, and pixel dimensions.
        Returns: (is_valid, error_message_if_invalid, metadata_dict)
        """
        if len(file_bytes) == 0:
            return False, "Uploaded file is empty (0 bytes).", None

        if len(file_bytes) > max_size_bytes:
            mb = max_size_bytes / (1024 * 1024)
            return False, f"File exceeds maximum allowed size of {mb:.1f}MB.", None

        try:
            with Image.open(io.BytesIO(file_bytes)) as img:
                img.verify()

            # Re-open after verify() to inspect properties
            with Image.open(io.BytesIO(file_bytes)) as img:
                fmt = img.format.upper() if img.format else "UNKNOWN"
                if fmt not in ["PNG", "JPEG", "JPG", "WEBP"]:
                    return False, f"Unsupported image format: '{fmt}'. Supported: PNG, JPEG, WebP.", None

                width, height = img.size
                if width < 64 or height < 64:
                    return False, f"Image dimensions ({width}x{height}) are too small. Minimum is 64x64.", None

                if width > 4096 or height > 4096:
                    return False, f"Image dimensions ({width}x{height}) exceed maximum allowed of 4096x4096.", None

                return True, None, {
                    "format": fmt,
                    "width": width,
                    "height": height,
                    "size_bytes": len(file_bytes),
                    "mime_type": f"image/{fmt.lower()}",
                }
        except Exception as e:
            return False, f"Invalid or corrupt image file: {str(e)}", None

    def save_image(
        self,
        image_bytes: bytes,
        filename: Optional[str] = None,
        mime_type: str = "image/png",
    ) -> Dict[str, Any]:
        """
        Saves image bytes and a generated thumbnail.
        Attempts S3 upload, falling back gracefully to local filesystem storage.
        """
        ext = "png" if "png" in mime_type.lower() else "jpg"
        unique_id = str(uuid.uuid4())
        name = f"{unique_id}.{ext}"
        thumb_name = f"{unique_id}_thumb.{ext}"

        # Inspect dimensions
        with Image.open(io.BytesIO(image_bytes)) as img:
            width, height = img.size

            # Generate thumbnail
            thumb = img.copy()
            thumb.thumbnail((256, 256))
            thumb_buf = io.BytesIO()
            thumb.save(thumb_buf, format=img.format or "PNG")
            thumb_bytes = thumb_buf.getvalue()

        # Try S3/R2 first if configured
        s3_ok = False
        if self.is_s3_configured():
            try:
                import boto3
                from botocore.config import Config
                s3 = boto3.client(
                    "s3",
                    endpoint_url=self.endpoint_url,
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name=self.region,
                    config=Config(connect_timeout=3, read_timeout=10, retries={"max_attempts": 1}),
                )
                s3.put_object(
                    Bucket=self.bucket,
                    Key=name,
                    Body=image_bytes,
                    ContentType=mime_type,
                )
                s3.put_object(
                    Bucket=self.bucket,
                    Key=thumb_name,
                    Body=thumb_bytes,
                    ContentType=mime_type,
                )
                s3_ok = True
            except Exception:
                s3_ok = False

        if s3_ok:
            if settings.S3_PUBLIC_URL:
                storage_url = f"{settings.S3_PUBLIC_URL.rstrip('/')}/{name}"
                thumbnail_url = f"{settings.S3_PUBLIC_URL.rstrip('/')}/{thumb_name}"
            else:
                # Private bucket mode: store persistent endpoint path in DB rather than a temporary presigned URL
                storage_url = f"/api/v1/images/file/{name}"
                thumbnail_url = f"/api/v1/images/file/{thumb_name}"
        else:
            # Local filesystem save
            main_path = self.local_dir / name
            thumb_path = self.local_dir / thumb_name
            with open(main_path, "wb") as f:
                f.write(image_bytes)
            with open(thumb_path, "wb") as f:
                f.write(thumb_bytes)

            storage_url = f"/api/v1/images/file/{name}"
            thumbnail_url = f"/api/v1/images/file/{thumb_name}"

        return {
            "key": name,
            "storage_url": storage_url,
            "thumbnail_url": thumbnail_url,
            "width": width,
            "height": height,
            "file_size_bytes": len(image_bytes),
            "mime_type": mime_type,
        }

    def get_image_bytes(self, key_or_filename: str) -> Optional[bytes]:
        """
        Retrieves raw bytes for an image file from S3 or local filesystem.
        """
        # Try local first
        local_file = self.local_dir / key_or_filename
        if local_file.exists():
            with open(local_file, "rb") as f:
                return f.read()

        # Try S3
        try:
            import boto3
            s3 = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region,
            )
            resp = s3.get_object(Bucket=self.bucket, Key=key_or_filename)
            return resp["Body"].read()
        except Exception:
            return None

    def generate_presigned_url(self, key: str, expires_in: int = 3600) -> str:
        if settings.S3_PUBLIC_URL:
            return f"{settings.S3_PUBLIC_URL.rstrip('/')}/{key}"
        try:
            import boto3
            s3 = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region,
            )
            return s3.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            )
        except Exception:
            return f"/api/v1/images/file/{key}"


storage_manager = StorageManager()
