# app/services/chunking_service.py
import re
import uuid
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class TextChunk:
    """Représente un chunk de texte"""
    content: str
    chunk_index: int
    start_char: int
    end_char: int
    word_count: int
    char_count: int
    page_number: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None

class ChunkingService:
    """Service de découpage intelligent de texte pour RAG"""
    
    # Configuration par défaut
    DEFAULT_CHUNK_SIZE = 500    # Mots par chunk
    DEFAULT_OVERLAP = 50        # Mots de chevauchement
    MIN_CHUNK_SIZE = 100       # Taille minimale d'un chunk
    MAX_CHUNK_SIZE = 1000      # Taille maximale d'un chunk
    
    @staticmethod
    def create_chunks(
        text: str,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        overlap: int = DEFAULT_OVERLAP,
        page_number: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[TextChunk]:
        """
        Crée des chunks intelligents à partir d'un texte
        """
        
        if not text or not text.strip():
            return []
        
        # Nettoyer le texte d'entrée
        cleaned_text = ChunkingService._clean_text(text)
        
        # Découper en paragraphes
        paragraphs = ChunkingService._split_into_paragraphs(cleaned_text)
        
        # Créer les chunks
        chunks = ChunkingService._create_smart_chunks(
            paragraphs, chunk_size, overlap, cleaned_text
        )
        
        # Enrichir les chunks avec métadonnées
        result_chunks = []
        for i, chunk_text in enumerate(chunks):
            
            # Calculer les positions dans le texte original
            start_char = cleaned_text.find(chunk_text[:50])  # Approximation
            end_char = start_char + len(chunk_text)
            
            # Si on ne trouve pas, calculer autrement
            if start_char == -1:
                start_char = sum(len(chunks[j]) for j in range(i))
                end_char = start_char + len(chunk_text)
            
            chunk = TextChunk(
                content=chunk_text,
                chunk_index=i,
                start_char=start_char,
                end_char=end_char,
                word_count=len(chunk_text.split()),
                char_count=len(chunk_text),
                page_number=page_number,
                metadata=metadata
            )
            
            result_chunks.append(chunk)
        
        return result_chunks
    
    @staticmethod
    def create_chunks_from_pages(
        pages: List[Dict[str, Any]],
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        overlap: int = DEFAULT_OVERLAP
    ) -> List[TextChunk]:
        """
        Crée des chunks à partir d'une liste de pages
        (pour les documents multi-pages comme PDF)
        """
        
        all_chunks = []
        global_chunk_index = 0
        
        for page in pages:
            page_text = page.get('text', '')
            page_number = page.get('page_number', 1)
            
            if not page_text.strip():
                continue
            
            # Métadonnées de la page
            page_metadata = {
                'source_page': page_number,
                'page_char_count': page.get('char_count', len(page_text)),
                'page_word_count': page.get('word_count', len(page_text.split()))
            }
            
            # Créer les chunks pour cette page
            page_chunks = ChunkingService.create_chunks(
                page_text, chunk_size, overlap, page_number, page_metadata
            )
            
            # Ajuster les index globaux
            for chunk in page_chunks:
                chunk.chunk_index = global_chunk_index
                global_chunk_index += 1
            
            all_chunks.extend(page_chunks)
        
        return all_chunks
    
    @staticmethod
    def _clean_text(text: str) -> str:
        """Nettoie le texte avant chunking"""
        
        # Normaliser les espaces et retours à la ligne
        text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Max 2 retours consécutifs
        text = re.sub(r'[ \t]+', ' ', text)             # Multiple espaces = un espace
        text = re.sub(r'\n ', '\n', text)               # Espaces après retour à la ligne
        
        # Supprimer espaces en début/fin
        lines = [line.rstrip() for line in text.split('\n')]
        text = '\n'.join(lines).strip()
        
        return text
    
    @staticmethod
    def _split_into_paragraphs(text: str) -> List[str]:
        """Divise le texte en paragraphes logiques"""
        
        # Séparer par double saut de ligne (paragraphes)
        paragraphs = text.split('\n\n')
        
        # Nettoyer et filtrer les paragraphes vides
        cleaned_paragraphs = []
        for para in paragraphs:
            para = para.strip()
            if para and len(para.split()) >= 3:  # Au moins 3 mots
                cleaned_paragraphs.append(para)
        
        # Si pas de paragraphes distincts, découper par phrases
        if len(cleaned_paragraphs) <= 1 and text:
            sentences = ChunkingService._split_into_sentences(text)
            return sentences
        
        return cleaned_paragraphs
    
    @staticmethod
    def _split_into_sentences(text: str) -> List[str]:
        """Divise le texte en phrases"""
        
        # Pattern pour détecter les fins de phrases
        sentence_endings = r'[.!?]+\s+'
        sentences = re.split(sentence_endings, text)
        
        # Nettoyer les phrases
        cleaned_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            if sentence and len(sentence.split()) >= 5:  # Au moins 5 mots
                cleaned_sentences.append(sentence)
        
        return cleaned_sentences
    
    @staticmethod
    def _create_smart_chunks(
        paragraphs: List[str],
        chunk_size: int,
        overlap: int,
        original_text: str
    ) -> List[str]:
        """
        Crée des chunks en respectant les limites de paragraphes
        """
        
        chunks = []
        current_chunk = ""
        current_word_count = 0
        
        i = 0
        while i < len(paragraphs):
            paragraph = paragraphs[i]
            para_word_count = len(paragraph.split())
            
            # Si le paragraphe seul dépasse la taille max, le découper
            if para_word_count > ChunkingService.MAX_CHUNK_SIZE:
                # Finir le chunk actuel s'il existe
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = ""
                    current_word_count = 0
                
                # Découper le paragraphe en chunks
                para_chunks = ChunkingService._split_large_paragraph(
                    paragraph, chunk_size
                )
                chunks.extend(para_chunks)
                i += 1
                continue
            
            # Si ajouter ce paragraphe dépasserait la taille cible
            if current_word_count + para_word_count > chunk_size and current_chunk:
                # Sauvegarder le chunk actuel
                chunks.append(current_chunk.strip())
                
                # Commencer le nouveau chunk avec chevauchement
                overlap_text = ChunkingService._get_overlap_text(
                    current_chunk, overlap
                )
                current_chunk = overlap_text
                current_word_count = len(overlap_text.split()) if overlap_text else 0
            
            # Ajouter le paragraphe au chunk actuel
            if current_chunk:
                current_chunk += "\n\n" + paragraph
            else:
                current_chunk = paragraph
            
            current_word_count += para_word_count
            i += 1
        
        # Ajouter le dernier chunk
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        # Filtrer les chunks trop petits
        filtered_chunks = []
        for chunk in chunks:
            word_count = len(chunk.split())
            if word_count >= ChunkingService.MIN_CHUNK_SIZE:
                filtered_chunks.append(chunk)
        
        return filtered_chunks if filtered_chunks else chunks  # Garder même les petits si c'est tout ce qu'on a
    
    @staticmethod
    def _split_large_paragraph(paragraph: str, target_size: int) -> List[str]:
        """Découpe un paragraphe trop volumineux"""
        
        sentences = ChunkingService._split_into_sentences(paragraph)
        
        chunks = []
        current_chunk = ""
        current_words = 0
        
        for sentence in sentences:
            sentence_words = len(sentence.split())
            
            if current_words + sentence_words > target_size and current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = sentence
                current_words = sentence_words
            else:
                if current_chunk:
                    current_chunk += ". " + sentence
                else:
                    current_chunk = sentence
                current_words += sentence_words
        
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        
        return chunks
    
    @staticmethod
    def _get_overlap_text(text: str, overlap_words: int) -> str:
        """Récupère les derniers mots d'un texte pour le chevauchement"""
        
        words = text.split()
        if len(words) <= overlap_words:
            return text
        
        overlap_text = " ".join(words[-overlap_words:])
        
        # Essayer de commencer par une phrase complète
        sentences = overlap_text.split('. ')
        if len(sentences) > 1:
            return '. '.join(sentences[1:])  # Commencer par la phrase suivante
        
        return overlap_text