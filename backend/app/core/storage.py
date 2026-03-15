# app/core/storage.py
import os
import uuid
import aiofiles
try:
    import magic
except ImportError:
    magic = None
from pathlib import Path
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException

class StorageService:
    """Service de gestion du stockage des fichiers"""
    
    # Configuration
    BASE_UPLOAD_DIR = "uploads"
    MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB
    
    # Types de fichiers autorisés avec leurs extensions
    ALLOWED_TYPES = {
        'application/pdf': ['.pdf'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        'application/vnd.ms-excel': ['.xls'],
        'text/plain': ['.txt'],
        'text/markdown': ['.md'],
        'application/rtf': ['.rtf']
    }
    
    @classmethod
    def init_storage(cls):
        """Initialise les dossiers de stockage"""
        base_path = Path(cls.BASE_UPLOAD_DIR)
        base_path.mkdir(exist_ok=True)
        return base_path
    
    @classmethod
    def get_topic_directory(cls, topic_id: str) -> Path:
        """Récupère ou crée le dossier d'un topic"""
        topic_dir = Path(cls.BASE_UPLOAD_DIR) / str(topic_id)
        topic_dir.mkdir(parents=True, exist_ok=True)
        return topic_dir
    
    @classmethod
    async def validate_file(cls, file: UploadFile) -> Tuple[str, str]:
        """Valide un fichier uploadé et retourne (content_type, extension)"""
        
        print(f"DEBUG: Début validation fichier: {file.filename}")

        # Vérifier la taille
        if hasattr(file, 'size') and file.size > cls.MAX_FILE_SIZE:
            print(f"DEBUG: Fichier trop volumineux: {file.size}")
            raise HTTPException(
                status_code=413,
                detail=f"Fichier trop volumineux. Maximum: {cls.MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Lire le début du fichier pour détecter le type
        print("DEBUG: Lecture du fichier pour détection type...")
        try:
            file_content = await file.read(1024)  # Lire les premiers 1024 bytes
            await file.seek(0)  # Remettre le curseur au début
            print(f"DEBUG: {len(file_content)} bytes lus")
        except Exception as e:
            print(f"DEBUG: Erreur lecture fichier: {e}")
            raise
        
        # Détecter le type MIME
        try:
            print("DEBUG: Détection MIME avec python-magic...")
            content_type = magic.from_buffer(file_content, mime=True)
            print(f"DEBUG: Type détecté: {content_type}")
        except Exception as e:
            print(f"DEBUG: Erreur python-magic: {e}")
            # Fallback sur l'extension
            if file.filename:
                ext = Path(file.filename).suffix.lower()
                content_type = cls._get_content_type_from_extension(ext)
                print(f"DEBUG: Fallback extension {ext} -> {content_type}")
            else:
                content_type = 'application/octet-stream'
        
        print(f"DEBUG: Content-type final: {content_type}")

        # Vérifier que le type est autorisé
        if content_type not in cls.ALLOWED_TYPES:
            raise HTTPException(
                status_code=415,
                detail=f"Type de fichier non supporté: {content_type}"
            )
        
        # Déterminer l'extension
        if file.filename:
            original_ext = Path(file.filename).suffix.lower()
            if original_ext in cls.ALLOWED_TYPES[content_type]:
                extension = original_ext
            else:
                extension = cls.ALLOWED_TYPES[content_type][0]
        else:
            extension = cls.ALLOWED_TYPES[content_type][0]
        
        return content_type, extension
    
    @classmethod
    async def save_file(
        cls, 
        file: UploadFile, 
        topic_id: str, 
        document_id: str
    ) -> Tuple[str, int]:
        """
        Sauvegarde un fichier et retourne (file_path, file_size)
        """
        
        # Valider le fichier UNE SEULE FOIS
        #content_type, extension = await cls.validate_file(file)
        # S'assurer que le curseur est au début
        #await file.seek(0)
        # TEMPORARY FIX: Skip validation pour éviter double lecture
        if file.filename:
            ext = Path(file.filename).suffix.lower()
            if ext == '.txt':
                content_type = 'text/plain'
                extension = '.txt'
            elif ext == '.pdf':
                content_type = 'application/pdf'
                extension = '.pdf'
            elif ext == '.docx':
                content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                extension = '.docx'
            else:
                content_type = 'text/plain'
                extension = '.txt'
        else:
            content_type = 'text/plain'
            extension = '.txt'
        
        # Créer le chemin de destination
        topic_dir = cls.get_topic_directory(topic_id)
        filename = f"{document_id}{extension}"
        file_path = topic_dir / filename
        
        # Sauvegarder le fichier
        file_size = 0
        async with aiofiles.open(file_path, 'wb') as f:
            await file.seek(0)
            while chunk := await file.read(8192):  # Lire par chunks de 8KB
                file_size += len(chunk)
                await f.write(chunk)
        
        # Vérifier la taille finale
        if file_size > cls.MAX_FILE_SIZE:
            await cls.delete_file(str(file_path))
            raise HTTPException(
                status_code=413,
                detail=f"Fichier trop volumineux: {file_size // (1024*1024)}MB"
            )
        
        return str(file_path), file_size
    
    @classmethod
    async def delete_file(cls, file_path: str) -> bool:
        """Supprime un fichier"""
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
                return True
            return False
        except Exception as e:
            print(f"Erreur lors de la suppression de {file_path}: {e}")
            return False
    
    @classmethod
    def get_file_path(cls, topic_id: str, document_id: str, extension: str) -> Path:
        """Construit le chemin d'un fichier"""
        return cls.get_topic_directory(topic_id) / f"{document_id}{extension}"
    
    @classmethod
    def file_exists(cls, file_path: str) -> bool:
        """Vérifie si un fichier existe"""
        return Path(file_path).exists()
    
    @classmethod
    def _get_content_type_from_extension(cls, ext: str) -> str:
        """Fallback pour déterminer le content-type depuis l'extension"""
        mapping = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.rtf': 'application/rtf'
        }
        return mapping.get(ext, 'application/octet-stream')

# Initialiser le stockage au démarrage
storage_service = StorageService()
storage_service.init_storage()