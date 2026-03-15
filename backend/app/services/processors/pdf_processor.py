# app/services/processors/pdf_processor.py
import PyPDF2
import re
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class ExtractedContent:
    """Structure pour le contenu extrait d'un document"""
    text: str
    page_count: int
    metadata: Dict[str, Any]
    pages: List[Dict[str, Any]]  # Détails par pag

class PDFProcessor:
    """Processeur pour les fichiers PDF"""
    
    @staticmethod
    def extract_text(file_path: str) -> ExtractedContent:
        """Extrait le texte d'un fichier PDF"""
        
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Fichier non trouvé: {file_path}")
        
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                # Métadonnées du PDF
                metadata = {}
                if pdf_reader.metadata:
                    metadata = {
                        'title': pdf_reader.metadata.get('/Title', ''),
                        'author': pdf_reader.metadata.get('/Author', ''),
                        'subject': pdf_reader.metadata.get('/Subject', ''),
                        'creator': pdf_reader.metadata.get('/Creator', ''),
                        'producer': pdf_reader.metadata.get('/Producer', ''),
                        'creation_date': str(pdf_reader.metadata.get('/CreationDate', '')),
                        'modification_date': str(pdf_reader.metadata.get('/ModDate', ''))
                    }
                
                # Extraction du texte page par page
                pages = []
                full_text = ""
                
                for page_num, page in enumerate(pdf_reader.pages):
                    try:
                        page_text = page.extract_text()
                        
                        # Nettoyage du texte
                        cleaned_text = PDFProcessor._clean_text(page_text)
                        
                        page_info = {
                            'page_number': page_num + 1,
                            'text': cleaned_text,
                            'char_count': len(cleaned_text),
                            'word_count': len(cleaned_text.split()) if cleaned_text else 0
                        }
                        
                        pages.append(page_info)
                        full_text += cleaned_text + "\n\n"
                        
                    except Exception as e:
                        print(f"Erreur extraction page {page_num + 1}: {e}")
                        pages.append({
                            'page_number': page_num + 1,
                            'text': '',
                            'char_count': 0,
                            'word_count': 0,
                            'error': str(e)
                        })
                
                return ExtractedContent(
                    text=full_text.strip(),
                    page_count=len(pdf_reader.pages),
                    metadata=metadata,
                    pages=pages
                )
                
        except Exception as e:
            raise Exception(f"Erreur lors du traitement PDF: {str(e)}")
    
    @staticmethod
    def _clean_text(text: str) -> str:
        """Nettoie le texte extrait d'un PDF"""
        if not text:
            return ""
        
        # Supprimer les caractères de contrôle
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x84\x86-\x9f]', '', text)
        
        # Normaliser les espaces et retours à la ligne
        text = re.sub(r'\n\s*\n', '\n\n', text)  # Double saut = paragraphe
        text = re.sub(r'\n(?=\w)', ' ', text)    # Saut simple = espace
        text = re.sub(r' +', ' ', text)          # Multiple espaces = un espace
        
        # Supprimer espaces en début/fin de ligne
        lines = [line.strip() for line in text.split('\n')]
        text = '\n'.join(line for line in lines if line)
        
        return text.strip()