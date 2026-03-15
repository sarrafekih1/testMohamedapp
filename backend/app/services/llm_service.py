# app/services/llm_service.py
import aiohttp
import json
import asyncio
from typing import List, Dict, Any, Optional
from app.core.config import get_settings

class LLMService:
    """Service pour intégration LLM via Ollama OU Groq"""
    
    def __init__(self):
        self.settings = get_settings()
        
        # Configuration Ollama (existant)
        self.ollama_url = self.settings.OLLAMA_URL
        self.model_name = self.settings.LLM_MODEL
        
        # NOUVEAU : Configuration Groq (si clé API disponible)
        self.groq_client = None
        if hasattr(self.settings, 'GROQ_API_KEY') and self.settings.GROQ_API_KEY:
            try:
                from groq import AsyncGroq
                self.groq_client = AsyncGroq(api_key=self.settings.GROQ_API_KEY)
                print(f"✅ Groq client initialisé avec modèle {self.settings.GROQ_MODEL}")
            except ImportError:
                print("⚠️ Package 'groq' non installé. Utilisation d'Ollama uniquement.")
            except Exception as e:
                print(f"⚠️ Erreur initialisation Groq: {e}. Utilisation d'Ollama uniquement.")

    async def health_check(self) -> Dict[str, Any]:
        """Vérifier la disponibilité d'Ollama"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.ollama_url}/api/tags") as response:
                    if response.status == 200:
                        models = await response.json()
                        
                        # NOUVEAU : Ajoute info sur Groq si disponible
                        groq_status = "enabled" if self.groq_client else "disabled"
                        
                        return {
                            "status": "healthy",
                            "url": self.ollama_url,
                            "available_models": [m["name"] for m in models.get("models", [])],
                            "current_model": self.model_name,
                            "groq_enabled": groq_status  # NOUVEAU
                        }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "url": self.ollama_url
            }
    
    async def generate_response(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]],
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        ⭐ INTERFACE PUBLIQUE (signature identique, implémentation améliorée)
        
        Générer une réponse basée sur les chunks trouvés par RAG.
        Essaie Groq d'abord si disponible, sinon utilise Ollama.
        
        Args:
            query: Question de l'utilisateur
            context_chunks: Chunks pertinents du RAG avec métadonnées
            conversation_history: Historique conversation (optionnel)
            
        Returns:
            Dict avec réponse, sources, tokens utilisés, etc.
        """
        # Construction du contexte à partir des chunks (INCHANGÉ)
        context_text = self._build_context_from_chunks(context_chunks)
        
        # Construction du prompt RAG (INCHANGÉ)
        prompt = self._build_rag_prompt(query, context_text, conversation_history)
        
        # ═══════════════════════════════════════════════════════════
        # NOUVELLE LOGIQUE : Décision Groq vs Ollama
        # ═══════════════════════════════════════════════════════════
        
        # Si Groq est configuré, essaie d'abord Groq
        if self.groq_client:
            print("DEBUG: Tentative avec Groq API...")
            groq_result = await self._generate_with_groq(prompt, context_chunks)
            
            # Si succès, retourne directement
            if groq_result["success"]:
                print(f"DEBUG: ✅ Groq réussi")
                return groq_result
            
            # Si échec ET fallback activé → essaie Ollama
            if hasattr(self.settings, 'GROQ_FALLBACK_TO_OLLAMA') and self.settings.GROQ_FALLBACK_TO_OLLAMA:
                print(f"DEBUG: ⚠️ Groq échec ({groq_result.get('error')}), fallback vers Ollama...")
                return await self._generate_with_ollama(prompt, context_chunks)
            
            # Pas de fallback → retourne l'erreur Groq
            return groq_result
        
        # Pas de Groq configuré → utilise Ollama directement
        print("DEBUG: Utilisation Ollama (Groq non configuré)")
        return await self._generate_with_ollama(prompt, context_chunks)
    
    # ═══════════════════════════════════════════════════════════
    # NOUVELLE MÉTHODE : Génération via Groq
    # ═══════════════════════════════════════════════════════════
    
    async def _generate_with_groq(
        self,
        prompt: str,
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Générer une réponse via l'API Groq (rapide, GPU cloud)
        
        Returns:
            Dict avec success, response, model_used, etc.
        """
        try:
            # Appel API Groq
            response = await self.groq_client.chat.completions.create(
                model=self.settings.GROQ_MODEL,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=self.settings.LLM_TEMPERATURE,
                max_tokens=self.settings.LLM_MAX_TOKENS,
                top_p=self.settings.LLM_TOP_P,
            )
            
            # Extraction de la réponse
            return {
                "success": True,
                "response": response.choices[0].message.content.strip(),
                "model_used": f"groq/{self.settings.GROQ_MODEL}",
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "sources": self._extract_sources_from_chunks(context_chunks),
                "context_used": len(context_chunks),
                "provider": "groq"
            }
            
        except Exception as e:
            error_msg = str(e)
            
            # Détection erreur quota (pour logging)
            if "rate_limit" in error_msg.lower() or "quota" in error_msg.lower():
                error_type = "Quota/Rate limit dépassé"
            elif "authentication" in error_msg.lower():
                error_type = "Erreur authentification API"
            else:
                error_type = "Erreur API"
            
            print(f"DEBUG: Groq erreur - {error_type}: {error_msg}")
            
            return {
                "success": False,
                "error": f"Groq {error_type}: {error_msg}",
                "provider": "groq"
            }
    
    # ═══════════════════════════════════════════════════════════
    # MÉTHODE EXTRAITE : Génération via Ollama (ton code actuel)
    # ═══════════════════════════════════════════════════════════
    
    async def _generate_with_ollama(
        self,
        prompt: str,
        context_chunks: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Générer une réponse via Ollama local (CPU, plus lent mais toujours dispo)
        
        Returns:
            Dict avec success, response, model_used, etc.
        """
        try:
            # Appel à Ollama (TON CODE ORIGINAL)
            async with aiohttp.ClientSession() as session:
                payload = {
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": self.settings.LLM_TEMPERATURE,
                        "top_p": self.settings.LLM_TOP_P,
                        "top_k": self.settings.LLM_TOP_K,
                        "num_ctx": 4096
                    }
                }
                
                async with session.post(
                    f"{self.ollama_url}/api/generate",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=self.settings.LLM_TIMEOUT)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        return {
                            "success": True,
                            "response": result["response"].strip(),
                            "model_used": f"ollama/{self.model_name}",
                            "prompt_tokens": len(prompt.split()),  # Approximation
                            "completion_tokens": len(result["response"].split()),
                            "sources": self._extract_sources_from_chunks(context_chunks),
                            "context_used": len(context_chunks),
                            "provider": "ollama"
                        }
                    else:
                        error_text = await response.text()
                        return {
                            "success": False,
                            "error": f"Ollama API error {response.status}: {error_text}",
                            "provider": "ollama"
                        }
                        
        except asyncio.TimeoutError:
            return {
                "success": False,
                "error": "Timeout: Le modèle met trop de temps à répondre",
                "provider": "ollama"
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Erreur lors de la génération: {str(e)}",
                "provider": "ollama"
            }
    
    # ═══════════════════════════════════════════════════════════
    # MÉTHODES UTILITAIRES (INCHANGÉES)
    # ═══════════════════════════════════════════════════════════
    
    def _build_context_from_chunks(self, chunks: List[Dict[str, Any]]) -> str:
        """Construire le contexte textuel à partir des chunks RAG"""
        if not chunks:
            return "Aucun document pertinent trouvé."
        
        context_parts = []
        for i, chunk in enumerate(chunks, 1):
            # Extraction des informations du chunk
            content = chunk.get("content", "")
            filename = chunk.get("filename", "Document inconnu")
            topic_name = chunk.get("topic_name", "Topic inconnu")
            page_number = chunk.get("page_number")
            
            # Construction de la référence
            page_ref = f", page {page_number}" if page_number else ""
            source_ref = f"[Source {i}: {filename} - {topic_name}{page_ref}]"
            
            context_parts.append(f"{source_ref}\n{content}\n")
        
        return "\n---\n".join(context_parts)
    
    def _build_rag_prompt(
        self,
        query: str,
        context: str,
        history: List[Dict[str, str]] = None
    ) -> str:
        """Construire le prompt optimisé pour RAG"""
        
        # Historique conversation si disponible
        history_text = ""
        if history:
            history_parts = []
            for msg in history[-3:]:  # Garder seulement les 3 derniers échanges
                role = "Utilisateur" if msg.get("is_from_user") else "Assistant"
                content = msg.get("content", "")[:200]  # Tronquer si trop long
                history_parts.append(f"{role}: {content}")
            
            if history_parts:
                history_text = f"\nHistorique récent:\n{chr(10).join(history_parts)}\n"
        
        prompt = f"""Tu es un assistant IA spécialisé dans l'analyse de documents d'entreprise. Ton rôle est de répondre aux questions en te basant UNIQUEMENT sur les documents fournis en contexte.


RÈGLES CRITIQUES:

1. Base tes réponses EXCLUSIVEMENT sur le contexte fourni ci-dessous
2. Si l'information n'est PAS dans le contexte, dis EXPLICITEMENT : "Cette information n'est pas disponible dans les documents fournis."
3. AVANT de dire qu'une info n'existe pas, relis ATTENTIVEMENT tout le contexte
4. Cite TOUJOURS tes sources avec les références [Source X]
4.5 . Sois précis, factuel et concis, sauf si on te précise le contraire.
5. Si tu trouves l'info, réponds directement SANS dire "je ne trouve pas"
6. Réponds en français, de manière concise et factuelle
7. Si plusieurs sources se complètent, synthétise-les INTELLIGEMMENT.

CONTEXTE DOCUMENTAIRE:
{context}
{history_text}
QUESTION DE L'UTILISATEUR:
{query}

RÉPONSE BASÉE SUR LES DOCUMENTS:"""

        return prompt
    
    def _extract_sources_from_chunks(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extraire les informations de sources pour les citations"""
        sources = []
        for chunk in chunks:
            source = {
                "document_id": chunk.get("document_id"),
                "filename": chunk.get("filename"),
                "topic_name": chunk.get("topic_name"),
                "page_number": chunk.get("page_number"),
                "chunk_index": chunk.get("chunk_index"),
                "similarity_score": chunk.get("score", 0.0)
            }
            sources.append(source)
        
        return sources
    
    async def test_connection(self) -> bool:
        """Test rapide de connexion à Ollama"""
        try:
            health = await self.health_check()
            return health["status"] == "healthy"
        except:
            return False

# Instance globale
llm_service = LLMService()