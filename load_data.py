import pandas as pd
from sqlalchemy import create_engine
from app.core.config import settings
import os

def load_csvs():
    # 1. Obtenir la URL i netejar-la d'espais o cometes accidentals
    db_url = settings.DATABASE_URL.strip().replace('"', '').replace("'", "")

    # 2. DEBUG: Imprimim com comença la URL per veure si el format és correcte
    # No imprimim tota la URL per seguretat, només el protocol i el final
    print(f"DEBUG: La URL detectada comença per: {db_url[:15]}...")
    print(f"DEBUG: La URL acaba en: ...{db_url[-15:]}")

    # 3. CORRECCIÓ DE PROTOCOL
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif db_url.startswith("postgresql://") and "+psycopg2" not in db_url:
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    try:
        # 4. Creem l'engine
        print("🔗 Intentant connectar a la base de dades...")
        engine = create_engine(db_url)
        
        # Provem la connexió abans de seguir
        with engine.connect() as conn:
            print("✅ Connexió establerta amb èxit!")

        files = {
            "Fets_coneguts_al_transport_públic_20251124.csv": "fets_transport_public",
            "Fets_coneguts_als_aeroports_20251124.csv": "fets_aeroports",
            "Fets_delictius_i_infraccions_administratives_de_l'àmbit_de_l'odi_i_discriminació_20251124.csv": "fets_odi_discriminacio",
            "Fets_penals_coneguts,_fets_coneguts_resolts_i_detencions_20251124.csv": "fets_penals_detencions"
        }

        for csv_file, table_name in files.items():
            if os.path.exists(csv_file):
                print(f"⏳ Carregant {csv_file}...")
                df = pd.read_csv(csv_file, encoding='utf-8')
                
                # Neteja de columnes
                df.columns = [
                    c.replace(' ', '_').replace('.', '').replace('(', '').replace(')', '').replace('/', '_').lower()
                    for c in df.columns
                ]
                
                df.to_sql(table_name, engine, if_exists='replace', index=False)
                print(f"✅ Taula '{table_name}' llesta.")
            else:
                print(f"❌ Fitxer no trobat: {csv_file}")
                
    except Exception as e:
        print(f"❌ Error critic: {e}")

if __name__ == "__main__":
    load_csvs()