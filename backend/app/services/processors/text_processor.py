# app/services/processors/text_processor.py
import chardet
from pathlib import Path
from typing import List, Dict, Any
from .pdf_processor import ExtractedContent

class TextProcessor:
    """Processeur pour les fichiers texte (.txt, .md, .rtf)"""
    
    @staticmethod
    def extract_text(file_path: str) -> ExtractedContent:
        """Extrait le texte d'un fichier texte"""
        
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Fichier non trouvé: {file_path}")
        
        try:
            # Détecter l'encodage du fichier
            encoding = TextProcessor._detect_encoding(file_path)
            
            # Lire le fichier
            with open(file_path, 'r', encoding=encoding) as file:
                content = file.read()
            
            # Nettoyer le contenu
            cleaned_content = TextProcessor._clean_text(content)
            
            # Métadonnées basiques
            metadata = {
                'encoding': encoding,
                'file_extension': path.suffix.lower(),
                'line_count': len(cleaned_content.split('\n')) if cleaned_content else 0,
                'char_count': len(cleaned_content),
                'word_count': len(cleaned_content.split()) if cleaned_content else 0
            }
            
            # Analyser la structure si c'est du Markdown
            if path.suffix.lower() == '.md':
                metadata.update(TextProcessor._analyze_markdown(cleaned_content))
            
            # Page unique pour les fichiers texte
            pages = [{
                'page_number': 1,
                'text': cleaned_content,
                'char_count': len(cleaned_content),
                'word_count': len(cleaned_content.split()) if cleaned_content else 0,
                'line_count': metadata['line_count']
            }]
            
            return ExtractedContent(
                text=cleaned_content,
                page_count=1,
                metadata=metadata,
                pages=pages
            )
            
        except Exception as e:
            raise Exception(f"Erreur lors du traitement du fichier texte: {str(e)}")
    
    @staticmethod
    def _detect_encoding(file_path: str) -> str:
        """Détecte l'encodage d'un fichier texte"""
        try:
            with open(file_path, 'rb') as file:
                raw_data = file.read(10000)  # Lire les premiers 10KB
                result = chardet.detect(raw_data)
                return result['encoding'] or 'utf-8'
        except Exception:
            return 'utf-8'  # Fallback
    
    @staticmethod
    def _clean_text(text: str) -> str:
        """Nettoie le texte"""
        if not text:
            return ""
        
        # Normaliser les fins de ligne
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Supprimer les caractères de contrôle (sauf \n et \t)
        cleaned_chars = []
        for char in text:
            if ord(char) >= 32 or char in ['\n', '\t']:
                cleaned_chars.append(char)
        
        text = ''.join(cleaned_chars)
        
        # Normaliser les espaces multiples (mais garder les retours à la ligne)
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # Remplacer plusieurs espaces consécutifs par un seul
            cleaned_line = ' '.join(line.split())
            cleaned_lines.append(cleaned_line)
        
        return '\n'.join(cleaned_lines).strip()
    
    @staticmethod
    def _analyze_markdown(content: str) -> Dict[str, Any]:
        """Analyse la structure d'un fichier Markdown"""
        lines = content.split('\n')
        
        headers = []
        links = []
        code_blocks = 0
        
        in_code_block = False
        
        for line_num, line in enumerate(lines, 1):
            stripped = line.strip()
            
            # Détecter les en-têtes
            if stripped.startswith('#'):
                level = 0
                for char in stripped:
                    if char == '#':
                        level += 1
                    else:
                        break
                
                header_text = stripped[level:].strip()
                if header_text:
                    headers.append({
                        'level': level,
                        'text': header_text,
                        'line': line_num
                    })
            
            # Détecter les blocs de code
            if stripped.startswith('```'):
                if in_code_block:
                    in_code_block = False
                else:
                    in_code_block = True
                    code_blocks += 1
            
            # Détecter les liens
            import re
            link_pattern = r'\[([^\]]+)\]\(([^)]+)\)'
            matches = re.findall(link_pattern, stripped)
            for match in matches:
                links.append({
                    'text': match[0],
                    'url': match[1],
                    'line': line_num
                })
        
        return {
            'is_markdown': True,
            'headers': headers,
            'headers_count': len(headers),
            'links': links,
            'links_count': len(links),
            'code_blocks_count': code_blocks
        }