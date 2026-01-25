import os
from pathlib import Path

print("🚀 Generant estructura professional...")

# Llista de tots els fitxers que necessitem
files = [
    "app/main.py",
    "app/__init__.py",
    "app/core/config.py",
    "app/core/security.py",
    "app/core/__init__.py",
    "app/routers/chat.py",
    "app/routers/admin.py",
    "app/routers/__init__.py",
    "app/services/database.py",
    "app/services/__init__.py",
    "app/agents/sql_agent.py",
    "app/agents/chat_agent.py",
    "app/agents/tools.py",
    "app/agents/__init__.py",
]

base_path = Path(".")

for file_path in files:
    full_path = base_path / file_path
    
    # 1. Crear la carpeta pare si no existeix (ex: app/core/)
    full_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 2. Crear el fitxer buit
    if not full_path.exists():
        full_path.touch()
        print(f"✅ Creat: {file_path}")
    else:
        print(f"ℹ️  Ja existeix: {file_path}")

print("\n✨ Estructura completada! Ara pots esborrar setup.py")