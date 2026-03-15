import asyncio
from typing import List, Dict, Any, Optional
# Moved import inside SentenceTransformer lazy loader
# from sentence_transformers import SentenceTransformer
import numpy as np
from functools import lru_cache
import logging

logger = logging.getLogger(__name__)

class EmbeddingsService:
    """
    Service de génération d'embeddings pour la recherche sémantique.
    Utilise Sentence Transformers avec mise en cache des modèles.
    """
    
    # Configuration des modèles
    MODELS = {
        'multilingual': 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',  # Support français
        'english': 'sentence-transformers/all-MiniLM-L6-v2',  # Plus rapide, anglais seulement
        'large': 'sentence-transformers/all-mpnet-base-v2'     # Plus précis, plus lent
    }
    
    def __init__(self, model_name: str = 'multilingual'):
        """
        Initialize embeddings service
        
        Args:
            model_name: Nom du modèle à utiliser ('multilingual', 'english', 'large')
        """
        self.model_name = model_name
        self.model_path = self.MODELS.get(model_name, self.MODELS['multilingual'])
        self._model: Optional[SentenceTransformer] = None
        self.vector_dimension = 384  # Dimension pour MiniLM models
        
    @property
    def model(self) -> Any:
        """Lazy loading du modèle avec mise en cache"""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
            except ImportError:
                logger.error("sentence-transformers is not installed. Please run 'pip install sentence-transformers'")
                raise ImportError("sentence-transformers is not installed. Please run 'pip install sentence-transformers' inside the backend/ directory with your virtualenv activated.")
            
            logger.info(f"Chargement du modèle d'embeddings : {self.model_path}")
            self._model = SentenceTransformer(self.model_path)
            # Optimisation : utilise GPU si disponible
            if hasattr(self._model, 'device'):
                logger.info(f"Modèle chargé sur : {self._model.device}")
        return self._model
    
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Génère l'embedding d'un texte unique.
        
        Args:
            text: Texte à convertir en vecteur
            
        Returns:
            Liste de floats représentant le vecteur d'embedding
        """
        if not text or not text.strip():
            return [0.0] * self.vector_dimension
            
        # Nettoyage du texte
        cleaned_text = self._clean_text(text)
        
        # Génération asynchrone pour ne pas bloquer FastAPI
        loop = asyncio.get_event_loop()
        embedding = await loop.run_in_executor(
            None, 
            lambda: self.model.encode([cleaned_text], convert_to_tensor=False)[0]
        )
        
        # Conversion en liste Python standard
        if isinstance(embedding, np.ndarray):
            embedding = embedding.tolist()
            
        return embedding
    
    async def generate_embeddings_batch(
        self, 
        texts: List[str], 
        batch_size: int = 32
    ) -> List[List[float]]:
        """
        Génère les embeddings pour un lot de textes.
        Plus efficace pour traiter plusieurs chunks d'un document.
        
        Args:
            texts: Liste des textes à convertir
            batch_size: Taille des lots pour le traitement
            
        Returns:
            Liste d'embeddings correspondant aux textes
        """
        if not texts:
            return []
            
        # Nettoyage des textes
        cleaned_texts = [self._clean_text(text) for text in texts]
        
        # Traitement par lots pour optimiser la mémoire
        all_embeddings = []
        
        for i in range(0, len(cleaned_texts), batch_size):
            batch = cleaned_texts[i:i + batch_size]
            
            # Génération asynchrone
            loop = asyncio.get_event_loop()
            batch_embeddings = await loop.run_in_executor(
                None,
                lambda: self.model.encode(batch, convert_to_tensor=False)
            )
            
            # Conversion en listes Python
            for embedding in batch_embeddings:
                if isinstance(embedding, np.ndarray):
                    embedding = embedding.tolist()
                all_embeddings.append(embedding)
                
        logger.info(f"Généré {len(all_embeddings)} embeddings en {len(texts)//batch_size + 1} lots")
        return all_embeddings
    
    def _clean_text(self, text: str) -> str:
        """
        Nettoie le texte avant génération d'embedding.
        
        Args:
            text: Texte brut
            
        Returns:
            Texte nettoyé et normalisé
        """
        # Suppression caractères de contrôle et espaces multiples
        cleaned = ' '.join(text.split())
        
        # Truncation pour éviter les textes trop longs (limite modèle : 512 tokens)
        # Approximation : 1 token ≈ 4 caractères
        max_chars = 2000  # ~500 tokens de sécurité
        if len(cleaned) > max_chars:
            cleaned = cleaned[:max_chars].rsplit(' ', 1)[0]  # Coupe au dernier mot complet
            logger.warning(f"Texte tronqué à {len(cleaned)} caractères pour l'embedding")
            
        return cleaned
    
    async def compute_similarity(
        self, 
        embedding1: List[float], 
        embedding2: List[float]
    ) -> float:
        """
        Calcule la similarité cosinus entre deux embeddings.
        
        Args:
            embedding1, embedding2: Vecteurs d'embeddings à comparer
            
        Returns:
            Score de similarité entre -1 et 1 (1 = identique)
        """
        import numpy as np
        
        # Conversion en arrays numpy
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        # Similarité cosinus
        dot_product = np.dot(vec1, vec2)
        norm_product = np.linalg.norm(vec1) * np.linalg.norm(vec2)
        
        if norm_product == 0:
            return 0.0
            
        similarity = dot_product / norm_product
        return float(similarity)
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Vérifie que le service d'embeddings fonctionne correctement.
        
        Returns:
            Dictionnaire avec le statut de santé du service
        """
        try:
            # Test d'embedding simple
            test_embedding = await self.generate_embedding("Test de fonctionnement")
            
            return {
                "status": "healthy",
                "model": self.model_path,
                "model_name": self.model_name,
                "vector_dimension": len(test_embedding),
                "device": str(getattr(self.model, 'device', 'cpu'))
            }
        except Exception as e:
            logger.error(f"Health check embeddings failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "model_name": self.model_name
            }

# Instance globale réutilisable
@lru_cache(maxsize=1)
def get_embeddings_service(model_name: str = 'multilingual') -> EmbeddingsService:
    """Factory function avec cache pour éviter le rechargement du modèle"""
    return EmbeddingsService(model_name)

# Convenience functions
async def generate_embedding(text: str) -> List[float]:
    """Fonction utilitaire pour générer un embedding simple"""
    service = get_embeddings_service()
    return await service.generate_embedding(text)

async def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Fonction utilitaire pour générer des embeddings en lot"""
    service = get_embeddings_service()
    return await service.generate_embeddings_batch(texts)