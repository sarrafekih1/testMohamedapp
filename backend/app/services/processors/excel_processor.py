# app/services/processors/excel_processor.py
import openpyxl
import pandas as pd
from pathlib import Path
from typing import List, Dict, Any
from .pdf_processor import ExtractedContent

class ExcelProcessor:
    """Processeur pour les fichiers Excel (.xlsx, .xls)"""
    
    @staticmethod
    def extract_text(file_path: str) -> ExtractedContent:
        """Extrait le texte d'un fichier Excel"""
        
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Fichier non trouvé: {file_path}")
        
        try:
            # Utiliser pandas pour une lecture plus robuste
            excel_file = pd.ExcelFile(file_path)
            
            # Métadonnées
            metadata = {
                'sheet_names': excel_file.sheet_names,
                'sheets_count': len(excel_file.sheet_names)
            }
            
            full_text = ""
            sheets_info = []
            
            # Traiter chaque feuille
            for sheet_name in excel_file.sheet_names:
                try:
                    df = pd.read_excel(file_path, sheet_name=sheet_name)
                    
                    # Convertir le DataFrame en texte
                    sheet_text = ExcelProcessor._dataframe_to_text(df, sheet_name)
                    
                    if sheet_text.strip():
                        full_text += f"\n\n[FEUILLE: {sheet_name}]\n{sheet_text}\n"
                        
                        sheets_info.append({
                            'sheet_name': sheet_name,
                            'text': sheet_text,
                            'rows': len(df),
                            'columns': len(df.columns),
                            'char_count': len(sheet_text),
                            'word_count': len(sheet_text.split()) if sheet_text else 0,
                            'has_data': not df.empty
                        })
                    
                except Exception as e:
                    print(f"Erreur traitement feuille '{sheet_name}': {e}")
                    sheets_info.append({
                        'sheet_name': sheet_name,
                        'text': '',
                        'error': str(e),
                        'has_data': False
                    })
            
            # Essayer d'extraire les métadonnées avec openpyxl
            try:
                workbook = openpyxl.load_workbook(file_path, read_only=True)
                if workbook.properties:
                    props = workbook.properties
                    metadata.update({
                        'title': props.title or '',
                        'author': props.creator or '',
                        'subject': props.subject or '',
                        'keywords': props.keywords or '',
                        'comments': props.description or '',
                        'created': str(props.created) if props.created else '',
                        'modified': str(props.modified) if props.modified else '',
                        'last_modified_by': props.lastModifiedBy or ''
                    })
                workbook.close()
            except Exception as e:
                metadata['metadata_extraction_error'] = str(e)
            
            # Ajouter les infos des feuilles aux métadonnées
            metadata['sheets_info'] = sheets_info
            
            # Page unique pour Excel (toutes les feuilles combinées)
            pages = [{
                'page_number': 1,
                'text': full_text.strip(),
                'char_count': len(full_text),
                'word_count': len(full_text.split()) if full_text else 0,
                'sheets_count': len(sheets_info)
            }]
            
            return ExtractedContent(
                text=full_text.strip(),
                page_count=1,
                metadata=metadata,
                pages=pages
            )
            
        except Exception as e:
            raise Exception(f"Erreur lors du traitement Excel: {str(e)}")
    
    @staticmethod
    def _dataframe_to_text(df: pd.DataFrame, sheet_name: str) -> str:
        """Convertit un DataFrame en texte lisible"""
        
        if df.empty:
            return f"Feuille '{sheet_name}' vide"
        
        text_parts = []
        
        # Ajouter les en-têtes de colonnes
        headers = [str(col) for col in df.columns if str(col) != 'Unnamed']
        if headers:
            text_parts.append("COLONNES: " + " | ".join(headers))
        
        # Convertir les données ligne par ligne
        for index, row in df.iterrows():
            row_values = []
            for col in df.columns:
                value = row[col]
                
                # Nettoyer et formater la valeur
                if pd.isna(value):
                    value_str = ""
                elif isinstance(value, (int, float)):
                    if pd.isna(value):
                        value_str = ""
                    else:
                        value_str = str(value)
                else:
                    value_str = str(value).strip()
                
                if value_str:  # Seulement ajouter les valeurs non vides
                    row_values.append(value_str)
            
            if row_values:  # Seulement ajouter les lignes avec des données
                text_parts.append(" | ".join(row_values))
        
        return "\n".join(text_parts)