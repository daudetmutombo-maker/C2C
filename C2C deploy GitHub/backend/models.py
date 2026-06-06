from sqlalchemy import Column, Integer, String
from database import Base


class Decision(Base):
    __tablename__ = "decisions"

    id = Column(Integer, primary_key=True, index=True)
    ref = Column(String, unique=True, index=True)
    intitule = Column(String, index=True)
    responsable = Column(String)
    echeance = Column(String)
    avancement = Column(Integer, default=0)
    statut = Column(String, default="vert")
    autorite = Column(String, default="Présidence")
    echeances_inter = Column(String, default="")
    difficultes = Column(String, default="")
    mesures = Column(String, default="")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    expediteur = Column(String)
    contenu = Column(String)
    timestamp = Column(String)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)
