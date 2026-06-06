from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import uvicorn
from typing import List
import logging
import os
import json

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("C2S_Backend")
logger.info("Démarrage du système C2S Backend...")

import config
import models
import schemas
from auth import hash_password, verify_password, create_access_token, get_current_user
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title=config.APP_NAME if hasattr(config, 'APP_NAME') else "C2S API",
              description="API pilotage stratégique",
              version=config.APP_VERSION)

origins = [origin.strip() for origin in config.CORS_ORIGINS.split(",")] if config.CORS_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


PUBLIC_PATHS = {"/api/login", "/"}


@app.middleware("http")
async def check_authorization(request: Request, call_next):
    if "/api/" in request.url.path and request.method != "OPTIONS" and request.url.path not in PUBLIC_PATHS:
        auth_header = request.headers.get("Authorization")
        if auth_header is None or not auth_header.startswith("Bearer "):
            client_ip = request.client.host if request.client else "Inconnue"
            logger.warning(f"IT LOG: Accès non autorisé rejeté ! IP: {client_ip} Path: {request.url.path}")
            return JSONResponse(status_code=403, content={"detail": "Accès non autorisé. Token requis."})
    response = await call_next(request)
    return response


@app.on_event("startup")
def seed_default_users():
    from database import SessionLocal
    db = SessionLocal()
    try:
        existing = db.query(models.User).first()
        if existing is not None:
            return
        users = [
            models.User(username="admin_it", password=hash_password("admin2026"), role="IT"),
            models.User(username="operateur", password=hash_password("operateur2026"), role="OPERATEUR"),
            models.User(username="decideur", password=hash_password("decideur2026"), role="DECIDEUR"),
        ]
        for u in users:
            db.add(u)
        db.commit()
        logger.info("IT LOG: Utilisateurs par défaut créés avec mots de passe hachés.")
    except Exception as e:
        logger.error(f"Erreur seed utilisateurs: {e}")
        db.rollback()
    finally:
        db.close()


@app.get("/")
def read_root():
    return {"message": "API C2S en ligne.", "version": config.APP_VERSION}


@app.post("/api/login", response_model=schemas.TokenResponse)
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == user_data.username).first()
    if not user or not verify_password(user_data.password, user.password):
        logger.warning(f"IT LOG: Échec de connexion pour {user_data.username}")
        raise HTTPException(status_code=401, detail="Identifiants incorrects")

    token = create_access_token(data={"sub": user.username, "role": user.role})
    logger.info(f"IT LOG: Connexion réussie : {user.username} ({user.role})")
    return {
        "status": "success",
        "token": token,
        "user": {"username": user.username, "role": user.role},
    }


@app.get("/api/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return {"username": current_user.username, "role": current_user.role}


THEME_CONFIG_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'theme_config.json')


@app.get("/api/config/theme")
def get_theme_config():
    if os.path.exists(THEME_CONFIG_PATH):
        with open(THEME_CONFIG_PATH, 'r') as f:
            return json.load(f)
    return {"accent": "#111c44", "bg": "#f5f5f7", "bgMain": "#f5f5f7", "name": "Business Blue"}


@app.put("/api/config/theme")
def save_theme_config(theme: dict):
    with open(THEME_CONFIG_PATH, 'w') as f:
        json.dump(theme, f, indent=2)
    logger.info(f"IT LOG: Thème sauvegardé : {theme.get('name', 'Custom')}")
    return {"status": "success"}


@app.get("/api/dashboard/feux-tricolores")
def get_dashboard_summary(db: Session = Depends(get_db)):
    decisions = db.query(models.Decision).all()
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")

    vert = 0
    orange = 0
    rouge = 0

    for d in decisions:
        if d.statut == "rouge" or (d.avancement < 100 and d.echeance and d.echeance < today):
            rouge += 1
        elif d.statut == "orange" or (d.difficultes and len(d.difficultes.strip()) > 0):
            orange += 1
        else:
            vert += 1

    return {"status": "success", "data": {"vert": vert, "orange": orange, "rouge": rouge}}


@app.get("/api/decisions", response_model=List[schemas.Decision])
def get_decisions(db: Session = Depends(get_db)):
    logger.info("IT LOG: Lecture de la matrice des décisions")
    return db.query(models.Decision).order_by(models.Decision.id.desc()).all()


@app.post("/api/decisions", response_model=schemas.Decision)
def create_decision(decision: schemas.DecisionCreate, db: Session = Depends(get_db)):
    logger.info(f"IT LOG: Nouvelle décision enregistrée (Réf: {decision.ref})")
    db_decision = models.Decision(**decision.model_dump())
    db.add(db_decision)
    db.commit()
    db.refresh(db_decision)
    return db_decision


@app.put("/api/decisions/{decision_id}", response_model=schemas.Decision)
def update_decision(decision_id: int, decision_update: schemas.DecisionCreate, db: Session = Depends(get_db)):
    db_decision = db.query(models.Decision).filter(models.Decision.id == decision_id).first()
    if not db_decision:
        raise HTTPException(status_code=404, detail="Décision non trouvée")
    for key, value in decision_update.model_dump().items():
        setattr(db_decision, key, value)
    db.commit()
    db.refresh(db_decision)
    logger.info(f"IT LOG: Mise à jour de la décision ID {decision_id} (Réf: {db_decision.ref})")
    return db_decision


@app.delete("/api/decisions/{decision_id}")
def delete_decision(decision_id: int, db: Session = Depends(get_db)):
    db_decision = db.query(models.Decision).filter(models.Decision.id == decision_id).first()
    if not db_decision:
        raise HTTPException(status_code=404, detail="Décision non trouvée")
    db.delete(db_decision)
    db.commit()
    logger.warning(f"IT LOG: Suppression de la décision ID {decision_id}")
    return {"message": "Décision supprimée"}


@app.post("/api/decisions/restore")
def restore_decisions(decisions: List[schemas.DecisionCreate], db: Session = Depends(get_db)):
    logger.warning("IT LOG: Restauration massive de la base de données initiée !")
    imported = 0
    for d in decisions:
        existing = db.query(models.Decision).filter(models.Decision.ref == d.ref).first()
        if not existing:
            db_decision = models.Decision(**d.model_dump())
            db.add(db_decision)
            imported += 1
    db.commit()
    logger.info(f"IT LOG: Restauration terminée ({imported} importées).")
    return {"message": "Restauration terminée", "imported_count": imported}


@app.get("/api/logs")
def get_it_logs():
    log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'system_c2s.log')
    try:
        with open(log_path, 'r') as f:
            lines = f.readlines()
        return {"logs": "".join(lines[-100:])}
    except Exception as e:
        return {"logs": "Fichier log vide ou introuvable : " + str(e)}


@app.get("/api/messages", response_model=List[schemas.Message])
def get_messages(db: Session = Depends(get_db)):
    return db.query(models.Message).order_by(models.Message.id.desc()).limit(50).all()


@app.post("/api/messages", response_model=schemas.Message)
def send_message(msg: schemas.MessageCreate, db: Session = Depends(get_db)):
    logger.info(f"IT LOG: Nouveau message réseau de {msg.expediteur}")
    db_msg = models.Message(**msg.model_dump())
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
